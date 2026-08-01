"""platform variant feedback

Revision ID: 202606200010
Revises: 202606200009
Create Date: 2026-06-20
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "202606200010"
down_revision = "202606200009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "platform_variant_feedback",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("rubric_id", sa.Uuid(), sa.ForeignKey("rubrics.id"), nullable=True),
        sa.Column("platform_variant_id", sa.Uuid(), sa.ForeignKey("platform_variants.id"), nullable=False),
        sa.Column("platform_key", sa.String(length=80), sa.ForeignKey("platforms.key"), nullable=False),
        sa.Column("actor_user_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reaction", sa.String(length=40), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("style_example_id", sa.Uuid(), sa.ForeignKey("example_posts.id"), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.UniqueConstraint(
            "platform_variant_id", "actor_user_id",
            name="uq_platform_variant_feedback_variant_actor",
        ),
    )
    for column in (
        "workspace_id", "project_id", "rubric_id", "platform_variant_id", "platform_key",
        "actor_user_id", "reaction", "style_example_id", "is_active", "revoked_at",
    ):
        op.create_index(f"ix_platform_variant_feedback_{column}", "platform_variant_feedback", [column])


def downgrade() -> None:
    op.drop_table("platform_variant_feedback")
