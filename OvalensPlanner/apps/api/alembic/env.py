"""Alembic environment for migrations (sync engine; use for PostgreSQL/Supabase)."""

import socket
import sys
from pathlib import Path
from urllib.parse import urlparse

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
    try:
        fileConfig(config.config_file_name)
    except Exception:
        # alembic.ini may not define [formatters]/[handlers]/[loggers]; skip logging config
        pass

target_metadata = Base.metadata


def _postgres_url_force_ipv4(url: str) -> str:
    """Rewrite Postgres URL to use the host's IPv4 address. Avoids 'Network is unreachable' when
    the resolver returns IPv6 and the deployment environment (e.g. Railway) has no IPv6 path."""
    parsed = urlparse(url)
    if not parsed.hostname or "postgresql" not in url:
        return url
    try:
        # Resolve to IPv4 only so containers without IPv6 can connect (e.g. Railway → Supabase)
        infos = socket.getaddrinfo(parsed.hostname, parsed.port or 5432, socket.AF_INET, socket.SOCK_STREAM)
        if not infos:
            return url
        ipv4 = infos[0][4][0]
        # Replace hostname with IPv4 so credentials and path are unchanged
        return url.replace(parsed.hostname, ipv4, 1)
    except (socket.gaierror, OSError):
        return url


def get_sync_url() -> str:
    """Get sync database URL for Alembic (postgresql:// for psycopg2, sqlite:// for SQLite)."""
    settings = get_settings()
    url = (settings.database_url or "").strip()
    if "postgresql+asyncpg" in url:
        url = url.replace("postgresql+asyncpg://", "postgresql://", 1)
    if url.startswith("sqlite+aiosqlite"):
        return url.replace("sqlite+aiosqlite", "sqlite", 1)
    if url.startswith("postgresql://"):
        url = _postgres_url_force_ipv4(url)
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
