"""phase03 project rubric builder

Revision ID: 202606200003
Revises: 202606200002
Create Date: 2026-06-20
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "202606200003"
down_revision = "202606200002"
branch_labels = None
depends_on = None


def created_updated() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]


def version_content_table(
    table_name: str,
    parent_table: str,
    parent_column: str,
    unique_name: str,
) -> None:
    op.create_table(
        table_name,
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column(parent_column, sa.Uuid(), sa.ForeignKey(f"{parent_table}.id"), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("scope", sa.String(length=80), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("structured_settings", sa.JSON(), nullable=True),
        sa.Column("checksum", sa.String(length=64), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint(parent_column, "version_number", name=unique_name),
    )
    op.create_index(f"ix_{table_name}_workspace_id", table_name, ["workspace_id"])
    op.create_index(f"ix_{table_name}_{parent_column}", table_name, [parent_column])
    op.create_index(f"ix_{table_name}_checksum", table_name, ["checksum"])


def upgrade() -> None:
    op.create_table(
        "projects",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("slug", sa.String(length=160), nullable=False),
        sa.Column("preset_key", sa.String(length=160), nullable=True),
        sa.Column("active_version_id", sa.Uuid(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        *created_updated(),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.UniqueConstraint("workspace_id", "slug", name="uq_projects_workspace_slug"),
        sa.UniqueConstraint("workspace_id", "preset_key", name="uq_projects_workspace_preset_key"),
    )
    op.create_index("ix_projects_workspace_id", "projects", ["workspace_id"])
    op.create_index("ix_projects_slug", "projects", ["slug"])
    op.create_index("ix_projects_preset_key", "projects", ["preset_key"])
    op.create_index("ix_projects_status", "projects", ["status"])
    op.create_index("ix_projects_created_by", "projects", ["created_by"])

    op.create_table(
        "project_versions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("language", sa.String(length=20), nullable=False),
        sa.Column("content_domain", sa.String(length=120), nullable=True),
        sa.Column("tone_config", sa.JSON(), nullable=False),
        sa.Column("ai_mode_default", sa.String(length=32), nullable=False),
        sa.Column("editing_strength", sa.JSON(), nullable=False),
        sa.Column("humor_config", sa.JSON(), nullable=False),
        sa.Column("cta_config", sa.JSON(), nullable=False),
        sa.Column("provider_preferences", sa.JSON(), nullable=False),
        sa.Column("character_count_policy", sa.JSON(), nullable=False),
        sa.Column("branding", sa.JSON(), nullable=True),
        sa.Column("connected_platform_types", sa.JSON(), nullable=True),
        sa.Column("example_retrieval", sa.JSON(), nullable=True),
        sa.Column("source_kind", sa.String(length=40), nullable=False),
        sa.Column("source_payload", sa.JSON(), nullable=True),
        sa.Column("checksum", sa.String(length=64), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("project_id", "version_number", name="uq_project_versions_project_number"),
        sa.UniqueConstraint("project_id", "checksum", name="uq_project_versions_project_checksum"),
    )
    op.create_index("ix_project_versions_workspace_id", "project_versions", ["workspace_id"])
    op.create_index("ix_project_versions_project_id", "project_versions", ["project_id"])
    op.create_index("ix_project_versions_checksum", "project_versions", ["checksum"])
    op.create_index("ix_project_versions_created_by", "project_versions", ["created_by"])

    op.create_table(
        "input_schemas",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("schema_version", sa.String(length=40), nullable=False),
        sa.Column("json_schema", sa.JSON(), nullable=False),
        sa.Column("ui_schema", sa.JSON(), nullable=False),
        sa.Column("checksum", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("workspace_id", "checksum", name="uq_input_schemas_workspace_checksum"),
    )
    op.create_index("ix_input_schemas_workspace_id", "input_schemas", ["workspace_id"])
    op.create_index("ix_input_schemas_checksum", "input_schemas", ["checksum"])

    op.create_table(
        "rubrics",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("slug", sa.String(length=160), nullable=False),
        sa.Column("active_version_id", sa.Uuid(), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        *created_updated(),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.UniqueConstraint("project_id", "slug", name="uq_rubrics_project_slug"),
    )
    op.create_index("ix_rubrics_workspace_id", "rubrics", ["workspace_id"])
    op.create_index("ix_rubrics_project_id", "rubrics", ["project_id"])
    op.create_index("ix_rubrics_slug", "rubrics", ["slug"])
    op.create_index("ix_rubrics_status", "rubrics", ["status"])

    op.create_table(
        "rubric_versions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("rubric_id", sa.Uuid(), sa.ForeignKey("rubrics.id"), nullable=False),
        sa.Column("version_number", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("input_schema_id", sa.Uuid(), sa.ForeignKey("input_schemas.id"), nullable=False),
        sa.Column("ui_schema", sa.JSON(), nullable=False),
        sa.Column("ai_mode", sa.String(length=32), nullable=False),
        sa.Column("editorial_min_chars", sa.Integer(), nullable=True),
        sa.Column("editorial_max_chars", sa.Integer(), nullable=True),
        sa.Column("generation_pipeline", sa.JSON(), nullable=False),
        sa.Column("media_policy", sa.JSON(), nullable=False),
        sa.Column("rating_policy", sa.JSON(), nullable=False),
        sa.Column("generated_fields", sa.JSON(), nullable=False),
        sa.Column("platform_overrides", sa.JSON(), nullable=True),
        sa.Column("source_payload", sa.JSON(), nullable=True),
        sa.Column("checksum", sa.String(length=64), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("rubric_id", "version_number", name="uq_rubric_versions_rubric_number"),
        sa.UniqueConstraint("rubric_id", "checksum", name="uq_rubric_versions_rubric_checksum"),
    )
    op.create_index("ix_rubric_versions_workspace_id", "rubric_versions", ["workspace_id"])
    op.create_index("ix_rubric_versions_rubric_id", "rubric_versions", ["rubric_id"])
    op.create_index("ix_rubric_versions_input_schema_id", "rubric_versions", ["input_schema_id"])
    op.create_index("ix_rubric_versions_checksum", "rubric_versions", ["checksum"])
    op.create_index("ix_rubric_versions_created_by", "rubric_versions", ["created_by"])

    for table_name, parent_column, unique_name in [
        ("project_rules", "project_id", "uq_project_rules_project_slug"),
        ("prompts", "project_id", "uq_prompts_project_slug"),
        ("templates", "project_id", "uq_templates_project_slug"),
    ]:
        op.create_table(
            table_name,
            sa.Column("id", sa.Uuid(), primary_key=True),
            sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
            sa.Column(parent_column, sa.Uuid(), sa.ForeignKey("projects.id"), nullable=False),
            sa.Column("slug", sa.String(length=160), nullable=False),
            sa.Column("active_version_id", sa.Uuid(), nullable=True),
            sa.Column("status", sa.String(length=32), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint(parent_column, "slug", name=unique_name),
        )
        op.create_index(f"ix_{table_name}_workspace_id", table_name, ["workspace_id"])
        op.create_index(f"ix_{table_name}_{parent_column}", table_name, [parent_column])
        op.create_index(f"ix_{table_name}_slug", table_name, ["slug"])

    version_content_table("rule_versions", "project_rules", "rule_id", "uq_rule_versions_rule_number")
    version_content_table("prompt_versions", "prompts", "prompt_id", "uq_prompt_versions_prompt_number")
    version_content_table("template_versions", "templates", "template_id", "uq_template_versions_template_number")

    op.create_table(
        "platform_overrides",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("rubric_id", sa.Uuid(), sa.ForeignKey("rubrics.id"), nullable=True),
        sa.Column("platform_key", sa.String(length=80), nullable=False),
        sa.Column("overrides_json", sa.JSON(), nullable=False),
        *created_updated(),
        sa.UniqueConstraint(
            "workspace_id",
            "project_id",
            "rubric_id",
            "platform_key",
            name="uq_platform_overrides_scope_platform",
        ),
    )
    op.create_index("ix_platform_overrides_workspace_id", "platform_overrides", ["workspace_id"])
    op.create_index("ix_platform_overrides_project_id", "platform_overrides", ["project_id"])
    op.create_index("ix_platform_overrides_rubric_id", "platform_overrides", ["rubric_id"])
    op.create_index("ix_platform_overrides_platform_key", "platform_overrides", ["platform_key"])

    op.create_table(
        "rubric_suggestions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id"), nullable=True),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("suggestions_json", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_rubric_suggestions_workspace_id", "rubric_suggestions", ["workspace_id"])
    op.create_index("ix_rubric_suggestions_project_id", "rubric_suggestions", ["project_id"])
    op.create_index("ix_rubric_suggestions_status", "rubric_suggestions", ["status"])


def downgrade() -> None:
    op.drop_table("rubric_suggestions")
    op.drop_table("platform_overrides")
    op.drop_table("template_versions")
    op.drop_table("prompt_versions")
    op.drop_table("rule_versions")
    op.drop_table("templates")
    op.drop_table("prompts")
    op.drop_table("project_rules")
    op.drop_table("rubric_versions")
    op.drop_table("rubrics")
    op.drop_table("input_schemas")
    op.drop_table("project_versions")
    op.drop_table("projects")
