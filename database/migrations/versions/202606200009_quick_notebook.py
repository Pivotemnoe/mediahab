"""quick notebook

Revision ID: 202606200009
Revises: 202606200008
Create Date: 2026-06-20
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "202606200009"
down_revision = "202606200008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "notebook_notes",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("author_id", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("kind", sa.String(length=40), nullable=True),
        sa.Column("pinned_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
    )
    for column in ("workspace_id", "author_id", "kind", "pinned_at", "archived_at", "deleted_at"):
        op.create_index(f"ix_notebook_notes_{column}", "notebook_notes", [column])

    op.create_table(
        "notebook_transcriptions",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("note_id", sa.Uuid(), sa.ForeignKey("notebook_notes.id"), nullable=False),
        sa.Column("media_asset_id", sa.Uuid(), sa.ForeignKey("media_assets.id"), nullable=False),
        sa.Column("provider_key", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=40), nullable=False),
        sa.Column("transcript_text", sa.Text(), nullable=True),
        sa.Column("corrected_text", sa.Text(), nullable=True),
        sa.Column("confidence_json", sa.JSON(), nullable=True),
        sa.Column("error_code", sa.String(length=120), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("accepted_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    for column in ("workspace_id", "note_id", "media_asset_id", "provider_key", "status", "created_by"):
        op.create_index(f"ix_notebook_transcriptions_{column}", "notebook_transcriptions", [column])

    op.create_table(
        "notebook_transfers",
        sa.Column("id", sa.Uuid(), primary_key=True),
        sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("note_id", sa.Uuid(), sa.ForeignKey("notebook_notes.id"), nullable=False),
        sa.Column("content_item_id", sa.Uuid(), sa.ForeignKey("content_items.id"), nullable=False),
        sa.Column("content_block_id", sa.Uuid(), sa.ForeignKey("content_blocks.id"), nullable=False),
        sa.Column("transfer_type", sa.String(length=40), nullable=False),
        sa.Column("note_version", sa.Integer(), nullable=False),
        sa.Column("dedupe_key", sa.String(length=160), nullable=False),
        sa.Column("created_by", sa.Uuid(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("note_id", "dedupe_key", name="uq_notebook_transfers_note_dedupe_key"),
    )
    for column in ("workspace_id", "note_id", "content_item_id", "content_block_id", "transfer_type", "created_by"):
        op.create_index(f"ix_notebook_transfers_{column}", "notebook_transfers", [column])


def downgrade() -> None:
    op.drop_table("notebook_transfers")
    op.drop_table("notebook_transcriptions")
    op.drop_table("notebook_notes")
