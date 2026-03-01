"""Convert timestamp columns to TIMESTAMPTZ for PostgreSQL/asyncpg.

Fixes: asyncpg "can't subtract offset-naive and offset-aware datetimes" when
ORM uses timezone-aware datetimes (datetime.now(UTC)) with TIMESTAMP WITHOUT TIME ZONE.

Revision ID: 002_timestamptz
Revises: 001_initial_fts
Create Date: 2026-03-01

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "002_timestamptz"
down_revision: Union[str, None] = "001_initial_fts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (table, columns) for each table that has DateTime columns
_TZ_COLUMNS = [
    ("users", ["created_at", "updated_at"]),
    ("households", ["created_at", "updated_at"]),
    ("clients", ["created_at", "updated_at"]),
    ("tax_profiles", ["created_at", "updated_at"]),
    ("documents", ["created_at", "updated_at"]),
    ("context_snippets", ["created_at"]),
    ("conversations", ["last_message_at", "created_at", "updated_at"]),
    ("messages", ["created_at"]),
    ("observations", ["created_at", "updated_at"]),
    ("meeting_notes", ["meeting_date", "created_at", "updated_at"]),
]


def upgrade() -> None:
    """Alter timestamp columns to TIMESTAMP WITH TIME ZONE (interpret existing as UTC)."""
    conn = op.get_bind()
    if conn.dialect.name != "postgresql":
        return
    for table, columns in _TZ_COLUMNS:
        for col in columns:
            # Interpret existing values as UTC when converting to TIMESTAMPTZ
            conn.execute(
                text(
                    f'ALTER TABLE {table} ALTER COLUMN {col} TYPE TIMESTAMP WITH TIME ZONE '
                    f"USING {col} AT TIME ZONE 'UTC'"
                )
            )


def downgrade() -> None:
    """Revert to TIMESTAMP WITHOUT TIME ZONE (cast to UTC time, drop tz)."""
    conn = op.get_bind()
    if conn.dialect.name != "postgresql":
        return
    for table, columns in _TZ_COLUMNS:
        for col in columns:
            conn.execute(
                text(
                    f'ALTER TABLE {table} ALTER COLUMN {col} TYPE TIMESTAMP WITHOUT TIME ZONE '
                    f"USING {col} AT TIME ZONE 'UTC'"
                )
            )
