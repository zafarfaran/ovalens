"""Add Nora meeting sessions, transcript chunks, and note source metadata.

Revision ID: 008_nora_sessions
Revises: 007_performance_indexes
Create Date: 2026-03-15
"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import inspect, text

revision: str = "008_nora_sessions"
down_revision: Union[str, None] = "007_performance_indexes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    meeting_note_columns = {col["name"] for col in inspector.get_columns("meeting_notes")}

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS meeting_sessions (
            id VARCHAR NOT NULL PRIMARY KEY,
            client_id VARCHAR NOT NULL,
            user_id VARCHAR NOT NULL,
            provider VARCHAR NOT NULL DEFAULT 'recall',
            provider_bot_id VARCHAR NULL,
            meeting_url_hash VARCHAR NULL,
            status VARCHAR NOT NULL DEFAULT 'scheduled',
            meeting_url TEXT NULL,
            agenda TEXT NULL,
            started_at TIMESTAMP NULL,
            ended_at TIMESTAMP NULL,
            processing_started_at TIMESTAMP NULL,
            processing_completed_at TIMESTAMP NULL,
            error_message TEXT NULL,
            created_at TIMESTAMP NOT NULL,
            updated_at TIMESTAMP NOT NULL,
            FOREIGN KEY(client_id) REFERENCES clients (id),
            FOREIGN KEY(user_id) REFERENCES users (id)
        )
        """
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ux_meeting_sessions_provider_bot "
        "ON meeting_sessions (provider, provider_bot_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_meeting_sessions_client_created "
        "ON meeting_sessions (client_id, created_at)"
    )

    op.execute(
        """
        CREATE TABLE IF NOT EXISTS transcript_chunks (
            id VARCHAR NOT NULL PRIMARY KEY,
            session_id VARCHAR NOT NULL,
            speaker VARCHAR NULL,
            text TEXT NOT NULL,
            ts_start TIMESTAMP NULL,
            ts_end TIMESTAMP NULL,
            provider_event_id VARCHAR NULL,
            created_at TIMESTAMP NOT NULL,
            FOREIGN KEY(session_id) REFERENCES meeting_sessions (id)
        )
        """
    )
    op.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS ux_transcript_chunks_provider_event "
        "ON transcript_chunks (provider_event_id)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_transcript_chunks_session_ts_start "
        "ON transcript_chunks (session_id, ts_start)"
    )

    if "session_id" not in meeting_note_columns:
        op.execute("ALTER TABLE meeting_notes ADD COLUMN session_id VARCHAR NULL")
    if "source" not in meeting_note_columns:
        op.execute("ALTER TABLE meeting_notes ADD COLUMN source VARCHAR NULL")
    if "source_id" not in meeting_note_columns:
        op.execute("ALTER TABLE meeting_notes ADD COLUMN source_id VARCHAR NULL")
    if "is_draft" not in meeting_note_columns:
        op.execute("ALTER TABLE meeting_notes ADD COLUMN is_draft BOOLEAN NULL")
    if "processing_confidence" not in meeting_note_columns:
        op.execute("ALTER TABLE meeting_notes ADD COLUMN processing_confidence FLOAT NULL")
    if "processing_duration_ms" not in meeting_note_columns:
        op.execute("ALTER TABLE meeting_notes ADD COLUMN processing_duration_ms INTEGER NULL")
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_meeting_notes_session_id "
        "ON meeting_notes (session_id)"
    )

    op.execute(text("UPDATE meeting_notes SET source = COALESCE(source, 'manual')"))
    op.execute(text("UPDATE meeting_notes SET is_draft = COALESCE(is_draft, FALSE)"))


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_meeting_notes_session_id")
    op.execute("ALTER TABLE meeting_notes DROP COLUMN IF EXISTS processing_duration_ms")
    op.execute("ALTER TABLE meeting_notes DROP COLUMN IF EXISTS processing_confidence")
    op.execute("ALTER TABLE meeting_notes DROP COLUMN IF EXISTS is_draft")
    op.execute("ALTER TABLE meeting_notes DROP COLUMN IF EXISTS source_id")
    op.execute("ALTER TABLE meeting_notes DROP COLUMN IF EXISTS source")
    op.execute("ALTER TABLE meeting_notes DROP COLUMN IF EXISTS session_id")

    op.execute("DROP INDEX IF EXISTS ix_transcript_chunks_session_ts_start")
    op.execute("DROP INDEX IF EXISTS ux_transcript_chunks_provider_event")
    op.execute("DROP TABLE IF EXISTS transcript_chunks")

    op.execute("DROP INDEX IF EXISTS ix_meeting_sessions_client_created")
    op.execute("DROP INDEX IF EXISTS ux_meeting_sessions_provider_bot")
    op.execute("DROP TABLE IF EXISTS meeting_sessions")
