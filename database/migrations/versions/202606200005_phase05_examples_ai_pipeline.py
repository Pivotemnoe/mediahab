"""phase05 examples ai pipeline

Revision ID: 202606200005
Revises: 202606200004
Create Date: 2026-06-20
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "202606200005"
down_revision = "202606200004"
branch_labels = None
depends_on = None


def created_updated() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "example_posts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("rubric_id", sa.Uuid(), sa.ForeignKey("rubrics.id"), nullable=True),
        sa.Column("source_type", sa.String(length=40), nullable=False),
        sa.Column("source_external_id", sa.String(length=220), nullable=True),
        sa.Column("title", sa.String(length=240), nullable=True),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("normalized_text", sa.Text(), nullable=False),
        sa.Column("character_count", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("labels_json", sa.JSON(), nullable=False),
        sa.Column("manual_quality_score", sa.Integer(), nullable=True),
        sa.Column("dedupe_hash", sa.String(length=64), nullable=False),
        sa.Column("reviewed_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        *created_updated(),
        sa.UniqueConstraint(
            "workspace_id",
            "project_id",
            "dedupe_hash",
            name="uq_example_posts_workspace_project_hash",
        ),
    )
    op.create_index("ix_example_posts_workspace_id", "example_posts", ["workspace_id"])
    op.create_index("ix_example_posts_project_id", "example_posts", ["project_id"])
    op.create_index("ix_example_posts_rubric_id", "example_posts", ["rubric_id"])
    op.create_index("ix_example_posts_source_type", "example_posts", ["source_type"])
    op.create_index("ix_example_posts_source_external_id", "example_posts", ["source_external_id"])
    op.create_index("ix_example_posts_status", "example_posts", ["status"])
    op.create_index("ix_example_posts_dedupe_hash", "example_posts", ["dedupe_hash"])
    op.create_index("ix_example_posts_created_by", "example_posts", ["created_by"])

    op.create_table(
        "example_metrics",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("example_post_id", sa.Uuid(), sa.ForeignKey("example_posts.id"), nullable=False),
        sa.Column("views", sa.Integer(), nullable=True),
        sa.Column("reactions", sa.Integer(), nullable=True),
        sa.Column("comments", sa.Integer(), nullable=True),
        sa.Column("shares", sa.Integer(), nullable=True),
        sa.Column("engagement_rate", sa.Numeric(10, 4), nullable=True),
        sa.Column("captured_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_example_metrics_workspace_id", "example_metrics", ["workspace_id"])
    op.create_index("ix_example_metrics_example_post_id", "example_metrics", ["example_post_id"])

    op.create_table(
        "example_embeddings",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("example_post_id", sa.Uuid(), sa.ForeignKey("example_posts.id"), nullable=False),
        sa.Column("provider_key", sa.String(length=80), nullable=False),
        sa.Column("model_id", sa.String(length=160), nullable=False),
        sa.Column("dimensions", sa.Integer(), nullable=False),
        sa.Column("embedding_json", sa.JSON(), nullable=False),
        sa.Column("content_hash", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(
            "example_post_id",
            "provider_key",
            "model_id",
            "content_hash",
            name="uq_example_embeddings_example_provider_hash",
        ),
    )
    op.create_index("ix_example_embeddings_workspace_id", "example_embeddings", ["workspace_id"])
    op.create_index("ix_example_embeddings_example_post_id", "example_embeddings", ["example_post_id"])
    op.create_index("ix_example_embeddings_content_hash", "example_embeddings", ["content_hash"])

    op.create_table(
        "rejected_patterns",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id"), nullable=True),
        sa.Column("rubric_id", sa.Uuid(), sa.ForeignKey("rubrics.id"), nullable=True),
        sa.Column("pattern_type", sa.String(length=80), nullable=False),
        sa.Column("text_or_regex", sa.Text(), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("severity", sa.String(length=40), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_rejected_patterns_workspace_id", "rejected_patterns", ["workspace_id"])
    op.create_index("ix_rejected_patterns_project_id", "rejected_patterns", ["project_id"])
    op.create_index("ix_rejected_patterns_rubric_id", "rejected_patterns", ["rubric_id"])
    op.create_index("ix_rejected_patterns_created_by", "rejected_patterns", ["created_by"])

    op.create_table(
        "provider_configs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=True),
        sa.Column("provider_family", sa.String(length=80), nullable=False),
        sa.Column("provider_key", sa.String(length=80), nullable=False),
        sa.Column("encrypted_credentials_json", sa.JSON(), nullable=True),
        sa.Column("configuration_json", sa.JSON(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False),
        sa.Column("last_verified_at", sa.DateTime(timezone=True), nullable=True),
        *created_updated(),
        sa.UniqueConstraint(
            "workspace_id",
            "provider_family",
            "provider_key",
            name="uq_provider_configs_workspace_family_key",
        ),
    )
    op.create_index("ix_provider_configs_workspace_id", "provider_configs", ["workspace_id"])
    op.create_index("ix_provider_configs_provider_family", "provider_configs", ["provider_family"])
    op.create_index("ix_provider_configs_provider_key", "provider_configs", ["provider_key"])

    op.create_table(
        "generation_runs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("rubric_id", sa.Uuid(), sa.ForeignKey("rubrics.id"), nullable=False),
        sa.Column("content_item_id", sa.Uuid(), sa.ForeignKey("content_items.id"), nullable=False),
        sa.Column("task_type", sa.String(length=80), nullable=False),
        sa.Column("provider_key", sa.String(length=80), nullable=False),
        sa.Column("model_id", sa.String(length=160), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("context_manifest_json", sa.JSON(), nullable=False),
        sa.Column("request_metadata_json", sa.JSON(), nullable=True),
        sa.Column("response_json", sa.JSON(), nullable=True),
        sa.Column("retrieved_example_ids", sa.JSON(), nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("input_tokens", sa.Integer(), nullable=True),
        sa.Column("output_tokens", sa.Integer(), nullable=True),
        sa.Column("input_characters", sa.Integer(), nullable=True),
        sa.Column("output_characters", sa.Integer(), nullable=True),
        sa.Column("cost_estimate_micro_usd", sa.Integer(), nullable=True),
        sa.Column("error_code", sa.String(length=120), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        *created_updated(),
    )
    op.create_index("ix_generation_runs_workspace_id", "generation_runs", ["workspace_id"])
    op.create_index("ix_generation_runs_project_id", "generation_runs", ["project_id"])
    op.create_index("ix_generation_runs_rubric_id", "generation_runs", ["rubric_id"])
    op.create_index("ix_generation_runs_content_item_id", "generation_runs", ["content_item_id"])
    op.create_index("ix_generation_runs_task_type", "generation_runs", ["task_type"])
    op.create_index("ix_generation_runs_provider_key", "generation_runs", ["provider_key"])
    op.create_index("ix_generation_runs_status", "generation_runs", ["status"])
    op.create_index("ix_generation_runs_created_by", "generation_runs", ["created_by"])

    op.create_table(
        "generation_steps",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("generation_run_id", sa.Uuid(), sa.ForeignKey("generation_runs.id"), nullable=False),
        sa.Column("step_type", sa.String(length=80), nullable=False),
        sa.Column("provider_key", sa.String(length=80), nullable=True),
        sa.Column("model_id", sa.String(length=160), nullable=True),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("input_metadata_json", sa.JSON(), nullable=True),
        sa.Column("output_metadata_json", sa.JSON(), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("error_code", sa.String(length=120), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_generation_steps_workspace_id", "generation_steps", ["workspace_id"])
    op.create_index("ix_generation_steps_generation_run_id", "generation_steps", ["generation_run_id"])
    op.create_index("ix_generation_steps_step_type", "generation_steps", ["step_type"])
    op.create_index("ix_generation_steps_status", "generation_steps", ["status"])


def downgrade() -> None:
    op.drop_table("generation_steps")
    op.drop_table("generation_runs")
    op.drop_table("provider_configs")
    op.drop_table("rejected_patterns")
    op.drop_table("example_embeddings")
    op.drop_table("example_metrics")
    op.drop_table("example_posts")
