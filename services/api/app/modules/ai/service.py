from __future__ import annotations

import hashlib
import json
import math
import re
import time
from dataclasses import dataclass
from decimal import Decimal
from typing import Any
from uuid import UUID, uuid4

from jsonschema import Draft202012Validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.db.base import (
    ContentBlock,
    ContentItem,
    ContentRevision,
    ExampleEmbedding,
    ExampleMetric,
    ExamplePost,
    GenerationRun,
    GenerationStep,
    LockedFact,
    ProjectVersion,
    RubricVersion,
    utc_now,
)
from app.modules.ai.providers import (
    ProviderError,
    StructuredGenerationRequest,
    embedding_provider_for,
    text_provider_for,
)
from app.modules.content.service import (
    fact_key_for_block,
    next_content_revision_number,
    text_from_value,
)


class AiPipelineError(RuntimeError):
    def __init__(self, code: str, message: str, details: dict[str, Any] | None = None) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details or {}


@dataclass
class ExampleMatch:
    example: ExamplePost
    score: float
    reasons: list[str]


MASTER_OUTPUT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "master_text",
        "body_blocks",
        "hook_candidates",
        "ratings_suggestion",
        "cta_candidate",
        "fact_usage_map",
        "warnings",
    ],
    "properties": {
        "master_text": {"type": "string"},
        "body_blocks": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["section", "text", "source_keys"],
                "properties": {
                    "section": {"type": "string"},
                    "text": {"type": "string"},
                    "source_keys": {"type": "array", "items": {"type": "string"}},
                },
            },
        },
        "hook_candidates": {
            "type": "array",
            "minItems": 3,
            "maxItems": 3,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["text", "rank", "source"],
                "properties": {
                    "text": {"type": "string"},
                    "rank": {"type": "integer", "minimum": 1, "maximum": 3},
                    "source": {"type": "string"},
                },
            },
        },
        "ratings_suggestion": {"$ref": "#/$defs/ratings"},
        "cta_candidate": {"type": "string"},
        "fact_usage_map": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["fact_key", "generated_value_json", "source"],
                "properties": {
                    "fact_key": {"type": "string"},
                    "generated_value_json": {"type": "string"},
                    "source": {"type": "string"},
                },
            },
        },
        "warnings": {"type": "array", "items": {"$ref": "#/$defs/finding"}},
    },
    "$defs": {
        "rating": {
            "type": "object",
            "additionalProperties": False,
            "required": ["value", "source", "evidence"],
            "properties": {
                "value": {"type": ["integer", "null"], "minimum": 1, "maximum": 9},
                "source": {"type": "string"},
                "evidence": {"type": "string"},
            },
        },
        "ratings": {
            "type": "object",
            "additionalProperties": False,
            "required": ["taste", "impression", "fatness", "spiciness"],
            "properties": {
                "taste": {"$ref": "#/$defs/rating"},
                "impression": {"$ref": "#/$defs/rating"},
                "fatness": {"$ref": "#/$defs/rating"},
                "spiciness": {"$ref": "#/$defs/rating"},
            },
        },
        "finding": {
            "type": "object",
            "additionalProperties": False,
            "required": ["code", "message", "field"],
            "properties": {
                "code": {"type": "string"},
                "message": {"type": "string"},
                "field": {"type": ["string", "null"]},
            },
        },
    },
}

HOOK_OUTPUT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["hook_candidates", "warnings"],
    "properties": {
        "hook_candidates": MASTER_OUTPUT_SCHEMA["properties"]["hook_candidates"],
        "warnings": MASTER_OUTPUT_SCHEMA["properties"]["warnings"],
    },
    "$defs": MASTER_OUTPUT_SCHEMA["$defs"],
}

RATINGS_OUTPUT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["ratings", "warnings"],
    "properties": {
        "ratings": MASTER_OUTPUT_SCHEMA["$defs"]["ratings"],
        "warnings": MASTER_OUTPUT_SCHEMA["properties"]["warnings"],
    },
    "$defs": MASTER_OUTPUT_SCHEMA["$defs"],
}

FACTS_OUTPUT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["facts", "uncertainties", "warnings"],
    "properties": {
        "facts": {"type": "object"},
        "uncertainties": {"type": "array", "items": {"type": "string"}},
        "warnings": MASTER_OUTPUT_SCHEMA["properties"]["warnings"],
    },
    "$defs": MASTER_OUTPUT_SCHEMA["$defs"],
}

QUALITY_OUTPUT_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "required": ["errors", "warnings", "scores"],
    "properties": {
        "errors": {"type": "array", "items": {"$ref": "#/$defs/finding"}},
        "warnings": {"type": "array", "items": {"$ref": "#/$defs/finding"}},
        "scores": {
            "type": "object",
            "additionalProperties": False,
            "required": ["fact_fidelity", "style_match", "structure"],
            "properties": {
                "fact_fidelity": {"type": "number", "minimum": 0, "maximum": 1},
                "style_match": {"type": "number", "minimum": 0, "maximum": 1},
                "structure": {"type": "number", "minimum": 0, "maximum": 1},
            },
        },
    },
    "$defs": MASTER_OUTPUT_SCHEMA["$defs"],
}


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip())


def content_hash(value: str) -> str:
    return hashlib.sha256(normalize_text(value).lower().encode("utf-8")).hexdigest()


def canonical_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, default=str)


def token_set(value: str) -> set[str]:
    return set(re.findall(r"[\wа-яё]+", value.lower()))


def cosine(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    dot = sum(a * b for a, b in zip(left, right))
    left_norm = math.sqrt(sum(a * a for a in left)) or 1.0
    right_norm = math.sqrt(sum(b * b for b in right)) or 1.0
    return dot / (left_norm * right_norm)


def validate_structured_payload(payload: dict[str, Any], schema: dict[str, Any]) -> None:
    errors = sorted(Draft202012Validator(schema).iter_errors(payload), key=lambda error: error.path)
    if errors:
        first = errors[0]
        path = ".".join(str(part) for part in first.path) or "$"
        raise AiPipelineError(
            "invalid_structured_output",
            f"Structured provider output failed schema validation at {path}: {first.message}",
        )


def usage_number(usage: dict[str, Any], *keys: str) -> int | None:
    for key in keys:
        value = usage.get(key)
        if isinstance(value, int):
            return value
    return None


def source_text_from_blocks(blocks: list[ContentBlock]) -> str:
    parts = []
    for block in blocks:
        text = text_from_value(block.value_json)
        if text:
            parts.append(text)
        elif block.value_json:
            parts.append(canonical_json(block.value_json))
    return "\n".join(parts)


def block_key(block: ContentBlock) -> str:
    return fact_key_for_block(block)


def blocks_manifest(blocks: list[ContentBlock]) -> list[dict[str, Any]]:
    return [
        {
            "id": str(block.id),
            "key": block_key(block),
            "field_key": block.field_key,
            "group_key": block.group_key,
            "group_index": block.group_index,
            "source_type": block.source_type,
            "locked": block.is_locked,
            "value": block.value_json,
            "text": text_from_value(block.value_json),
        }
        for block in blocks
    ]


async def create_or_update_example_embedding(
    session: AsyncSession,
    settings: Settings,
    example: ExamplePost,
) -> ExampleEmbedding:
    provider = embedding_provider_for(settings)
    hash_value = content_hash(example.normalized_text)
    existing = await session.scalar(
        select(ExampleEmbedding).where(
            ExampleEmbedding.example_post_id == example.id,
            ExampleEmbedding.provider_key == provider.provider_key,
            ExampleEmbedding.model_id == provider.model_id,
            ExampleEmbedding.content_hash == hash_value,
        )
    )
    if existing is not None:
        return existing
    result = await provider.embed([example.normalized_text])
    embedding = result.embeddings[0]
    row = ExampleEmbedding(
        id=uuid4(),
        workspace_id=example.workspace_id,
        example_post_id=example.id,
        provider_key=result.provider_key,
        model_id=result.model_id,
        dimensions=len(embedding),
        embedding_json=embedding,
        content_hash=hash_value,
        created_at=utc_now(),
    )
    session.add(row)
    await session.flush()
    return row


async def import_example_post(
    session: AsyncSession,
    project_id: UUID,
    workspace_id: UUID,
    actor_user_id: UUID,
    payload: dict[str, Any],
) -> tuple[ExamplePost, bool]:
    normalized = normalize_text(str(payload["text"]))
    dedupe = content_hash(normalized)
    existing = await session.scalar(
        select(ExamplePost).where(
            ExamplePost.workspace_id == workspace_id,
            ExamplePost.project_id == project_id,
            ExamplePost.dedupe_hash == dedupe,
        )
    )
    if existing is not None:
        return existing, False
    metrics = payload.get("metrics") or {}
    example = ExamplePost(
        id=uuid4(),
        workspace_id=workspace_id,
        project_id=project_id,
        rubric_id=payload.get("rubric_id"),
        source_type=payload.get("source_type", "manual"),
        source_external_id=payload.get("source_external_id"),
        title=payload.get("title"),
        text=str(payload["text"]),
        normalized_text=normalized,
        character_count=len(normalized),
        status=payload.get("status", "pending_review"),
        labels_json=payload.get("labels", []),
        manual_quality_score=payload.get("manual_quality_score"),
        dedupe_hash=dedupe,
        created_by=actor_user_id,
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    session.add(example)
    await session.flush()
    if metrics:
        metric = ExampleMetric(
            id=uuid4(),
            workspace_id=workspace_id,
            example_post_id=example.id,
            views=metrics.get("views"),
            reactions=metrics.get("reactions"),
            comments=metrics.get("comments"),
            shares=metrics.get("shares"),
            engagement_rate=Decimal(str(metrics["engagement_rate"]))
            if metrics.get("engagement_rate") is not None
            else None,
            captured_at=utc_now(),
        )
        session.add(metric)
    return example, True


async def approve_example(
    session: AsyncSession,
    settings: Settings,
    example: ExamplePost,
    actor_user_id: UUID,
) -> ExamplePost:
    example.status = "approved"
    example.reviewed_by = actor_user_id
    example.reviewed_at = utc_now()
    example.updated_at = utc_now()
    await create_or_update_example_embedding(session, settings, example)
    await session.flush()
    return example


async def reject_example(
    session: AsyncSession,
    example: ExamplePost,
    actor_user_id: UUID,
) -> ExamplePost:
    example.status = "rejected"
    example.reviewed_by = actor_user_id
    example.reviewed_at = utc_now()
    example.updated_at = utc_now()
    await session.flush()
    return example


async def content_generation_context(
    session: AsyncSession,
    item: ContentItem,
) -> tuple[ProjectVersion, RubricVersion, list[ContentBlock], list[LockedFact]]:
    project_version = await session.get(ProjectVersion, item.project_version_id)
    rubric_version = await session.get(RubricVersion, item.rubric_version_id)
    assert project_version is not None
    assert rubric_version is not None
    blocks = (
        await session.scalars(
            select(ContentBlock)
            .where(ContentBlock.content_item_id == item.id)
            .order_by(ContentBlock.group_key, ContentBlock.group_index, ContentBlock.field_key)
        )
    ).all()
    locked = (
        await session.scalars(
            select(LockedFact)
            .where(LockedFact.content_item_id == item.id)
            .order_by(LockedFact.fact_key)
        )
    ).all()
    return project_version, rubric_version, list(blocks), list(locked)


async def retrieve_examples(
    session: AsyncSession,
    settings: Settings,
    item: ContentItem,
    query_text: str,
    max_examples: int,
) -> list[ExampleMatch]:
    max_examples = min(max(max_examples, 3), 8)
    candidates = (
        await session.scalars(
            select(ExamplePost)
            .where(
                ExamplePost.workspace_id == item.workspace_id,
                ExamplePost.project_id == item.project_id,
                ExamplePost.status == "approved",
            )
            .order_by((ExamplePost.rubric_id == item.rubric_id).desc(), ExamplePost.created_at.desc())
            .limit(24)
        )
    ).all()
    if not candidates:
        return []
    provider = embedding_provider_for(settings)
    query_vector = (await provider.embed([query_text or ""])).embeddings[0]
    query_tokens = token_set(query_text)
    matches: list[ExampleMatch] = []
    for example in candidates:
        embedding = await session.scalar(
            select(ExampleEmbedding).where(
                ExampleEmbedding.example_post_id == example.id,
                ExampleEmbedding.provider_key == provider.provider_key,
                ExampleEmbedding.model_id == provider.model_id,
                ExampleEmbedding.content_hash == content_hash(example.normalized_text),
            )
        )
        vector_score = cosine(query_vector, embedding.embedding_json) if embedding else 0.0
        tokens = token_set(example.normalized_text)
        overlap = len(query_tokens & tokens) / max(len(query_tokens | tokens), 1)
        quality = (example.manual_quality_score or 5) / 9
        same_rubric = example.rubric_id == item.rubric_id
        score = 0.45 * vector_score + 0.25 * overlap + 0.20 * quality + (0.10 if same_rubric else 0.0)
        reasons = []
        if same_rubric:
            reasons.append("same_rubric")
        if overlap:
            reasons.append("lexical_overlap")
        if embedding:
            reasons.append("embedding_similarity")
        matches.append(ExampleMatch(example=example, score=score, reasons=reasons))
    matches.sort(key=lambda match: match.score, reverse=True)
    return matches[:max_examples]


def context_manifest(
    item: ContentItem,
    project_version: ProjectVersion,
    rubric_version: RubricVersion,
    examples: list[ExampleMatch],
    locked_facts: list[LockedFact],
) -> dict[str, Any]:
    locked_payload = {fact.fact_key: fact.value_json for fact in locked_facts}
    return {
        "project_version_id": str(project_version.id),
        "rubric_version_id": str(rubric_version.id),
        "example_ids": [str(match.example.id) for match in examples],
        "locked_fact_hash": content_hash(canonical_json(locked_payload)),
        "content_version": item.version,
    }


def system_prompt(project_version: ProjectVersion, rubric_version: RubricVersion) -> str:
    return "\n".join(
        [
            "Ты редактор русскоязычного медиа-проекта.",
            "Используй только переданные факты. Не выдумывай цены, адреса, блюда и оценки.",
            "Верни только JSON по схеме. Никакого свободного текста вне JSON.",
            f"Проект: {project_version.name}",
            f"Рубрика: {rubric_version.name}",
        ]
    )


def user_prompt(
    item: ContentItem,
    blocks: list[ContentBlock],
    examples: list[ExampleMatch],
    locked_facts: list[LockedFact],
    task_type: str,
) -> str:
    return canonical_json(
        {
            "task": task_type,
            "content_item": {"id": str(item.id), "title": item.title_internal},
            "source_blocks": blocks_manifest(blocks),
            "locked_facts": {fact.fact_key: fact.value_json for fact in locked_facts},
            "style_examples": [
                {
                    "id": str(match.example.id),
                    "score": round(match.score, 4),
                    "text": match.example.normalized_text[:2400],
                    "reasons": match.reasons,
                }
                for match in examples
            ],
        }
    )


def user_ratings_from_blocks(blocks: list[ContentBlock]) -> dict[str, Any] | None:
    for block in blocks:
        if block.field_key not in {"ratings", "rating"}:
            continue
        value = block.value_json
        if isinstance(value, dict):
            if "ratings" in value and isinstance(value["ratings"], dict):
                return value["ratings"]
            return value
    return None


def rating_value(value: Any, fallback: int | None = None) -> int | None:
    if isinstance(value, dict):
        value = value.get("value")
    if isinstance(value, int) and 1 <= value <= 9:
        return value
    return fallback


def mock_ratings(blocks: list[ContentBlock], source_text: str) -> dict[str, dict[str, Any]]:
    user = user_ratings_from_blocks(blocks)
    if user:
        return {
            key: {
                "value": rating_value(user.get(key)),
                "source": "user",
                "evidence": "Оценка введена пользователем и не меняется AI.",
            }
            for key in ["taste", "impression", "fatness", "spiciness"]
        }
    lowered = source_text.lower()
    has_negative = any(word in lowered for word in ["плохо", "мимо", "слаб", "горел", "пересол"])
    has_positive = any(word in lowered for word in ["отлич", "хорош", "понрав", "сочно"])
    taste = 7 if has_positive and not has_negative else 4 if has_negative else None
    impression = 7 if has_positive else 3 if has_negative else None
    fatness = 7 if any(word in lowered for word in ["жир", "масл", "майонез"]) else None
    spiciness = 7 if any(word in lowered for word in ["остр", "аджик", "перец"]) else 1 if "не остро" in lowered else None
    return {
        "taste": {
            "value": taste,
            "source": "ai" if taste is not None else "insufficient_evidence",
            "evidence": "Выведено из описания вкуса." if taste is not None else "Недостаточно фактов о вкусе.",
        },
        "impression": {
            "value": impression,
            "source": "ai" if impression is not None else "insufficient_evidence",
            "evidence": "Выведено из общего тона фактов." if impression is not None else "Недостаточно фактов о впечатлении.",
        },
        "fatness": {
            "value": fatness,
            "source": "ai" if fatness is not None else "insufficient_evidence",
            "evidence": "Есть явные признаки жирности." if fatness is not None else "Жирность не описана явно.",
        },
        "spiciness": {
            "value": spiciness,
            "source": "ai" if spiciness is not None else "insufficient_evidence",
            "evidence": "Есть явные признаки остроты." if spiciness is not None else "Острота не описана явно.",
        },
    }


def hook_candidates(item: ContentItem, source_text: str) -> list[dict[str, Any]]:
    title = item.title_internal.strip() or "Материал"
    first_fact = normalize_text(source_text).split(".")[0][:90] if source_text else "фактов пока мало"
    return [
        {"text": f"🔥 {title}: честный обзор без лишней витрины", "rank": 1, "source": "ai"},
        {"text": f"Когда {first_fact.lower()} — уже есть повод разобраться", "rank": 2, "source": "ai"},
        {"text": f"{title}: что вышло хорошо, а где кухня спорит с ожиданием", "rank": 3, "source": "ai"},
    ]


def cta_candidate(project_version: ProjectVersion) -> str:
    config = project_version.cta_config if isinstance(project_version.cta_config, dict) else {}
    variants = config.get("default_cta_variants") or config.get("variants") or []
    if variants and isinstance(variants[0], str):
        return variants[0]
    return "А вы как считаете? Напишите в комментариях."


def mock_master_payload(
    item: ContentItem,
    project_version: ProjectVersion,
    rubric_version: RubricVersion,
    blocks: list[ContentBlock],
    locked_facts: list[LockedFact],
) -> dict[str, Any]:
    source_text = source_text_from_blocks(blocks)
    blocks_out: list[dict[str, Any]] = []
    for block in blocks:
        text = text_from_value(block.value_json) or canonical_json(block.value_json)
        if not text or block.field_key == "ratings":
            continue
        blocks_out.append(
            {
                "section": block_key(block),
                "text": text,
                "source_keys": [block_key(block)],
            }
        )
    if not blocks_out:
        blocks_out.append(
            {
                "section": "source",
                "text": "Недостаточно исходных фактов для полноценной сборки.",
                "source_keys": [],
            }
        )
    hooks = hook_candidates(item, source_text)
    ratings = mock_ratings(blocks, source_text)
    cta = cta_candidate(project_version)
    body_text = "\n\n".join(f"{block['section']}\n{block['text']}" for block in blocks_out)
    master_text = "\n\n".join([hooks[0]["text"], body_text, cta])
    warnings = deterministic_warnings(master_text, source_text, rubric_version, len(blocks_out))
    return {
        "master_text": master_text,
        "body_blocks": blocks_out,
        "hook_candidates": hooks,
        "ratings_suggestion": ratings,
        "cta_candidate": cta,
        "fact_usage_map": [
            {
                "fact_key": fact.fact_key,
                "generated_value_json": canonical_json(fact.value_json),
                "source": "locked_fact",
            }
            for fact in locked_facts
        ],
        "warnings": warnings,
    }


def deterministic_warnings(
    generated_text: str,
    source_text: str,
    rubric_version: RubricVersion,
    section_count: int,
) -> list[dict[str, Any]]:
    warnings: list[dict[str, Any]] = []
    length = len(generated_text)
    if rubric_version.editorial_min_chars and length < rubric_version.editorial_min_chars:
        warnings.append(
            {
                "code": "below_min_chars",
                "message": (
                    f"Текст короче рубричного минимума: {length} < "
                    f"{rubric_version.editorial_min_chars}."
                ),
                "field": "master_text",
            }
        )
    if rubric_version.editorial_max_chars and length > rubric_version.editorial_max_chars:
        warnings.append(
            {
                "code": "above_max_chars",
                "message": (
                    f"Текст длиннее рубричного максимума: {length} > "
                    f"{rubric_version.editorial_max_chars}."
                ),
                "field": "master_text",
            }
        )
    risky_terms = ["лечит", "гарантированно", "безопасно для всех"]
    lowered_generated = generated_text.lower()
    lowered_source = source_text.lower()
    for term in risky_terms:
        if term in lowered_generated and term not in lowered_source:
            warnings.append(
                {
                    "code": "unsupported_claim",
                    "message": f"Фраза «{term}» не подтверждена исходными фактами.",
                    "field": "master_text",
                }
            )
    if section_count < 2:
        warnings.append(
            {
                "code": "thin_source",
                "message": "Мало исходных блоков: результат пригоден только как черновик.",
                "field": None,
            }
        )
    return warnings


def validate_locked_facts(payload: dict[str, Any], locked_facts: list[LockedFact]) -> list[dict[str, Any]]:
    errors: list[dict[str, Any]] = []
    raw_usage = payload.get("fact_usage_map")
    if isinstance(raw_usage, dict):
        usage = raw_usage
    elif isinstance(raw_usage, list):
        usage = {
            str(item.get("fact_key")): item
            for item in raw_usage
            if isinstance(item, dict) and item.get("fact_key")
        }
    else:
        usage = {}
    for fact in locked_facts:
        generated = usage.get(fact.fact_key)
        if generated is None:
            continue
        if isinstance(generated, dict) and "generated_value_json" in generated:
            generated_value = generated["generated_value_json"]
            if isinstance(generated_value, str):
                if generated_value != canonical_json(fact.value_json):
                    errors.append(
                        {
                            "code": "fact_conflict",
                            "field": fact.fact_key,
                            "message": f"AI изменил зафиксированный факт: {fact.fact_key}.",
                        }
                    )
                continue
        elif isinstance(generated, dict) and "generated_value" in generated:
            generated_value = generated["generated_value"]
        else:
            generated_value = generated
        if canonical_json(generated_value) != canonical_json(fact.value_json):
            errors.append(
                {
                    "code": "fact_conflict",
                    "field": fact.fact_key,
                    "message": f"AI изменил зафиксированный факт: {fact.fact_key}.",
                }
            )
    return errors


def quality_result(
    payload: dict[str, Any],
    source_text: str,
    rubric_version: RubricVersion,
    locked_facts: list[LockedFact],
) -> dict[str, Any]:
    errors = validate_locked_facts(payload, locked_facts)
    warnings = list(payload.get("warnings") or [])
    warnings.extend(
        deterministic_warnings(
            payload.get("master_text", ""),
            source_text,
            rubric_version,
            len(payload.get("body_blocks") or []),
        )
    )
    unique_warnings = {canonical_json(warning): warning for warning in warnings}.values()
    return {
        "errors": errors,
        "warnings": list(unique_warnings),
        "scores": {
            "fact_fidelity": 0.0 if errors else 1.0,
            "style_match": 0.72,
            "structure": 0.9 if payload.get("body_blocks") else 0.4,
        },
    }


async def create_generation_run(
    session: AsyncSession,
    item: ContentItem,
    actor_user_id: UUID,
    task_type: str,
    provider_key: str,
    model_id: str,
    manifest: dict[str, Any],
    request_metadata: dict[str, Any],
    examples: list[ExampleMatch],
) -> GenerationRun:
    now = utc_now()
    run = GenerationRun(
        id=uuid4(),
        workspace_id=item.workspace_id,
        project_id=item.project_id,
        rubric_id=item.rubric_id,
        content_item_id=item.id,
        task_type=task_type,
        provider_key=provider_key,
        model_id=model_id,
        status="running",
        context_manifest_json=manifest,
        request_metadata_json=request_metadata,
        response_json=None,
        retrieved_example_ids=[str(match.example.id) for match in examples],
        retry_count=0,
        started_at=now,
        completed_at=None,
        created_by=actor_user_id,
        created_at=now,
        updated_at=now,
    )
    session.add(run)
    await session.flush()
    return run


async def add_generation_step(
    session: AsyncSession,
    run: GenerationRun,
    step_type: str,
    status: str = "completed",
    input_metadata: dict[str, Any] | None = None,
    output_metadata: dict[str, Any] | None = None,
    latency_ms: int | None = None,
    error_code: str | None = None,
    error_message: str | None = None,
) -> GenerationStep:
    step = GenerationStep(
        id=uuid4(),
        workspace_id=run.workspace_id,
        generation_run_id=run.id,
        step_type=step_type,
        provider_key=run.provider_key,
        model_id=run.model_id,
        status=status,
        input_metadata_json=input_metadata,
        output_metadata_json=output_metadata,
        latency_ms=latency_ms,
        error_code=error_code,
        error_message=error_message,
        created_at=utc_now(),
    )
    session.add(step)
    await session.flush()
    return step


def complete_generation_run(
    run: GenerationRun,
    status: str,
    payload: dict[str, Any],
    started_monotonic: float,
    usage: dict[str, Any],
    error_code: str | None = None,
    error_message: str | None = None,
) -> None:
    now = utc_now()
    run.status = status
    run.response_json = payload
    run.latency_ms = int((time.monotonic() - started_monotonic) * 1000)
    run.input_tokens = usage_number(usage, "input_tokens", "prompt_tokens")
    run.output_tokens = usage_number(usage, "output_tokens", "completion_tokens")
    run.input_characters = usage_number(usage, "input_characters")
    run.output_characters = usage_number(usage, "output_characters")
    run.error_code = error_code
    run.error_message = error_message
    run.completed_at = now
    run.updated_at = now


async def run_structured_task(
    session: AsyncSession,
    settings: Settings,
    item: ContentItem,
    actor_user_id: UUID,
    task_type: str,
    schema_name: str,
    schema: dict[str, Any],
    fallback_payload: dict[str, Any],
) -> GenerationRun:
    started = time.monotonic()
    project_version, rubric_version, blocks, locked_facts = await content_generation_context(session, item)
    source_text = source_text_from_blocks(blocks)
    retrieval_config = project_version.example_retrieval if isinstance(project_version.example_retrieval, dict) else {}
    max_examples = int(retrieval_config.get("max_examples_per_generation") or 8)
    examples = await retrieve_examples(session, settings, item, source_text, max_examples=max_examples)
    provider = text_provider_for(settings)
    manifest = context_manifest(item, project_version, rubric_version, examples, locked_facts)
    prompt = user_prompt(item, blocks, examples, locked_facts, task_type)
    run = await create_generation_run(
        session,
        item,
        actor_user_id,
        task_type,
        provider.provider_key,
        provider.model_id,
        manifest,
        {
            "schema_name": schema_name,
            "retrieved_example_count": len(examples),
            "source_block_count": len(blocks),
        },
        examples,
    )
    await add_generation_step(
        session,
        run,
        "retrieval",
        output_metadata={
            "example_ids": [str(match.example.id) for match in examples],
            "scores": [round(match.score, 4) for match in examples],
        },
    )
    try:
        result = await provider.generate_structured(
            StructuredGenerationRequest(
                task_type=task_type,
                schema_name=schema_name,
                json_schema=schema,
                system_prompt=system_prompt(project_version, rubric_version),
                user_prompt=prompt,
                fallback_payload=fallback_payload,
            )
        )
        validate_structured_payload(result.payload, schema)
        response_payload = dict(result.payload)
        usage = result.usage
        await add_generation_step(
            session,
            run,
            "generation",
            output_metadata={"provider": result.provider_key, "model": result.model_id},
        )
    except (ProviderError, AiPipelineError) as exc:
        code = getattr(exc, "code", "generation_failed")
        message = getattr(exc, "message", str(exc))
        response_payload = {"errors": [{"code": code, "message": message}], "warnings": []}
        usage = {}
        await add_generation_step(
            session,
            run,
            "generation",
            status="failed",
            error_code=code,
            error_message=message,
        )
        complete_generation_run(run, "failed", response_payload, started, usage, code, message)
        await session.flush()
        return run
    if task_type == "assemble_master":
        quality = quality_result(response_payload, source_text, rubric_version, locked_facts)
        response_payload["quality"] = quality
        validate_structured_payload(quality, QUALITY_OUTPUT_SCHEMA)
        await add_generation_step(session, run, "quality_check", output_metadata=quality)
        if quality["errors"]:
            complete_generation_run(
                run,
                "failed",
                response_payload,
                started,
                usage,
                "fact_conflict",
                "Generated master conflicts with locked facts.",
            )
            await session.flush()
            return run
        revision = ContentRevision(
            id=uuid4(),
            workspace_id=item.workspace_id,
            content_item_id=item.id,
            revision_number=await next_content_revision_number(session, item.id),
            revision_type="master",
            text=response_payload["master_text"],
            structured_document=response_payload,
            character_count=len(response_payload["master_text"]),
            generation_run_id=run.id,
            parent_revision_id=item.current_master_revision_id,
            created_by=actor_user_id,
            created_at=utc_now(),
        )
        session.add(revision)
        await session.flush()
        item.current_master_revision_id = revision.id
        item.updated_at = utc_now()
        item.version += 1
        response_payload["revision_id"] = str(revision.id)
        complete_generation_run(run, "completed", response_payload, started, usage)
        return run
    complete_generation_run(run, "completed", response_payload, started, usage)
    await session.flush()
    return run


async def assemble_master(
    session: AsyncSession,
    settings: Settings,
    item: ContentItem,
    actor_user_id: UUID,
) -> GenerationRun:
    project_version, rubric_version, blocks, locked_facts = await content_generation_context(session, item)
    fallback = mock_master_payload(item, project_version, rubric_version, blocks, locked_facts)
    return await run_structured_task(
        session,
        settings,
        item,
        actor_user_id,
        "assemble_master",
        "master_assembly",
        MASTER_OUTPUT_SCHEMA,
        fallback,
    )


async def suggest_hook(
    session: AsyncSession,
    settings: Settings,
    item: ContentItem,
    actor_user_id: UUID,
) -> GenerationRun:
    _, _, blocks, _ = await content_generation_context(session, item)
    source_text = source_text_from_blocks(blocks)
    fallback = {"hook_candidates": hook_candidates(item, source_text), "warnings": []}
    return await run_structured_task(
        session,
        settings,
        item,
        actor_user_id,
        "suggest_hook",
        "hook_suggestion",
        HOOK_OUTPUT_SCHEMA,
        fallback,
    )


async def suggest_ratings(
    session: AsyncSession,
    settings: Settings,
    item: ContentItem,
    actor_user_id: UUID,
) -> GenerationRun:
    _, _, blocks, _ = await content_generation_context(session, item)
    source_text = source_text_from_blocks(blocks)
    fallback = {"ratings": mock_ratings(blocks, source_text), "warnings": []}
    return await run_structured_task(
        session,
        settings,
        item,
        actor_user_id,
        "suggest_ratings",
        "ratings_suggestion",
        RATINGS_OUTPUT_SCHEMA,
        fallback,
    )


async def extract_facts(
    session: AsyncSession,
    settings: Settings,
    item: ContentItem,
    actor_user_id: UUID,
) -> GenerationRun:
    _, _, blocks, _ = await content_generation_context(session, item)
    facts = {block_key(block): block.value_json for block in blocks if block.value_json}
    uncertainties = [
        block_key(block)
        for block in blocks
        if not text_from_value(block.value_json) and not block.value_json
    ]
    fallback = {"facts": facts, "uncertainties": uncertainties, "warnings": []}
    return await run_structured_task(
        session,
        settings,
        item,
        actor_user_id,
        "extract_facts",
        "fact_extraction",
        FACTS_OUTPUT_SCHEMA,
        fallback,
    )


async def quality_check(
    session: AsyncSession,
    settings: Settings,
    item: ContentItem,
    actor_user_id: UUID,
) -> GenerationRun:
    project_version, rubric_version, blocks, locked_facts = await content_generation_context(session, item)
    source_text = source_text_from_blocks(blocks)
    if item.current_master_revision_id:
        revision = await session.get(ContentRevision, item.current_master_revision_id)
        payload = revision.structured_document if revision is not None else {}
    else:
        payload = mock_master_payload(item, project_version, rubric_version, blocks, locked_facts)
    fallback = quality_result(payload, source_text, rubric_version, locked_facts)
    return await run_structured_task(
        session,
        settings,
        item,
        actor_user_id,
        "quality_check",
        "quality_check",
        QUALITY_OUTPUT_SCHEMA,
        fallback,
    )
