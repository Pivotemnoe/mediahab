"""publication production decisions

Revision ID: 202606200007
Revises: 202606200006
Create Date: 2026-06-20
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "202606200007"
down_revision = "202606200006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("publications", sa.Column("publication_method", sa.String(length=40), nullable=True))
    op.add_column("publications", sa.Column("confirmed_by", sa.Uuid(), nullable=True))
    op.add_column("publications", sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("publications", sa.Column("external_url", sa.Text(), nullable=True))
    op.add_column("publications", sa.Column("external_post_id", sa.String(length=240), nullable=True))
    op.add_column("publications", sa.Column("confirmation_evidence_json", sa.JSON(), nullable=True))
    op.create_foreign_key(
        "fk_publications_confirmed_by_users",
        "publications",
        "users",
        ["confirmed_by"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_publications_confirmed_by_users", "publications", type_="foreignkey")
    op.drop_column("publications", "confirmation_evidence_json")
    op.drop_column("publications", "external_post_id")
    op.drop_column("publications", "external_url")
    op.drop_column("publications", "confirmed_at")
    op.drop_column("publications", "confirmed_by")
    op.drop_column("publications", "publication_method")
