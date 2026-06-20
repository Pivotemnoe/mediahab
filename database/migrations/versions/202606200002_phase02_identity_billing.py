"""phase02 identity billing

Revision ID: 202606200002
Revises: 202606200001
Create Date: 2026-06-20
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "202606200002"
down_revision = "202606200001"
branch_labels = None
depends_on = None


def timestamps() -> list[sa.Column[sa.DateTime]]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("password_hash", sa.Text(), nullable=False),
        sa.Column("display_name", sa.String(length=160), nullable=False),
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("locale", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        *timestamps(),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"])

    op.create_table(
        "roles",
        sa.Column("key", sa.String(length=32), primary_key=True),
        sa.Column("name", sa.String(length=80), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("can_manage_billing", sa.Boolean(), nullable=False),
        sa.Column("can_manage_members", sa.Boolean(), nullable=False),
        sa.Column("can_publish", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "plans",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("key", sa.String(length=80), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        *timestamps(),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.UniqueConstraint("key", name="uq_plans_key"),
    )
    op.create_index("ix_plans_key", "plans", ["key"])

    op.create_table(
        "sessions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("session_token_hash", sa.String(length=128), nullable=False),
        sa.Column("csrf_token_hash", sa.String(length=128), nullable=False),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("ip_hash", sa.String(length=128), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("session_token_hash", name="uq_sessions_token_hash"),
    )
    op.create_index("ix_sessions_user_id", "sessions", ["user_id"])
    op.create_index("ix_sessions_token_hash", "sessions", ["session_token_hash"])
    op.create_index("ix_sessions_expires_at", "sessions", ["expires_at"])

    op.create_table(
        "email_verification_tokens",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("token_hash", name="uq_email_verification_token_hash"),
    )
    op.create_index("ix_email_verification_tokens_user_id", "email_verification_tokens", ["user_id"])
    op.create_index("ix_email_verification_tokens_token_hash", "email_verification_tokens", ["token_hash"])
    op.create_index("ix_email_verification_tokens_expires_at", "email_verification_tokens", ["expires_at"])

    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("token_hash", name="uq_password_reset_token_hash"),
    )
    op.create_index("ix_password_reset_tokens_user_id", "password_reset_tokens", ["user_id"])
    op.create_index("ix_password_reset_tokens_token_hash", "password_reset_tokens", ["token_hash"])
    op.create_index("ix_password_reset_tokens_expires_at", "password_reset_tokens", ["expires_at"])

    op.create_table(
        "workspaces",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("name", sa.String(length=180), nullable=False),
        sa.Column("slug", sa.String(length=120), nullable=False),
        sa.Column("owner_user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("timezone", sa.String(length=80), nullable=False),
        sa.Column("default_locale", sa.String(length=16), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.UniqueConstraint("slug", name="uq_workspaces_slug"),
    )
    op.create_index("ix_workspaces_slug", "workspaces", ["slug"])
    op.create_index("ix_workspaces_owner_user_id", "workspaces", ["owner_user_id"])
    op.create_index("ix_workspaces_status", "workspaces", ["status"])

    op.create_table(
        "memberships",
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), primary_key=True),
        sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("role_key", sa.String(length=32), sa.ForeignKey("roles.key"), nullable=False),
        sa.Column("publication_permission", sa.String(length=32), nullable=False),
        sa.Column("invited_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
        sa.Column("version", sa.Integer(), nullable=False),
    )
    op.create_index("ix_memberships_role_key", "memberships", ["role_key"])

    op.create_table(
        "prices",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("plan_id", sa.Uuid(), sa.ForeignKey("plans.id"), nullable=False),
        sa.Column("provider_key", sa.String(length=80), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("amount_minor", sa.Integer(), nullable=False),
        sa.Column("interval", sa.String(length=32), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_prices_plan_id", "prices", ["plan_id"])

    op.create_table(
        "entitlements",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("plan_id", sa.Uuid(), sa.ForeignKey("plans.id"), nullable=False),
        sa.Column("key", sa.String(length=120), nullable=False),
        sa.Column("value_json", sa.JSON(), nullable=False),
        *timestamps(),
        sa.UniqueConstraint("plan_id", "key", name="uq_entitlements_plan_key"),
    )
    op.create_index("ix_entitlements_plan_id", "entitlements", ["plan_id"])
    op.create_index("ix_entitlements_key", "entitlements", ["key"])

    op.create_table(
        "subscriptions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("plan_id", sa.Uuid(), sa.ForeignKey("plans.id"), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("provider_key", sa.String(length=80), nullable=False),
        sa.Column("provider_customer_id", sa.String(length=160), nullable=True),
        sa.Column("provider_subscription_id", sa.String(length=160), nullable=True),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("trial_ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancel_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("canceled_at", sa.DateTime(timezone=True), nullable=True),
        *timestamps(),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.UniqueConstraint("workspace_id", name="uq_subscriptions_workspace_id"),
    )
    op.create_index("ix_subscriptions_workspace_id", "subscriptions", ["workspace_id"])
    op.create_index("ix_subscriptions_plan_id", "subscriptions", ["plan_id"])

    op.create_table(
        "usage_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("key", sa.String(length=120), nullable=False),
        sa.Column("quantity", sa.Numeric(18, 4), nullable=False),
        sa.Column("source", sa.String(length=80), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_usage_events_workspace_id", "usage_events", ["workspace_id"])
    op.create_index("ix_usage_events_key", "usage_events", ["key"])

    op.create_table(
        "checkout_sessions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("plan_id", sa.Uuid(), sa.ForeignKey("plans.id"), nullable=False),
        sa.Column("provider_key", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("payment_captured", sa.Boolean(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_checkout_sessions_workspace_id", "checkout_sessions", ["workspace_id"])
    op.create_index("ix_checkout_sessions_plan_id", "checkout_sessions", ["plan_id"])

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=True),
        sa.Column("actor_user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("action", sa.String(length=160), nullable=False),
        sa.Column("resource_type", sa.String(length=120), nullable=False),
        sa.Column("resource_id", sa.String(length=120), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_audit_logs_workspace_id", "audit_logs", ["workspace_id"])
    op.create_index("ix_audit_logs_actor_user_id", "audit_logs", ["actor_user_id"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("checkout_sessions")
    op.drop_table("usage_events")
    op.drop_table("subscriptions")
    op.drop_table("entitlements")
    op.drop_table("prices")
    op.drop_table("memberships")
    op.drop_table("workspaces")
    op.drop_table("password_reset_tokens")
    op.drop_table("email_verification_tokens")
    op.drop_table("sessions")
    op.drop_table("plans")
    op.drop_table("roles")
    op.drop_table("users")
