"""visible retention and safe cleanup

Revision ID: 202606200011
Revises: 202606200010
Create Date: 2026-06-20
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "202606200011"
down_revision = "202606200010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "retention_policies",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("original_media_days", sa.Integer(), nullable=False),
        sa.Column("text_days", sa.Integer(), nullable=False),
        sa.Column("warning_days", sa.Integer(), nullable=False),
        sa.Column("media_grace_days", sa.Integer(), nullable=False),
        sa.Column("inactivity_days", sa.Integer(), nullable=False),
        sa.Column("inactivity_grace_days", sa.Integer(), nullable=False),
        sa.Column("raw_voice_days", sa.Integer(), nullable=True),
        sa.Column("cleanup_enabled", sa.Boolean(), nullable=False),
        sa.Column("text_cleanup_enabled", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.UniqueConstraint("workspace_id", name="uq_retention_policies_workspace_id"),
    )
    op.create_index("ix_retention_policies_workspace_id", "retention_policies", ["workspace_id"])
    op.create_table(
        "retention_candidates",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("object_type", sa.String(length=40), nullable=False),
        sa.Column("object_id", sa.Uuid(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("reason", sa.String(length=120), nullable=False),
        sa.Column("retention_until", sa.DateTime(timezone=True), nullable=False),
        sa.Column("warning_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("grace_until", sa.DateTime(timezone=True), nullable=False),
        sa.Column("details_json", sa.JSON(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.UniqueConstraint(
            "workspace_id", "object_type", "object_id",
            name="uq_retention_candidates_workspace_object",
        ),
    )
    for column in (
        "workspace_id", "object_type", "object_id", "status",
        "retention_until", "warning_at", "grace_until",
    ):
        op.create_index(f"ix_retention_candidates_{column}", "retention_candidates", [column])
    op.create_index("ix_media_assets_retention_until", "media_assets", ["retention_until"])


def downgrade() -> None:
    op.drop_index("ix_media_assets_retention_until", table_name="media_assets")
    op.drop_table("retention_candidates")
    op.drop_table("retention_policies")
