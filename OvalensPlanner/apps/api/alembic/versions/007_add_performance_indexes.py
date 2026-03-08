"""Add indexes for hot query paths (list/filter by user_id, client_id, conversation_id).

Revision ID: 007_performance_indexes
Revises: 006_client_id_nullable
Create Date: 2026-03-07

"""
from typing import Sequence, Union

from alembic import op

revision: str = "007_performance_indexes"
down_revision: Union[str, None] = "006_client_id_nullable"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name

    if dialect == "postgresql":
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_clients_user_id ON clients (user_id)"
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_households_user_id ON households (user_id)"
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_conversations_user_id ON conversations (user_id)"
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_conversations_client_id ON conversations (client_id)"
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_messages_conversation_id ON messages (conversation_id)"
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_tax_profiles_client_id_created_at "
            "ON tax_profiles (client_id, created_at DESC)"
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_meeting_notes_client_id_meeting_date "
            "ON meeting_notes (client_id, meeting_date DESC)"
        )
    else:
        # SQLite
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_clients_user_id ON clients (user_id)"
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_households_user_id ON households (user_id)"
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_conversations_user_id ON conversations (user_id)"
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_conversations_client_id ON conversations (client_id)"
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_messages_conversation_id ON messages (conversation_id)"
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_tax_profiles_client_id_created_at "
            "ON tax_profiles (client_id, created_at)"
        )
        op.execute(
            "CREATE INDEX IF NOT EXISTS ix_meeting_notes_client_id_meeting_date "
            "ON meeting_notes (client_id, meeting_date)"
        )


def downgrade() -> None:
    conn = op.get_bind()
    dialect = conn.dialect.name

    indexes = [
        "ix_clients_user_id",
        "ix_households_user_id",
        "ix_conversations_user_id",
        "ix_conversations_client_id",
        "ix_messages_conversation_id",
        "ix_tax_profiles_client_id_created_at",
        "ix_meeting_notes_client_id_meeting_date",
    ]
    for name in indexes:
        op.execute(f"DROP INDEX IF EXISTS {name}")
