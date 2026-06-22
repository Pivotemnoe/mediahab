from __future__ import annotations

from dataclasses import dataclass
from typing import Any
from urllib.parse import quote
from uuid import UUID, uuid4

import boto3
import httpx
from botocore.client import BaseClient
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError
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


class ContentProviderError(RuntimeError):
    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code
        self.message = message


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


def normalize_storage_prefix(storage_prefix: str) -> str:
    return "/".join(
        segment
        for segment in storage_prefix.replace("\\", "/").strip().split("/")
        if segment
    )


def make_storage_key(
    workspace_id: UUID, media_id: UUID, filename: str, storage_prefix: str = ""
) -> str:
    safe_name = filename.replace("/", "_").replace("\\", "_") or "upload.bin"
    scoped_key = f"workspaces/{workspace_id}/media/{media_id}/{safe_name}"
    prefix = normalize_storage_prefix(storage_prefix)
    if not prefix:
        return scoped_key
    return f"{prefix}/{scoped_key}"


def make_mock_presigned_upload_url(settings: Settings, storage_key: str) -> str:
    base = settings.media_public_base_url.rstrip("/")
    bucket = quote(settings.media_bucket)
    key = quote(storage_key)
    return (
        f"{base}/{bucket}/{key}"
        f"?X-Amz-Mock-Expires={settings.media_presign_ttl_seconds}"
        "&X-Amz-Mock-SignedHeaders=content-type"
    )


def make_s3_client(settings: Settings, endpoint_url: str | None = None) -> BaseClient:
    return boto3.client(
        "s3",
        endpoint_url=endpoint_url or settings.s3_endpoint_url or settings.s3_public_base_url,
        region_name=settings.s3_region,
        aws_access_key_id=settings.s3_access_key_id,
        aws_secret_access_key=settings.s3_secret_access_key,
        config=Config(
            signature_version="s3v4",
            s3={"addressing_style": "path" if settings.s3_force_path_style else "auto"},
        ),
    )


def make_presigned_upload_url(settings: Settings, storage_key: str, mime_type: str) -> str:
    if not settings.s3_upload_enabled:
        return make_mock_presigned_upload_url(settings, storage_key)
    client = make_s3_client(settings, endpoint_url=settings.s3_endpoint_url)
    try:
        return str(
            client.generate_presigned_url(
                ClientMethod="put_object",
                Params={
                    "Bucket": settings.resolved_media_bucket,
                    "Key": storage_key,
                    "ContentType": mime_type,
                },
                ExpiresIn=settings.media_presign_ttl_seconds,
                HttpMethod="PUT",
            )
        )
    except (BotoCoreError, ClientError) as exc:
        raise ContentProviderError(
            "s3_presign_failed",
            "S3 presigned upload URL could not be generated.",
        ) from exc


def fetch_s3_object_bytes(settings: Settings, media: MediaAsset) -> bytes:
    if not settings.s3_download_enabled:
        raise ContentProviderError(
            "s3_not_configured",
            "S3 storage is not configured for server-side media reads.",
        )
    client = make_s3_client(
        settings,
        endpoint_url=settings.s3_endpoint_url or settings.s3_public_base_url,
    )
    try:
        response = client.get_object(Bucket=media.bucket, Key=media.storage_key)
    except (BotoCoreError, ClientError) as exc:
        raise ContentProviderError(
            "s3_object_unavailable",
            "S3 object could not be read for transcription.",
        ) from exc
    body = response["Body"]
    try:
        return bytes(body.read())
    finally:
        close = getattr(body, "close", None)
        if callable(close):
            close()


async def transcribe_with_openai(
    settings: Settings,
    media: MediaAsset,
    audio_bytes: bytes,
) -> tuple[str, dict[str, Any]]:
    if not settings.openai_api_key:
        raise ContentProviderError(
            "openai_not_configured",
            "OPENAI_API_KEY is not configured.",
        )
    endpoint = f"{settings.openai_base_url.rstrip('/')}/audio/transcriptions"
    data: dict[str, str] = {
        "model": settings.openai_stt_model,
        "response_format": "json",
    }
    if settings.openai_stt_language:
        data["language"] = settings.openai_stt_language
    files = {
        "file": (
            media.storage_key.rsplit("/", 1)[-1] or "audio.webm",
            audio_bytes,
            media.mime_type,
        )
    }
    try:
        async with httpx.AsyncClient(timeout=settings.openai_stt_timeout_seconds) as client:
            response = await client.post(
                endpoint,
                headers={"Authorization": f"Bearer {settings.openai_api_key}"},
                data=data,
                files=files,
            )
    except httpx.HTTPError as exc:
        raise ContentProviderError(
            "openai_request_failed",
            "OpenAI STT request failed before a response was received.",
        ) from exc
    if response.status_code >= 400:
        raise ContentProviderError(
            "openai_request_failed",
            f"OpenAI STT returned HTTP {response.status_code}.",
        )
    try:
        payload = response.json()
    except ValueError as exc:
        raise ContentProviderError(
            "openai_invalid_response",
            "OpenAI STT response was not valid JSON.",
        ) from exc
    text = payload.get("text")
    if not isinstance(text, str) or not text.strip():
        raise ContentProviderError(
            "openai_empty_transcript",
            "OpenAI STT response did not contain transcript text.",
        )
    return text.strip(), {
        "provider": "openai",
        "model": settings.openai_stt_model,
        "usage": payload.get("usage"),
    }


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
