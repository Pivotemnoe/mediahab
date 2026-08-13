"""allow project-scoped idea generation runs

Revision ID: 202606200012
Revises: 202606200011
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "202606200012"
down_revision = "202606200011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "generation_runs",
        "rubric_id",
        existing_type=sa.Uuid(),
        nullable=True,
    )
    op.alter_column(
        "generation_runs",
        "content_item_id",
        existing_type=sa.Uuid(),
        nullable=True,
    )


def downgrade() -> None:
    connection = op.get_bind()
    project_scoped_count = int(
        connection.execute(
            sa.text(
                "SELECT COUNT(*) FROM generation_runs "
                "WHERE rubric_id IS NULL OR content_item_id IS NULL"
            )
        ).scalar_one()
    )
    if project_scoped_count:
        raise RuntimeError(
            "Cannot downgrade while project-scoped generation runs with null foreign keys exist."
        )
    op.alter_column(
        "generation_runs",
        "content_item_id",
        existing_type=sa.Uuid(),
        nullable=False,
    )
    op.alter_column(
        "generation_runs",
        "rubric_id",
        existing_type=sa.Uuid(),
        nullable=False,
    )
