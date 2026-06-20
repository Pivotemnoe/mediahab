from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class Phase01Marker(Base):
    __tablename__ = "phase01_markers"

    key: Mapped[str] = mapped_column(primary_key=True)
    value: Mapped[str]


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(Text)
    display_name: Mapped[str] = mapped_column(String(160))
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    locale: Mapped[str] = mapped_column(String(16), default="ru")
    status: Mapped[str] = mapped_column(String(32), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
    version: Mapped[int] = mapped_column(Integer, default=1)


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    session_token_hash: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    csrf_token_hash: Mapped[str] = mapped_column(String(128))
    user_agent: Mapped[str | None] = mapped_column(Text)
    ip_hash: Mapped[str | None] = mapped_column(String(128))
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class EmailVerificationToken(Base):
    __tablename__ = "email_verification_tokens"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class PasswordResetToken(Base):
    __tablename__ = "password_reset_tokens"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(128), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    name: Mapped[str] = mapped_column(String(180))
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    owner_user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    timezone: Mapped[str] = mapped_column(String(80), default="Europe/Moscow")
    default_locale: Mapped[str] = mapped_column(String(16), default="ru")
    status: Mapped[str] = mapped_column(String(32), default="active", index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
    version: Mapped[int] = mapped_column(Integer, default=1)


class Role(Base):
    __tablename__ = "roles"

    key: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(Text)
    can_manage_billing: Mapped[bool] = mapped_column(Boolean, default=False)
    can_manage_members: Mapped[bool] = mapped_column(Boolean, default=False)
    can_publish: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Membership(Base):
    __tablename__ = "memberships"

    workspace_id: Mapped[UUID] = mapped_column(
        ForeignKey("workspaces.id"), primary_key=True
    )
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id"), primary_key=True)
    role_key: Mapped[str] = mapped_column(ForeignKey("roles.key"), index=True)
    publication_permission: Mapped[str] = mapped_column(String(32), default="allowed")
    invited_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
    version: Mapped[int] = mapped_column(Integer, default=1)


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    key: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
    version: Mapped[int] = mapped_column(Integer, default=1)


class Price(Base):
    __tablename__ = "prices"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    plan_id: Mapped[UUID] = mapped_column(ForeignKey("plans.id"), index=True)
    provider_key: Mapped[str] = mapped_column(String(80), default="mock")
    currency: Mapped[str] = mapped_column(String(3), default="RUB")
    amount_minor: Mapped[int] = mapped_column(Integer, default=0)
    interval: Mapped[str] = mapped_column(String(32), default="month")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Entitlement(Base):
    __tablename__ = "entitlements"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    plan_id: Mapped[UUID] = mapped_column(ForeignKey("plans.id"), index=True)
    key: Mapped[str] = mapped_column(String(120), index=True)
    value_json: Mapped[object] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(
        ForeignKey("workspaces.id"), unique=True, index=True
    )
    plan_id: Mapped[UUID] = mapped_column(ForeignKey("plans.id"), index=True)
    status: Mapped[str] = mapped_column(String(40), default="active")
    provider_key: Mapped[str] = mapped_column(String(80), default="mock")
    provider_customer_id: Mapped[str | None] = mapped_column(String(160))
    provider_subscription_id: Mapped[str | None] = mapped_column(String(160))
    current_period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancel_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    canceled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
    version: Mapped[int] = mapped_column(Integer, default=1)


class UsageEvent(Base):
    __tablename__ = "usage_events"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    key: Mapped[str] = mapped_column(String(120), index=True)
    quantity: Mapped[float] = mapped_column(Numeric(18, 4), default=0)
    source: Mapped[str] = mapped_column(String(80), default="system")
    metadata_json: Mapped[object | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class CheckoutSession(Base):
    __tablename__ = "checkout_sessions"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    plan_id: Mapped[UUID] = mapped_column(ForeignKey("plans.id"), index=True)
    provider_key: Mapped[str] = mapped_column(String(80), default="mock")
    status: Mapped[str] = mapped_column(String(40), default="pending_manual_contact")
    payment_captured: Mapped[bool] = mapped_column(Boolean, default=False)
    metadata_json: Mapped[object | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID | None] = mapped_column(ForeignKey("workspaces.id"), index=True)
    actor_user_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True)
    action: Mapped[str] = mapped_column(String(160), index=True)
    resource_type: Mapped[str] = mapped_column(String(120))
    resource_id: Mapped[str | None] = mapped_column(String(120))
    metadata_json: Mapped[object | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
