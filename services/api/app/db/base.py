from __future__ import annotations

from datetime import datetime, timezone
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    BigInteger,
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


class ExamplePost(Base):
    __tablename__ = "example_posts"
    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "project_id",
            "dedupe_hash",
            name="uq_example_posts_workspace_project_hash",
        ),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    rubric_id: Mapped[UUID | None] = mapped_column(ForeignKey("rubrics.id"), index=True)
    source_type: Mapped[str] = mapped_column(String(40), default="manual", index=True)
    source_external_id: Mapped[str | None] = mapped_column(String(220), index=True)
    title: Mapped[str | None] = mapped_column(String(240))
    text: Mapped[str] = mapped_column(Text)
    normalized_text: Mapped[str] = mapped_column(Text)
    character_count: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(40), default="pending_review", index=True)
    labels_json: Mapped[object] = mapped_column(JSON)
    manual_quality_score: Mapped[int | None] = mapped_column(Integer)
    dedupe_hash: Mapped[str] = mapped_column(String(64), index=True)
    reviewed_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class ExampleMetric(Base):
    __tablename__ = "example_metrics"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    example_post_id: Mapped[UUID] = mapped_column(ForeignKey("example_posts.id"), index=True)
    views: Mapped[int | None] = mapped_column(Integer)
    reactions: Mapped[int | None] = mapped_column(Integer)
    comments: Mapped[int | None] = mapped_column(Integer)
    shares: Mapped[int | None] = mapped_column(Integer)
    engagement_rate: Mapped[object | None] = mapped_column(Numeric(10, 4))
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class ExampleEmbedding(Base):
    __tablename__ = "example_embeddings"
    __table_args__ = (
        UniqueConstraint(
            "example_post_id",
            "provider_key",
            "model_id",
            "content_hash",
            name="uq_example_embeddings_example_provider_hash",
        ),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    example_post_id: Mapped[UUID] = mapped_column(ForeignKey("example_posts.id"), index=True)
    provider_key: Mapped[str] = mapped_column(String(80), default="mock")
    model_id: Mapped[str] = mapped_column(String(160), default="mock-embedding-v1")
    dimensions: Mapped[int] = mapped_column(Integer, default=16)
    embedding_json: Mapped[object] = mapped_column(JSON)
    content_hash: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class RejectedPattern(Base):
    __tablename__ = "rejected_patterns"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    project_id: Mapped[UUID | None] = mapped_column(ForeignKey("projects.id"), index=True)
    rubric_id: Mapped[UUID | None] = mapped_column(ForeignKey("rubrics.id"), index=True)
    pattern_type: Mapped[str] = mapped_column(String(80), default="phrase")
    text_or_regex: Mapped[str] = mapped_column(Text)
    explanation: Mapped[str | None] = mapped_column(Text)
    severity: Mapped[str] = mapped_column(String(40), default="warning")
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class ContentItem(Base):
    __tablename__ = "content_items"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    rubric_id: Mapped[UUID] = mapped_column(ForeignKey("rubrics.id"), index=True)
    rubric_version_id: Mapped[UUID] = mapped_column(ForeignKey("rubric_versions.id"), index=True)
    project_version_id: Mapped[UUID] = mapped_column(ForeignKey("project_versions.id"), index=True)
    title_internal: Mapped[str] = mapped_column(String(200))
    status: Mapped[str] = mapped_column(String(40), default="draft", index=True)
    current_master_revision_id: Mapped[UUID | None] = mapped_column()
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    assigned_to: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"), index=True)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
    version: Mapped[int] = mapped_column(Integer, default=1)


class ContentBlock(Base):
    __tablename__ = "content_blocks"
    __table_args__ = (
        UniqueConstraint(
            "content_item_id",
            "field_key",
            "group_key",
            "group_index",
            name="uq_content_blocks_item_field_group",
        ),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    content_item_id: Mapped[UUID] = mapped_column(ForeignKey("content_items.id"), index=True)
    field_key: Mapped[str] = mapped_column(String(160), index=True)
    group_key: Mapped[str | None] = mapped_column(String(160), index=True)
    group_index: Mapped[int | None] = mapped_column(Integer)
    source_type: Mapped[str] = mapped_column(String(40), default="user_text", index=True)
    value_json: Mapped[object] = mapped_column(JSON)
    transcript_text: Mapped[str | None] = mapped_column(Text)
    is_locked: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    source_media_id: Mapped[UUID | None] = mapped_column(ForeignKey("media_assets.id"), index=True)
    revision_number: Mapped[int] = mapped_column(Integer, default=1)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    updated_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class LockedFact(Base):
    __tablename__ = "locked_facts"
    __table_args__ = (
        UniqueConstraint("content_item_id", "fact_key", name="uq_locked_facts_item_key"),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    content_item_id: Mapped[UUID] = mapped_column(ForeignKey("content_items.id"), index=True)
    fact_key: Mapped[str] = mapped_column(String(200), index=True)
    value_json: Mapped[object] = mapped_column(JSON)
    source_block_id: Mapped[UUID] = mapped_column(ForeignKey("content_blocks.id"), index=True)
    locked_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    locked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class ContentRevision(Base):
    __tablename__ = "content_revisions"
    __table_args__ = (
        UniqueConstraint("content_item_id", "revision_number", name="uq_content_revisions_item_number"),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    content_item_id: Mapped[UUID] = mapped_column(ForeignKey("content_items.id"), index=True)
    revision_number: Mapped[int] = mapped_column(Integer)
    revision_type: Mapped[str] = mapped_column(String(40), default="user_edit", index=True)
    text: Mapped[str] = mapped_column(Text, default="")
    structured_document: Mapped[object] = mapped_column(JSON)
    character_count: Mapped[int] = mapped_column(Integer, default=0)
    generation_run_id: Mapped[UUID | None] = mapped_column()
    parent_revision_id: Mapped[UUID | None] = mapped_column(ForeignKey("content_revisions.id"))
    approved_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    storage_key: Mapped[str] = mapped_column(String(500), unique=True, index=True)
    bucket: Mapped[str] = mapped_column(String(160))
    kind: Mapped[str] = mapped_column(String(40), index=True)
    mime_type: Mapped[str] = mapped_column(String(160))
    size_bytes: Mapped[int] = mapped_column(BigInteger, default=0)
    checksum: Mapped[str | None] = mapped_column(String(128), index=True)
    width: Mapped[int | None] = mapped_column(Integer)
    height: Mapped[int | None] = mapped_column(Integer)
    duration_ms: Mapped[int | None] = mapped_column(Integer)
    codec_metadata: Mapped[object | None] = mapped_column(JSON)
    upload_status: Mapped[str] = mapped_column(String(40), default="pending", index=True)
    processing_status: Mapped[str] = mapped_column(String(40), default="pending", index=True)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    retention_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
    version: Mapped[int] = mapped_column(Integer, default=1)


class ContentMedia(Base):
    __tablename__ = "content_media"
    __table_args__ = (
        UniqueConstraint("content_item_id", "media_asset_id", name="uq_content_media_item_asset"),
        UniqueConstraint("content_item_id", "sort_order", name="uq_content_media_item_order"),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    content_item_id: Mapped[UUID] = mapped_column(ForeignKey("content_items.id"), index=True)
    media_asset_id: Mapped[UUID] = mapped_column(ForeignKey("media_assets.id"), index=True)
    role: Mapped[str] = mapped_column(String(80), default="body")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    caption: Mapped[str | None] = mapped_column(Text)
    crop_metadata: Mapped[object | None] = mapped_column(JSON)
    cover_metadata: Mapped[object | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class VoiceAsset(Base):
    __tablename__ = "voice_assets"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    media_asset_id: Mapped[UUID] = mapped_column(ForeignKey("media_assets.id"), unique=True, index=True)
    content_item_id: Mapped[UUID | None] = mapped_column(ForeignKey("content_items.id"), index=True)
    content_block_id: Mapped[UUID | None] = mapped_column(ForeignKey("content_blocks.id"), index=True)
    recording_metadata: Mapped[object | None] = mapped_column(JSON)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class TranscriptionRun(Base):
    __tablename__ = "transcription_runs"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    content_item_id: Mapped[UUID] = mapped_column(ForeignKey("content_items.id"), index=True)
    content_block_id: Mapped[UUID] = mapped_column(ForeignKey("content_blocks.id"), index=True)
    media_asset_id: Mapped[UUID] = mapped_column(ForeignKey("media_assets.id"), index=True)
    voice_asset_id: Mapped[UUID | None] = mapped_column(ForeignKey("voice_assets.id"), index=True)
    provider_key: Mapped[str] = mapped_column(String(80), default="mock")
    status: Mapped[str] = mapped_column(String(40), default="queued", index=True)
    transcript_text: Mapped[str | None] = mapped_column(Text)
    corrected_text: Mapped[str | None] = mapped_column(Text)
    confidence_json: Mapped[object | None] = mapped_column(JSON)
    error_code: Mapped[str | None] = mapped_column(String(120))
    error_message: Mapped[str | None] = mapped_column(Text)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    accepted_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class ProviderConfig(Base):
    __tablename__ = "provider_configs"
    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "provider_family",
            "provider_key",
            name="uq_provider_configs_workspace_family_key",
        ),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID | None] = mapped_column(ForeignKey("workspaces.id"), index=True)
    provider_family: Mapped[str] = mapped_column(String(80), index=True)
    provider_key: Mapped[str] = mapped_column(String(80), index=True)
    encrypted_credentials_json: Mapped[object | None] = mapped_column(JSON)
    configuration_json: Mapped[object] = mapped_column(JSON)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class GenerationRun(Base):
    __tablename__ = "generation_runs"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    rubric_id: Mapped[UUID] = mapped_column(ForeignKey("rubrics.id"), index=True)
    content_item_id: Mapped[UUID] = mapped_column(ForeignKey("content_items.id"), index=True)
    task_type: Mapped[str] = mapped_column(String(80), index=True)
    provider_key: Mapped[str] = mapped_column(String(80), default="mock", index=True)
    model_id: Mapped[str] = mapped_column(String(160), default="mock-editor-v1")
    status: Mapped[str] = mapped_column(String(40), default="queued", index=True)
    context_manifest_json: Mapped[object] = mapped_column(JSON)
    request_metadata_json: Mapped[object | None] = mapped_column(JSON)
    response_json: Mapped[object | None] = mapped_column(JSON)
    retrieved_example_ids: Mapped[object] = mapped_column(JSON)
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    input_tokens: Mapped[int | None] = mapped_column(Integer)
    output_tokens: Mapped[int | None] = mapped_column(Integer)
    input_characters: Mapped[int | None] = mapped_column(Integer)
    output_characters: Mapped[int | None] = mapped_column(Integer)
    cost_estimate_micro_usd: Mapped[int | None] = mapped_column(Integer)
    error_code: Mapped[str | None] = mapped_column(String(120))
    error_message: Mapped[str | None] = mapped_column(Text)
    retry_count: Mapped[int] = mapped_column(Integer, default=0)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class GenerationStep(Base):
    __tablename__ = "generation_steps"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    generation_run_id: Mapped[UUID] = mapped_column(ForeignKey("generation_runs.id"), index=True)
    step_type: Mapped[str] = mapped_column(String(80), index=True)
    provider_key: Mapped[str | None] = mapped_column(String(80))
    model_id: Mapped[str | None] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(String(40), default="completed", index=True)
    input_metadata_json: Mapped[object | None] = mapped_column(JSON)
    output_metadata_json: Mapped[object | None] = mapped_column(JSON)
    latency_ms: Mapped[int | None] = mapped_column(Integer)
    error_code: Mapped[str | None] = mapped_column(String(120))
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Platform(Base):
    __tablename__ = "platforms"

    key: Mapped[str] = mapped_column(String(80), primary_key=True)
    name: Mapped[str] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(String(40), default="active", index=True)
    native_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class PlatformCapability(Base):
    __tablename__ = "platform_capabilities"
    __table_args__ = (
        UniqueConstraint(
            "platform_key",
            "connector_key",
            "version",
            name="uq_platform_capabilities_platform_connector_version",
        ),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    platform_key: Mapped[str] = mapped_column(ForeignKey("platforms.key"), index=True)
    connector_key: Mapped[str] = mapped_column(String(80), index=True)
    version: Mapped[int] = mapped_column(Integer, default=1)
    capabilities_json: Mapped[object] = mapped_column(JSON)
    hard_limits_json: Mapped[object] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(40), default="active", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class PlatformAccount(Base):
    __tablename__ = "platform_accounts"
    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "platform_key",
            "display_name",
            name="uq_platform_accounts_workspace_platform_name",
        ),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    platform_key: Mapped[str] = mapped_column(ForeignKey("platforms.key"), index=True)
    display_name: Mapped[str] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(String(40), default="active", index=True)
    credentials_ref: Mapped[str | None] = mapped_column(String(240))
    configuration_json: Mapped[object] = mapped_column(JSON)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
    version: Mapped[int] = mapped_column(Integer, default=1)


class ProjectDestination(Base):
    __tablename__ = "project_destinations"
    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "project_id",
            "name",
            name="uq_project_destinations_workspace_project_name",
        ),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    platform_key: Mapped[str] = mapped_column(ForeignKey("platforms.key"), index=True)
    connector_key: Mapped[str] = mapped_column(String(80), index=True)
    platform_account_id: Mapped[UUID | None] = mapped_column(ForeignKey("platform_accounts.id"), index=True)
    name: Mapped[str] = mapped_column(String(160))
    status: Mapped[str] = mapped_column(String(40), default="active", index=True)
    publication_mode: Mapped[str] = mapped_column(String(80), default="manual_export")
    configuration_json: Mapped[object] = mapped_column(JSON)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
    version: Mapped[int] = mapped_column(Integer, default=1)


class PlatformVariant(Base):
    __tablename__ = "platform_variants"
    __table_args__ = (
        UniqueConstraint(
            "content_item_id",
            "master_revision_id",
            "platform_key",
            "revision_number",
            name="uq_platform_variants_content_master_platform_number",
        ),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    content_item_id: Mapped[UUID] = mapped_column(ForeignKey("content_items.id"), index=True)
    master_revision_id: Mapped[UUID] = mapped_column(ForeignKey("content_revisions.id"), index=True)
    platform_key: Mapped[str] = mapped_column(ForeignKey("platforms.key"), index=True)
    revision_number: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(40), default="draft", index=True)
    text: Mapped[str] = mapped_column(Text)
    rendered_text: Mapped[str] = mapped_column(Text)
    payload_json: Mapped[object] = mapped_column(JSON)
    validation_json: Mapped[object] = mapped_column(JSON)
    character_count: Mapped[int] = mapped_column(Integer, default=0)
    parent_variant_id: Mapped[UUID | None] = mapped_column(ForeignKey("platform_variants.id"))
    superseded_by_variant_id: Mapped[UUID | None] = mapped_column(ForeignKey("platform_variants.id"))
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    approved_by: Mapped[UUID | None] = mapped_column(ForeignKey("users.id"))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class Publication(Base):
    __tablename__ = "publications"
    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "idempotency_key",
            name="uq_publications_workspace_idempotency_key",
        ),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    project_id: Mapped[UUID] = mapped_column(ForeignKey("projects.id"), index=True)
    content_item_id: Mapped[UUID] = mapped_column(ForeignKey("content_items.id"), index=True)
    platform_variant_id: Mapped[UUID] = mapped_column(ForeignKey("platform_variants.id"), index=True)
    destination_id: Mapped[UUID] = mapped_column(ForeignKey("project_destinations.id"), index=True)
    status: Mapped[str] = mapped_column(String(40), default="draft", index=True)
    scheduled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), index=True)
    queued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error_code: Mapped[str | None] = mapped_column(String(120))
    last_error_message: Mapped[str | None] = mapped_column(Text)
    idempotency_key: Mapped[str | None] = mapped_column(String(160), index=True)
    created_by: Mapped[UUID] = mapped_column(ForeignKey("users.id"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
    version: Mapped[int] = mapped_column(Integer, default=1)


class PublicationAttempt(Base):
    __tablename__ = "publication_attempts"
    __table_args__ = (
        UniqueConstraint(
            "publication_id",
            "attempt_number",
            name="uq_publication_attempts_publication_number",
        ),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    publication_id: Mapped[UUID] = mapped_column(ForeignKey("publications.id"), index=True)
    destination_id: Mapped[UUID] = mapped_column(ForeignKey("project_destinations.id"), index=True)
    connector_key: Mapped[str] = mapped_column(String(80), index=True)
    attempt_number: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(40), default="started", index=True)
    retryable: Mapped[bool] = mapped_column(Boolean, default=False)
    request_payload_json: Mapped[object | None] = mapped_column(JSON)
    response_payload_json: Mapped[object | None] = mapped_column(JSON)
    error_code: Mapped[str | None] = mapped_column(String(120))
    error_message: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class ExternalPost(Base):
    __tablename__ = "external_posts"
    __table_args__ = (
        UniqueConstraint(
            "publication_id",
            "idempotency_key",
            name="uq_external_posts_publication_idempotency_key",
        ),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    publication_id: Mapped[UUID] = mapped_column(ForeignKey("publications.id"), index=True)
    destination_id: Mapped[UUID] = mapped_column(ForeignKey("project_destinations.id"), index=True)
    connector_key: Mapped[str] = mapped_column(String(80), index=True)
    provider_external_id: Mapped[str] = mapped_column(String(240), index=True)
    permalink_url: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(40), default="published", index=True)
    idempotency_key: Mapped[str] = mapped_column(String(160), index=True)
    payload_json: Mapped[object] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )


class WebhookInbox(Base):
    __tablename__ = "webhook_inbox"
    __table_args__ = (
        UniqueConstraint(
            "destination_id",
            "dedupe_key",
            name="uq_webhook_inbox_destination_dedupe_key",
        ),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    destination_id: Mapped[UUID | None] = mapped_column(ForeignKey("project_destinations.id"), index=True)
    connector_key: Mapped[str] = mapped_column(String(80), index=True)
    event_type: Mapped[str] = mapped_column(String(120), default="generic_webhook", index=True)
    payload_json: Mapped[object] = mapped_column(JSON)
    headers_json: Mapped[object] = mapped_column(JSON)
    signature_valid: Mapped[bool] = mapped_column(Boolean, default=False)
    dedupe_key: Mapped[str | None] = mapped_column(String(160), index=True)
    status: Mapped[str] = mapped_column(String(40), default="received", index=True)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class OutboxEvent(Base):
    __tablename__ = "outbox_events"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True)
    workspace_id: Mapped[UUID] = mapped_column(ForeignKey("workspaces.id"), index=True)
    aggregate_type: Mapped[str] = mapped_column(String(80), index=True)
    aggregate_id: Mapped[UUID] = mapped_column(index=True)
    event_type: Mapped[str] = mapped_column(String(120), index=True)
    payload_json: Mapped[object] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String(40), default="pending", index=True)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0)
    max_attempts: Mapped[int] = mapped_column(Integer, default=5)
    available_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, index=True)
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    locked_by: Mapped[str | None] = mapped_column(String(120))
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_code: Mapped[str | None] = mapped_column(String(120))
    error_message: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
