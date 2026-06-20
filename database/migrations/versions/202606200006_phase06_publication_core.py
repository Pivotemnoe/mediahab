"""phase06 publication core

Revision ID: 202606200006
Revises: 202606200005
Create Date: 2026-06-20
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "202606200006"
down_revision = "202606200005"
branch_labels = None
depends_on = None


def created_updated() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "platforms",
        sa.Column("key", sa.String(length=80), primary_key=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("native_enabled", sa.Boolean(), nullable=False),
        *created_updated(),
    )
    op.create_index("ix_platforms_status", "platforms", ["status"])

    op.create_table(
        "platform_capabilities",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("platform_key", sa.String(length=80), sa.ForeignKey("platforms.key"), nullable=False),
        sa.Column("connector_key", sa.String(length=80), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("capabilities_json", sa.JSON(), nullable=False),
        sa.Column("hard_limits_json", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        *created_updated(),
        sa.UniqueConstraint(
            "platform_key",
            "connector_key",
            "version",
            name="uq_platform_capabilities_platform_connector_version",
        ),
    )
    op.create_index("ix_platform_capabilities_platform_key", "platform_capabilities", ["platform_key"])
    op.create_index("ix_platform_capabilities_connector_key", "platform_capabilities", ["connector_key"])
    op.create_index("ix_platform_capabilities_status", "platform_capabilities", ["status"])

    op.create_table(
        "platform_accounts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("platform_key", sa.String(length=80), sa.ForeignKey("platforms.key"), nullable=False),
        sa.Column("display_name", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("credentials_ref", sa.String(length=240), nullable=True),
        sa.Column("configuration_json", sa.JSON(), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        *created_updated(),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.UniqueConstraint(
            "workspace_id",
            "platform_key",
            "display_name",
            name="uq_platform_accounts_workspace_platform_name",
        ),
    )
    op.create_index("ix_platform_accounts_workspace_id", "platform_accounts", ["workspace_id"])
    op.create_index("ix_platform_accounts_platform_key", "platform_accounts", ["platform_key"])
    op.create_index("ix_platform_accounts_status", "platform_accounts", ["status"])
    op.create_index("ix_platform_accounts_created_by", "platform_accounts", ["created_by"])

    op.create_table(
        "project_destinations",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("platform_key", sa.String(length=80), sa.ForeignKey("platforms.key"), nullable=False),
        sa.Column("connector_key", sa.String(length=80), nullable=False),
        sa.Column("platform_account_id", sa.Uuid(), sa.ForeignKey("platform_accounts.id"), nullable=True),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("publication_mode", sa.String(length=80), nullable=False),
        sa.Column("configuration_json", sa.JSON(), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        *created_updated(),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.UniqueConstraint(
            "workspace_id",
            "project_id",
            "name",
            name="uq_project_destinations_workspace_project_name",
        ),
    )
    op.create_index("ix_project_destinations_workspace_id", "project_destinations", ["workspace_id"])
    op.create_index("ix_project_destinations_project_id", "project_destinations", ["project_id"])
    op.create_index("ix_project_destinations_platform_key", "project_destinations", ["platform_key"])
    op.create_index("ix_project_destinations_connector_key", "project_destinations", ["connector_key"])
    op.create_index("ix_project_destinations_platform_account_id", "project_destinations", ["platform_account_id"])
    op.create_index("ix_project_destinations_status", "project_destinations", ["status"])
    op.create_index("ix_project_destinations_created_by", "project_destinations", ["created_by"])

    op.create_table(
        "platform_variants",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("content_item_id", sa.Uuid(), sa.ForeignKey("content_items.id"), nullable=False),
        sa.Column("master_revision_id", sa.Uuid(), sa.ForeignKey("content_revisions.id"), nullable=False),
        sa.Column("platform_key", sa.String(length=80), sa.ForeignKey("platforms.key"), nullable=False),
        sa.Column("revision_number", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("rendered_text", sa.Text(), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("validation_json", sa.JSON(), nullable=False),
        sa.Column("character_count", sa.Integer(), nullable=False),
        sa.Column("parent_variant_id", sa.Uuid(), sa.ForeignKey("platform_variants.id"), nullable=True),
        sa.Column("superseded_by_variant_id", sa.Uuid(), sa.ForeignKey("platform_variants.id"), nullable=True),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("approved_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        *created_updated(),
        sa.UniqueConstraint(
            "content_item_id",
            "master_revision_id",
            "platform_key",
            "revision_number",
            name="uq_platform_variants_content_master_platform_number",
        ),
    )
    op.create_index("ix_platform_variants_workspace_id", "platform_variants", ["workspace_id"])
    op.create_index("ix_platform_variants_content_item_id", "platform_variants", ["content_item_id"])
    op.create_index("ix_platform_variants_master_revision_id", "platform_variants", ["master_revision_id"])
    op.create_index("ix_platform_variants_platform_key", "platform_variants", ["platform_key"])
    op.create_index("ix_platform_variants_status", "platform_variants", ["status"])
    op.create_index("ix_platform_variants_created_by", "platform_variants", ["created_by"])

    op.create_table(
        "publications",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("content_item_id", sa.Uuid(), sa.ForeignKey("content_items.id"), nullable=False),
        sa.Column("platform_variant_id", sa.Uuid(), sa.ForeignKey("platform_variants.id"), nullable=False),
        sa.Column("destination_id", sa.Uuid(), sa.ForeignKey("project_destinations.id"), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("queued_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error_code", sa.String(length=120), nullable=True),
        sa.Column("last_error_message", sa.Text(), nullable=True),
        sa.Column("idempotency_key", sa.String(length=160), nullable=True),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        *created_updated(),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.UniqueConstraint(
            "workspace_id",
            "idempotency_key",
            name="uq_publications_workspace_idempotency_key",
        ),
    )
    op.create_index("ix_publications_workspace_id", "publications", ["workspace_id"])
    op.create_index("ix_publications_project_id", "publications", ["project_id"])
    op.create_index("ix_publications_content_item_id", "publications", ["content_item_id"])
    op.create_index("ix_publications_platform_variant_id", "publications", ["platform_variant_id"])
    op.create_index("ix_publications_destination_id", "publications", ["destination_id"])
    op.create_index("ix_publications_status", "publications", ["status"])
    op.create_index("ix_publications_scheduled_at", "publications", ["scheduled_at"])
    op.create_index("ix_publications_idempotency_key", "publications", ["idempotency_key"])
    op.create_index("ix_publications_created_by", "publications", ["created_by"])

    op.create_table(
        "publication_attempts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("publication_id", sa.Uuid(), sa.ForeignKey("publications.id"), nullable=False),
        sa.Column("destination_id", sa.Uuid(), sa.ForeignKey("project_destinations.id"), nullable=False),
        sa.Column("connector_key", sa.String(length=80), nullable=False),
        sa.Column("attempt_number", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("retryable", sa.Boolean(), nullable=False),
        sa.Column("request_payload_json", sa.JSON(), nullable=True),
        sa.Column("response_payload_json", sa.JSON(), nullable=True),
        sa.Column("error_code", sa.String(length=120), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "publication_id",
            "attempt_number",
            name="uq_publication_attempts_publication_number",
        ),
    )
    op.create_index("ix_publication_attempts_workspace_id", "publication_attempts", ["workspace_id"])
    op.create_index("ix_publication_attempts_publication_id", "publication_attempts", ["publication_id"])
    op.create_index("ix_publication_attempts_destination_id", "publication_attempts", ["destination_id"])
    op.create_index("ix_publication_attempts_connector_key", "publication_attempts", ["connector_key"])
    op.create_index("ix_publication_attempts_status", "publication_attempts", ["status"])

    op.create_table(
        "external_posts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("publication_id", sa.Uuid(), sa.ForeignKey("publications.id"), nullable=False),
        sa.Column("destination_id", sa.Uuid(), sa.ForeignKey("project_destinations.id"), nullable=False),
        sa.Column("connector_key", sa.String(length=80), nullable=False),
        sa.Column("provider_external_id", sa.String(length=240), nullable=False),
        sa.Column("permalink_url", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("idempotency_key", sa.String(length=160), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        *created_updated(),
        sa.UniqueConstraint(
            "publication_id",
            "idempotency_key",
            name="uq_external_posts_publication_idempotency_key",
        ),
    )
    op.create_index("ix_external_posts_workspace_id", "external_posts", ["workspace_id"])
    op.create_index("ix_external_posts_publication_id", "external_posts", ["publication_id"])
    op.create_index("ix_external_posts_destination_id", "external_posts", ["destination_id"])
    op.create_index("ix_external_posts_connector_key", "external_posts", ["connector_key"])
    op.create_index("ix_external_posts_provider_external_id", "external_posts", ["provider_external_id"])
    op.create_index("ix_external_posts_status", "external_posts", ["status"])
    op.create_index("ix_external_posts_idempotency_key", "external_posts", ["idempotency_key"])

    op.create_table(
        "webhook_inbox",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("destination_id", sa.Uuid(), sa.ForeignKey("project_destinations.id"), nullable=True),
        sa.Column("connector_key", sa.String(length=80), nullable=False),
        sa.Column("event_type", sa.String(length=120), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("headers_json", sa.JSON(), nullable=False),
        sa.Column("signature_valid", sa.Boolean(), nullable=False),
        sa.Column("dedupe_key", sa.String(length=160), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint(
            "destination_id",
            "dedupe_key",
            name="uq_webhook_inbox_destination_dedupe_key",
        ),
    )
    op.create_index("ix_webhook_inbox_workspace_id", "webhook_inbox", ["workspace_id"])
    op.create_index("ix_webhook_inbox_destination_id", "webhook_inbox", ["destination_id"])
    op.create_index("ix_webhook_inbox_connector_key", "webhook_inbox", ["connector_key"])
    op.create_index("ix_webhook_inbox_event_type", "webhook_inbox", ["event_type"])
    op.create_index("ix_webhook_inbox_dedupe_key", "webhook_inbox", ["dedupe_key"])
    op.create_index("ix_webhook_inbox_status", "webhook_inbox", ["status"])

    op.create_table(
        "outbox_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("aggregate_type", sa.String(length=80), nullable=False),
        sa.Column("aggregate_id", sa.Uuid(), nullable=False),
        sa.Column("event_type", sa.String(length=120), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("attempt_count", sa.Integer(), nullable=False),
        sa.Column("max_attempts", sa.Integer(), nullable=False),
        sa.Column("available_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("locked_by", sa.String(length=120), nullable=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_code", sa.String(length=120), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        *created_updated(),
    )
    op.create_index("ix_outbox_events_workspace_id", "outbox_events", ["workspace_id"])
    op.create_index("ix_outbox_events_aggregate_type", "outbox_events", ["aggregate_type"])
    op.create_index("ix_outbox_events_aggregate_id", "outbox_events", ["aggregate_id"])
    op.create_index("ix_outbox_events_event_type", "outbox_events", ["event_type"])
    op.create_index("ix_outbox_events_status", "outbox_events", ["status"])
    op.create_index("ix_outbox_events_available_at", "outbox_events", ["available_at"])


def downgrade() -> None:
    op.drop_table("outbox_events")
    op.drop_table("webhook_inbox")
    op.drop_table("external_posts")
    op.drop_table("publication_attempts")
    op.drop_table("publications")
    op.drop_table("platform_variants")
    op.drop_table("project_destinations")
    op.drop_table("platform_accounts")
    op.drop_table("platform_capabilities")
    op.drop_table("platforms")
