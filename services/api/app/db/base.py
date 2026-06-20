from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
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


class Project(Base):
    __tablename__ = "projects"
    __table_args__ = (
        UniqueConstraint("workspace_id", "slug", name="uq_projects_workspace_slug"),
        UniqueConstraint("workspace_id", "preset_key", name="uq_projects_workspace_preset_key"),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    slug: Mapped[str] = mapped_column(String(160), index=True)
    preset_key: Mapped[str | None] = mapped_column(String(160), index=True)
    active_version_id: Mapped[UUID | None] = mapped_column()
    status: Mapped[str] = mapped_column(String(32), default="active", index=True)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
    version: Mapped[int] = mapped_column(Integer, default=1)


class ProjectVersion(Base):
    __tablename__ = "project_versions"
    __table_args__ = (
        UniqueConstraint("project_id", "version_number", name="uq_project_versions_project_number"),
        UniqueConstraint("project_id", "checksum", name="uq_project_versions_project_checksum"),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    version_number: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str | None] = mapped_column(Text)
    language: Mapped[str] = mapped_column(String(20), default="ru-RU")
    content_domain: Mapped[str | None] = mapped_column(String(120))
    tone_config: Mapped[object] = mapped_column(JSON)
    ai_mode_default: Mapped[str] = mapped_column(String(32), default="editor")
    editing_strength: Mapped[object] = mapped_column(JSON)
    humor_config: Mapped[object] = mapped_column(JSON)
    cta_config: Mapped[object] = mapped_column(JSON)
    provider_preferences: Mapped[object] = mapped_column(JSON)
    character_count_policy: Mapped[object] = mapped_column(JSON)
    branding: Mapped[object | None] = mapped_column(JSON)
    connected_platform_types: Mapped[object | None] = mapped_column(JSON)
    example_retrieval: Mapped[object | None] = mapped_column(JSON)
    source_kind: Mapped[str] = mapped_column(String(40), default="manual")
    source_payload: Mapped[object | None] = mapped_column(JSON)
    checksum: Mapped[str] = mapped_column(String(64), index=True)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class InputSchema(Base):
    __tablename__ = "input_schemas"
    __table_args__ = (
        UniqueConstraint("workspace_id", "checksum", name="uq_input_schemas_workspace_checksum"),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    schema_version: Mapped[str] = mapped_column(String(40), default="1.0")
    json_schema: Mapped[object] = mapped_column(JSON)
    ui_schema: Mapped[object] = mapped_column(JSON)
    checksum: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Rubric(Base):
    __tablename__ = "rubrics"
    __table_args__ = (
        UniqueConstraint("project_id", "slug", name="uq_rubrics_project_slug"),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    slug: Mapped[str] = mapped_column(String(160), index=True)
    active_version_id: Mapped[UUID | None] = mapped_column()
    status: Mapped[str] = mapped_column(String(32), default="active", index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
    version: Mapped[int] = mapped_column(Integer, default=1)


class RubricVersion(Base):
    __tablename__ = "rubric_versions"
    __table_args__ = (
        UniqueConstraint("rubric_id", "version_number", name="uq_rubric_versions_rubric_number"),
        UniqueConstraint("rubric_id", "checksum", name="uq_rubric_versions_rubric_checksum"),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    rubric_id: Mapped[UUID] = mapped_column(ForeignKey("rubrics.id"), index=True)
    version_number: Mapped[int] = mapped_column(Integer)
    name: Mapped[str] = mapped_column(String(160))
    description: Mapped[str | None] = mapped_column(Text)
    input_schema_id: Mapped[UUID] = mapped_column(ForeignKey("input_schemas.id"), index=True)
    ui_schema: Mapped[object] = mapped_column(JSON)
    ai_mode: Mapped[str] = mapped_column(String(32), default="editor")
    editorial_min_chars: Mapped[int | None] = mapped_column(Integer)
    editorial_max_chars: Mapped[int | None] = mapped_column(Integer)
    generation_pipeline: Mapped[object] = mapped_column(JSON)
    media_policy: Mapped[object] = mapped_column(JSON)
    rating_policy: Mapped[object] = mapped_column(JSON)
    generated_fields: Mapped[object] = mapped_column(JSON)
    platform_overrides: Mapped[object | None] = mapped_column(JSON)
    source_payload: Mapped[object | None] = mapped_column(JSON)
    checksum: Mapped[str] = mapped_column(String(64), index=True)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class ProjectRule(Base):
    __tablename__ = "project_rules"
    __table_args__ = (UniqueConstraint("project_id", "slug", name="uq_project_rules_project_slug"),)

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    slug: Mapped[str] = mapped_column(String(160), index=True)
    active_version_id: Mapped[UUID | None] = mapped_column()
    status: Mapped[str] = mapped_column(String(32), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class RuleVersion(Base):
    __tablename__ = "rule_versions"
    __table_args__ = (UniqueConstraint("rule_id", "version_number", name="uq_rule_versions_rule_number"),)

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    rule_id: Mapped[UUID] = mapped_column(ForeignKey("project_rules.id"), index=True)
    version_number: Mapped[int] = mapped_column(Integer)
    scope: Mapped[str] = mapped_column(String(80), default="project")
    content: Mapped[str] = mapped_column(Text)
    structured_settings: Mapped[object | None] = mapped_column(JSON)
    checksum: Mapped[str] = mapped_column(String(64), index=True)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Prompt(Base):
    __tablename__ = "prompts"
    __table_args__ = (UniqueConstraint("project_id", "slug", name="uq_prompts_project_slug"),)

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    slug: Mapped[str] = mapped_column(String(160), index=True)
    active_version_id: Mapped[UUID | None] = mapped_column()
    status: Mapped[str] = mapped_column(String(32), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class PromptVersion(Base):
    __tablename__ = "prompt_versions"
    __table_args__ = (UniqueConstraint("prompt_id", "version_number", name="uq_prompt_versions_prompt_number"),)

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    prompt_id: Mapped[UUID] = mapped_column(ForeignKey("prompts.id"), index=True)
    version_number: Mapped[int] = mapped_column(Integer)
    scope: Mapped[str] = mapped_column(String(80), default="project")
    content: Mapped[str] = mapped_column(Text)
    structured_settings: Mapped[object | None] = mapped_column(JSON)
    checksum: Mapped[str] = mapped_column(String(64), index=True)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Template(Base):
    __tablename__ = "templates"
    __table_args__ = (UniqueConstraint("project_id", "slug", name="uq_templates_project_slug"),)

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    slug: Mapped[str] = mapped_column(String(160), index=True)
    active_version_id: Mapped[UUID | None] = mapped_column()
    status: Mapped[str] = mapped_column(String(32), default="active")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class TemplateVersion(Base):
    __tablename__ = "template_versions"
    __table_args__ = (UniqueConstraint("template_id", "version_number", name="uq_template_versions_template_number"),)

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    template_id: Mapped[UUID] = mapped_column(ForeignKey("templates.id"), index=True)
    version_number: Mapped[int] = mapped_column(Integer)
    scope: Mapped[str] = mapped_column(String(80), default="project")
    content: Mapped[str] = mapped_column(Text)
    structured_settings: Mapped[object | None] = mapped_column(JSON)
    checksum: Mapped[str] = mapped_column(String(64), index=True)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class PlatformOverride(Base):
    __tablename__ = "platform_overrides"
    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "project_id",
            "rubric_id",
            "platform_key",
            name="uq_platform_overrides_scope_platform",
        ),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    rubric_id: Mapped[UUID | None] = mapped_column(ForeignKey("rubrics.id"), index=True)
    platform_key: Mapped[str] = mapped_column(String(80), index=True)
    overrides_json: Mapped[object] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class RubricSuggestion(Base):
    __tablename__ = "rubric_suggestions"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    project_id: Mapped[UUID | None] = mapped_column(ForeignKey("projects.id"), index=True)
    prompt: Mapped[str] = mapped_column(Text)
    suggestions_json: Mapped[object] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(32), default="draft", index=True)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
