"""add one-time closed-pilot access invitations

Revision ID: 202606200014
Revises: 202606200013
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "202606200014"
down_revision = "202606200013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "pilot_access_invites",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("token_hash", sa.String(length=128), nullable=False),
        sa.Column("created_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("consumed_by_user_id", sa.Uuid(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["created_by_user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["consumed_by_user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_pilot_access_invites_email", "pilot_access_invites", ["email"])
    op.create_index("ix_pilot_access_invites_token_hash", "pilot_access_invites", ["token_hash"], unique=True)
    op.create_index("ix_pilot_access_invites_created_by_user_id", "pilot_access_invites", ["created_by_user_id"])
    op.create_index("ix_pilot_access_invites_consumed_by_user_id", "pilot_access_invites", ["consumed_by_user_id"])
    op.create_index("ix_pilot_access_invites_expires_at", "pilot_access_invites", ["expires_at"])
    op.create_index("ix_pilot_access_invites_consumed_at", "pilot_access_invites", ["consumed_at"])
    op.create_index("ix_pilot_access_invites_revoked_at", "pilot_access_invites", ["revoked_at"])


def downgrade() -> None:
    connection = op.get_bind()
    invite_count = int(
        connection.execute(sa.text("SELECT COUNT(*) FROM pilot_access_invites")).scalar_one()
    )
    if invite_count:
        raise RuntimeError(
            "Cannot downgrade while pilot access invitation audit rows exist."
        )
    op.drop_index("ix_pilot_access_invites_revoked_at", table_name="pilot_access_invites")
    op.drop_index("ix_pilot_access_invites_consumed_at", table_name="pilot_access_invites")
    op.drop_index("ix_pilot_access_invites_expires_at", table_name="pilot_access_invites")
    op.drop_index("ix_pilot_access_invites_consumed_by_user_id", table_name="pilot_access_invites")
    op.drop_index("ix_pilot_access_invites_created_by_user_id", table_name="pilot_access_invites")
    op.drop_index("ix_pilot_access_invites_token_hash", table_name="pilot_access_invites")
    op.drop_index("ix_pilot_access_invites_email", table_name="pilot_access_invites")
    op.drop_table("pilot_access_invites")
