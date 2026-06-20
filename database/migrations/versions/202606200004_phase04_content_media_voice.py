"""phase04 content media voice

Revision ID: 202606200004
Revises: 202606200003
Create Date: 2026-06-20
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "202606200004"
down_revision = "202606200003"
branch_labels = None
depends_on = None


def created_updated() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    ]


def upgrade() -> None:
    op.create_table(
        "content_items",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", sa.Uuid(), sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("rubric_id", sa.Uuid(), sa.ForeignKey("rubrics.id"), nullable=False),
        sa.Column("rubric_version_id", sa.Uuid(), sa.ForeignKey("rubric_versions.id"), nullable=False),
        sa.Column("project_version_id", sa.Uuid(), sa.ForeignKey("project_versions.id"), nullable=False),
        sa.Column("title_internal", sa.String(length=200), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("current_master_revision_id", sa.Uuid(), nullable=True),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("assigned_to", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        *created_updated(),
        sa.Column("version", sa.Integer(), nullable=False),
    )
    op.create_index("ix_content_items_workspace_id", "content_items", ["workspace_id"])
    op.create_index("ix_content_items_project_id", "content_items", ["project_id"])
    op.create_index("ix_content_items_rubric_id", "content_items", ["rubric_id"])
    op.create_index("ix_content_items_rubric_version_id", "content_items", ["rubric_version_id"])
    op.create_index("ix_content_items_project_version_id", "content_items", ["project_version_id"])
    op.create_index("ix_content_items_status", "content_items", ["status"])
    op.create_index("ix_content_items_created_by", "content_items", ["created_by"])
    op.create_index("ix_content_items_assigned_to", "content_items", ["assigned_to"])

    op.create_table(
        "media_assets",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("storage_key", sa.String(length=500), nullable=False, unique=True),
        sa.Column("bucket", sa.String(length=160), nullable=False),
        sa.Column("kind", sa.String(length=40), nullable=False),
        sa.Column("mime_type", sa.String(length=160), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("checksum", sa.String(length=128), nullable=True),
        sa.Column("width", sa.Integer(), nullable=True),
        sa.Column("height", sa.Integer(), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("codec_metadata", sa.JSON(), nullable=True),
        sa.Column("upload_status", sa.String(length=40), nullable=False),
        sa.Column("processing_status", sa.String(length=40), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("retention_until", sa.DateTime(timezone=True), nullable=True),
        *created_updated(),
        sa.Column("version", sa.Integer(), nullable=False),
    )
    op.create_index("ix_media_assets_workspace_id", "media_assets", ["workspace_id"])
    op.create_index("ix_media_assets_storage_key", "media_assets", ["storage_key"])
    op.create_index("ix_media_assets_kind", "media_assets", ["kind"])
    op.create_index("ix_media_assets_checksum", "media_assets", ["checksum"])
    op.create_index("ix_media_assets_upload_status", "media_assets", ["upload_status"])
    op.create_index("ix_media_assets_processing_status", "media_assets", ["processing_status"])
    op.create_index("ix_media_assets_created_by", "media_assets", ["created_by"])

    op.create_table(
        "content_blocks",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("content_item_id", sa.Uuid(), sa.ForeignKey("content_items.id"), nullable=False),
        sa.Column("field_key", sa.String(length=160), nullable=False),
        sa.Column("group_key", sa.String(length=160), nullable=True),
        sa.Column("group_index", sa.Integer(), nullable=True),
        sa.Column("source_type", sa.String(length=40), nullable=False),
        sa.Column("value_json", sa.JSON(), nullable=False),
        sa.Column("transcript_text", sa.Text(), nullable=True),
        sa.Column("is_locked", sa.Boolean(), nullable=False),
        sa.Column("source_media_id", sa.Uuid(), sa.ForeignKey("media_assets.id"), nullable=True),
        sa.Column("revision_number", sa.Integer(), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("updated_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
        *created_updated(),
        sa.UniqueConstraint(
            "content_item_id",
            "field_key",
            "group_key",
            "group_index",
            name="uq_content_blocks_item_field_group",
        ),
    )
    op.create_index("ix_content_blocks_workspace_id", "content_blocks", ["workspace_id"])
    op.create_index("ix_content_blocks_content_item_id", "content_blocks", ["content_item_id"])
    op.create_index("ix_content_blocks_field_key", "content_blocks", ["field_key"])
    op.create_index("ix_content_blocks_group_key", "content_blocks", ["group_key"])
    op.create_index("ix_content_blocks_source_type", "content_blocks", ["source_type"])
    op.create_index("ix_content_blocks_is_locked", "content_blocks", ["is_locked"])
    op.create_index("ix_content_blocks_source_media_id", "content_blocks", ["source_media_id"])
    op.create_index("ix_content_blocks_created_by", "content_blocks", ["created_by"])

    op.create_table(
        "locked_facts",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("content_item_id", sa.Uuid(), sa.ForeignKey("content_items.id"), nullable=False),
        sa.Column("fact_key", sa.String(length=200), nullable=False),
        sa.Column("value_json", sa.JSON(), nullable=False),
        sa.Column("source_block_id", sa.Uuid(), sa.ForeignKey("content_blocks.id"), nullable=False),
        sa.Column("locked_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=False),
        *created_updated(),
        sa.UniqueConstraint("content_item_id", "fact_key", name="uq_locked_facts_item_key"),
    )
    op.create_index("ix_locked_facts_workspace_id", "locked_facts", ["workspace_id"])
    op.create_index("ix_locked_facts_content_item_id", "locked_facts", ["content_item_id"])
    op.create_index("ix_locked_facts_fact_key", "locked_facts", ["fact_key"])
    op.create_index("ix_locked_facts_source_block_id", "locked_facts", ["source_block_id"])
    op.create_index("ix_locked_facts_locked_by", "locked_facts", ["locked_by"])

    op.create_table(
        "content_revisions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("content_item_id", sa.Uuid(), sa.ForeignKey("content_items.id"), nullable=False),
        sa.Column("revision_number", sa.Integer(), nullable=False),
        sa.Column("revision_type", sa.String(length=40), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("structured_document", sa.JSON(), nullable=False),
        sa.Column("character_count", sa.Integer(), nullable=False),
        sa.Column("generation_run_id", sa.Uuid(), nullable=True),
        sa.Column("parent_revision_id", sa.Uuid(), sa.ForeignKey("content_revisions.id"), nullable=True),
        sa.Column("approved_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("content_item_id", "revision_number", name="uq_content_revisions_item_number"),
    )
    op.create_index("ix_content_revisions_workspace_id", "content_revisions", ["workspace_id"])
    op.create_index("ix_content_revisions_content_item_id", "content_revisions", ["content_item_id"])
    op.create_index("ix_content_revisions_revision_type", "content_revisions", ["revision_type"])
    op.create_index("ix_content_revisions_created_by", "content_revisions", ["created_by"])

    op.create_table(
        "content_media",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("content_item_id", sa.Uuid(), sa.ForeignKey("content_items.id"), nullable=False),
        sa.Column("media_asset_id", sa.Uuid(), sa.ForeignKey("media_assets.id"), nullable=False),
        sa.Column("role", sa.String(length=80), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("crop_metadata", sa.JSON(), nullable=True),
        sa.Column("cover_metadata", sa.JSON(), nullable=True),
        *created_updated(),
        sa.UniqueConstraint("content_item_id", "media_asset_id", name="uq_content_media_item_asset"),
        sa.UniqueConstraint("content_item_id", "sort_order", name="uq_content_media_item_order"),
    )
    op.create_index("ix_content_media_workspace_id", "content_media", ["workspace_id"])
    op.create_index("ix_content_media_content_item_id", "content_media", ["content_item_id"])
    op.create_index("ix_content_media_media_asset_id", "content_media", ["media_asset_id"])

    op.create_table(
        "voice_assets",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("media_asset_id", sa.Uuid(), sa.ForeignKey("media_assets.id"), nullable=False, unique=True),
        sa.Column("content_item_id", sa.Uuid(), sa.ForeignKey("content_items.id"), nullable=True),
        sa.Column("content_block_id", sa.Uuid(), sa.ForeignKey("content_blocks.id"), nullable=True),
        sa.Column("recording_metadata", sa.JSON(), nullable=True),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_voice_assets_workspace_id", "voice_assets", ["workspace_id"])
    op.create_index("ix_voice_assets_media_asset_id", "voice_assets", ["media_asset_id"])
    op.create_index("ix_voice_assets_content_item_id", "voice_assets", ["content_item_id"])
    op.create_index("ix_voice_assets_content_block_id", "voice_assets", ["content_block_id"])
    op.create_index("ix_voice_assets_created_by", "voice_assets", ["created_by"])

    op.create_table(
        "transcription_runs",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("content_item_id", sa.Uuid(), sa.ForeignKey("content_items.id"), nullable=False),
        sa.Column("content_block_id", sa.Uuid(), sa.ForeignKey("content_blocks.id"), nullable=False),
        sa.Column("media_asset_id", sa.Uuid(), sa.ForeignKey("media_assets.id"), nullable=False),
        sa.Column("voice_asset_id", sa.Uuid(), sa.ForeignKey("voice_assets.id"), nullable=True),
        sa.Column("provider_key", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("transcript_text", sa.Text(), nullable=True),
        sa.Column("corrected_text", sa.Text(), nullable=True),
        sa.Column("confidence_json", sa.JSON(), nullable=True),
        sa.Column("error_code", sa.String(length=120), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accepted_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        *created_updated(),
    )
    op.create_index("ix_transcription_runs_workspace_id", "transcription_runs", ["workspace_id"])
    op.create_index("ix_transcription_runs_content_item_id", "transcription_runs", ["content_item_id"])
    op.create_index("ix_transcription_runs_content_block_id", "transcription_runs", ["content_block_id"])
    op.create_index("ix_transcription_runs_media_asset_id", "transcription_runs", ["media_asset_id"])
    op.create_index("ix_transcription_runs_voice_asset_id", "transcription_runs", ["voice_asset_id"])
    op.create_index("ix_transcription_runs_status", "transcription_runs", ["status"])
    op.create_index("ix_transcription_runs_created_by", "transcription_runs", ["created_by"])


def downgrade() -> None:
    op.drop_table("transcription_runs")
    op.drop_table("voice_assets")
    op.drop_table("content_media")
    op.drop_table("content_revisions")
    op.drop_table("locked_facts")
    op.drop_table("content_blocks")
    op.drop_table("media_assets")
    op.drop_table("content_items")
