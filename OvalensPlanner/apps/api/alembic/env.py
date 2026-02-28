"""Alembic environment for migrations (sync engine; use for PostgreSQL/Supabase)."""

import sys
from pathlib import Path

# Ensure app package is importable when running from apps/api
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection

from app.config import get_settings
from app.db.models import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_sync_url() -> str:
    """Get sync database URL for Alembic (postgresql:// for psycopg2, sqlite:// for SQLite)."""
    settings = get_settings()
    url = settings.database_url
    if "postgresql+asyncpg" in url:
        return url.replace("postgresql+asyncpg://", "postgresql://", 1)
    if url.startswith("sqlite+aiosqlite"):
        return url.replace("sqlite+aiosqlite", "sqlite", 1)
    return url


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode (SQL only, no connection)."""
    url = get_sync_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode (with connection)."""
    configuration = config.get_section(config.config_ini_section, {}) or {}
    configuration["sqlalchemy.url"] = get_sync_url()

    connectable = context.config.attributes.get("connection", None)
    if connectable is None:
        from sqlalchemy import create_engine
        connectable = create_engine(
            configuration["sqlalchemy.url"],
            poolclass=pool.NullPool,
        )

    with connectable.connect() as connection:
        do_run_migrations(connection)


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
