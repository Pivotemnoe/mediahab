"""phase01 baseline

Revision ID: 202606200001
Revises:
Create Date: 2026-06-20
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "202606200001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")
    op.create_table(
        "phase01_markers",
        sa.Column("key", sa.String(length=120), primary_key=True),
        sa.Column("value", sa.String(length=500), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("phase01_markers")
