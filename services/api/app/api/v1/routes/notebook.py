from __future__ import annotations

from datetime import timedelta
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.base import (
    ContentBlock,
    ContentItem,
    MediaAsset,
    NotebookNote,
    NotebookTranscription,
    NotebookTransfer,
    RubricVersion,
    UsageEvent,
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
    fetch_s3_object_bytes,
    resolve_content_create_context,
    text_from_value,
    transcribe_with_openai,
    upsert_block,
    write_content_revision,
)
from app.modules.projects.service import get_active_project
from app.modules.shared.errors import api_error

router = APIRouter()
NOTE_KINDS = {"idea", "observation", "task", "link", "draft", "other"}


class NoteCreateRequest(BaseModel):
    workspace_id: UUID
    body: str = Field(default="", max_length=50_000)
    kind: str | None = None
    client_note_id: UUID | None = None


class NotePatchRequest(BaseModel):
    body: str | None = Field(default=None, max_length=50_000)
    kind: str | None = None
    pinned: bool | None = None
    archived: bool | None = None
    version: int


class NoteOut(BaseModel):
    id: UUID
    workspace_id: UUID
    author_id: UUID
    body: str
    kind: str | None
    pinned: bool
    archived: bool
    deleted: bool
    version: int
    created_at: str
    updated_at: str


class NoteListResponse(BaseModel):
    notes: list[NoteOut]


class NoteTranscribeRequest(BaseModel):
    media_id: UUID
    provider_key: str = "default"
    mock_transcript: str | None = None


class NoteTranscribeNewRequest(NoteTranscribeRequest):
    workspace_id: UUID
    body: str = Field(default="", max_length=50_000)
    kind: str | None = None
    client_note_id: UUID | None = None


class NoteTranscriptionOut(BaseModel):
    id: UUID
    note_id: UUID
    media_asset_id: UUID
    provider_key: str
    status: str
    transcript_text: str | None
    corrected_text: str | None
    accepted_at: str | None


class NoteTranscriptionAcceptRequest(BaseModel):
    corrected_text: str = Field(min_length=1, max_length=50_000)
    append: bool = True
    note_version: int


class NoteTransferRequest(BaseModel):
    project_id: UUID | None = None
    rubric_id: UUID | None = None
    content_item_id: UUID | None = None

    @model_validator(mode="after")
    def exactly_one_destination(self) -> "NoteTransferRequest":
        if (self.project_id is None) == (self.content_item_id is None):
            raise ValueError("Choose a project for a new material or one existing material.")
        if self.content_item_id is not None and self.rubric_id is not None:
            raise ValueError("Rubric can only be selected for a new material.")
        return self


class NoteTransferOut(BaseModel):
    id: UUID
    note_id: UUID
    content_item_id: UUID
    content_block_id: UUID
    transfer_type: str
    note_version: int
    composer_url: str


def note_out(note: NotebookNote) -> NoteOut:
    return NoteOut(
        id=note.id,
        workspace_id=note.workspace_id,
        author_id=note.author_id,
        body=note.body,
        kind=note.kind,
        pinned=note.pinned_at is not None,
        archived=note.archived_at is not None,
        deleted=note.deleted_at is not None,
        version=note.version,
        created_at=note.created_at.isoformat(),
        updated_at=note.updated_at.isoformat(),
    )


def transcription_out(run: NotebookTranscription) -> NoteTranscriptionOut:
    return NoteTranscriptionOut(
        id=run.id,
        note_id=run.note_id,
        media_asset_id=run.media_asset_id,
        provider_key=run.provider_key,
        status=run.status,
        transcript_text=run.transcript_text,
        corrected_text=run.corrected_text,
        accepted_at=run.accepted_at.isoformat() if run.accepted_at else None,
    )


async def resolve_note_transcript(
    payload: NoteTranscribeRequest,
    media: MediaAsset,
    request: Request,
    settings: Settings,
) -> tuple[str, dict[str, Any], str]:
    provider = settings.stt_provider if payload.provider_key == "default" else payload.provider_key
    provider = provider.strip().lower()
    if provider == "mock":
        transcript = (payload.mock_transcript or "Новая голосовая заметка").strip()
        confidence: dict[str, Any] = {"provider": "mock", "mock": True}
    elif provider == "openai":
        if payload.mock_transcript:
            raise api_error(422, "mock_transcript_not_allowed", "Mock text is only allowed for mock STT.", request=request)
        try:
            transcript, confidence = await transcribe_with_openai(
                settings, media, fetch_s3_object_bytes(settings, media)
            )
        except ContentProviderError as exc:
            raise api_error(503, exc.code, exc.message, request=request) from exc
    else:
        raise api_error(503, "stt_provider_unavailable", "Requested STT provider is unavailable.", request=request)
    if not transcript:
        raise api_error(422, "notebook_transcript_empty", "Voice transcript is empty.", request=request)
    return transcript, confidence, provider


async def note_for_actor(
    note_id: UUID,
    request: Request,
    actor: Actor,
    db: AsyncSession,
    *,
    include_deleted: bool = False,
) -> tuple[NotebookNote, Any]:
    note = await db.get(NotebookNote, note_id)
    if note is None or (note.deleted_at is not None and not include_deleted):
        raise api_error(404, "notebook_note_not_found", "Notebook note not found.", request=request)
    try:
        _, membership = await require_workspace_membership(note.workspace_id, request, actor, db)
    except HTTPException as exc:
        raise api_error(404, "notebook_note_not_found", "Notebook note not found.", request=request) from exc
    return note, membership


async def mutable_note(
    note_id: UUID,
    request: Request,
    actor: Actor,
    db: AsyncSession,
    *,
    include_deleted: bool = False,
) -> NotebookNote:
    note, membership = await note_for_actor(note_id, request, actor, db, include_deleted=include_deleted)
    require_role(membership, CONTENT_MUTATION_ROLES, request)
    return note


def ensure_note_version(note: NotebookNote, expected: int, request: Request) -> None:
    if note.version != expected:
        raise api_error(
            409,
            "version_conflict",
            "Notebook note has a newer version.",
            {"expected": expected, "actual": note.version},
            request=request,
        )


def validate_kind(kind: str | None, request: Request) -> None:
    if kind is not None and kind not in NOTE_KINDS:
        raise api_error(422, "notebook_kind_invalid", "Notebook note kind is invalid.", request=request)


async def existing_client_note(
    client_note_id: UUID | None,
    workspace_id: UUID,
    request: Request,
    db: AsyncSession,
) -> NotebookNote | None:
    if client_note_id is None:
        return None
    note = await db.get(NotebookNote, client_note_id)
    if note is None:
        return None
    if note.workspace_id != workspace_id:
        raise api_error(404, "notebook_note_not_found", "Notebook note not found.", request=request)
    return note


def flatten_ui_fields(fields: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    for field in fields:
        result.append(field)
        children = field.get("fields")
        if isinstance(children, list):
            result.extend(flatten_ui_fields([row for row in children if isinstance(row, dict)]))
    return result


def source_field_key(version: RubricVersion) -> str:
    schema = version.ui_schema if isinstance(version.ui_schema, dict) else {}
    fields = flatten_ui_fields([row for row in schema.get("fields", []) if isinstance(row, dict)])
    preferred_types = {"voice", "voice_or_long_text", "long_text", "text"}
    preferred = next((field for field in fields if field.get("type") in preferred_types), None)
    return str((preferred or {}).get("key") or "source")


async def append_note_to_item(
    db: AsyncSession,
    note: NotebookNote,
    item: ContentItem,
    actor_user_id: UUID,
) -> ContentBlock:
    existing = await db.scalar(
        select(ContentBlock)
        .where(ContentBlock.content_item_id == item.id)
        .order_by(ContentBlock.updated_at.desc())
    )
    if existing is None:
        rubric_version = await db.get(RubricVersion, item.rubric_version_id)
        assert rubric_version is not None
        field_key = source_field_key(rubric_version)
        previous = ""
    else:
        field_key = existing.field_key
        previous = existing.transcript_text or text_from_value(existing.value_json)
    merged = "\n\n".join(part for part in (previous.strip(), note.body.strip()) if part)
    block = await upsert_block(
        db,
        item,
        actor_user_id,
        field_key,
        {"text": merged},
        source_type="import",
        transcript_text=merged,
        source_media_id=existing.source_media_id if existing else None,
        group_key=existing.group_key if existing else None,
        group_index=existing.group_index if existing else None,
        lock=False,
    )
    await write_content_revision(
        db,
        item,
        actor_user_id,
        "user_edit",
        {"event": "notebook_note_appended", "note_id": str(note.id), "note_version": note.version},
        text=merged,
    )
    return block


@router.get("/notebook", response_model=NoteListResponse)
async def list_notes(
    workspace_id: UUID,
    request: Request,
    q: str | None = Query(default=None, max_length=200),
    archived: bool = False,
    deleted: bool = False,
    limit: int = Query(default=50, ge=1, le=200),
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> NoteListResponse:
    await require_workspace_membership(workspace_id, request, actor, db)
    query = select(NotebookNote).where(NotebookNote.workspace_id == workspace_id)
    query = query.where(NotebookNote.deleted_at.is_not(None) if deleted else NotebookNote.deleted_at.is_(None))
    if not deleted:
        query = query.where(NotebookNote.archived_at.is_not(None) if archived else NotebookNote.archived_at.is_(None))
    if q and q.strip():
        query = query.where(NotebookNote.body.ilike(f"%{q.strip()}%"))
    rows = (
        await db.scalars(
            query.order_by(NotebookNote.pinned_at.desc(), NotebookNote.updated_at.desc()).limit(limit)
        )
    ).all()
    return NoteListResponse(notes=[note_out(row) for row in rows])


@router.post("/notebook", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
async def create_note(
    payload: NoteCreateRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> NoteOut:
    _, membership = await require_workspace_membership(payload.workspace_id, request, actor, db)
    require_role(membership, CONTENT_MUTATION_ROLES, request)
    validate_kind(payload.kind, request)
    existing = await existing_client_note(payload.client_note_id, payload.workspace_id, request, db)
    if existing is not None:
        return note_out(existing)
    now = utc_now()
    note = NotebookNote(
        id=payload.client_note_id or uuid4(), workspace_id=payload.workspace_id, author_id=actor.user.id,
        body=payload.body, kind=payload.kind, created_at=now, updated_at=now, version=1,
    )
    db.add(note)
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        existing = await existing_client_note(payload.client_note_id, payload.workspace_id, request, db)
        if existing is None:
            raise
        return note_out(existing)
    return note_out(note)


@router.post("/notebook/transcribe-new", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
async def transcribe_new_note(
    payload: NoteTranscribeNewRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> NoteOut:
    _, membership = await require_workspace_membership(payload.workspace_id, request, actor, db)
    require_role(membership, CONTENT_MUTATION_ROLES, request)
    validate_kind(payload.kind, request)
    existing = await existing_client_note(payload.client_note_id, payload.workspace_id, request, db)
    if existing is not None:
        return note_out(existing)
    media = await db.get(MediaAsset, payload.media_id)
    if media is None or media.deleted_at is not None or media.workspace_id != payload.workspace_id:
        raise api_error(404, "media_not_found", "Media asset not found.", request=request)
    if media.kind not in {"audio", "voice"} or media.upload_status != "uploaded":
        raise api_error(422, "media_not_voice", "An uploaded voice or audio asset is required.", request=request)

    transcript, confidence, provider = await resolve_note_transcript(payload, media, request, settings)
    body = "\n\n".join(part for part in (payload.body.strip(), transcript.strip()) if part)
    if len(body) > 50_000:
        raise api_error(422, "notebook_note_too_long", "Notebook note is too long.", request=request)

    now = utc_now()
    note = NotebookNote(
        id=payload.client_note_id or uuid4(), workspace_id=payload.workspace_id, author_id=actor.user.id,
        body=body, kind=payload.kind, created_at=now, updated_at=now, version=1,
    )
    run = NotebookTranscription(
        id=uuid4(), workspace_id=payload.workspace_id, note_id=note.id,
        media_asset_id=media.id, provider_key=provider, status="accepted",
        transcript_text=transcript, corrected_text=transcript,
        confidence_json=confidence, accepted_at=now, accepted_by=actor.user.id,
        created_by=actor.user.id, created_at=now, updated_at=now,
    )
    media.retention_until = now + timedelta(days=7)
    media.processing_status = "completed"
    media.updated_at = now
    db.add(note)
    db.add(run)
    db.add(
        UsageEvent(
            id=uuid4(), workspace_id=payload.workspace_id, key="notebook_stt_request",
            quantity=1, source=provider,
            metadata_json={"note_id": str(note.id), "media_id": str(media.id)},
            created_at=now,
        )
    )
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        existing = await existing_client_note(payload.client_note_id, payload.workspace_id, request, db)
        if existing is None:
            raise
        return note_out(existing)
    return note_out(note)


@router.patch("/notebook/{note_id}", response_model=NoteOut)
async def update_note(
    note_id: UUID,
    payload: NotePatchRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> NoteOut:
    note = await mutable_note(note_id, request, actor, db)
    ensure_note_version(note, payload.version, request)
    validate_kind(payload.kind, request)
    if payload.body is not None:
        note.body = payload.body
    if "kind" in payload.model_fields_set:
        note.kind = payload.kind
    if payload.pinned is not None:
        note.pinned_at = utc_now() if payload.pinned else None
    if payload.archived is not None:
        note.archived_at = utc_now() if payload.archived else None
    note.updated_at = utc_now()
    note.version += 1
    await db.commit()
    return note_out(note)


@router.delete("/notebook/{note_id}", response_model=NoteOut)
async def delete_note(
    note_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> NoteOut:
    note = await mutable_note(note_id, request, actor, db)
    note.deleted_at = utc_now()
    note.updated_at = utc_now()
    note.version += 1
    await db.commit()
    return note_out(note)


@router.post("/notebook/{note_id}/restore", response_model=NoteOut)
async def restore_note(
    note_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> NoteOut:
    note = await mutable_note(note_id, request, actor, db, include_deleted=True)
    note.deleted_at = None
    note.updated_at = utc_now()
    note.version += 1
    await db.commit()
    return note_out(note)


@router.post(
    "/notebook/{note_id}/transcribe",
    response_model=NoteTranscriptionOut,
    status_code=status.HTTP_202_ACCEPTED,
)
async def transcribe_note(
    note_id: UUID,
    payload: NoteTranscribeRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> NoteTranscriptionOut:
    note = await mutable_note(note_id, request, actor, db)
    media = await db.get(MediaAsset, payload.media_id)
    if media is None or media.deleted_at is not None or media.workspace_id != note.workspace_id:
        raise api_error(404, "media_not_found", "Media asset not found.", request=request)
    if media.kind not in {"audio", "voice"} or media.upload_status != "uploaded":
        raise api_error(422, "media_not_voice", "An uploaded voice or audio asset is required.", request=request)
    transcript, confidence, provider = await resolve_note_transcript(payload, media, request, settings)
    now = utc_now()
    run = NotebookTranscription(
        id=uuid4(), workspace_id=note.workspace_id, note_id=note.id,
        media_asset_id=media.id, provider_key=provider, status="completed",
        transcript_text=transcript, confidence_json=confidence,
        created_by=actor.user.id, created_at=now, updated_at=now,
    )
    db.add(run)
    await db.commit()
    return transcription_out(run)


@router.post("/notebook-transcriptions/{run_id}/accept", response_model=NoteOut)
async def accept_note_transcription(
    run_id: UUID,
    payload: NoteTranscriptionAcceptRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> NoteOut:
    run = await db.get(NotebookTranscription, run_id)
    if run is None:
        raise api_error(404, "notebook_transcription_not_found", "Notebook transcription not found.", request=request)
    note = await mutable_note(run.note_id, request, actor, db)
    ensure_note_version(note, payload.note_version, request)
    corrected = payload.corrected_text.strip()
    note.body = "\n\n".join(part for part in (note.body.strip() if payload.append else "", corrected) if part)
    note.updated_at = utc_now()
    note.version += 1
    run.corrected_text = corrected
    run.status = "accepted"
    run.accepted_at = utc_now()
    run.accepted_by = actor.user.id
    run.updated_at = utc_now()
    media = await db.get(MediaAsset, run.media_asset_id)
    if media is not None:
        media.retention_until = utc_now() + timedelta(days=7)
        media.processing_status = "completed"
        media.updated_at = utc_now()
    db.add(
        UsageEvent(
            id=uuid4(), workspace_id=note.workspace_id, key="notebook_stt_request",
            quantity=1, source=run.provider_key,
            metadata_json={"note_id": str(note.id), "media_id": str(run.media_asset_id)},
            created_at=utc_now(),
        )
    )
    await db.commit()
    return note_out(note)


@router.post("/notebook/{note_id}/transfer", response_model=NoteTransferOut)
async def transfer_note(
    note_id: UUID,
    payload: NoteTransferRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> NoteTransferOut:
    note = await mutable_note(note_id, request, actor, db)
    if not note.body.strip():
        raise api_error(422, "notebook_note_empty", "Write or dictate the note before transfer.", request=request)
    transfer_type = "append"
    if payload.content_item_id is not None:
        item = await db.get(ContentItem, payload.content_item_id)
        if item is None or item.deleted_at is not None or item.workspace_id != note.workspace_id:
            raise api_error(404, "content_not_found", "Content item not found.", request=request)
        _, membership = await require_workspace_membership(item.workspace_id, request, actor, db)
        require_role(membership, CONTENT_MUTATION_ROLES, request)
        dedupe_key = f"append:{item.id}:{note.version}"
    else:
        assert payload.project_id is not None
        project_ctx = await get_active_project(db, payload.project_id)
        if project_ctx is None or project_ctx.project.workspace_id != note.workspace_id:
            raise api_error(404, "project_not_found", "Project not found.", request=request)
        _, membership = await require_workspace_membership(note.workspace_id, request, actor, db)
        require_role(membership, CONTENT_MUTATION_ROLES, request)
        create_ctx = await resolve_content_create_context(db, payload.project_id, payload.rubric_id, actor.user.id)
        if create_ctx is None:
            raise api_error(404, "rubric_not_found", "Rubric not found.", request=request)
        dedupe_key = f"create:{note.version}"
        existing_create = await db.scalar(
            select(NotebookTransfer).where(
                NotebookTransfer.note_id == note.id,
                NotebookTransfer.dedupe_key == dedupe_key,
            )
        )
        if existing_create is not None:
            raise api_error(409, "notebook_transfer_duplicate", "This note version already created a material.", request=request)
        now = utc_now()
        item = ContentItem(
            id=uuid4(), workspace_id=note.workspace_id, project_id=payload.project_id,
            rubric_id=create_ctx.rubric.id, rubric_version_id=create_ctx.rubric_version.id,
            project_version_id=create_ctx.project_version.id,
            title_internal=note.body.strip().splitlines()[0][:200] or "Материал из блокнота",
            status="draft", created_by=actor.user.id, assigned_to=actor.user.id,
            created_at=now, updated_at=now, version=1,
        )
        db.add(item)
        await db.flush()
        await write_content_revision(
            db, item, actor.user.id, "user_edit",
            {"event": "created_from_notebook", "note_id": str(note.id), "note_version": note.version},
        )
        transfer_type = "create"
    duplicate = await db.scalar(
        select(NotebookTransfer).where(
            NotebookTransfer.note_id == note.id,
            NotebookTransfer.dedupe_key == dedupe_key,
        )
    )
    if duplicate is not None:
        raise api_error(409, "notebook_transfer_duplicate", "This note version is already in that material.", request=request)
    block = await append_note_to_item(db, note, item, actor.user.id)
    transfer = NotebookTransfer(
        id=uuid4(), workspace_id=note.workspace_id, note_id=note.id,
        content_item_id=item.id, content_block_id=block.id,
        transfer_type=transfer_type, note_version=note.version,
        dedupe_key=dedupe_key,
        created_by=actor.user.id, created_at=utc_now(),
    )
    db.add(transfer)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise api_error(409, "notebook_transfer_duplicate", "This note version is already in that material.", request=request) from exc
    return NoteTransferOut(
        id=transfer.id, note_id=note.id, content_item_id=item.id,
        content_block_id=block.id, transfer_type=transfer.transfer_type,
        note_version=transfer.note_version,
        composer_url=f"/app/content/new?edit={item.id}",
    )
