"""Async SQLite engine and session management."""

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

engine = create_async_engine(
    settings.database_url,
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

    logger.info("Initialising database", url=settings.database_url)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")


async def init_fts() -> None:
    """Create and populate FTS5 index for meeting notes."""
    logger.info("Initialising FTS5 index for meeting notes")
    async with engine.begin() as conn:
        await conn.execute(text("""
            CREATE VIRTUAL TABLE IF NOT EXISTS meeting_notes_fts USING fts5(
                note_id UNINDEXED,
                client_id UNINDEXED,
                subject,
                summary,
                action_items_text,
                tags_text
            )
        """))
        # Rebuild index from current data
        await conn.execute(text("DELETE FROM meeting_notes_fts"))
        await conn.execute(text("""
            INSERT INTO meeting_notes_fts (note_id, client_id, subject, summary, action_items_text, tags_text)
            SELECT id, client_id, subject, summary,
                   COALESCE(action_items, '[]'),
                   COALESCE(tags, '[]')
            FROM meeting_notes
        """))
    logger.info("FTS5 index created and populated")
