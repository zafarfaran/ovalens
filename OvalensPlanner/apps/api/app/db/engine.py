"""Async database engine and session management (SQLite + PostgreSQL/Supabase)."""

import os
from collections.abc import AsyncIterator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

settings = get_settings()

# On Vercel (serverless), use NullPool so each request gets a new connection that is closed
# after use. Use Supabase connection pooler (port 6543) as DATABASE_URL to avoid
# "Cannot assign requested address" from opening too many direct DB connections.
_is_vercel = os.environ.get("VERCEL") == "1"
_engine_kw: dict = {
    "echo": settings.environment == "development",
    "future": True,
}
if _is_vercel and settings.is_postgres:
    _engine_kw["poolclass"] = NullPool

# PgBouncer (Supabase pooler) in transaction mode does not support prepared statements.
# Disable asyncpg's statement cache to avoid DuplicatePreparedStatementError.
if settings.is_postgres:
    _engine_kw["connect_args"] = {"statement_cache_size": 0}

engine = create_async_engine(
    settings.database_url_async,
    **_engine_kw,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """Return the session factory (useful for non-FastAPI contexts)."""
    return async_session_factory


async def get_db_session() -> AsyncIterator[AsyncSession]:
    """Yield an async DB session for FastAPI Depends."""
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def init_db() -> None:
    """Create all tables from ORM metadata.

    Not used at API startup. Use for local dev, tests, or one-off setup.
    Production schema must be applied via: alembic upgrade head
    """
    from app.db.models import Base  # noqa: F811 — deferred to avoid circular imports

    # Mask password in logs
    url_for_log = (
        settings.effective_database_url.split("@")[-1]
        if "@" in settings.effective_database_url
        else settings.effective_database_url
    )
    logger.info(
        "Initialising database",
        url=url_for_log,
        dialect="postgresql" if settings.is_postgres else "sqlite",
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")


async def init_fts() -> None:
    """Create full-text search index for meeting notes (FTS5 on SQLite, tsvector on PostgreSQL).

    Not used at API startup. PostgreSQL FTS is applied via migrations;
    use this for local SQLite dev or tests.
    """
    if settings.is_postgres:
        await _init_fts_postgres()
    else:
        await _init_fts_sqlite()


async def _init_fts_postgres() -> None:
    """PostgreSQL: add tsvector column and GIN index for meeting_notes search."""
    logger.info("Initialising PostgreSQL full-text search for meeting notes")
    async with engine.begin() as conn:
        # Add generated tsvector column if not present (idempotent)
        await conn.execute(
            text("""
            ALTER TABLE meeting_notes
            ADD COLUMN IF NOT EXISTS search_vector tsvector
            GENERATED ALWAYS AS (
                setweight(to_tsvector('english', coalesce(subject, '')), 'A') ||
                setweight(to_tsvector('english', coalesce(summary, '')), 'B') ||
                setweight(to_tsvector('english', coalesce(action_items::text, '')), 'C')
            ) STORED
        """)
        )
        await conn.execute(
            text("""
            CREATE INDEX IF NOT EXISTS ix_meeting_notes_search_vector
            ON meeting_notes USING GIN (search_vector)
        """)
        )
    logger.info("PostgreSQL full-text search index created")


async def _init_fts_sqlite() -> None:
    """SQLite: create and populate FTS5 virtual table for meeting notes."""
    logger.info("Initialising FTS5 index for meeting notes")
    async with engine.begin() as conn:
        await conn.execute(
            text("""
            CREATE VIRTUAL TABLE IF NOT EXISTS meeting_notes_fts USING fts5(
                note_id UNINDEXED,
                client_id UNINDEXED,
                subject,
                summary,
                action_items_text,
                tags_text
            )
        """)
        )
        await conn.execute(text("DELETE FROM meeting_notes_fts"))
        await conn.execute(
            text("""
            INSERT INTO meeting_notes_fts (
                note_id, client_id, subject, summary, action_items_text, tags_text
            )
            SELECT id, client_id, subject, summary,
                   COALESCE(action_items, '[]'),
                   COALESCE(tags, '[]')
            FROM meeting_notes
        """)
        )
    logger.info("FTS5 index created and populated")
