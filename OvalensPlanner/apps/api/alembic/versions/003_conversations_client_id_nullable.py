"""Allow conversations.client_id to be NULL (chat without a selected client).

Revision ID: 003_client_id_nullable
Revises: 002_timestamptz
Create Date: 2026-03-01

"""
from typing import Sequence, Union

from alembic import op
from sqlalchemy import String

revision: str = "003_client_id_nullable"
down_revision: Union[str, None] = "002_timestamptz"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name == "postgresql":
        op.alter_column(
            "conversations",
            "client_id",
            existing_type=String(),
            nullable=True,
        )
    else:
        with op.batch_alter_table("conversations") as batch_op:
            batch_op.alter_column(
                "client_id",
                existing_type=String(),
                nullable=True,
            )


def downgrade() -> None:
    conn = op.get_bind()
    if conn.dialect.name == "postgresql":
        op.alter_column(
            "conversations",
            "client_id",
            existing_type=String(),
            nullable=False,
        )
    else:
        with op.batch_alter_table("conversations") as batch_op:
            batch_op.alter_column(
                "client_id",
                existing_type=String(),
                nullable=False,
            )
