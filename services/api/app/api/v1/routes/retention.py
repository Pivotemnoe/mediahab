from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.base import (
    AuditLog,
    ContentItem,
    MediaAsset,
    Membership,
    RetentionCandidate,
    RetentionPolicy,
    Session,
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
from app.modules.content.service import ContentProviderError, delete_s3_object
from app.modules.shared.errors import api_error

router = APIRouter()

MEDIA_KINDS = {"image", "video"}
RAW_VOICE_KINDS = {"audio", "voice"}


class RetentionPolicyOut(BaseModel):
    original_media_days: int
    text_days: int
    warning_days: int
    media_grace_days: int
    inactivity_days: int
    inactivity_grace_days: int
    raw_voice_days: int | None
    cleanup_enabled: bool
    text_cleanup_enabled: bool
    version: int


class RetentionPolicyPatch(BaseModel):
    cleanup_enabled: bool | None = None
    text_cleanup_enabled: bool | None = None
    raw_voice_days: int | None = Field(default=None, ge=1, le=365)
    version: int


class RetentionSummaryOut(BaseModel):
    workspace_id: UUID
    policy: RetentionPolicyOut
    media_count: int
    media_bytes: int
    next_media_expiry_at: str | None
    media_warning_count: int
    candidate_counts: dict[str, int]
    text_candidate_count: int
    last_authenticated_activity_at: str | None
    inactive_cleanup_at: str | None
    blockers: list[str]


class RetentionScanRequest(BaseModel):
    dry_run: bool = True
    now: datetime | None = None


class RetentionCandidateOut(BaseModel):
    id: UUID | None
    object_type: str
    object_id: UUID
    status: str
    reason: str
    retention_until: str
    warning_at: str
    grace_until: str
    details: dict[str, Any]


class RetentionScanOut(BaseModel):
    dry_run: bool
    workspace_id: UUID
    candidates: list[RetentionCandidateOut]
    excluded_raw_voice: int
    message: str


class RetainRequest(BaseModel):
    extend_days: int = Field(default=30, ge=1, le=365)
    version: int | None = None


class ExecuteRetentionRequest(BaseModel):
    limit: int = Field(default=50, ge=1, le=100)


class ExecuteRetentionOut(BaseModel):
    completed: int
    failed: int
    message: str


def as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def policy_out(policy: RetentionPolicy) -> RetentionPolicyOut:
    return RetentionPolicyOut(
        original_media_days=policy.original_media_days,
        text_days=policy.text_days,
        warning_days=policy.warning_days,
        media_grace_days=policy.media_grace_days,
        inactivity_days=policy.inactivity_days,
        inactivity_grace_days=policy.inactivity_grace_days,
        raw_voice_days=policy.raw_voice_days,
        cleanup_enabled=policy.cleanup_enabled,
        text_cleanup_enabled=policy.text_cleanup_enabled,
        version=policy.version,
    )


async def ensure_policy(db: AsyncSession, workspace_id: UUID) -> RetentionPolicy:
    policy = await db.scalar(
        select(RetentionPolicy).where(RetentionPolicy.workspace_id == workspace_id)
    )
    if policy is not None:
        return policy
    policy = RetentionPolicy(
        id=uuid4(),
        workspace_id=workspace_id,
        original_media_days=30,
        text_days=180,
        warning_days=7,
        media_grace_days=7,
        inactivity_days=90,
        inactivity_grace_days=30,
        raw_voice_days=None,
        cleanup_enabled=False,
        text_cleanup_enabled=False,
        created_at=utc_now(),
        updated_at=utc_now(),
        version=1,
    )
    db.add(policy)
    await db.flush()
    return policy


def lifecycle_status(now: datetime, warning_at: datetime, expiry: datetime, grace: datetime) -> str:
    if now >= grace:
        return "ready"
    if now >= expiry:
        return "grace"
    if now >= warning_at:
        return "warning"
    return "scheduled"


def candidate_out(
    *, candidate_id: UUID | None, object_type: str, object_id: UUID, status: str,
    reason: str, expiry: datetime, warning_at: datetime, grace_until: datetime,
    details: dict[str, Any],
) -> RetentionCandidateOut:
    return RetentionCandidateOut(
        id=candidate_id,
        object_type=object_type,
        object_id=object_id,
        status=status,
        reason=reason,
        retention_until=expiry.isoformat(),
        warning_at=warning_at.isoformat(),
        grace_until=grace_until.isoformat(),
        details=details,
    )


async def retention_candidates(
    db: AsyncSession,
    workspace_id: UUID,
    policy: RetentionPolicy,
    now: datetime,
    *,
    persist: bool,
) -> tuple[list[RetentionCandidateOut], int]:
    existing_rows = list(
        await db.scalars(
            select(RetentionCandidate).where(RetentionCandidate.workspace_id == workspace_id)
        )
    )
    existing = {(row.object_type, row.object_id): row for row in existing_rows}
    output: list[RetentionCandidateOut] = []
    excluded_raw_voice = 0

    media_rows = list(
        await db.scalars(
            select(MediaAsset).where(
                MediaAsset.workspace_id == workspace_id,
                MediaAsset.deleted_at.is_(None),
            )
        )
    )
    for media in media_rows:
        if media.kind in RAW_VOICE_KINDS and policy.raw_voice_days is None:
            excluded_raw_voice += 1
            continue
        if media.kind not in MEDIA_KINDS and media.kind not in RAW_VOICE_KINDS:
            continue
        expiry = as_utc(media.retention_until) if media.retention_until else as_utc(media.created_at) + timedelta(
            days=policy.raw_voice_days if media.kind in RAW_VOICE_KINDS else policy.original_media_days
        )
        warning_at = expiry - timedelta(days=policy.warning_days)
        grace_until = expiry + timedelta(days=policy.media_grace_days)
        status = lifecycle_status(now, warning_at, expiry, grace_until)
        key = ("media", media.id)
        row = existing.get(key)
        if row and row.status == "cancelled" and as_utc(row.retention_until) == expiry:
            status = "cancelled"
        details = {
            "kind": media.kind,
            "mime_type": media.mime_type,
            "size_bytes": media.size_bytes,
        }
        if persist:
            if row is None:
                row = RetentionCandidate(
                    id=uuid4(), workspace_id=workspace_id, object_type="media",
                    object_id=media.id, status=status, reason="media_retention",
                    retention_until=expiry, warning_at=warning_at, grace_until=grace_until,
                    details_json=details, attempts=0, created_at=now, updated_at=now, version=1,
                )
                db.add(row)
            elif row.status not in {"completed", "cancelled"}:
                row.status = status
                row.retention_until = expiry
                row.warning_at = warning_at
                row.grace_until = grace_until
                row.details_json = details
                row.updated_at = now
                row.version += 1
        output.append(candidate_out(
            candidate_id=row.id if row else None, object_type="media", object_id=media.id,
            status=status, reason="media_retention", expiry=expiry, warning_at=warning_at,
            grace_until=grace_until, details=details,
        ))

    items = list(
        await db.scalars(
            select(ContentItem).where(
                ContentItem.workspace_id == workspace_id,
                ContentItem.deleted_at.is_(None),
            )
        )
    )
    for item in items:
        expiry = as_utc(item.updated_at) + timedelta(days=policy.text_days)
        warning_at = expiry - timedelta(days=policy.warning_days)
        grace_until = expiry + timedelta(days=policy.inactivity_grace_days)
        status = lifecycle_status(now, warning_at, expiry, grace_until)
        key = ("content_text", item.id)
        row = existing.get(key)
        if row and row.status == "cancelled" and as_utc(row.retention_until) == expiry:
            status = "cancelled"
        details = {"title": item.title_internal, "destructive_cleanup_blocked": True}
        if persist:
            if row is None:
                row = RetentionCandidate(
                    id=uuid4(), workspace_id=workspace_id, object_type="content_text",
                    object_id=item.id, status=status, reason="text_retention",
                    retention_until=expiry, warning_at=warning_at, grace_until=grace_until,
                    details_json=details, attempts=0, created_at=now, updated_at=now, version=1,
                )
                db.add(row)
            elif row.status not in {"completed", "cancelled"}:
                row.status = status
                row.retention_until = expiry
                row.warning_at = warning_at
                row.grace_until = grace_until
                row.details_json = details
                row.updated_at = now
                row.version += 1
        output.append(candidate_out(
            candidate_id=row.id if row else None, object_type="content_text", object_id=item.id,
            status=status, reason="text_retention", expiry=expiry, warning_at=warning_at,
            grace_until=grace_until, details=details,
        ))
    return output, excluded_raw_voice


@router.get("/workspaces/{workspace_id}/retention", response_model=RetentionSummaryOut)
async def get_retention_summary(
    workspace_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> RetentionSummaryOut:
    workspace, _ = await require_workspace_membership(workspace_id, request, actor, db)
    policy = await ensure_policy(db, workspace_id)
    now = utc_now()
    await db.commit()
    media = list(await db.scalars(select(MediaAsset).where(
        MediaAsset.workspace_id == workspace_id,
        MediaAsset.deleted_at.is_(None),
        MediaAsset.kind.in_(MEDIA_KINDS),
    )))
    expiries = [as_utc(row.retention_until) for row in media if row.retention_until]
    candidate_rows = list(await db.scalars(select(RetentionCandidate).where(
        RetentionCandidate.workspace_id == workspace_id,
    )))
    counts: dict[str, int] = {}
    for row in candidate_rows:
        counts[row.status] = counts.get(row.status, 0) + 1
    last_seen = await db.scalar(
        select(func.max(Session.last_seen_at))
        .join(Membership, Membership.user_id == Session.user_id)
        .where(Membership.workspace_id == workspace_id)
    )
    last_activity = as_utc(last_seen) if last_seen else as_utc(workspace.updated_at)
    inactive_cleanup = last_activity + timedelta(
        days=policy.inactivity_days + policy.inactivity_grace_days
    )
    return RetentionSummaryOut(
        workspace_id=workspace_id,
        policy=policy_out(policy),
        media_count=len(media),
        media_bytes=sum(row.size_bytes for row in media),
        next_media_expiry_at=min(expiries).isoformat() if expiries else None,
        media_warning_count=sum(1 for expiry in expiries if now <= expiry <= now + timedelta(days=policy.warning_days)),
        candidate_counts=counts,
        text_candidate_count=sum(1 for row in candidate_rows if row.object_type == "content_text"),
        last_authenticated_activity_at=last_activity.isoformat(),
        inactive_cleanup_at=inactive_cleanup.isoformat(),
        blockers=[message for message in (
            "Физическая очистка выключена до отдельного подтверждения владельца."
            if not policy.cleanup_enabled else None,
            "Срок сырого голоса не утверждён; аудио не удаляется автоматически."
            if policy.raw_voice_days is None else None,
            "Удаление текста заблокировано до экспорта и проверки ссылок."
            if not policy.text_cleanup_enabled else None,
        ) if message],
    )


@router.patch("/workspaces/{workspace_id}/retention", response_model=RetentionPolicyOut)
async def update_retention_policy(
    workspace_id: UUID,
    payload: RetentionPolicyPatch,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> RetentionPolicyOut:
    _, membership = await require_workspace_membership(workspace_id, request, actor, db)
    require_role(membership, {"owner"}, request)
    policy = await ensure_policy(db, workspace_id)
    if policy.version != payload.version:
        raise api_error(409, "version_conflict", "Политика хранения уже изменилась.", request=request)
    if payload.text_cleanup_enabled is True:
        raise api_error(
            422,
            "text_retention_cleanup_not_available",
            "Удаление текста нельзя включить до появления экспорта и проверки ссылок.",
            request=request,
        )
    for key, value in payload.model_dump(exclude_unset=True, exclude={"version"}).items():
        setattr(policy, key, value)
    policy.updated_at = utc_now()
    policy.version += 1
    db.add(AuditLog(
        workspace_id=workspace_id, actor_user_id=actor.user.id,
        action="retention.policy.update", resource_type="retention_policy",
        resource_id=str(policy.id), metadata_json={
            "cleanup_enabled": policy.cleanup_enabled,
            "text_cleanup_enabled": policy.text_cleanup_enabled,
            "raw_voice_days": policy.raw_voice_days,
        }, created_at=utc_now(),
    ))
    await db.commit()
    return policy_out(policy)


@router.post("/workspaces/{workspace_id}/retention/scan", response_model=RetentionScanOut)
async def scan_retention(
    workspace_id: UUID,
    payload: RetentionScanRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> RetentionScanOut:
    _, membership = await require_workspace_membership(workspace_id, request, actor, db)
    require_role(membership, {"owner", "admin"}, request)
    policy = await ensure_policy(db, workspace_id)
    now = as_utc(payload.now) if payload.now else utc_now()
    candidates, excluded = await retention_candidates(
        db, workspace_id, policy, now, persist=not payload.dry_run
    )
    if not payload.dry_run:
        db.add(AuditLog(
            workspace_id=workspace_id, actor_user_id=actor.user.id,
            action="retention.scan", resource_type="workspace", resource_id=str(workspace_id),
            metadata_json={"candidate_count": len(candidates), "excluded_raw_voice": excluded},
            created_at=utc_now(),
        ))
    await db.commit()
    return RetentionScanOut(
        dry_run=payload.dry_run, workspace_id=workspace_id, candidates=candidates,
        excluded_raw_voice=excluded,
        message="Проверка выполнена без удаления данных." if payload.dry_run else "Очередь хранения обновлена; данные не удалялись.",
    )


@router.post("/workspaces/{workspace_id}/retention/{candidate_id}/retain", response_model=RetentionCandidateOut)
async def retain_candidate(
    workspace_id: UUID,
    candidate_id: UUID,
    payload: RetainRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> RetentionCandidateOut:
    _, membership = await require_workspace_membership(workspace_id, request, actor, db)
    require_role(membership, {"owner", "admin", "editor"}, request)
    row = await db.scalar(select(RetentionCandidate).where(
        RetentionCandidate.id == candidate_id,
        RetentionCandidate.workspace_id == workspace_id,
    ))
    if row is None or row.status == "completed":
        raise api_error(404, "retention_candidate_not_found", "Кандидат хранения не найден.", request=request)
    if payload.version is not None and row.version != payload.version:
        raise api_error(409, "version_conflict", "Статус хранения уже изменился.", request=request)
    now = utc_now()
    row.status = "cancelled"
    row.cancelled_at = now
    row.updated_at = now
    row.version += 1
    if row.object_type == "media":
        media = await db.scalar(select(MediaAsset).where(
            MediaAsset.id == row.object_id, MediaAsset.workspace_id == workspace_id,
        ))
        if media is not None and media.deleted_at is None:
            media.retention_until = max(as_utc(media.retention_until), now) + timedelta(days=payload.extend_days) if media.retention_until else now + timedelta(days=payload.extend_days)
            media.updated_at = now
            media.version += 1
            row.retention_until = media.retention_until
            row.warning_at = media.retention_until - timedelta(days=7)
            row.grace_until = media.retention_until + timedelta(days=7)
    await db.commit()
    details = row.details_json if isinstance(row.details_json, dict) else {}
    return candidate_out(
        candidate_id=row.id, object_type=row.object_type, object_id=row.object_id,
        status=row.status, reason=row.reason, expiry=as_utc(row.retention_until),
        warning_at=as_utc(row.warning_at), grace_until=as_utc(row.grace_until), details=details,
    )


@router.post("/workspaces/{workspace_id}/retention/execute-ready", response_model=ExecuteRetentionOut)
async def execute_retention(
    workspace_id: UUID,
    payload: ExecuteRetentionRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> ExecuteRetentionOut:
    _, membership = await require_workspace_membership(workspace_id, request, actor, db)
    require_role(membership, {"owner"}, request)
    policy = await ensure_policy(db, workspace_id)
    if not policy.cleanup_enabled:
        raise api_error(
            409, "retention_cleanup_disabled",
            "Физическая очистка выключена до отдельного подтверждения владельца.",
            request=request,
        )
    now = utc_now()
    rows = list(await db.scalars(
        select(RetentionCandidate).where(
            RetentionCandidate.workspace_id == workspace_id,
            RetentionCandidate.object_type == "media",
            RetentionCandidate.status == "ready",
            RetentionCandidate.grace_until <= now,
        ).order_by(RetentionCandidate.grace_until).limit(payload.limit)
    ))
    completed = 0
    failed = 0
    for row in rows:
        media = await db.scalar(select(MediaAsset).where(
            MediaAsset.id == row.object_id,
            MediaAsset.workspace_id == workspace_id,
        ))
        if media is None or media.deleted_at is not None:
            row.status = "completed"
            row.completed_at = now
            row.updated_at = now
            row.version += 1
            completed += 1
            continue
        row.attempts += 1
        try:
            await asyncio.to_thread(delete_s3_object, settings, media)
            media.deleted_at = now
            media.upload_status = "expired"
            media.processing_status = "expired"
            media.codec_metadata = {
                **(media.codec_metadata if isinstance(media.codec_metadata, dict) else {}),
                "retention_expired_at": now.isoformat(),
            }
            media.updated_at = now
            media.version += 1
            row.status = "completed"
            row.completed_at = now
            row.last_error = None
            completed += 1
        except ContentProviderError as exc:
            row.status = "failed"
            row.last_error = exc.code
            failed += 1
        row.updated_at = now
        row.version += 1
    db.add(AuditLog(
        workspace_id=workspace_id, actor_user_id=actor.user.id,
        action="retention.execute", resource_type="workspace", resource_id=str(workspace_id),
        metadata_json={"completed": completed, "failed": failed}, created_at=now,
    ))
    await db.commit()
    return ExecuteRetentionOut(
        completed=completed, failed=failed,
        message="Готовые внутренние медиа обработаны; внешние публикации не затрагивались.",
    )
