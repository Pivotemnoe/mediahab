from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from fastapi import Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.base import Membership, Session, User, Workspace
from app.db.session import get_session
from app.modules.auth.security import hash_secret, is_past
from app.modules.shared.errors import api_error


@dataclass
class Actor:
    user: User
    session: Session


async def get_current_actor(
    request: Request,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> Actor:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        raise api_error(401, "auth_required", "Authentication required.", request=request)

    session_token_hash = hash_secret(token)
    row = (
        await db.execute(
            select(Session, User)
            .join(User, User.id == Session.user_id)
            .where(Session.session_token_hash == session_token_hash)
        )
    ).first()
    if row is None:
        raise api_error(401, "auth_required", "Authentication required.", request=request)

    session, user = row
    if session.revoked_at is not None or is_past(session.expires_at):
        raise api_error(401, "session_revoked", "Session is no longer active.", request=request)
    if user.status != "active":
        raise api_error(403, "user_disabled", "User is not active.", request=request)
    return Actor(user=user, session=session)


async def require_csrf(
    request: Request,
    actor: Actor = Depends(get_current_actor),
    settings: Settings = Depends(get_settings),
) -> Actor:
    header_token = request.headers.get(settings.csrf_header_name)
    cookie_token = request.cookies.get(settings.csrf_cookie_name)
    if not header_token or not cookie_token or header_token != cookie_token:
        raise api_error(403, "csrf_required", "Valid CSRF token required.", request=request)
    if hash_secret(header_token) != actor.session.csrf_token_hash:
        raise api_error(403, "csrf_invalid", "Valid CSRF token required.", request=request)
    return actor


async def require_workspace_membership(
    workspace_id: UUID,
    request: Request,
    actor: Actor,
    db: AsyncSession,
) -> tuple[Workspace, Membership]:
    row = (
        await db.execute(
            select(Workspace, Membership)
            .join(Membership, Membership.workspace_id == Workspace.id)
            .where(
                Workspace.id == workspace_id,
                Workspace.deleted_at.is_(None),
                Workspace.status == "active",
                Membership.user_id == actor.user.id,
            )
        )
    ).first()
    if row is None:
        raise api_error(404, "workspace_not_found", "Workspace not found.", request=request)
    workspace, membership = row
    return workspace, membership


def require_role(
    membership: Membership,
    allowed: set[str],
    request: Request,
) -> None:
    if membership.role_key not in allowed:
        raise api_error(
            403,
            "role_denied",
            "Your workspace role does not allow this action.",
            {"required_roles": sorted(allowed)},
            request=request,
        )
