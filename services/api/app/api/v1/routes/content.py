from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.base import (
    ContentBlock,
    ContentItem,
    ContentMedia,
    InputSchema,
    MediaAsset,
    TranscriptionRun,
    VoiceAsset,
    utc_now,
)
from app.db.session import get_session
from app.modules.auth.dependencies import (
    Actor,
    get_current_actor,
    require_csrf,
    require_role,
    require_workspace_membership,
)
from app.modules.content.service import (
    CONTENT_MUTATION_ROLES,
    ContentProviderError,
    attach_media_order,
    content_item_rubric_version,
    fetch_s3_object_bytes,
    find_block,
    guided_form_from_rubric,
    lock_fact,
    make_presigned_upload_url,
    make_storage_key,
    mock_transcript_for,
    next_group_index,
    resolve_content_create_context,
    transcribe_with_openai,
    unlock_fact,
    upsert_block,
    write_content_revision,
)
from app.modules.projects.service import get_active_project
from app.modules.shared.errors import api_error

router = APIRouter()


class ContentCreateRequest(BaseModel):
    rubric_id: UUID
    title_internal: str | None = Field(default=None, max_length=200)
    assigned_to: UUID | None = None


class ContentPatchRequest(BaseModel):
    title_internal: str | None = Field(default=None, max_length=200)
    status: str | None = Field(default=None, pattern="^(draft|collecting|ready_for_ai|archived)$")
    version: int | None = None


class ContentItemOut(BaseModel):
    id: UUID
    workspace_id: UUID
    project_id: UUID
    rubric_id: UUID
    rubric_version_id: UUID
    project_version_id: UUID
    title_internal: str
    status: str
    version: int
    created_at: str
    updated_at: str


class ContentListResponse(BaseModel):
    content_items: list[ContentItemOut]


class GuidedFormResponse(BaseModel):
    content_id: UUID
    rubric_version_id: UUID
    json_schema: dict[str, Any]
    ui_schema: dict[str, Any]
    generated_fields: list[str]
    editorial_limits: dict[str, int | None]


class BlockPutRequest(BaseModel):
    value: Any
    source_type: str = Field(default="user_text", pattern="^(user_text|voice|transcription|import|ai_suggested|system)$")
    transcript_text: str | None = None
    source_media_id: UUID | None = None
    lock: bool = False
    version: int | None = None


class RepeatableGroupRequest(BaseModel):
    values: dict[str, Any] = Field(default_factory=dict)
    source_type: str = Field(default="user_text", pattern="^(user_text|voice|transcription|import|ai_suggested|system)$")
    lock: bool = False
    version: int | None = None


class BlockPatchRequest(BaseModel):
    value: Any | None = None
    source_type: str | None = Field(default=None, pattern="^(user_text|voice|transcription|import|ai_suggested|system)$")
    transcript_text: str | None = None
    source_media_id: UUID | None = None
    lock: bool | None = None


class BlockOut(BaseModel):
    id: UUID
    content_item_id: UUID
    field_key: str
    group_key: str | None
    group_index: int | None
    source_type: str
    value_json: Any
    transcript_text: str | None
    is_locked: bool
    source_media_id: UUID | None
    revision_number: int
    updated_at: str


class BlocksResponse(BaseModel):
    blocks: list[BlockOut]


class MediaPresignRequest(BaseModel):
    workspace_id: UUID
    filename: str = Field(min_length=1, max_length=240)
    kind: str = Field(pattern="^(image|video|audio|voice|document)$")
    mime_type: str = Field(min_length=3, max_length=160)
    size_bytes: int = Field(ge=0)
    checksum: str | None = Field(default=None, max_length=128)
    content_item_id: UUID | None = None


class MediaPresignResponse(BaseModel):
    media_id: UUID
    bucket: str
    storage_key: str
    upload_url: str
    method: str
    headers: dict[str, str]
    expires_in_seconds: int


class MediaCompleteRequest(BaseModel):
    size_bytes: int | None = Field(default=None, ge=0)
    checksum: str | None = Field(default=None, max_length=128)
    width: int | None = Field(default=None, ge=0)
    height: int | None = Field(default=None, ge=0)
    duration_ms: int | None = Field(default=None, ge=0)
    codec_metadata: dict[str, Any] | None = None


class MediaOut(BaseModel):
    id: UUID
    workspace_id: UUID
    storage_key: str
    bucket: str
    kind: str
    mime_type: str
    size_bytes: int
    checksum: str | None
    upload_status: str
    processing_status: str
    version: int


class MediaOrderItem(BaseModel):
    media_id: UUID
    role: str = "body"
    sort_order: int | None = None
    caption: str | None = None
    crop_metadata: dict[str, Any] | None = None
    cover_metadata: dict[str, Any] | None = None


class MediaOrderRequest(BaseModel):
    media: list[MediaOrderItem]
    version: int | None = None


class ContentMediaOut(BaseModel):
    id: UUID
    content_item_id: UUID
    media_asset_id: UUID
    role: str
    sort_order: int
    caption: str | None


class ContentMediaResponse(BaseModel):
    media: list[ContentMediaOut]


class TranscribeRequest(BaseModel):
    media_id: UUID | None = None
    provider_key: str = "default"
    mock_transcript: str | None = None


class AcceptTranscriptionRequest(BaseModel):
    corrected_text: str = Field(min_length=1)
    lock: bool = True


class TranscriptionJobOut(BaseModel):
    id: UUID
    content_item_id: UUID
    content_block_id: UUID
    media_asset_id: UUID
    provider_key: str
    status: str
    transcript_text: str | None
    corrected_text: str | None
    retry_count: int
    accepted_at: str | None


class MessageResponse(BaseModel):
    status: str
    message: str


def content_item_out(item: ContentItem) -> ContentItemOut:
    return ContentItemOut(
        id=item.id,
        workspace_id=item.workspace_id,
        project_id=item.project_id,
        rubric_id=item.rubric_id,
        rubric_version_id=item.rubric_version_id,
        project_version_id=item.project_version_id,
        title_internal=item.title_internal,
        status=item.status,
        version=item.version,
        created_at=item.created_at.isoformat(),
        updated_at=item.updated_at.isoformat(),
    )


def block_out(block: ContentBlock) -> BlockOut:
    return BlockOut(
        id=block.id,
        content_item_id=block.content_item_id,
        field_key=block.field_key,
        group_key=block.group_key,
        group_index=block.group_index,
        source_type=block.source_type,
        value_json=block.value_json,
        transcript_text=block.transcript_text,
        is_locked=block.is_locked,
        source_media_id=block.source_media_id,
        revision_number=block.revision_number,
        updated_at=block.updated_at.isoformat(),
    )


def media_out(media: MediaAsset) -> MediaOut:
    return MediaOut(
        id=media.id,
        workspace_id=media.workspace_id,
        storage_key=media.storage_key,
        bucket=media.bucket,
        kind=media.kind,
        mime_type=media.mime_type,
        size_bytes=media.size_bytes,
        checksum=media.checksum,
        upload_status=media.upload_status,
        processing_status=media.processing_status,
        version=media.version,
    )


def content_media_out(row: ContentMedia) -> ContentMediaOut:
    return ContentMediaOut(
        id=row.id,
        content_item_id=row.content_item_id,
        media_asset_id=row.media_asset_id,
        role=row.role,
        sort_order=row.sort_order,
        caption=row.caption,
    )


def transcription_out(run: TranscriptionRun) -> TranscriptionJobOut:
    return TranscriptionJobOut(
        id=run.id,
        content_item_id=run.content_item_id,
        content_block_id=run.content_block_id,
        media_asset_id=run.media_asset_id,
        provider_key=run.provider_key,
        status=run.status,
        transcript_text=run.transcript_text,
        corrected_text=run.corrected_text,
        retry_count=run.retry_count,
        accepted_at=run.accepted_at.isoformat() if run.accepted_at else None,
    )


def requested_version(request: Request, body_version: int | None) -> int | None:
    if body_version is not None:
        return body_version
    header = request.headers.get("If-Match")
    if not header:
        return None
    try:
        return int(header.strip().strip('"'))
    except ValueError:
        return None


def ensure_item_version(item: ContentItem, expected: int | None, request: Request) -> None:
    if expected is not None and expected != item.version:
        raise api_error(
            409,
            "version_conflict",
            "Content item has a newer version.",
            {"expected": expected, "actual": item.version},
            request=request,
        )


async def project_for_actor(
    project_id: UUID,
    request: Request,
    actor: Actor,
    db: AsyncSession,
):
    ctx = await get_active_project(db, project_id)
    if ctx is None:
        raise api_error(404, "project_not_found", "Project not found.", request=request)
    try:
        _, membership = await require_workspace_membership(ctx.project.workspace_id, request, actor, db)
    except HTTPException as exc:
        raise api_error(404, "project_not_found", "Project not found.", request=request) from exc
    return ctx, membership


async def item_for_actor(
    content_id: UUID,
    request: Request,
    actor: Actor,
    db: AsyncSession,
) -> tuple[ContentItem, Any]:
    item = await db.get(ContentItem, content_id)
    if item is None or item.deleted_at is not None:
        raise api_error(404, "content_not_found", "Content item not found.", request=request)
    try:
        _, membership = await require_workspace_membership(item.workspace_id, request, actor, db)
    except HTTPException as exc:
        raise api_error(404, "content_not_found", "Content item not found.", request=request) from exc
    return item, membership


async def mutable_item_for_actor(
    content_id: UUID,
    request: Request,
    actor: Actor,
    db: AsyncSession,
) -> ContentItem:
    item, membership = await item_for_actor(content_id, request, actor, db)
    require_role(membership, CONTENT_MUTATION_ROLES, request)
    return item


async def block_for_actor(
    block_id: UUID,
    request: Request,
    actor: Actor,
    db: AsyncSession,
) -> tuple[ContentBlock, ContentItem, Any]:
    block = await db.get(ContentBlock, block_id)
    if block is None:
        raise api_error(404, "block_not_found", "Content block not found.", request=request)
    item, membership = await item_for_actor(block.content_item_id, request, actor, db)
    return block, item, membership


async def mutable_block_for_actor(
    block_id: UUID,
    request: Request,
    actor: Actor,
    db: AsyncSession,
) -> tuple[ContentBlock, ContentItem]:
    block, item, membership = await block_for_actor(block_id, request, actor, db)
    require_role(membership, CONTENT_MUTATION_ROLES, request)
    return block, item


async def media_for_actor(
    media_id: UUID,
    request: Request,
    actor: Actor,
    db: AsyncSession,
) -> tuple[MediaAsset, Any]:
    media = await db.get(MediaAsset, media_id)
    if media is None or media.deleted_at is not None:
        raise api_error(404, "media_not_found", "Media asset not found.", request=request)
    try:
        _, membership = await require_workspace_membership(media.workspace_id, request, actor, db)
    except HTTPException as exc:
        raise api_error(404, "media_not_found", "Media asset not found.", request=request) from exc
    return media, membership


async def transcription_for_actor(
    job_id: UUID,
    request: Request,
    actor: Actor,
    db: AsyncSession,
) -> tuple[TranscriptionRun, ContentItem, Any]:
    run = await db.get(TranscriptionRun, job_id)
    if run is None:
        raise api_error(404, "transcription_not_found", "Transcription job not found.", request=request)
    item, membership = await item_for_actor(run.content_item_id, request, actor, db)
    return run, item, membership


@router.get("/projects/{project_id}/content-items", response_model=ContentListResponse)
async def list_content_items(
    project_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> ContentListResponse:
    ctx, _ = await project_for_actor(project_id, request, actor, db)
    rows = (
        await db.scalars(
            select(ContentItem)
            .where(ContentItem.project_id == ctx.project.id, ContentItem.deleted_at.is_(None))
            .order_by(ContentItem.updated_at.desc())
        )
    ).all()
    return ContentListResponse(content_items=[content_item_out(row) for row in rows])


@router.post("/projects/{project_id}/content-items", response_model=ContentItemOut)
async def create_content_item(
    project_id: UUID,
    payload: ContentCreateRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> ContentItemOut:
    ctx, membership = await project_for_actor(project_id, request, actor, db)
    require_role(membership, CONTENT_MUTATION_ROLES, request)
    create_ctx = await resolve_content_create_context(db, ctx.project.id, payload.rubric_id)
    if create_ctx is None:
        raise api_error(404, "rubric_not_found", "Rubric not found.", request=request)
    now = utc_now()
    item = ContentItem(
        id=uuid4(),
        workspace_id=ctx.project.workspace_id,
        project_id=ctx.project.id,
        rubric_id=create_ctx.rubric.id,
        rubric_version_id=create_ctx.rubric_version.id,
        project_version_id=create_ctx.project_version.id,
        title_internal=payload.title_internal or f"Черновик: {create_ctx.rubric_version.name}",
        status="draft",
        created_by=actor.user.id,
        assigned_to=payload.assigned_to,
        created_at=now,
        updated_at=now,
        version=1,
    )
    db.add(item)
    await db.flush()
    await write_content_revision(db, item, actor.user.id, "user_edit", {"event": "created"})
    await db.commit()
    return content_item_out(item)


@router.get("/content-items/{content_id}", response_model=ContentItemOut)
async def get_content_item(
    content_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> ContentItemOut:
    item, _ = await item_for_actor(content_id, request, actor, db)
    return content_item_out(item)


@router.patch("/content-items/{content_id}", response_model=ContentItemOut)
async def update_content_item(
    content_id: UUID,
    payload: ContentPatchRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> ContentItemOut:
    item = await mutable_item_for_actor(content_id, request, actor, db)
    ensure_item_version(item, requested_version(request, payload.version), request)
    data = payload.model_dump(exclude_none=True, exclude={"version"})
    for key, value in data.items():
        setattr(item, key, value)
    item.updated_at = utc_now()
    item.version += 1
    await write_content_revision(db, item, actor.user.id, "user_edit", {"event": "content_item_updated", **data})
    await db.commit()
    return content_item_out(item)


@router.delete("/content-items/{content_id}", response_model=MessageResponse)
async def delete_content_item(
    content_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    item = await mutable_item_for_actor(content_id, request, actor, db)
    item.deleted_at = utc_now()
    item.status = "archived"
    item.updated_at = utc_now()
    await db.commit()
    return MessageResponse(status="ok", message="Content item archived.")


@router.post("/content-items/{content_id}/clone", response_model=ContentItemOut)
async def clone_content_item(
    content_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> ContentItemOut:
    item = await mutable_item_for_actor(content_id, request, actor, db)
    now = utc_now()
    clone = ContentItem(
        id=uuid4(),
        workspace_id=item.workspace_id,
        project_id=item.project_id,
        rubric_id=item.rubric_id,
        rubric_version_id=item.rubric_version_id,
        project_version_id=item.project_version_id,
        title_internal=f"{item.title_internal} — копия",
        status="draft",
        created_by=actor.user.id,
        assigned_to=actor.user.id,
        created_at=now,
        updated_at=now,
        version=1,
    )
    db.add(clone)
    await db.flush()
    blocks = (
        await db.scalars(select(ContentBlock).where(ContentBlock.content_item_id == item.id))
    ).all()
    for block in blocks:
        await upsert_block(
            db,
            clone,
            actor.user.id,
            block.field_key,
            block.value_json,
            source_type=block.source_type,
            transcript_text=block.transcript_text,
            source_media_id=block.source_media_id,
            group_key=block.group_key,
            group_index=block.group_index,
            lock=block.is_locked,
        )
    await write_content_revision(db, clone, actor.user.id, "user_edit", {"event": "cloned_from", "source": str(item.id)})
    await db.commit()
    return content_item_out(clone)


@router.get("/content-items/{content_id}/guided-form", response_model=GuidedFormResponse)
async def get_guided_form(
    content_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> GuidedFormResponse:
    item, _ = await item_for_actor(content_id, request, actor, db)
    rubric_version = await content_item_rubric_version(db, item)
    input_schema = await db.get(InputSchema, rubric_version.input_schema_id)
    assert input_schema is not None
    form = guided_form_from_rubric(rubric_version)
    return GuidedFormResponse(
        content_id=item.id,
        rubric_version_id=rubric_version.id,
        json_schema=input_schema.json_schema,
        ui_schema=form["ui_schema"],
        generated_fields=form["generated_fields"],
        editorial_limits=form["editorial_limits"],
    )


@router.get("/content-items/{content_id}/blocks", response_model=BlocksResponse)
async def list_blocks(
    content_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> BlocksResponse:
    item, _ = await item_for_actor(content_id, request, actor, db)
    blocks = (
        await db.scalars(
            select(ContentBlock)
            .where(ContentBlock.content_item_id == item.id)
            .order_by(ContentBlock.group_key, ContentBlock.group_index, ContentBlock.field_key)
        )
    ).all()
    return BlocksResponse(blocks=[block_out(block) for block in blocks])


@router.put("/content-items/{content_id}/blocks/{field_key}", response_model=BlockOut)
async def put_block(
    content_id: UUID,
    field_key: str,
    payload: BlockPutRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> BlockOut:
    item = await mutable_item_for_actor(content_id, request, actor, db)
    ensure_item_version(item, requested_version(request, payload.version), request)
    if payload.source_media_id is not None:
        media, _ = await media_for_actor(payload.source_media_id, request, actor, db)
        if media.workspace_id != item.workspace_id:
            raise api_error(404, "media_not_found", "Media asset not found.", request=request)
    block = await upsert_block(
        db,
        item,
        actor.user.id,
        field_key,
        payload.value,
        source_type=payload.source_type,
        transcript_text=payload.transcript_text,
        source_media_id=payload.source_media_id,
        lock=payload.lock,
    )
    await write_content_revision(db, item, actor.user.id, "user_edit", {"block": field_key, "value": payload.value})
    await db.commit()
    return block_out(block)


@router.post("/content-items/{content_id}/repeatable-groups/{group_key}", response_model=BlocksResponse)
async def add_repeatable_group(
    content_id: UUID,
    group_key: str,
    payload: RepeatableGroupRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> BlocksResponse:
    item = await mutable_item_for_actor(content_id, request, actor, db)
    ensure_item_version(item, requested_version(request, payload.version), request)
    index = await next_group_index(db, item, group_key)
    blocks: list[ContentBlock] = []
    for field_key, value in payload.values.items():
        block = await upsert_block(
            db,
            item,
            actor.user.id,
            field_key,
            value,
            source_type=payload.source_type,
            group_key=group_key,
            group_index=index,
            lock=payload.lock,
        )
        blocks.append(block)
    await write_content_revision(
        db,
        item,
        actor.user.id,
        "user_edit",
        {"group": group_key, "group_index": index, "values": payload.values},
    )
    await db.commit()
    return BlocksResponse(blocks=[block_out(block) for block in blocks])


@router.patch("/content-blocks/{block_id}", response_model=BlockOut)
async def patch_block(
    block_id: UUID,
    payload: BlockPatchRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> BlockOut:
    block, item = await mutable_block_for_actor(block_id, request, actor, db)
    data = payload.model_dump(exclude_none=True)
    if payload.source_media_id is not None:
        media, _ = await media_for_actor(payload.source_media_id, request, actor, db)
        if media.workspace_id != item.workspace_id:
            raise api_error(404, "media_not_found", "Media asset not found.", request=request)
    block.value_json = data.get("value", block.value_json)
    block.source_type = data.get("source_type", block.source_type)
    if "transcript_text" in data:
        block.transcript_text = data["transcript_text"]
    if "source_media_id" in data:
        block.source_media_id = data["source_media_id"]
    if payload.lock is not None:
        block.is_locked = payload.lock
        if payload.lock:
            await lock_fact(db, block, actor.user.id)
        else:
            await unlock_fact(db, block)
    block.updated_by = actor.user.id
    block.updated_at = utc_now()
    block.revision_number += 1
    item.updated_at = utc_now()
    item.version += 1
    await write_content_revision(db, item, actor.user.id, "user_edit", {"block_id": str(block.id), "patch": data})
    await db.commit()
    return block_out(block)


@router.delete("/content-blocks/{block_id}", response_model=MessageResponse)
async def delete_block(
    block_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    block, item = await mutable_block_for_actor(block_id, request, actor, db)
    await unlock_fact(db, block)
    await db.delete(block)
    item.updated_at = utc_now()
    item.version += 1
    await db.commit()
    return MessageResponse(status="ok", message="Content block deleted.")


@router.post("/content-blocks/{block_id}/lock", response_model=BlockOut)
async def lock_block(
    block_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> BlockOut:
    block, item = await mutable_block_for_actor(block_id, request, actor, db)
    block.is_locked = True
    block.updated_by = actor.user.id
    block.updated_at = utc_now()
    item.updated_at = utc_now()
    item.version += 1
    await lock_fact(db, block, actor.user.id)
    await db.commit()
    return block_out(block)


@router.post("/content-blocks/{block_id}/unlock", response_model=BlockOut)
async def unlock_block(
    block_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> BlockOut:
    block, item = await mutable_block_for_actor(block_id, request, actor, db)
    await unlock_fact(db, block)
    block.updated_by = actor.user.id
    block.updated_at = utc_now()
    item.updated_at = utc_now()
    item.version += 1
    await db.commit()
    return block_out(block)


@router.post("/media/presign-upload", response_model=MediaPresignResponse)
async def presign_upload(
    payload: MediaPresignRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MediaPresignResponse:
    _, membership = await require_workspace_membership(payload.workspace_id, request, actor, db)
    require_role(membership, CONTENT_MUTATION_ROLES, request)
    if payload.content_item_id is not None:
        item, _ = await item_for_actor(payload.content_item_id, request, actor, db)
        if item.workspace_id != payload.workspace_id:
            raise api_error(404, "content_not_found", "Content item not found.", request=request)
    media_id = uuid4()
    storage_key = make_storage_key(payload.workspace_id, media_id, payload.filename)
    media = MediaAsset(
        id=media_id,
        workspace_id=payload.workspace_id,
        storage_key=storage_key,
        bucket=settings.resolved_media_bucket,
        kind=payload.kind,
        mime_type=payload.mime_type,
        size_bytes=payload.size_bytes,
        checksum=payload.checksum,
        upload_status="pending",
        processing_status="pending",
        created_by=actor.user.id,
        created_at=utc_now(),
        updated_at=utc_now(),
        version=1,
    )
    db.add(media)
    await db.commit()
    try:
        upload_url = make_presigned_upload_url(settings, storage_key, payload.mime_type)
    except ContentProviderError as exc:
        raise api_error(503, exc.code, exc.message, request=request) from exc
    return MediaPresignResponse(
        media_id=media.id,
        bucket=media.bucket,
        storage_key=media.storage_key,
        upload_url=upload_url,
        method="PUT",
        headers={"Content-Type": payload.mime_type},
        expires_in_seconds=settings.media_presign_ttl_seconds,
    )


@router.post("/media/{media_id}/complete-upload", response_model=MediaOut)
async def complete_upload(
    media_id: UUID,
    payload: MediaCompleteRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> MediaOut:
    media, membership = await media_for_actor(media_id, request, actor, db)
    require_role(membership, CONTENT_MUTATION_ROLES, request)
    updates = payload.model_dump(exclude_none=True)
    for key, value in updates.items():
        setattr(media, key, value)
    media.upload_status = "uploaded"
    media.processing_status = "ready"
    media.updated_at = utc_now()
    media.version += 1
    await db.commit()
    return media_out(media)


@router.get("/media/{media_id}", response_model=MediaOut)
async def get_media(
    media_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> MediaOut:
    media, _ = await media_for_actor(media_id, request, actor, db)
    return media_out(media)


@router.delete("/media/{media_id}", response_model=MessageResponse)
async def delete_media(
    media_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    media, membership = await media_for_actor(media_id, request, actor, db)
    require_role(membership, CONTENT_MUTATION_ROLES, request)
    media.deleted_at = utc_now()
    media.upload_status = "deleted"
    media.processing_status = "deleted"
    media.updated_at = utc_now()
    media.version += 1
    await db.commit()
    return MessageResponse(status="ok", message="Media asset deleted.")


@router.get("/content-items/{content_id}/media", response_model=ContentMediaResponse)
async def list_content_media(
    content_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> ContentMediaResponse:
    item, _ = await item_for_actor(content_id, request, actor, db)
    rows = (
        await db.scalars(
            select(ContentMedia)
            .where(ContentMedia.content_item_id == item.id)
            .order_by(ContentMedia.sort_order)
        )
    ).all()
    return ContentMediaResponse(media=[content_media_out(row) for row in rows])


@router.put("/content-items/{content_id}/media-order", response_model=ContentMediaResponse)
async def put_content_media_order(
    content_id: UUID,
    payload: MediaOrderRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> ContentMediaResponse:
    item = await mutable_item_for_actor(content_id, request, actor, db)
    ensure_item_version(item, requested_version(request, payload.version), request)
    media_payloads: list[dict[str, Any]] = []
    for index, media in enumerate(payload.media):
        media_asset, _ = await media_for_actor(media.media_id, request, actor, db)
        if media_asset.workspace_id != item.workspace_id:
            raise api_error(404, "media_not_found", "Media asset not found.", request=request)
        media_payloads.append({
            **media.model_dump(exclude_none=True),
            "media_id": media.media_id,
            "sort_order": media.sort_order if media.sort_order is not None else index,
        })
    rows = await attach_media_order(db, item, media_payloads)
    await db.commit()
    return ContentMediaResponse(media=[content_media_out(row) for row in rows])


@router.post(
    "/content-blocks/{block_id}/transcribe",
    response_model=TranscriptionJobOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def transcribe_block(
    block_id: UUID,
    payload: TranscribeRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> TranscriptionJobOut:
    provider_key = settings.stt_provider if payload.provider_key == "default" else payload.provider_key
    provider_key = provider_key.strip().lower()
    block, item = await mutable_block_for_actor(block_id, request, actor, db)
    media_id = payload.media_id or block.source_media_id
    if media_id is None:
        raise api_error(422, "media_required", "A voice or audio media asset is required.", request=request)
    media, _ = await media_for_actor(media_id, request, actor, db)
    if media.workspace_id != item.workspace_id:
        raise api_error(404, "media_not_found", "Media asset not found.", request=request)
    if media.kind not in {"audio", "voice"}:
        raise api_error(422, "media_not_voice", "Only audio or voice assets can be transcribed.", request=request)
    voice_asset = await db.scalar(select(VoiceAsset).where(VoiceAsset.media_asset_id == media.id))
    if voice_asset is None:
        voice_asset = VoiceAsset(
            id=uuid4(),
            workspace_id=item.workspace_id,
            media_asset_id=media.id,
            content_item_id=item.id,
            content_block_id=block.id,
            recording_metadata={"source": "browser"},
            created_by=actor.user.id,
            created_at=utc_now(),
        )
        db.add(voice_asset)
        await db.flush()
    confidence_json: dict[str, Any]
    if provider_key == "mock":
        transcript = payload.mock_transcript or mock_transcript_for(block)
        confidence_json = {"provider": provider_key, "mock": True}
    elif provider_key == "openai":
        if payload.mock_transcript:
            raise api_error(
                422,
                "mock_transcript_not_allowed",
                "mock_transcript can only be used with the mock STT provider.",
                request=request,
            )
        try:
            audio_bytes = fetch_s3_object_bytes(settings, media)
            transcript, confidence_json = await transcribe_with_openai(settings, media, audio_bytes)
        except ContentProviderError as exc:
            raise api_error(503, exc.code, exc.message, request=request) from exc
    else:
        raise api_error(
            503,
            "stt_provider_unavailable",
            "Requested speech-to-text provider is not configured.",
            {"provider_key": provider_key},
            request=request,
        )
    run = TranscriptionRun(
        id=uuid4(),
        workspace_id=item.workspace_id,
        content_item_id=item.id,
        content_block_id=block.id,
        media_asset_id=media.id,
        voice_asset_id=voice_asset.id,
        provider_key=provider_key,
        status="completed",
        transcript_text=transcript,
        confidence_json=confidence_json,
        retry_count=0,
        started_at=utc_now(),
        completed_at=utc_now(),
        created_by=actor.user.id,
        created_at=utc_now(),
        updated_at=utc_now(),
    )
    db.add(run)
    await db.commit()
    return transcription_out(run)


@router.get("/transcription-jobs/{job_id}", response_model=TranscriptionJobOut)
async def get_transcription_job(
    job_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> TranscriptionJobOut:
    run, _, _ = await transcription_for_actor(job_id, request, actor, db)
    return transcription_out(run)


@router.post("/transcription-jobs/{job_id}/accept", response_model=BlockOut)
async def accept_transcription(
    job_id: UUID,
    payload: AcceptTranscriptionRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> BlockOut:
    run, item, membership = await transcription_for_actor(job_id, request, actor, db)
    require_role(membership, CONTENT_MUTATION_ROLES, request)
    block = await db.get(ContentBlock, run.content_block_id)
    assert block is not None
    run.corrected_text = payload.corrected_text
    run.accepted_at = utc_now()
    run.accepted_by = actor.user.id
    run.status = "accepted"
    run.updated_at = utc_now()
    block.source_type = "transcription"
    block.transcript_text = run.transcript_text
    block.value_json = {"text": payload.corrected_text}
    block.source_media_id = run.media_asset_id
    block.updated_by = actor.user.id
    block.updated_at = utc_now()
    block.revision_number += 1
    if payload.lock:
        block.is_locked = True
        await lock_fact(db, block, actor.user.id)
    item.updated_at = utc_now()
    item.version += 1
    await write_content_revision(
        db,
        item,
        actor.user.id,
        "user_edit",
        {"event": "transcription_accepted", "block_id": str(block.id), "corrected_text": payload.corrected_text},
        text=payload.corrected_text,
    )
    await db.commit()
    return block_out(block)


@router.post(
    "/transcription-jobs/{job_id}/retry",
    response_model=TranscriptionJobOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def retry_transcription_job(
    job_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> TranscriptionJobOut:
    run, _, membership = await transcription_for_actor(job_id, request, actor, db)
    require_role(membership, CONTENT_MUTATION_ROLES, request)
    run.retry_count += 1
    run.status = "completed"
    run.error_code = None
    run.error_message = None
    run.started_at = utc_now()
    run.completed_at = utc_now()
    run.updated_at = utc_now()
    if not run.transcript_text:
        block = await db.get(ContentBlock, run.content_block_id)
        assert block is not None
        run.transcript_text = mock_transcript_for(block)
    await db.commit()
    return transcription_out(run)
