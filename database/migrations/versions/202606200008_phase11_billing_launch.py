"""phase11 billing launch

Revision ID: 202606200008
Revises: 202606200007
Create Date: 2026-06-20
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "202606200008"
down_revision = "202606200007"
branch_labels = None
depends_on = None


def created_updated() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "payment_customers",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("provider_key", sa.String(length=80), nullable=False),
        sa.Column("provider_customer_id", sa.String(length=160), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        *created_updated(),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.UniqueConstraint("workspace_id", "provider_key", name="uq_payment_customers_workspace_provider"),
        sa.UniqueConstraint("provider_key", "provider_customer_id", name="uq_payment_customers_provider_customer"),
    )
    op.create_index("ix_payment_customers_workspace_id", "payment_customers", ["workspace_id"])
    op.create_index("ix_payment_customers_provider_key", "payment_customers", ["provider_key"])
    op.create_index("ix_payment_customers_provider_customer_id", "payment_customers", ["provider_customer_id"])
    op.create_index("ix_payment_customers_status", "payment_customers", ["status"])

    op.create_table(
        "payment_webhook_inbox",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=True),
        sa.Column("provider_key", sa.String(length=80), nullable=False),
        sa.Column("event_id", sa.String(length=160), nullable=False),
        sa.Column("event_type", sa.String(length=120), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("headers_json", sa.JSON(), nullable=False),
        sa.Column("signature_valid", sa.Boolean(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.UniqueConstraint("provider_key", "event_id", name="uq_payment_webhook_provider_event"),
    )
    op.create_index("ix_payment_webhook_inbox_workspace_id", "payment_webhook_inbox", ["workspace_id"])
    op.create_index("ix_payment_webhook_inbox_provider_key", "payment_webhook_inbox", ["provider_key"])
    op.create_index("ix_payment_webhook_inbox_event_id", "payment_webhook_inbox", ["event_id"])
    op.create_index("ix_payment_webhook_inbox_event_type", "payment_webhook_inbox", ["event_type"])
    op.create_index("ix_payment_webhook_inbox_status", "payment_webhook_inbox", ["status"])

    op.create_table(
        "payments",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("subscription_id", sa.Uuid(), sa.ForeignKey("subscriptions.id"), nullable=True),
        sa.Column("checkout_session_id", sa.Uuid(), sa.ForeignKey("checkout_sessions.id"), nullable=True),
        sa.Column("provider_key", sa.String(length=80), nullable=False),
        sa.Column("provider_payment_id", sa.String(length=160), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("amount_minor", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("payment_captured", sa.Boolean(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        *created_updated(),
        sa.UniqueConstraint("provider_key", "provider_payment_id", name="uq_payments_provider_payment"),
    )
    op.create_index("ix_payments_workspace_id", "payments", ["workspace_id"])
    op.create_index("ix_payments_subscription_id", "payments", ["subscription_id"])
    op.create_index("ix_payments_checkout_session_id", "payments", ["checkout_session_id"])
    op.create_index("ix_payments_provider_key", "payments", ["provider_key"])
    op.create_index("ix_payments_provider_payment_id", "payments", ["provider_payment_id"])
    op.create_index("ix_payments_status", "payments", ["status"])

    op.create_table(
        "invoices",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("subscription_id", sa.Uuid(), sa.ForeignKey("subscriptions.id"), nullable=True),
        sa.Column("provider_key", sa.String(length=80), nullable=False),
        sa.Column("provider_invoice_id", sa.String(length=160), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("amount_due_minor", sa.Integer(), nullable=False),
        sa.Column("amount_paid_minor", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("invoice_url", sa.Text(), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=True),
        *created_updated(),
        sa.UniqueConstraint("provider_key", "provider_invoice_id", name="uq_invoices_provider_invoice"),
    )
    op.create_index("ix_invoices_workspace_id", "invoices", ["workspace_id"])
    op.create_index("ix_invoices_subscription_id", "invoices", ["subscription_id"])
    op.create_index("ix_invoices_provider_key", "invoices", ["provider_key"])
    op.create_index("ix_invoices_provider_invoice_id", "invoices", ["provider_invoice_id"])
    op.create_index("ix_invoices_status", "invoices", ["status"])

    op.create_table(
        "subscription_events",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("subscription_id", sa.Uuid(), sa.ForeignKey("subscriptions.id"), nullable=True),
        sa.Column("provider_key", sa.String(length=80), nullable=False),
        sa.Column("provider_event_id", sa.String(length=160), nullable=True),
        sa.Column("event_type", sa.String(length=120), nullable=False),
        sa.Column("payload_json", sa.JSON(), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("provider_key", "provider_event_id", name="uq_subscription_events_provider_event"),
    )
    op.create_index("ix_subscription_events_workspace_id", "subscription_events", ["workspace_id"])
    op.create_index("ix_subscription_events_subscription_id", "subscription_events", ["subscription_id"])
    op.create_index("ix_subscription_events_provider_key", "subscription_events", ["provider_key"])
    op.create_index("ix_subscription_events_provider_event_id", "subscription_events", ["provider_event_id"])
    op.create_index("ix_subscription_events_event_type", "subscription_events", ["event_type"])


def downgrade() -> None:
    op.drop_table("subscription_events")
    op.drop_table("invoices")
    op.drop_table("payments")
    op.drop_table("payment_webhook_inbox")
    op.drop_table("payment_customers")
