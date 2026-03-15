"""Add scheduled_for field and index for Nora meetings.

Revision ID: 009_nora_scheduled_for
Revises: 008_nora_sessions
Create Date: 2026-03-15
"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect

revision: str = "009_nora_scheduled_for"
down_revision: Union[str, None] = "008_nora_sessions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    meeting_session_columns = {col["name"] for col in inspector.get_columns("meeting_sessions")}
    if "scheduled_for" not in meeting_session_columns:
        op.execute("ALTER TABLE meeting_sessions ADD COLUMN scheduled_for TIMESTAMPTZ NULL")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_meeting_sessions_client_scheduled_for "
        "ON meeting_sessions (client_id, scheduled_for)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_meeting_sessions_client_scheduled_for")
    op.execute("ALTER TABLE meeting_sessions DROP COLUMN IF EXISTS scheduled_for")
