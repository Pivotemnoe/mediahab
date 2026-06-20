from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from urllib.parse import quote
from uuid import UUID, uuid4

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.db.base import (
    ContentBlock,
    ContentItem,
    ContentMedia,
    ContentRevision,
    LockedFact,
    MediaAsset,
    Project,
    ProjectVersion,
    Rubric,
    RubricVersion,
    TranscriptionRun,
    VoiceAsset,
    utc_now,
)


CONTENT_MUTATION_ROLES = {"owner", "admin", "editor"}
READ_ROLES = {"owner", "admin", "editor", "viewer"}


@dataclass
class ContentCreateContext:
    project: Project
    project_version: ProjectVersion
    rubric: Rubric
    rubric_version: RubricVersion


def fact_key_for_block(block: ContentBlock) -> str:
    if block.group_key is not None and block.group_index is not None:
        return f"{block.group_key}[{block.group_index}].{block.field_key}"
    return block.field_key


def text_from_value(value: Any) -> str:
    if isinstance(value, dict) and "text" in value:
        return str(value["text"])
    if isinstance(value, str):
        return value
    return ""


def guided_form_from_rubric(version: RubricVersion) -> dict[str, Any]:
    ui_schema = dict(version.ui_schema or {})
    fields = list(ui_schema.get("fields", []))
    generated = list(version.generated_fields or [])
    generated_set = set(generated)
    return {
        "rubric_version_id": version.id,
        "json_schema": version.source_payload.get("json_schema")
        if isinstance(version.source_payload, dict) and version.source_payload.get("json_schema")
        else None,
        "ui_schema": {
            **ui_schema,
            "fields": [field for field in fields if field.get("key") not in generated_set],
        },
        "generated_fields": generated,
        "editorial_limits": {
            "min_chars": version.editorial_min_chars,
            "max_chars": version.editorial_max_chars,
        },
    }


async def resolve_content_create_context(
    session: AsyncSession,
    project_id: UUID,
    rubric_id: UUID,
) -> ContentCreateContext | None:
    row = (
        await session.execute(
            select(Project, ProjectVersion, Rubric, RubricVersion)
            .join(ProjectVersion, ProjectVersion.id == Project.active_version_id)
            .join(Rubric, Rubric.project_id == Project.id)
            .join(RubricVersion, RubricVersion.id == Rubric.active_version_id)
            .where(
                Project.id == project_id,
                Project.deleted_at.is_(None),
                Rubric.id == rubric_id,
                Rubric.status == "active",
            )
        )
    ).first()
    if row is None:
        return None
    project, project_version, rubric, rubric_version = row
    return ContentCreateContext(
        project=project,
        project_version=project_version,
        rubric=rubric,
        rubric_version=rubric_version,
    )


async def active_content_item(session: AsyncSession, content_id: UUID) -> ContentItem | None:
    return await session.scalar(
        select(ContentItem).where(ContentItem.id == content_id, ContentItem.deleted_at.is_(None))
    )


async def content_item_rubric_version(
    session: AsyncSession,
    item: ContentItem,
) -> RubricVersion:
    version = await session.get(RubricVersion, item.rubric_version_id)
    assert version is not None
    return version


async def next_content_revision_number(session: AsyncSession, content_id: UUID) -> int:
    latest = await session.scalar(
        select(func.max(ContentRevision.revision_number)).where(
            ContentRevision.content_item_id == content_id
        )
    )
    return int(latest or 0) + 1


async def write_content_revision(
    session: AsyncSession,
    item: ContentItem,
    actor_user_id: UUID,
    revision_type: str,
    structured_document: dict[str, Any],
    text: str = "",
) -> ContentRevision:
    revision = ContentRevision(
        id=uuid4(),
        workspace_id=item.workspace_id,
        content_item_id=item.id,
        revision_number=await next_content_revision_number(session, item.id),
        revision_type=revision_type,
        text=text,
        structured_document=structured_document,
        character_count=len(text),
        created_by=actor_user_id,
        created_at=utc_now(),
    )
    session.add(revision)
    await session.flush()
    return revision


async def find_block(
    session: AsyncSession,
    item: ContentItem,
    field_key: str,
    group_key: str | None = None,
    group_index: int | None = None,
) -> ContentBlock | None:
    return await session.scalar(
        select(ContentBlock).where(
            ContentBlock.content_item_id == item.id,
            ContentBlock.field_key == field_key,
            ContentBlock.group_key == group_key,
            ContentBlock.group_index == group_index,
        )
    )


async def upsert_block(
    session: AsyncSession,
    item: ContentItem,
    actor_user_id: UUID,
    field_key: str,
    value: Any,
    source_type: str = "user_text",
    transcript_text: str | None = None,
    source_media_id: UUID | None = None,
    group_key: str | None = None,
    group_index: int | None = None,
    lock: bool = False,
) -> ContentBlock:
    now = utc_now()
    block = await find_block(session, item, field_key, group_key, group_index)
    if block is None:
        block = ContentBlock(
            id=uuid4(),
            workspace_id=item.workspace_id,
            content_item_id=item.id,
            field_key=field_key,
            group_key=group_key,
            group_index=group_index,
            source_type=source_type,
            value_json=value,
            transcript_text=transcript_text,
            is_locked=lock,
            source_media_id=source_media_id,
            revision_number=1,
            created_by=actor_user_id,
            updated_by=actor_user_id,
            created_at=now,
            updated_at=now,
        )
        session.add(block)
        await session.flush()
    else:
        block.source_type = source_type
        block.value_json = value
        block.transcript_text = transcript_text
        block.source_media_id = source_media_id
        block.updated_by = actor_user_id
        block.updated_at = now
        block.revision_number += 1
        if lock:
            block.is_locked = True
    item.updated_at = now
    item.version += 1
    if lock:
        await lock_fact(session, block, actor_user_id)
    await session.flush()
    return block


async def lock_fact(session: AsyncSession, block: ContentBlock, actor_user_id: UUID) -> LockedFact:
    key = fact_key_for_block(block)
    existing = await session.scalar(
        select(LockedFact).where(
            LockedFact.content_item_id == block.content_item_id,
            LockedFact.fact_key == key,
        )
    )
    now = utc_now()
    if existing is not None:
        existing.value_json = block.value_json
        existing.source_block_id = block.id
        existing.locked_by = actor_user_id
        existing.locked_at = now
        existing.updated_at = now
        return existing
    fact = LockedFact(
        id=uuid4(),
        workspace_id=block.workspace_id,
        content_item_id=block.content_item_id,
        fact_key=key,
        value_json=block.value_json,
        source_block_id=block.id,
        locked_by=actor_user_id,
        locked_at=now,
        created_at=now,
        updated_at=now,
    )
    session.add(fact)
    return fact


async def unlock_fact(session: AsyncSession, block: ContentBlock) -> None:
    block.is_locked = False
    await session.execute(
        delete(LockedFact).where(
            LockedFact.content_item_id == block.content_item_id,
            LockedFact.fact_key == fact_key_for_block(block),
        )
    )


async def next_group_index(session: AsyncSession, item: ContentItem, group_key: str) -> int:
    latest = await session.scalar(
        select(func.max(ContentBlock.group_index)).where(
            ContentBlock.content_item_id == item.id,
            ContentBlock.group_key == group_key,
        )
    )
    return int(latest if latest is not None else -1) + 1


def make_storage_key(workspace_id: UUID, media_id: UUID, filename: str) -> str:
    safe_name = filename.replace("/", "_").replace("\\", "_") or "upload.bin"
    return f"workspaces/{workspace_id}/media/{media_id}/{safe_name}"


def make_presigned_upload_url(settings: Settings, storage_key: str) -> str:
    base = settings.media_public_base_url.rstrip("/")
    bucket = quote(settings.media_bucket)
    key = quote(storage_key)
    return (
        f"{base}/{bucket}/{key}"
        f"?X-Amz-Mock-Expires={settings.media_presign_ttl_seconds}"
        "&X-Amz-Mock-SignedHeaders=content-type"
    )


async def attach_media_order(
    session: AsyncSession,
    item: ContentItem,
    media_items: list[dict[str, Any]],
) -> list[ContentMedia]:
    await session.execute(delete(ContentMedia).where(ContentMedia.content_item_id == item.id))
    await session.flush()
    rows: list[ContentMedia] = []
    for index, media in enumerate(media_items):
        row = ContentMedia(
            id=uuid4(),
            workspace_id=item.workspace_id,
            content_item_id=item.id,
            media_asset_id=media["media_id"],
            role=media.get("role", "body"),
            sort_order=media.get("sort_order", index),
            caption=media.get("caption"),
            crop_metadata=media.get("crop_metadata"),
            cover_metadata=media.get("cover_metadata"),
            created_at=utc_now(),
            updated_at=utc_now(),
        )
        session.add(row)
        rows.append(row)
    item.updated_at = utc_now()
    item.version += 1
    await session.flush()
    return rows


def mock_transcript_for(block: ContentBlock) -> str:
    current_text = text_from_value(block.value_json)
    if current_text:
        return current_text
    label = fact_key_for_block(block)
    return f"Моковая расшифровка для блока {label}."
