"""Test fixtures — tests use a separate DB (in-memory SQLite by default), never production."""

import os

# Force test environment before any app import → config uses test_database_url (in-memory SQLite)
os.environ.setdefault("ENVIRONMENT", "test")

from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def init_test_db() -> None:
    """Initialize DB and seed (ASGI lifespan is not triggered by httpx AsyncClient)."""
    from app.db.engine import get_session_factory, init_db, init_fts
    from app.db.seed import seed_if_empty

    await init_db()
    async with get_session_factory()() as session:
        await seed_if_empty(session)
    await init_fts()


@pytest.fixture
async def async_client() -> AsyncIterator[AsyncClient]:
    """Create an async test client for the FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client


@pytest.fixture
async def redis_url() -> str:
    """Redis URL for integration tests. Skips test if Redis is not available (e.g. no local Redis)."""
    url = os.environ.get("REDIS_URL", "redis://localhost:6379/1")
    try:
        from redis.asyncio import from_url
        client = from_url(url, decode_responses=True)
        try:
            await client.ping()
        finally:
            await client.aclose()
        return url
    except Exception as e:
        pytest.skip(f"Redis not available at {url}: {e}")
