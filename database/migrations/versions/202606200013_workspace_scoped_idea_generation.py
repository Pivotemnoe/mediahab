"""allow workspace-scoped standalone idea generation runs

Revision ID: 202606200013
Revises: 202606200012
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "202606200013"
down_revision = "202606200012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "generation_runs",
        "project_id",
        existing_type=sa.Uuid(),
        nullable=True,
    )
    op.create_check_constraint(
        "ck_generation_runs_project_scope",
        "generation_runs",
        "(task_type = 'suggest_standalone_content_ideas' AND project_id IS NULL) "
        "OR (task_type <> 'suggest_standalone_content_ideas' AND project_id IS NOT NULL)",
    )


def downgrade() -> None:
    connection = op.get_bind()
    standalone_count = int(
        connection.execute(
            sa.text(
                "SELECT COUNT(*) FROM generation_runs "
                "WHERE project_id IS NULL"
            )
        ).scalar_one()
    )
    if standalone_count:
        raise RuntimeError(
            "Cannot downgrade while workspace-scoped generation runs with null project ids exist."
        )
    op.drop_constraint(
        "ck_generation_runs_project_scope",
        "generation_runs",
        type_="check",
    )
    op.alter_column(
        "generation_runs",
        "project_id",
        existing_type=sa.Uuid(),
        nullable=False,
    )
