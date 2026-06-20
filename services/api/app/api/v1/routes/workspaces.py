from __future__ import annotations

from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import AuditLog, Membership, Subscription, User, Workspace, utc_now
from app.db.session import get_session
from app.modules.auth.dependencies import (
    Actor,
    get_current_actor,
    require_csrf,
    require_role,
    require_workspace_membership,
)
from app.modules.auth.security import normalize_email
from app.modules.billing.catalog import ensure_catalog, get_plan_by_key
from app.modules.billing.service import current_team_seats, entitlement_value
from app.modules.shared.errors import api_error

router = APIRouter()


class WorkspaceCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=180)
    timezone: str = Field(default="Europe/Moscow", min_length=1, max_length=80)
    default_locale: str = Field(default="ru", min_length=2, max_length=16)


class WorkspaceUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=180)
    timezone: str | None = Field(default=None, min_length=1, max_length=80)
    default_locale: str | None = Field(default=None, min_length=2, max_length=16)


class WorkspaceOut(BaseModel):
    id: UUID
    name: str
    slug: str
    timezone: str
    default_locale: str
    role: str
    status: str


class WorkspaceListResponse(BaseModel):
    workspaces: list[WorkspaceOut]


class MemberOut(BaseModel):
    user_id: UUID
    email: str
    display_name: str
    role: str
    publication_permission: str
    accepted: bool


class MembersResponse(BaseModel):
    members: list[MemberOut]


class InvitationRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    role: str = Field(default="viewer", pattern="^(admin|editor|viewer)$")


class InvitationResponse(BaseModel):
    status: str
    member: MemberOut | None = None
    message: str


class MemberUpdateRequest(BaseModel):
    role: str | None = Field(default=None, pattern="^(admin|editor|viewer)$")
    publication_permission: str | None = Field(default=None, pattern="^(allowed|approval_required|denied)$")


class MessageResponse(BaseModel):
    status: str
    message: str


def workspace_out(workspace: Workspace, role: str) -> WorkspaceOut:
    return WorkspaceOut(
        id=workspace.id,
        name=workspace.name,
        slug=workspace.slug,
        timezone=workspace.timezone,
        default_locale=workspace.default_locale,
        role=role,
        status=workspace.status,
    )


async def list_actor_workspaces(db: AsyncSession, actor: Actor) -> list[WorkspaceOut]:
    rows = await db.execute(
        select(Workspace, Membership)
        .join(Membership, Membership.workspace_id == Workspace.id)
        .where(
            Membership.user_id == actor.user.id,
            Workspace.deleted_at.is_(None),
            Workspace.status == "active",
        )
        .order_by(Workspace.created_at)
    )
    return [workspace_out(workspace, membership.role_key) for workspace, membership in rows.all()]


async def unique_slug(db: AsyncSession, value: str) -> str:
    from app.modules.auth.security import slugify

    base = slugify(value)
    candidate = base
    index = 1
    while await db.scalar(select(Workspace.id).where(Workspace.slug == candidate)):
        index += 1
        candidate = f"{base}-{index}"
    return candidate


@router.get("/workspaces", response_model=WorkspaceListResponse)
async def list_workspaces(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> WorkspaceListResponse:
    return WorkspaceListResponse(workspaces=await list_actor_workspaces(db, actor))


@router.post("/workspaces", response_model=WorkspaceOut)
async def create_workspace(
    payload: WorkspaceCreateRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> WorkspaceOut:
    await ensure_catalog(db)
    workspace = Workspace(
        id=uuid4(),
        name=payload.name.strip(),
        slug=await unique_slug(db, payload.name),
        owner_user_id=actor.user.id,
        timezone=payload.timezone,
        default_locale=payload.default_locale,
        status="active",
        created_at=utc_now(),
        updated_at=utc_now(),
        version=1,
    )
    db.add(workspace)
    await db.flush()
    db.add(
        Membership(
            workspace_id=workspace.id,
            user_id=actor.user.id,
            role_key="owner",
            publication_permission="allowed",
            accepted_at=utc_now(),
            created_at=utc_now(),
            updated_at=utc_now(),
            version=1,
        )
    )
    free_plan = await get_plan_by_key(db, "free")
    if free_plan is None:
        raise api_error(500, "catalog_missing", "Default plan catalog is missing.", request=request)
    db.add(
        Subscription(
            workspace_id=workspace.id,
            plan_id=free_plan.id,
            status="active",
            provider_key="mock",
            current_period_start=utc_now(),
            created_at=utc_now(),
            updated_at=utc_now(),
            version=1,
        )
    )
    db.add(
        AuditLog(
            workspace_id=workspace.id,
            actor_user_id=actor.user.id,
            action="workspace.create",
            resource_type="workspace",
            resource_id=str(workspace.id),
            created_at=utc_now(),
        )
    )
    await db.commit()
    return workspace_out(workspace, "owner")


@router.get("/workspaces/{workspace_id}", response_model=WorkspaceOut)
async def get_workspace(
    workspace_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> WorkspaceOut:
    workspace, membership = await require_workspace_membership(workspace_id, request, actor, db)
    return workspace_out(workspace, membership.role_key)


@router.patch("/workspaces/{workspace_id}", response_model=WorkspaceOut)
async def update_workspace(
    workspace_id: UUID,
    payload: WorkspaceUpdateRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> WorkspaceOut:
    workspace, membership = await require_workspace_membership(workspace_id, request, actor, db)
    require_role(membership, {"owner", "admin"}, request)
    if payload.name is not None:
        workspace.name = payload.name.strip()
    if payload.timezone is not None:
        workspace.timezone = payload.timezone
    if payload.default_locale is not None:
        workspace.default_locale = payload.default_locale
    workspace.updated_at = utc_now()
    workspace.version += 1
    await db.commit()
    return workspace_out(workspace, membership.role_key)


@router.delete("/workspaces/{workspace_id}", response_model=MessageResponse)
async def delete_workspace(
    workspace_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    workspace, membership = await require_workspace_membership(workspace_id, request, actor, db)
    require_role(membership, {"owner"}, request)
    workspace.deleted_at = utc_now()
    workspace.status = "deleted"
    workspace.updated_at = utc_now()
    await db.commit()
    return MessageResponse(status="ok", message="Workspace deleted.")


@router.get("/workspaces/{workspace_id}/members", response_model=MembersResponse)
async def list_members(
    workspace_id: UUID,
    request: Request,
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> MembersResponse:
    await require_workspace_membership(workspace_id, request, actor, db)
    rows = await db.execute(
        select(Membership, User)
        .join(User, User.id == Membership.user_id)
        .where(Membership.workspace_id == workspace_id)
        .order_by(User.email)
    )
    return MembersResponse(
        members=[
            MemberOut(
                user_id=user.id,
                email=user.email,
                display_name=user.display_name,
                role=membership.role_key,
                publication_permission=membership.publication_permission,
                accepted=membership.accepted_at is not None,
            )
            for membership, user in rows.all()
        ]
    )


@router.post("/workspaces/{workspace_id}/invitations", response_model=InvitationResponse)
async def create_invitation(
    workspace_id: UUID,
    payload: InvitationRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> InvitationResponse:
    _, actor_membership = await require_workspace_membership(workspace_id, request, actor, db)
    require_role(actor_membership, {"owner", "admin"}, request)
    seats_max = await entitlement_value(db, workspace_id, "team.seats.max", 1)
    seats_used = await current_team_seats(db, workspace_id)
    if seats_used >= int(seats_max):
        raise api_error(
            402,
            "limit_exceeded",
            "Free-plan team seat limit reached.",
            {"entitlement": "team.seats.max", "limit": seats_max, "used": seats_used},
            request=request,
        )

    invited_user = await db.scalar(select(User).where(User.email == normalize_email(payload.email)))
    if invited_user is None:
        return InvitationResponse(
            status="pending",
            member=None,
            message="Mock invitation queued. Email delivery is not active in Phase 02.",
        )

    existing = await db.get(Membership, {"workspace_id": workspace_id, "user_id": invited_user.id})
    if existing is not None:
        raise api_error(409, "member_exists", "User is already a workspace member.", request=request)
    membership = Membership(
        workspace_id=workspace_id,
        user_id=invited_user.id,
        role_key=payload.role,
        publication_permission="approval_required",
        invited_by=actor.user.id,
        accepted_at=None,
        created_at=utc_now(),
        updated_at=utc_now(),
        version=1,
    )
    db.add(membership)
    await db.commit()
    return InvitationResponse(
        status="pending",
        member=MemberOut(
            user_id=invited_user.id,
            email=invited_user.email,
            display_name=invited_user.display_name,
            role=membership.role_key,
            publication_permission=membership.publication_permission,
            accepted=False,
        ),
        message="Mock invitation created.",
    )


@router.patch("/workspaces/{workspace_id}/members/{user_id}", response_model=MemberOut)
async def update_member(
    workspace_id: UUID,
    user_id: UUID,
    payload: MemberUpdateRequest,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> MemberOut:
    workspace, actor_membership = await require_workspace_membership(workspace_id, request, actor, db)
    require_role(actor_membership, {"owner", "admin"}, request)
    membership = await db.get(Membership, {"workspace_id": workspace.id, "user_id": user_id})
    user = await db.get(User, user_id)
    if membership is None or user is None:
        raise api_error(404, "member_not_found", "Member not found.", request=request)
    if user_id == workspace.owner_user_id:
        raise api_error(403, "owner_role_locked", "Owner role cannot be changed here.", request=request)
    if payload.role is not None:
        membership.role_key = payload.role
    if payload.publication_permission is not None:
        membership.publication_permission = payload.publication_permission
    membership.updated_at = utc_now()
    membership.version += 1
    await db.commit()
    return MemberOut(
        user_id=user.id,
        email=user.email,
        display_name=user.display_name,
        role=membership.role_key,
        publication_permission=membership.publication_permission,
        accepted=membership.accepted_at is not None,
    )


@router.delete("/workspaces/{workspace_id}/members/{user_id}", response_model=MessageResponse)
async def delete_member(
    workspace_id: UUID,
    user_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    workspace, actor_membership = await require_workspace_membership(workspace_id, request, actor, db)
    require_role(actor_membership, {"owner", "admin"}, request)
    if user_id == workspace.owner_user_id:
        raise api_error(403, "owner_role_locked", "Owner membership cannot be removed.", request=request)
    membership = await db.get(Membership, {"workspace_id": workspace.id, "user_id": user_id})
    if membership is None:
        raise api_error(404, "member_not_found", "Member not found.", request=request)
    await db.delete(membership)
    await db.commit()
    return MessageResponse(status="ok", message="Member removed.")
