from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Membership, Session as DbSession, Workspace, utc_now
from app.db.session import get_session
from app.modules.auth.dependencies import Actor, get_current_actor, require_csrf
from app.modules.shared.errors import api_error

router = APIRouter()


class MeUserOut(BaseModel):
    id: UUID
    email: str
    display_name: str
    email_verified: bool


class MeWorkspaceOut(BaseModel):
    id: UUID
    name: str
    slug: str
    role: str


class MeResponse(BaseModel):
    user: MeUserOut
    workspaces: list[MeWorkspaceOut]


class SessionOut(BaseModel):
    id: UUID
    current: bool
    user_agent: str | None
    expires_at: str
    revoked_at: str | None
    last_seen_at: str


class SessionsResponse(BaseModel):
    sessions: list[SessionOut]


class MessageResponse(BaseModel):
    status: str
    message: str


@router.get("/me", response_model=MeResponse)
async def me(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> MeResponse:
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
    return MeResponse(
        user=MeUserOut(
            id=actor.user.id,
            email=actor.user.email,
            display_name=actor.user.display_name,
            email_verified=actor.user.email_verified_at is not None,
        ),
        workspaces=[
            MeWorkspaceOut(
                id=workspace.id,
                name=workspace.name,
                slug=workspace.slug,
                role=membership.role_key,
            )
            for workspace, membership in rows.all()
        ],
    )


@router.get("/me/sessions", response_model=SessionsResponse)
async def list_sessions(
    actor: Actor = Depends(get_current_actor),
    db: AsyncSession = Depends(get_session),
) -> SessionsResponse:
    sessions = await db.scalars(
        select(DbSession)
        .where(DbSession.user_id == actor.user.id)
        .order_by(DbSession.created_at.desc())
    )
    return SessionsResponse(
        sessions=[
            SessionOut(
                id=session.id,
                current=session.id == actor.session.id,
                user_agent=session.user_agent,
                expires_at=session.expires_at.isoformat(),
                revoked_at=session.revoked_at.isoformat() if session.revoked_at else None,
                last_seen_at=session.last_seen_at.isoformat(),
            )
            for session in sessions
        ]
    )


@router.delete("/me/sessions/{session_id}", response_model=MessageResponse)
async def revoke_session(
    session_id: UUID,
    request: Request,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    session = await db.get(DbSession, session_id)
    if session is None or session.user_id != actor.user.id:
        raise api_error(404, "session_not_found", "Session not found.", request=request)
    session.revoked_at = utc_now()
    await db.commit()
    return MessageResponse(status="ok", message="Session revoked.")
