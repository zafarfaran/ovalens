"""Initial schema and meeting_notes full-text search (PostgreSQL).

Creates all tables from ORM metadata, then adds search_vector column and GIN index
on meeting_notes when using PostgreSQL (Supabase).

Revision ID: 001_initial_fts
Revises:
Create Date: 2025-02-25

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision: str = "001_initial_fts"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create all tables from metadata, then add PostgreSQL FTS for meeting_notes."""
    from app.db.models import Base

    conn = op.get_bind()
    # Create all tables (idempotent for existing tables)
    Base.metadata.create_all(bind=conn)

    if conn.dialect.name == "postgresql":
        # Add generated tsvector column for full-text search (idempotent)
        conn.execute(text("""
            ALTER TABLE meeting_notes
            ADD COLUMN IF NOT EXISTS search_vector tsvector
            GENERATED ALWAYS AS (
                setweight(to_tsvector('english', coalesce(subject, '')), 'A') ||
                setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
                setweight(to_tsvector('english', coalesce(action_items::text, '')), 'C')
            ) STORED
        """))
        conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_meeting_notes_search_vector
            ON meeting_notes USING GIN (search_vector)
        """))


def downgrade() -> None:
    """Remove FTS column/index on PostgreSQL only (tables are left in place)."""
    conn = op.get_bind()
    if conn.dialect.name == "postgresql":
        conn.execute(text("DROP INDEX IF EXISTS ix_meeting_notes_search_vector"))
        conn.execute(text("ALTER TABLE meeting_notes DROP COLUMN IF EXISTS search_vector"))
