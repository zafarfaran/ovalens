"""Ensure conversations.client_id is nullable (idempotent).

Canonical path: 003 makes client_id nullable; this revision is a Postgres-only
idempotent safety net (e.g. if DB was created with create_all or 003 was skipped).
Revision ID: 006_client_id_nullable
Revises: 003_client_id_nullable
Create Date: 2026-03-07
"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import text

revision: str = "006_client_id_nullable"
down_revision: Union[str, None] = "003_client_id_nullable"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name != "postgresql":
        return
    # Only alter if column is currently NOT NULL (idempotent).
    result = conn.execute(
        text(
            "SELECT is_nullable FROM information_schema.columns "
            "WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'client_id'"
        )
    )
    row = result.fetchone()
    if row and row[0] == "NO":
        conn.execute(text("ALTER TABLE conversations ALTER COLUMN client_id DROP NOT NULL"))


def downgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name != "postgresql":
        return
    op.execute(text("ALTER TABLE conversations ALTER COLUMN client_id SET NOT NULL"))
