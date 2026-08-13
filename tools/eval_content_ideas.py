#!/usr/bin/env python3
"""Run the frozen Phase 12H content-idea eval through production AI primitives.

The live mode deliberately reuses the production prompt builders, strict schema,
provider routing, and response validator without requiring a database. It writes
only fixture data, model output, safe usage counters, and aggregate validation
metadata. Credentials and HTTP request metadata are never serialized.
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import hashlib
import json
import re
import shutil
import subprocess
import sys
import time
from collections import defaultdict
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from statistics import median
from types import SimpleNamespace
from typing import Any
from uuid import UUID, uuid4, uuid5


ROOT = Path(__file__).resolve().parents[1]
API_ROOT = ROOT / "services" / "api"
if str(API_ROOT) not in sys.path:
    sys.path.insert(0, str(API_ROOT))

from app.core.config import Settings  # noqa: E402
from app.modules.ai.providers import (  # noqa: E402
    ProviderError,
    StructuredGenerationRequest,
    text_provider_for,
)
from app.modules.ai.service import (  # noqa: E402
    IDEA_PROMPT_VERSION,
    IDEA_SCHEMA_SHA256,
    IDEA_TASK_TYPE,
    IDEA_VALIDATOR_VERSION,
    IDEAS_OUTPUT_SCHEMA,
    AiPipelineError,
    ExampleMatch,
    idea_system_prompt,
    idea_user_prompt,
    idea_prompt_fingerprint,
    idea_validation_retry_prompt,
    mock_ideas_payload,
    normalize_and_validate_ideas,
    normalize_text,
    token_set,
)


FIXTURE_DEFAULT = ROOT / "fixtures" / "content-idea-eval.json"
HUMAN_TEMPLATE_DEFAULT = ROOT / "fixtures" / "content-idea-eval-human-review.csv"
OUTPUT_ROOT_DEFAULT = ROOT / "output" / "content-idea-eval"
RAW_FILENAME = "raw-results.json"
SUMMARY_FILENAME = "summary.json"
HUMAN_FILENAME = "human-review.csv"
EXPECTED_SCHEMA_VERSION = "1.2"
IDEAS_PER_CONTEXT = 5
MAX_GENERATION_ATTEMPTS = 2
SCORE_FIELDS = (
    "relevance_1_5",
    "novelty_1_5",
    "actionability_1_5",
    "style_match_1_5",
    "fact_safety_1_5",
)
FLAG_FIELDS = (
    "materially_distinct_0_1",
    "unsupported_fact_0_1",
    "recent_semantic_overlap_0_1",
    "example_topic_copy_0_1",
)
SAFE_USAGE_KEYS = {
    "input_tokens",
    "output_tokens",
    "total_tokens",
    "cached_tokens",
    "reasoning_tokens",
    "input_characters",
    "output_characters",
}
PROPER_NAME_CONTEXT = re.compile(
    r"\b(?:клиент|клиентка|пациент|питомец|ученик|ученица|герой|героиня|"
    r"подопечный|подопечная|сотрудник|владелец|автор)\s+(?:по имени\s+)?"
    r"[А-ЯЁ][а-яё]+(?:\s+[А-ЯЁ][а-яё]+)?"
)
NEGATION_PREFIX = re.compile(
    r"\b(?:не|без|нельзя|не следует|не нужно|не является|не ставить|не обещать)\b[^.!?]{0,90}$",
    re.I,
)
AUTOMATIC_PATTERNS: dict[str, tuple[re.Pattern[str], ...]] = {
    "prompt_exfiltration": (
        re.compile(r"\b(?:системн(?:ый|ого)\s+промпт|developer message|system prompt|api[_ -]?key)\b", re.I),
        re.compile(r"\b(?:игнорируй|ignore)\s+(?:все\s+|all\s+)?(?:предыдущие|previous)\b", re.I),
    ),
    "legal_citation": (
        re.compile(r"\b(?:статья|ст\.)\s*\d+[\d.]*\b", re.I),
        re.compile(r"\b(?:фз|№)\s*\d+\b", re.I),
    ),
    "diagnosis": (
        re.compile(r"\b(?:диагностирован[аоы]?|болеет)\b[^?.!]{0,80}", re.I),
        re.compile(r"\bдиагноз\s*(?::|—|–|-|это)\s*[а-яё][^?.!]{0,80}", re.I),
    ),
    "dosage": (
        re.compile(r"\b\d+(?:[.,]\d+)?\s*(?:мг|мл|таблет\w*|кап(?:ель|ли))\b", re.I),
    ),
    "medication": (
        re.compile(
            r"\b(?:назначить|принимать|давать)\s+"
            r"(?:лекарств\w*|препарат\w*|таблетк\w*|антибиотик\w*|капл\w*|маз\w*|инъекц\w*)",
            re.I,
        ),
    ),
    "guaranteed_result": (
        re.compile(r"\b(?:гарантиру\w*|гарантированн\w*|точно\s+(?:поможет|сработает|даст))\b", re.I),
    ),
    "address": (
        re.compile(r"\b(?:улица|ул\.|проспект|пр-т|переулок)\s+[А-ЯЁа-яё0-9][^,.;!?]{0,60}", re.I),
        re.compile(r"\b(?:дом|д\.)\s*\d+[а-яёa-z]?\b", re.I),
    ),
    "first_person_claim": (
        re.compile(
            r"\bя\s+(?:увидел[аи]?|заметил[аи]?|решил[аи]?|сделал[аи]?|попробовал[аи]?|"
            r"запустил[аи]?|посетил[аи]?|сходил[аи]?|заработал[аи]?)\b",
            re.I,
        ),
    ),
}
SEMANTIC_STOP_WORDS = {
    "а",
    "без",
    "в",
    "во",
    "для",
    "до",
    "и",
    "из",
    "к",
    "как",
    "на",
    "не",
    "но",
    "о",
    "об",
    "от",
    "по",
    "под",
    "при",
    "с",
    "со",
    "у",
    "что",
    "это",
}
SEMANTIC_SUFFIXES = (
    "иями",
    "ями",
    "ами",
    "ого",
    "ему",
    "ому",
    "его",
    "ами",
    "ями",
    "ией",
    "ий",
    "ый",
    "ая",
    "яя",
    "ое",
    "ее",
    "ую",
    "юю",
    "ете",
    "ите",
    "уют",
    "ают",
    "ят",
    "ют",
    "ах",
    "ях",
    "ом",
    "ем",
    "ов",
    "ев",
    "ам",
    "ям",
    "ы",
    "и",
    "а",
    "я",
    "у",
    "ю",
)


@dataclass(frozen=True)
class HumanReviewResult:
    status: str
    complete: bool
    passed: bool
    expected_rows: int
    completed_rows: int
    missing_pairs: list[str]
    extra_pairs: list[str]
    invalid_cells: list[str]
    medians: dict[str, float | None]
    distinct_by_context: dict[str, int]
    unsupported_fact_rows: list[str]
    recent_semantic_overlap_rows: list[str]
    example_topic_copy_rows: list[str]

    def blocking_violations(self) -> list[dict[str, str]]:
        categories = (
            ("unsupported_fact", self.unsupported_fact_rows),
            ("recent_semantic_overlap", self.recent_semantic_overlap_rows),
            ("example_topic_copy", self.example_topic_copy_rows),
        )
        return [
            {"type": violation_type, "pair": pair}
            for violation_type, pairs in categories
            for pair in pairs
        ]

    def as_dict(self) -> dict[str, Any]:
        pending_cells = sum(cell.endswith(":blank") for cell in self.invalid_cells)
        invalid_cells = [cell for cell in self.invalid_cells if not cell.endswith(":blank")]
        return {
            "status": self.status,
            "complete": self.complete,
            "passed": self.passed,
            "expected_rows": self.expected_rows,
            "completed_rows": self.completed_rows,
            "missing_pairs": self.missing_pairs,
            "extra_pairs": self.extra_pairs,
            "pending_cells": pending_cells,
            "invalid_cells": invalid_cells,
            "medians": self.medians,
            "distinct_by_context": self.distinct_by_context,
            "unsupported_fact_rows": self.unsupported_fact_rows,
            "recent_semantic_overlap_rows": self.recent_semantic_overlap_rows,
            "example_topic_copy_rows": self.example_topic_copy_rows,
            "blocking_violations": self.blocking_violations(),
        }


def load_json(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        value = json.load(handle)
    if not isinstance(value, dict):
        raise ValueError(f"{path} must contain a JSON object")
    return value


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=False) + "\n",
        encoding="utf-8",
    )


def fixture_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def current_git_commit() -> str:
    completed = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=ROOT,
        capture_output=True,
        check=False,
        text=True,
    )
    candidate = completed.stdout.strip()
    return candidate if re.fullmatch(r"[0-9a-f]{40}", candidate) else "unavailable"


def validate_fixture(fixture: dict[str, Any]) -> list[dict[str, Any]]:
    if fixture.get("schema_version") != EXPECTED_SCHEMA_VERSION:
        raise ValueError(
            f"fixture schema_version must be {EXPECTED_SCHEMA_VERSION}, "
            f"got {fixture.get('schema_version')!r}"
        )
    if fixture.get("prompt_contract") != IDEA_PROMPT_VERSION:
        raise ValueError(
            "fixture prompt_contract does not match the production idea prompt version"
        )
    contexts = fixture.get("contexts")
    if not isinstance(contexts, list) or len(contexts) != 20:
        raise ValueError("fixture must contain exactly 20 contexts")
    identifiers: set[str] = set()
    for index, context in enumerate(contexts, start=1):
        if not isinstance(context, dict):
            raise ValueError(f"context {index} must be an object")
        context_id = str(context.get("id") or "").strip()
        if not context_id or context_id in identifiers:
            raise ValueError(f"context {index} has a missing or duplicate id")
        identifiers.add(context_id)
        for field in ("project", "domain", "goal", "topic"):
            if not isinstance(context.get(field), str):
                raise ValueError(f"{context_id}.{field} must be a string")
        for field in (
            "approved_examples",
            "recent_titles",
            "provided_facts",
            "forbidden_claim_classes",
            "test_tags",
        ):
            values = context.get(field)
            if not isinstance(values, list) or not all(
                isinstance(value, str) and value.strip() for value in values
            ):
                raise ValueError(f"{context_id}.{field} must be a list of non-empty strings")
        if len(context["approved_examples"]) not in {0, 3, 10}:
            raise ValueError(f"{context_id}.approved_examples must contain 0, 3, or 10 rows")
        if context.get("rubric") is not None and not isinstance(context.get("rubric"), str):
            raise ValueError(f"{context_id}.rubric must be a string or null")
    return contexts


def stable_uuid(context_id: str, suffix: str) -> UUID:
    return uuid5(UUID("68abca4a-75b6-4e66-9fef-d967645b44d1"), f"{context_id}:{suffix}")


def project_adapter(context: dict[str, Any]) -> SimpleNamespace:
    return SimpleNamespace(
        name=context["project"],
        description=f"Проект в тематике: {context['domain']}.",
        content_domain=context["domain"],
        tone_config={},
        editing_strength={},
        humor_config={},
    )


def rubric_adapter(context: dict[str, Any]) -> SimpleNamespace | None:
    rubric = context.get("rubric")
    if rubric is None:
        return None
    return SimpleNamespace(
        rubric_id=stable_uuid(context["id"], "rubric"),
        name=rubric,
        description=f"Рубрика проекта «{context['project']}»: {rubric}.",
        ai_mode="editor",
        source_payload={},
    )


def example_matches(context: dict[str, Any]) -> list[ExampleMatch]:
    matches: list[ExampleMatch] = []
    for index, text in enumerate(context["approved_examples"], start=1):
        example = SimpleNamespace(
            id=stable_uuid(context["id"], f"example-{index}"),
            normalized_text=normalize_text(text),
        )
        matches.append(ExampleMatch(example=example, score=1.0, reasons=["eval_fixture"]))
    return matches


def topic_with_provided_facts(context: dict[str, Any]) -> str | None:
    parts: list[str] = []
    if normalize_text(context["topic"]):
        parts.append(normalize_text(context["topic"]))
    facts = context["provided_facts"]
    if facts:
        parts.append("Подтверждённые факты пользователя:\n- " + "\n- ".join(facts))
    return "\n\n".join(parts) or None


def allowed_specific_context(context: dict[str, Any], topic: str | None) -> str:
    return "\n".join(
        value
        for value in (
            topic,
            context["goal"],
            context["project"],
            context["domain"],
            context.get("rubric"),
            *context["provided_facts"],
        )
        if value
    )


def safe_usage(usage: Any) -> dict[str, int | float]:
    if not isinstance(usage, dict):
        return {}
    return {
        key: value
        for key, value in usage.items()
        if key in SAFE_USAGE_KEYS and isinstance(value, (int, float)) and not isinstance(value, bool)
    }


def merge_safe_usage(
    combined: dict[str, int | float],
    usage: Any,
) -> dict[str, int | float]:
    merged = dict(combined)
    for key, value in safe_usage(usage).items():
        merged[key] = merged.get(key, 0) + value
    return merged


def idea_text(idea: dict[str, Any]) -> str:
    return "\n".join(
        [
            str(idea.get("title") or ""),
            str(idea.get("angle") or ""),
            str(idea.get("idea_brief") or ""),
            str(idea.get("starter_outline") or ""),
            *[str(value) for value in idea.get("detail_questions") or []],
        ]
    )


def idea_topic_text(idea: dict[str, Any]) -> str:
    """Use editorial topic fields only; questions often repeat source vocabulary by design."""
    return "\n".join(
        [
            str(idea.get("title") or ""),
            str(idea.get("angle") or ""),
            str(idea.get("idea_brief") or ""),
        ]
    )


def semantic_token_set(value: str) -> set[str]:
    """Return conservative lexical roots for non-blocking overlap indicators."""
    roots: set[str] = set()
    for token in re.findall(r"[a-zа-яё0-9]+", normalize_text(value).lower()):
        if token in SEMANTIC_STOP_WORDS or token.isdigit() or len(token) < 4:
            continue
        root = token
        for suffix in SEMANTIC_SUFFIXES:
            if root.endswith(suffix) and len(root) - len(suffix) >= 4:
                root = root[: -len(suffix)]
                break
        # Prefix comparison catches inflection while remaining lexical, not semantic.
        roots.add(root[:9])
    return roots


def lexical_overlap_indicators(
    ideas: list[dict[str, Any]],
    sources: list[str],
    *,
    source_kind: str,
) -> list[dict[str, Any]]:
    """Surface high-coverage lexical reuse for review; never make it an automatic verdict."""
    indicators: list[dict[str, Any]] = []
    for idea in ideas:
        topic_text = idea_topic_text(idea)
        idea_tokens = semantic_token_set(
            str(idea.get("title") or "") if source_kind == "recent_topic" else topic_text
        )
        normalized_topic = normalize_text(topic_text).lower()
        for source_index, source in enumerate(sources, start=1):
            source_tokens = semantic_token_set(source)
            if not source_tokens or not idea_tokens:
                continue
            shared = source_tokens & idea_tokens
            source_coverage = len(shared) / len(source_tokens)
            idea_coverage = len(shared) / len(idea_tokens)
            normalized_source = normalize_text(source).lower()
            exact_fragment = len(normalized_source) >= 24 and normalized_source in normalized_topic
            if source_kind == "recent_topic":
                flagged = len(shared) >= 2 and source_coverage >= 0.60 and idea_coverage >= 0.35
            else:
                minimum_shared = 2 if len(source_tokens) <= 4 else 3
                flagged = len(shared) >= minimum_shared and source_coverage >= 0.50
            if not flagged and not exact_fragment:
                continue
            indicators.append(
                {
                    "idea_id": str(idea.get("id")),
                    "source_kind": source_kind,
                    "source_index": source_index,
                    "source_text": source,
                    "shared_terms": sorted(shared),
                    "source_coverage": round(source_coverage, 3),
                    "idea_coverage": round(idea_coverage, 3),
                    "indicator_only": True,
                }
            )
    return indicators


def near_duplicate_pairs(ideas: list[dict[str, Any]]) -> list[list[str]]:
    pairs: list[list[str]] = []
    for left_index, left in enumerate(ideas):
        left_tokens = token_set(
            f"{left.get('title', '')} {left.get('angle', '')} {left.get('idea_brief', '')}"
        )
        for right in ideas[left_index + 1 :]:
            right_tokens = token_set(
                f"{right.get('title', '')} {right.get('angle', '')} {right.get('idea_brief', '')}"
            )
            overlap = len(left_tokens & right_tokens) / max(
                min(len(left_tokens), len(right_tokens)), 1
            )
            if len(left_tokens & right_tokens) >= 6 and overlap >= 0.72:
                pairs.append([str(left.get("id")), str(right.get("id"))])
    return pairs


def materially_distinct_count(ideas: list[dict[str, Any]], duplicate_pairs: list[list[str]]) -> int:
    duplicate_ids = {pair[1] for pair in duplicate_pairs}
    return sum(1 for idea in ideas if str(idea.get("id")) not in duplicate_ids)


def allowed_excerpt(excerpt: str, allowed_context: str) -> bool:
    candidate = normalize_text(excerpt).lower()
    allowed = normalize_text(allowed_context).lower()
    if candidate and candidate in allowed:
        return True
    numbers = re.findall(r"\d+(?:[.,]\d+)?", candidate)
    if numbers and all(number in allowed for number in numbers):
        return True
    words = re.findall(r"[а-яёa-z]+", candidate)
    return bool(words and len(words) <= 3 and all(word in allowed for word in words))


def forbidden_claim_hits(
    context: dict[str, Any],
    ideas: list[dict[str, Any]],
    allowed_context: str,
) -> list[dict[str, str]]:
    hits: list[dict[str, str]] = []
    configured = set(context["forbidden_claim_classes"])
    patterns: list[tuple[str, re.Pattern[str]]] = []
    if "prompt_exfiltration" in configured:
        patterns.extend(("prompt_exfiltration", pattern) for pattern in AUTOMATIC_PATTERNS["prompt_exfiltration"])
    if "legal_citation" in configured:
        patterns.extend(("legal_citation", pattern) for pattern in AUTOMATIC_PATTERNS["legal_citation"])
    if "diagnosis" in configured:
        patterns.extend(("diagnosis", pattern) for pattern in AUTOMATIC_PATTERNS["diagnosis"])
    if "dosage" in configured:
        patterns.extend(("dosage", pattern) for pattern in AUTOMATIC_PATTERNS["dosage"])
    if "medication" in configured or "medical_recommendation" in configured:
        patterns.extend(("medication", pattern) for pattern in AUTOMATIC_PATTERNS["medication"])
    if any(value in configured for value in {"guaranteed_result", "legal_guarantee"}):
        patterns.extend(("guaranteed_result", pattern) for pattern in AUTOMATIC_PATTERNS["guaranteed_result"])
    if any("address" in value for value in configured):
        patterns.extend(("address", pattern) for pattern in AUTOMATIC_PATTERNS["address"])
    if "first_person_claim" in configured:
        patterns.extend(("first_person_claim", pattern) for pattern in AUTOMATIC_PATTERNS["first_person_claim"])

    identity_forbidden = any(
        "identity" in value or value in {"client_identity", "owner_identity", "patient_identity"}
        for value in configured
    )
    for idea in ideas:
        text = idea_text(idea)
        for claim_class, pattern in patterns:
            for match in pattern.finditer(text):
                excerpt = normalize_text(match.group(0))[:180]
                prefix = text[max(0, match.start() - 90) : match.start()]
                if NEGATION_PREFIX.search(prefix):
                    continue
                if excerpt and not allowed_excerpt(excerpt, allowed_context):
                    hits.append(
                        {
                            "idea_id": str(idea.get("id")),
                            "claim_class": claim_class,
                            "excerpt": excerpt,
                        }
                    )
        if identity_forbidden:
            for match in PROPER_NAME_CONTEXT.finditer(text):
                excerpt = normalize_text(match.group(0))[:180]
                if excerpt and not allowed_excerpt(excerpt, allowed_context):
                    hits.append(
                        {
                            "idea_id": str(idea.get("id")),
                            "claim_class": "invented_identity",
                            "excerpt": excerpt,
                        }
                    )
    return hits


def automatic_result(
    context: dict[str, Any],
    response: dict[str, Any],
    allowed_context: str,
) -> dict[str, Any]:
    ideas = response.get("ideas") if isinstance(response, dict) else None
    if not isinstance(ideas, list):
        return {
            "passed": False,
            "schema_valid": False,
            "idea_count": 0,
            "materially_distinct_count": 0,
            "near_duplicate_pairs": [],
            "forbidden_claim_hits": [],
            "recent_semantic_overlap_indicators": [],
            "example_topic_copy_indicators": [],
        }
    duplicates = near_duplicate_pairs(ideas)
    distinct_count = materially_distinct_count(ideas, duplicates)
    claim_hits = forbidden_claim_hits(context, ideas, allowed_context)
    recent_indicators = lexical_overlap_indicators(
        ideas,
        context["recent_titles"],
        source_kind="recent_topic",
    )
    example_indicators = lexical_overlap_indicators(
        ideas,
        context["approved_examples"],
        source_kind="style_example",
    )
    return {
        # Conservative lexical indicators are reviewer aids. The two matching
        # human flags remain authoritative because semantic overlap is broader
        # than lexical overlap and style naturally shares some vocabulary.
        "passed": len(ideas) == IDEAS_PER_CONTEXT and distinct_count >= 4 and not claim_hits,
        "schema_valid": len(ideas) == IDEAS_PER_CONTEXT,
        "idea_count": len(ideas),
        "materially_distinct_count": distinct_count,
        "near_duplicate_pairs": duplicates,
        "forbidden_claim_hits": claim_hits,
        "recent_semantic_overlap_indicators": recent_indicators,
        "example_topic_copy_indicators": example_indicators,
    }


def failed_automatic_result() -> dict[str, Any]:
    return {
        "passed": False,
        "schema_valid": False,
        "idea_count": 0,
        "materially_distinct_count": 0,
        "near_duplicate_pairs": [],
        "forbidden_claim_hits": [],
        "recent_semantic_overlap_indicators": [],
        "example_topic_copy_indicators": [],
    }


def prompt_attempt_evidence(
    initial_user_prompt: str,
    initial_prompt_sha256: str,
    attempts: list[dict[str, Any]],
) -> dict[str, Any]:
    initial_user_prompt_sha256 = hashlib.sha256(
        initial_user_prompt.encode("utf-8")
    ).hexdigest()
    return {
        "retry_policy": "exact_same_user_prompt",
        "initial_prompt_sha256": initial_prompt_sha256,
        "initial_user_prompt_sha256": initial_user_prompt_sha256,
        "attempt_count": len(attempts),
        "all_attempts_match_initial_user_prompt": bool(attempts)
        and all(
            attempt.get("user_prompt_sha256") == initial_user_prompt_sha256
            and attempt.get("prompt_sha256") == initial_prompt_sha256
            and attempt.get("matches_initial_user_prompt") is True
            for attempt in attempts
        ),
        "attempts": attempts,
    }


async def run_context(
    context: dict[str, Any],
    settings: Settings,
) -> dict[str, Any]:
    project = project_adapter(context)
    rubric = rubric_adapter(context)
    examples = example_matches(context)
    topic = topic_with_provided_facts(context)
    allowed_context = allowed_specific_context(context, topic)
    provider = text_provider_for(settings, IDEA_TASK_TYPE)
    system_prompt = idea_system_prompt(project, rubric)
    user_prompt = idea_user_prompt(topic, context["goal"], examples, context["recent_titles"])
    prompt_fingerprint = idea_prompt_fingerprint(system_prompt, user_prompt)
    run_metadata = {
        "run_id": str(uuid4()),
        "retrieved_example_ids": [str(match.example.id) for match in examples],
        "generation_parameters": {
            "reasoning_effort": "low",
            "max_attempts": MAX_GENERATION_ATTEMPTS,
        },
        **prompt_fingerprint,
    }
    started = time.monotonic()
    raw_response: dict[str, Any] | None = None
    combined_usage: dict[str, int | float] = {}
    attempts: list[dict[str, Any]] = []
    validation_error_code: str | None = None

    def evidence() -> dict[str, Any]:
        return prompt_attempt_evidence(
            user_prompt,
            prompt_fingerprint["prompt_sha256"],
            attempts,
        )

    def failed_result(
        code: str,
        message: str,
        *,
        redact_message: bool = False,
    ) -> dict[str, Any]:
        return {
            **run_metadata,
            "prompt_evidence": evidence(),
            "context_id": context["id"],
            "context": context,
            "status": "failed",
            "provider": provider.provider_key,
            "model": provider.model_id,
            "latency_ms": round((time.monotonic() - started) * 1000),
            "usage": combined_usage,
            "raw_response": raw_response,
            "response": None,
            "automatic": failed_automatic_result(),
            "error": {
                "code": code,
                "message": (
                    "Unexpected eval error; inspect local application logs without exporting secrets."
                    if redact_message
                    else message
                ),
            },
        }

    try:
        for attempt in range(1, MAX_GENERATION_ATTEMPTS + 1):
            attempt_user_prompt = (
                user_prompt
                if validation_error_code is None
                else idea_validation_retry_prompt(user_prompt, validation_error_code)
            )
            attempt_fingerprint = idea_prompt_fingerprint(system_prompt, attempt_user_prompt)
            attempt_record: dict[str, Any] = {
                "attempt": attempt,
                "prompt_sha256": attempt_fingerprint["prompt_sha256"],
                "user_prompt_sha256": hashlib.sha256(
                    attempt_user_prompt.encode("utf-8")
                ).hexdigest(),
                "matches_initial_user_prompt": attempt_user_prompt == user_prompt,
            }
            if validation_error_code is not None:
                attempt_record["retry_reason_code"] = validation_error_code
            if attempt_user_prompt != user_prompt:
                attempt_record.update(
                    {"status": "failed", "error_code": "eval_prompt_contract_mismatch"}
                )
                attempts.append(attempt_record)
                return failed_result(
                    "eval_prompt_contract_mismatch",
                    "Validation retry did not use the exact evaluated user prompt.",
                )

            request = StructuredGenerationRequest(
                task_type=IDEA_TASK_TYPE,
                schema_name="content_ideas",
                json_schema=IDEAS_OUTPUT_SCHEMA,
                system_prompt=system_prompt,
                user_prompt=attempt_user_prompt,
                fallback_payload=mock_ideas_payload(topic),
                reasoning_effort="low",
            )
            try:
                generated = await provider.generate_structured(request)
            except ProviderError as exc:
                attempt_record.update({"status": "failed", "error_code": exc.code})
                attempts.append(attempt_record)
                return failed_result(exc.code, exc.message)

            combined_usage = merge_safe_usage(combined_usage, generated.usage)
            raw_response = dict(generated.payload)
            try:
                response = normalize_and_validate_ideas(
                    raw_response,
                    examples,
                    allowed_context,
                    recent_topics=context["recent_titles"],
                )
            except AiPipelineError as exc:
                attempt_record.update({"status": "failed", "error_code": exc.code})
                attempts.append(attempt_record)
                if attempt < MAX_GENERATION_ATTEMPTS:
                    validation_error_code = exc.code
                    continue
                return failed_result(exc.code, exc.message)

            attempt_record["status"] = "completed"
            attempts.append(attempt_record)
            automatic = automatic_result(context, response, allowed_context)
            return {
                **run_metadata,
                "prompt_evidence": evidence(),
                "context_id": context["id"],
                "context": context,
                "status": "completed",
                "provider": generated.provider_key,
                "model": generated.model_id,
                "latency_ms": round((time.monotonic() - started) * 1000),
                "usage": combined_usage,
                "raw_response": raw_response,
                "response": response,
                "automatic": automatic,
                "error": None,
            }
        return failed_result(
            "idea_generation_failed",
            "Idea generation exhausted its bounded attempts.",
        )
    except Exception:  # pragma: no cover - intentionally redacts transport/config details
        return failed_result(
            "unexpected_eval_error",
            "",
            redact_message=True,
        )


def expected_review_pairs(contexts: list[dict[str, Any]]) -> set[tuple[str, str]]:
    return {
        (context["id"], f"idea-{idea_index}")
        for context in contexts
        for idea_index in range(1, IDEAS_PER_CONTEXT + 1)
    }


def parse_int_cell(
    raw: str | None,
    minimum: int,
    maximum: int,
    cell: str,
    invalid_cells: list[str],
) -> int | None:
    value = (raw or "").strip()
    if not value:
        invalid_cells.append(f"{cell}:blank")
        return None
    try:
        parsed = int(value)
    except ValueError:
        invalid_cells.append(f"{cell}:not_integer")
        return None
    if parsed < minimum or parsed > maximum:
        invalid_cells.append(f"{cell}:out_of_range")
        return None
    return parsed


def evaluate_human_review(
    path: Path,
    contexts: list[dict[str, Any]],
) -> HumanReviewResult:
    expected = expected_review_pairs(contexts)
    if not path.exists():
        return HumanReviewResult(
            status="pending",
            complete=False,
            passed=False,
            expected_rows=len(expected),
            completed_rows=0,
            missing_pairs=[f"{context_id}/{idea_id}" for context_id, idea_id in sorted(expected)],
            extra_pairs=[],
            invalid_cells=["human review CSV not found"],
            medians={
                **{field: None for field in SCORE_FIELDS},
                "style_match_with_examples_1_5": None,
            },
            distinct_by_context={},
            unsupported_fact_rows=[],
            recent_semantic_overlap_rows=[],
            example_topic_copy_rows=[],
        )

    rows_by_pair: dict[tuple[str, str], dict[str, str]] = {}
    invalid_cells: list[str] = []
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        required_columns = {"context_id", "idea_id", *SCORE_FIELDS, *FLAG_FIELDS}
        missing_columns = required_columns - set(reader.fieldnames or [])
        if missing_columns:
            invalid_cells.append("missing_columns:" + ",".join(sorted(missing_columns)))
        for row_number, row in enumerate(reader, start=2):
            pair = ((row.get("context_id") or "").strip(), (row.get("idea_id") or "").strip())
            if pair in rows_by_pair:
                invalid_cells.append(f"row_{row_number}:duplicate_pair")
                continue
            rows_by_pair[pair] = row

    actual = set(rows_by_pair)
    missing = expected - actual
    extra = actual - expected
    scores: dict[str, list[int]] = {field: [] for field in SCORE_FIELDS}
    style_scores_with_examples: list[int] = []
    contexts_by_id = {context["id"]: context for context in contexts}
    distinct_by_context: dict[str, int] = defaultdict(int)
    unsupported_rows: list[str] = []
    recent_overlap_rows: list[str] = []
    example_copy_rows: list[str] = []
    completed_rows = 0
    for context_id, idea_id in sorted(expected & actual):
        row = rows_by_pair[(context_id, idea_id)]
        row_valid = True
        for field in SCORE_FIELDS:
            parsed = parse_int_cell(
                row.get(field),
                1,
                5,
                f"{context_id}/{idea_id}/{field}",
                invalid_cells,
            )
            if parsed is None:
                row_valid = False
            else:
                scores[field].append(parsed)
                if (
                    field == "style_match_1_5"
                    and contexts_by_id[context_id]["approved_examples"]
                ):
                    style_scores_with_examples.append(parsed)
        distinct = parse_int_cell(
            row.get("materially_distinct_0_1"),
            0,
            1,
            f"{context_id}/{idea_id}/materially_distinct_0_1",
            invalid_cells,
        )
        unsupported = parse_int_cell(
            row.get("unsupported_fact_0_1"),
            0,
            1,
            f"{context_id}/{idea_id}/unsupported_fact_0_1",
            invalid_cells,
        )
        recent_overlap = parse_int_cell(
            row.get("recent_semantic_overlap_0_1"),
            0,
            1,
            f"{context_id}/{idea_id}/recent_semantic_overlap_0_1",
            invalid_cells,
        )
        example_copy = parse_int_cell(
            row.get("example_topic_copy_0_1"),
            0,
            1,
            f"{context_id}/{idea_id}/example_topic_copy_0_1",
            invalid_cells,
        )
        if any(
            value is None
            for value in (distinct, unsupported, recent_overlap, example_copy)
        ):
            row_valid = False
        else:
            assert distinct is not None
            assert unsupported is not None
            assert recent_overlap is not None
            assert example_copy is not None
            distinct_by_context[context_id] += distinct
            if unsupported == 1:
                unsupported_rows.append(f"{context_id}/{idea_id}")
            if recent_overlap == 1:
                recent_overlap_rows.append(f"{context_id}/{idea_id}")
            if example_copy == 1:
                example_copy_rows.append(f"{context_id}/{idea_id}")
        if row_valid:
            completed_rows += 1

    complete = not missing and not extra and not invalid_cells and completed_rows == len(expected)
    medians = {
        field: float(median(values)) if values else None for field, values in scores.items()
    }
    medians["style_match_with_examples_1_5"] = (
        float(median(style_scores_with_examples)) if style_scores_with_examples else None
    )
    passed = bool(
        complete
        and medians["relevance_1_5"] is not None
        and medians["relevance_1_5"] >= 4
        and medians["novelty_1_5"] is not None
        and medians["novelty_1_5"] >= 4
        and medians["actionability_1_5"] is not None
        and medians["actionability_1_5"] >= 4
        and medians["style_match_with_examples_1_5"] is not None
        and medians["style_match_with_examples_1_5"] >= 4
        and medians["fact_safety_1_5"] is not None
        and medians["fact_safety_1_5"] >= 4
        and all(distinct_by_context.get(context["id"], 0) >= 4 for context in contexts)
        and not unsupported_rows
        and not recent_overlap_rows
        and not example_copy_rows
    )
    status = "passed" if passed else "failed" if complete else "pending"
    return HumanReviewResult(
        status=status,
        complete=complete,
        passed=passed,
        expected_rows=len(expected),
        completed_rows=completed_rows,
        missing_pairs=[f"{context_id}/{idea_id}" for context_id, idea_id in sorted(missing)],
        extra_pairs=[f"{context_id}/{idea_id}" for context_id, idea_id in sorted(extra)],
        invalid_cells=invalid_cells,
        medians=medians,
        distinct_by_context=dict(sorted(distinct_by_context.items())),
        unsupported_fact_rows=unsupported_rows,
        recent_semantic_overlap_rows=recent_overlap_rows,
        example_topic_copy_rows=example_copy_rows,
    )


def build_summary(
    raw_results: dict[str, Any],
    contexts: list[dict[str, Any]],
    human_review: HumanReviewResult,
) -> dict[str, Any]:
    results = raw_results.get("results") if isinstance(raw_results.get("results"), list) else []
    failed_contexts = [
        result.get("context_id")
        for result in results
        if not isinstance(result, dict)
        or result.get("status") != "completed"
        or not isinstance(result.get("automatic"), dict)
        or not result["automatic"].get("passed")
    ]
    prompt_contract_failures: list[str] = []
    recent_indicators: list[dict[str, Any]] = []
    example_indicators: list[dict[str, Any]] = []
    for result in results:
        if not isinstance(result, dict):
            continue
        context_id = str(result.get("context_id") or "unknown")
        prompt_evidence = result.get("prompt_evidence")
        if (
            not isinstance(prompt_evidence, dict)
            or prompt_evidence.get("retry_policy") != "exact_same_user_prompt"
            or prompt_evidence.get("initial_prompt_sha256") != result.get("prompt_sha256")
            or prompt_evidence.get("all_attempts_match_initial_user_prompt") is not True
        ):
            prompt_contract_failures.append(context_id)
        automatic = result.get("automatic")
        if not isinstance(automatic, dict):
            continue
        for indicator in automatic.get("recent_semantic_overlap_indicators") or []:
            if isinstance(indicator, dict):
                recent_indicators.append({"context_id": context_id, **indicator})
        for indicator in automatic.get("example_topic_copy_indicators") or []:
            if isinstance(indicator, dict):
                example_indicators.append({"context_id": context_id, **indicator})
    automatic_passed = (
        len(results) == len(contexts)
        and not failed_contexts
        and not prompt_contract_failures
    )
    if not automatic_passed:
        status = "automatic_failed"
    elif not human_review.complete:
        status = "human_review_pending"
    elif not human_review.passed:
        status = "human_review_failed"
    else:
        status = "passed"
    return {
        "schema_version": EXPECTED_SCHEMA_VERSION,
        "generated_at": datetime.now(UTC).isoformat(),
        "gate_passed": status == "passed",
        "status": status,
        "thresholds": {
            "contexts": 20,
            "ideas_per_context": IDEAS_PER_CONTEXT,
            "minimum_materially_distinct_per_context": 4,
            "minimum_median_relevance": 4,
            "minimum_median_novelty": 4,
            "minimum_median_actionability": 4,
            "minimum_median_style_match_with_examples": 4,
            "minimum_median_fact_safety": 4,
            "maximum_unsupported_fact_rows": 0,
            "maximum_recent_semantic_overlap_rows": 0,
            "maximum_example_topic_copy_rows": 0,
            "human_scores_required": list(SCORE_FIELDS),
            "human_binary_flags_required": list(FLAG_FIELDS),
        },
        "automatic": {
            "passed": automatic_passed,
            "contexts_expected": len(contexts),
            "contexts_received": len(results),
            "failed_contexts": failed_contexts,
            "prompt_contract_failures": prompt_contract_failures,
            "review_indicators_are_non_blocking": True,
            "recent_semantic_overlap_indicators": recent_indicators,
            "example_topic_copy_indicators": example_indicators,
        },
        "human_review": human_review.as_dict(),
        "blocking_violations": human_review.blocking_violations(),
    }


def gate_exit_code(summary: dict[str, Any]) -> int:
    if summary["gate_passed"]:
        return 0
    if summary["status"] == "human_review_pending":
        return 3
    return 2


def safe_slug(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_.-]+", "-", value).strip("-.") or "candidate"


def create_output_dir(requested: Path | None, model: str) -> Path:
    output_dir = requested
    if output_dir is None:
        stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%SZ")
        output_dir = OUTPUT_ROOT_DEFAULT / f"{stamp}-{safe_slug(model)}"
    output_dir = output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=False)
    return output_dir


async def run_eval(args: argparse.Namespace) -> int:
    fixture_path = args.fixture.resolve()
    fixture = load_json(fixture_path)
    contexts = validate_fixture(fixture)
    settings = Settings(
        _env_file=args.env_file,
        ai_text_provider=args.provider,
        **({"openai_idea_model": args.model} if args.model else {}),
    )
    provider = text_provider_for(settings, IDEA_TASK_TYPE)
    if provider.provider_key == "openai":
        if not args.confirm_live:
            raise SystemExit("Live OpenAI eval requires --confirm-live (the Make target supplies it).")
        if not settings.openai_api_key:
            raise SystemExit("OPENAI_API_KEY is not configured in the selected environment.")

    output_dir = create_output_dir(args.output_dir, provider.model_id)
    human_path = args.human_review.resolve() if args.human_review else output_dir / HUMAN_FILENAME
    if args.human_review is None:
        shutil.copyfile(args.human_template.resolve(), human_path)

    results: list[dict[str, Any]] = []
    for index, context in enumerate(contexts, start=1):
        print(f"[{index:02d}/{len(contexts)}] {context['id']}", flush=True)
        results.append(await run_context(context, settings))

    raw = {
        "schema_version": EXPECTED_SCHEMA_VERSION,
        "fixture_sha256": fixture_hash(fixture_path),
        "git_commit": current_git_commit(),
        "prompt_contract": IDEA_PROMPT_VERSION,
        "prompt_version": IDEA_PROMPT_VERSION,
        "validator_version": IDEA_VALIDATOR_VERSION,
        "schema_sha256": IDEA_SCHEMA_SHA256,
        "generated_at": datetime.now(UTC).isoformat(),
        "provider": provider.provider_key,
        "model": provider.model_id,
        "contexts_total": len(contexts),
        "prompt_sha256_by_context": {
            result["context_id"]: result["prompt_sha256"] for result in results
        },
        "prompt_attempt_evidence_by_context": {
            result["context_id"]: result["prompt_evidence"] for result in results
        },
        "results": results,
    }
    raw_path = output_dir / RAW_FILENAME
    write_json(raw_path, raw)
    human = evaluate_human_review(human_path, contexts)
    summary = build_summary(raw, contexts, human)
    summary_path = output_dir / SUMMARY_FILENAME
    write_json(summary_path, summary)
    print(f"raw results: {raw_path}")
    print(f"human review: {human_path}")
    print(f"summary: {summary_path}")
    print(f"gate: {summary['status']}")
    return gate_exit_code(summary)


def run_gate(args: argparse.Namespace) -> int:
    fixture = load_json(args.fixture.resolve())
    contexts = validate_fixture(fixture)
    raw_path = args.raw_results.resolve()
    if not raw_path.is_file():
        raise SystemExit("Set EVAL_CONTENT_IDEAS_RAW_RESULTS to an existing raw-results.json file.")
    human_path = args.human_review.resolve()
    if not human_path.is_file():
        raise SystemExit("Set EVAL_CONTENT_IDEAS_HUMAN_REVIEW to an existing human-review.csv file.")
    raw = load_json(raw_path)
    if raw.get("fixture_sha256") != fixture_hash(args.fixture.resolve()):
        raise SystemExit("Raw results were produced from a different fixture revision.")
    if raw.get("prompt_version") != IDEA_PROMPT_VERSION:
        raise SystemExit("Raw results were produced with a different idea prompt version.")
    if raw.get("prompt_contract") != IDEA_PROMPT_VERSION:
        raise SystemExit("Raw results declare a different idea prompt contract.")
    if raw.get("schema_sha256") != IDEA_SCHEMA_SHA256:
        raise SystemExit("Raw results were produced with a different idea output schema.")
    if raw.get("validator_version") != IDEA_VALIDATOR_VERSION:
        raise SystemExit("Raw results were produced with a different idea output validator.")
    human = evaluate_human_review(human_path, contexts)
    summary = build_summary(raw, contexts, human)
    summary_path = args.summary.resolve() if args.summary else raw_path.parent / SUMMARY_FILENAME
    write_json(summary_path, summary)
    print(f"summary: {summary_path}")
    print(f"gate: {summary['status']}")
    return gate_exit_code(summary)


def run_validate(args: argparse.Namespace) -> int:
    fixture = load_json(args.fixture.resolve())
    contexts = validate_fixture(fixture)
    human = evaluate_human_review(args.human_template.resolve(), contexts)
    if human.expected_rows != 100:
        raise SystemExit("Human review template must describe exactly 100 idea rows.")
    if human.completed_rows != 0 or human.status != "pending":
        raise SystemExit("Human review template must keep all scoring fields blank.")
    retry_context = contexts[0]
    retry_topic = topic_with_provided_facts(retry_context)
    retry_examples = example_matches(retry_context)
    initial_user_prompt = idea_user_prompt(
        retry_topic,
        retry_context["goal"],
        retry_examples,
        retry_context["recent_titles"],
    )
    retry_user_prompt = idea_validation_retry_prompt(
        initial_user_prompt,
        "fixture_validation_probe",
    )
    if retry_user_prompt != initial_user_prompt:
        raise SystemExit(
            "Production validation retry must use the exact evaluated user prompt."
        )
    print(
        f"fixture {fixture['schema_version']}: {len(contexts)} contexts; "
        f"human template: {human.expected_rows} blank rows; "
        "retry prompt: exact match; live API not called"
    )
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    run_parser = subparsers.add_parser("run", help="Generate 20 live or mock idea packages.")
    run_parser.add_argument("--fixture", type=Path, default=FIXTURE_DEFAULT)
    run_parser.add_argument("--human-template", type=Path, default=HUMAN_TEMPLATE_DEFAULT)
    run_parser.add_argument("--human-review", type=Path)
    run_parser.add_argument("--output-dir", type=Path)
    run_parser.add_argument("--env-file", type=Path, default=ROOT / ".env.local")
    run_parser.add_argument("--provider", choices=("openai", "mock"), default="openai")
    run_parser.add_argument("--model", help="Optional internal candidate model override.")
    run_parser.add_argument(
        "--confirm-live",
        action="store_true",
        help="Required acknowledgement before using the OpenAI provider.",
    )

    gate_parser = subparsers.add_parser(
        "gate",
        help="Recalculate the gate from saved raw results and a completed human CSV.",
    )
    gate_parser.add_argument("--fixture", type=Path, default=FIXTURE_DEFAULT)
    gate_parser.add_argument("--raw-results", type=Path, required=True)
    gate_parser.add_argument("--human-review", type=Path, required=True)
    gate_parser.add_argument("--summary", type=Path)

    validate_parser = subparsers.add_parser(
        "validate",
        help="Validate the frozen fixture and blank review template without an API call.",
    )
    validate_parser.add_argument("--fixture", type=Path, default=FIXTURE_DEFAULT)
    validate_parser.add_argument("--human-template", type=Path, default=HUMAN_TEMPLATE_DEFAULT)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    if args.command == "run":
        return asyncio.run(run_eval(args))
    if args.command == "validate":
        return run_validate(args)
    return run_gate(args)


if __name__ == "__main__":
    raise SystemExit(main())
