from __future__ import annotations

from datetime import timedelta
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.db.base import (
    AuditLog,
    EmailVerificationToken,
    Membership,
    PasswordResetToken,
    Session as DbSession,
    Subscription,
    User,
    Workspace,
    utc_now,
)
from app.db.session import get_session
from app.modules.auth.dependencies import Actor, get_current_actor, require_csrf
from app.modules.auth.rate_limit import RateLimiter
from app.modules.auth.security import (
    expires_in,
    generate_secret,
    hash_optional_secret,
    hash_password,
    hash_secret,
    is_past,
    normalize_email,
    slugify,
    verify_password,
)
from app.modules.billing.catalog import ensure_catalog, get_plan_by_key
from app.modules.shared.errors import api_error

router = APIRouter()


class UserOut(BaseModel):
    id: UUID
    email: str
    display_name: str
    email_verified: bool


class WorkspaceOut(BaseModel):
    id: UUID
    name: str
    slug: str
    role: str


class AuthResponse(BaseModel):
    user: UserOut
    workspace: WorkspaceOut | None = None
    csrf_token: str
    email_verification_required: bool
    mock_email_verification_token: str | None = None


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=10, max_length=256)
    display_name: str = Field(min_length=1, max_length=160)
    workspace_name: str = Field(min_length=1, max_length=180)


class LoginRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=1, max_length=256)


class TokenRequest(BaseModel):
    token: str = Field(min_length=16, max_length=256)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=16, max_length=256)
    new_password: str = Field(min_length=10, max_length=256)


class MessageResponse(BaseModel):
    status: str
    message: str
    mock_token: str | None = None


def user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        email_verified=user.email_verified_at is not None,
    )


def workspace_out(workspace: Workspace, role: str) -> WorkspaceOut:
    return WorkspaceOut(
        id=workspace.id,
        name=workspace.name,
        slug=workspace.slug,
        role=role,
    )


def set_auth_cookies(
    response: Response,
    session_token: str,
    csrf_token: str,
    settings: Settings,
) -> None:
    max_age = settings.session_ttl_hours * 60 * 60
    response.set_cookie(
        settings.session_cookie_name,
        session_token,
        max_age=max_age,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        settings.csrf_cookie_name,
        csrf_token,
        max_age=max_age,
        httponly=False,
        secure=settings.session_cookie_secure,
        samesite="lax",
        path="/",
    )


def clear_auth_cookies(response: Response, settings: Settings) -> None:
    response.delete_cookie(settings.session_cookie_name, path="/")
    response.delete_cookie(settings.csrf_cookie_name, path="/")


def apply_auth_rate_limit(
    request: Request,
    settings: Settings,
    bucket: str,
    identifier: str,
) -> None:
    limiter: RateLimiter = request.app.state.rate_limiter
    client_host = request.client.host if request.client else "unknown"
    key = f"{bucket}:{client_host}:{identifier}"
    if not limiter.allow(
        key,
        settings.auth_rate_limit_attempts,
        settings.auth_rate_limit_window_seconds,
    ):
        raise api_error(
            429,
            "rate_limited",
            "Too many attempts. Try again later.",
            request=request,
        )


async def unique_workspace_slug(session: AsyncSession, workspace_name: str) -> str:
    base = slugify(workspace_name)
    candidate = base
    index = 1
    while await session.scalar(select(Workspace.id).where(Workspace.slug == candidate)):
        index += 1
        candidate = f"{base}-{index}"
    return candidate


async def create_email_verification_token(
    session: AsyncSession, user_id: UUID
) -> str:
    token = generate_secret()
    session.add(
        EmailVerificationToken(
            user_id=user_id,
            token_hash=hash_secret(token),
            expires_at=utc_now() + timedelta(hours=24),
            created_at=utc_now(),
        )
    )
    return token


async def create_browser_session(
    session: AsyncSession,
    user_id: UUID,
    request: Request,
    settings: Settings,
) -> tuple[str, str, DbSession]:
    session_token = generate_secret()
    csrf_token = generate_secret()
    db_session = DbSession(
        user_id=user_id,
        session_token_hash=hash_secret(session_token),
        csrf_token_hash=hash_secret(csrf_token),
        user_agent=request.headers.get("user-agent"),
        ip_hash=hash_optional_secret(request.client.host if request.client else None),
        expires_at=expires_in(settings.session_ttl_hours),
        last_seen_at=utc_now(),
        created_at=utc_now(),
    )
    session.add(db_session)
    await session.flush()
    return session_token, csrf_token, db_session


@router.post("/register", response_model=AuthResponse)
async def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> AuthResponse:
    email = normalize_email(payload.email)
    apply_auth_rate_limit(request, settings, "register", email)
    await ensure_catalog(db)

    if await db.scalar(select(User.id).where(User.email == email)):
        raise api_error(409, "registration_failed", "Unable to register this account.", request=request)

    user = User(
        id=uuid4(),
        email=email,
        password_hash=hash_password(payload.password),
        display_name=payload.display_name.strip(),
        locale="ru",
        status="active",
        created_at=utc_now(),
        updated_at=utc_now(),
        version=1,
    )
    db.add(user)
    await db.flush()

    workspace = Workspace(
        id=uuid4(),
        name=payload.workspace_name.strip(),
        slug=await unique_workspace_slug(db, payload.workspace_name),
        owner_user_id=user.id,
        timezone="Europe/Moscow",
        default_locale="ru",
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
            user_id=user.id,
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
            actor_user_id=user.id,
            action="auth.register",
            resource_type="user",
            resource_id=str(user.id),
            metadata_json={"workspace_id": str(workspace.id)},
            created_at=utc_now(),
        )
    )
    verification_token = await create_email_verification_token(db, user.id)
    session_token, csrf_token, _ = await create_browser_session(db, user.id, request, settings)

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise api_error(409, "registration_failed", "Unable to register this account.", request=request) from exc

    set_auth_cookies(response, session_token, csrf_token, settings)
    return AuthResponse(
        user=user_out(user),
        workspace=workspace_out(workspace, "owner"),
        csrf_token=csrf_token,
        email_verification_required=True,
        mock_email_verification_token=verification_token if settings.app_env != "production" else None,
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> AuthResponse:
    email = normalize_email(payload.email)
    apply_auth_rate_limit(request, settings, "login", email)
    user = await db.scalar(select(User).where(User.email == email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise api_error(401, "invalid_credentials", "Invalid email or password.", request=request)

    session_token, csrf_token, _ = await create_browser_session(db, user.id, request, settings)
    db.add(
        AuditLog(
            workspace_id=None,
            actor_user_id=user.id,
            action="auth.login",
            resource_type="user",
            resource_id=str(user.id),
            created_at=utc_now(),
        )
    )
    await db.commit()
    set_auth_cookies(response, session_token, csrf_token, settings)
    return AuthResponse(
        user=user_out(user),
        csrf_token=csrf_token,
        email_verification_required=user.email_verified_at is None,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    response: Response,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    actor.session.revoked_at = utc_now()
    await db.commit()
    clear_auth_cookies(response, settings)
    return MessageResponse(status="ok", message="Logged out.")


@router.post("/logout-all", response_model=MessageResponse)
async def logout_all(
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    sessions = await db.scalars(
        select(DbSession).where(DbSession.user_id == actor.user.id, DbSession.revoked_at.is_(None))
    )
    now = utc_now()
    for session in sessions:
        session.revoked_at = now
    await db.commit()
    return MessageResponse(status="ok", message="All sessions revoked.")


@router.post("/refresh", response_model=AuthResponse)
async def refresh(
    request: Request,
    response: Response,
    actor: Actor = Depends(require_csrf),
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> AuthResponse:
    session_token = generate_secret()
    csrf_token = generate_secret()
    actor.session.session_token_hash = hash_secret(session_token)
    actor.session.csrf_token_hash = hash_secret(csrf_token)
    actor.session.expires_at = expires_in(settings.session_ttl_hours)
    actor.session.last_seen_at = utc_now()
    await db.commit()
    set_auth_cookies(response, session_token, csrf_token, settings)
    return AuthResponse(
        user=user_out(actor.user),
        csrf_token=csrf_token,
        email_verification_required=actor.user.email_verified_at is None,
    )


@router.post("/verify-email", response_model=MessageResponse)
async def verify_email(
    payload: TokenRequest,
    request: Request,
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    token_hash = hash_secret(payload.token)
    row = (
        await db.execute(
            select(EmailVerificationToken, User)
            .join(User, User.id == EmailVerificationToken.user_id)
            .where(EmailVerificationToken.token_hash == token_hash)
        )
    ).first()
    if row is None:
        raise api_error(400, "token_invalid", "Verification token is invalid.", request=request)
    token, user = row
    if token.consumed_at is not None or is_past(token.expires_at):
        raise api_error(400, "token_invalid", "Verification token is invalid.", request=request)
    token.consumed_at = utc_now()
    user.email_verified_at = utc_now()
    user.updated_at = utc_now()
    await db.commit()
    return MessageResponse(status="ok", message="Email verified.")


@router.post("/resend-verification", response_model=MessageResponse)
async def resend_verification(
    payload: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    email = normalize_email(payload.email)
    apply_auth_rate_limit(request, settings, "resend-verification", email)
    user = await db.scalar(select(User).where(User.email == email))
    token = None
    if user is not None and user.email_verified_at is None:
        token = await create_email_verification_token(db, user.id)
        await db.commit()
    return MessageResponse(
        status="ok",
        message="If the account exists, a verification message will be sent.",
        mock_token=token if settings.app_env != "production" else None,
    )


@router.post("/forgot-password", response_model=MessageResponse)
async def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_session),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    email = normalize_email(payload.email)
    apply_auth_rate_limit(request, settings, "forgot-password", email)
    user = await db.scalar(select(User).where(User.email == email))
    token = None
    if user is not None:
        token = generate_secret()
        db.add(
            PasswordResetToken(
                user_id=user.id,
                token_hash=hash_secret(token),
                expires_at=utc_now() + timedelta(hours=2),
                created_at=utc_now(),
            )
        )
        await db.commit()
    return MessageResponse(
        status="ok",
        message="If the account exists, password reset instructions will be sent.",
        mock_token=token if settings.app_env != "production" else None,
    )


@router.post("/reset-password", response_model=MessageResponse)
async def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_session),
) -> MessageResponse:
    token_hash = hash_secret(payload.token)
    row = (
        await db.execute(
            select(PasswordResetToken, User)
            .join(User, User.id == PasswordResetToken.user_id)
            .where(PasswordResetToken.token_hash == token_hash)
        )
    ).first()
    if row is None:
        raise api_error(400, "token_invalid", "Reset token is invalid.", request=request)
    token, user = row
    if token.consumed_at is not None or is_past(token.expires_at):
        raise api_error(400, "token_invalid", "Reset token is invalid.", request=request)

    token.consumed_at = utc_now()
    user.password_hash = hash_password(payload.new_password)
    user.updated_at = utc_now()
    sessions = await db.scalars(
        select(DbSession).where(DbSession.user_id == user.id, DbSession.revoked_at.is_(None))
    )
    now = utc_now()
    for session in sessions:
        session.revoked_at = now
    await db.commit()
    return MessageResponse(status="ok", message="Password reset.")

