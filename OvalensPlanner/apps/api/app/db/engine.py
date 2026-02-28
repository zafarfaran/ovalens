"""Async database engine and session management (SQLite + PostgreSQL/Supabase)."""

from collections.abc import AsyncIterator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)

settings = get_settings()

# Use async driver URL (postgresql+asyncpg for Supabase/Postgres)
engine = create_async_engine(
    settings.database_url_async,
    echo=settings.environment == "development",
    future=True,
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
    """Create all tables from ORM metadata."""
    from app.db.models import Base  # noqa: F811 — deferred to avoid circular imports

    # Mask password in logs
    url_for_log = (
        settings.database_url_async.split("@")[-1]
        if "@" in settings.database_url_async
        else settings.database_url_async
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
    """Create full-text search index for meeting notes (FTS5 on SQLite, tsvector on PostgreSQL)."""
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
