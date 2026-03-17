"""Add completed_action_indices to meeting_notes for checklist persistence.

Revision ID: 010_completed_action_indices
Revises: 009_nora_scheduled_for
Create Date: 2026-03-17

"""

from collections.abc import Sequence

from alembic import op
from sqlalchemy import inspect

revision: str = "010_completed_action_indices"
down_revision: str | None = "009_nora_scheduled_for"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    meeting_note_columns = {col["name"] for col in inspector.get_columns("meeting_notes")}
    if "completed_action_indices" not in meeting_note_columns:
        if bind.dialect.name == "postgresql":
            op.execute(
                "ALTER TABLE meeting_notes ADD COLUMN completed_action_indices "
                "JSONB NULL DEFAULT '[]'"
            )
        else:
            op.execute(
                "ALTER TABLE meeting_notes ADD COLUMN completed_action_indices "
                "TEXT NULL DEFAULT '[]'"
            )


def downgrade() -> None:
    op.execute("ALTER TABLE meeting_notes DROP COLUMN IF EXISTS completed_action_indices")
