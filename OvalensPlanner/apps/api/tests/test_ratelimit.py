"""Rate limiting tests for expensive endpoints (chat stream, context ingest)."""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import get_settings
from app.core.ratelimit import check_rate_limit, clear_store_for_tests, reset_redis_client_for_tests
from app.dependencies import get_current_user
from app.main import app


async def _fake_get_current_user() -> str:
    return "test-user-ratelimit"


@pytest.fixture
async def auth_client():
    """Client with auth override so chat/context endpoints accept requests."""
    app.dependency_overrides[get_current_user] = _fake_get_current_user
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as c:
            yield c
    finally:
        app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_check_rate_limit_allows_under_limit() -> None:
    """Within limit: check_rate_limit returns allowed=True."""
    clear_store_for_tests()
    allowed, count, limit, retry = await check_rate_limit(
        "context_ingest", "user", "u1", limit=5, window_seconds=60
    )
    assert allowed is True
    assert count == 1
    assert retry == 0.0


@pytest.mark.asyncio
async def test_check_rate_limit_denies_over_limit() -> None:
    """Over limit: check_rate_limit returns allowed=False and retry_after > 0."""
    clear_store_for_tests()
    for _ in range(3):
        await check_rate_limit("context_ingest", "user", "u2", limit=2, window_seconds=60)
    allowed, count, limit, retry = await check_rate_limit(
        "context_ingest", "user", "u2", limit=2, window_seconds=60
    )
    assert allowed is False
    assert count == 4
    assert limit == 2
    assert retry > 0


@pytest.mark.asyncio
async def test_check_rate_limit_disabled_when_limit_zero() -> None:
    """When limit=0, always allowed (rate limiting disabled)."""
    clear_store_for_tests()
    allowed, _, _, retry = await check_rate_limit(
        "chat_stream", "ip", "127.0.0.1", limit=0, window_seconds=60
    )
    assert allowed is True
    assert retry == 0.0


@pytest.mark.asyncio
async def test_context_ingest_returns_429_when_over_limit(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """POST /api/context/ingest returns 429 after exceeding per-user limit."""
    # Use low limit and in-memory rate limit so test is deterministic (no Redis dependency)
    monkeypatch.setenv("RATE_LIMIT_CONTEXT_INGEST_PER_USER", "2")
    monkeypatch.setenv("RATE_LIMIT_CONTEXT_INGEST_PER_IP", "100")
    monkeypatch.setenv("REDIS_URL", "")
    get_settings.cache_clear()
    reset_redis_client_for_tests()
    clear_store_for_tests()

    try:
        # Hit an endpoint that uses the same rate limit dependency. We use a dummy
        # endpoint on the real app that only runs the context_ingest rate limit.
        # The actual /api/context/ingest needs DB + LLM; we test rate limit via
        # the dependency by calling a route that enforces context_ingest limits.
        from fastapi import Depends, FastAPI
        from httpx import ASGITransport, AsyncClient

        from app.core.errors import register_exception_handlers
        from app.dependencies import get_current_user, rate_limit_context_ingest

        test_app = FastAPI()
        register_exception_handlers(test_app)

        @test_app.post("/limited")
        async def _limited(_: None = Depends(rate_limit_context_ingest)):
            return {"ok": True}

        # Override auth for test app
        async def _fake_user() -> str:
            return "test-user-ratelimit"

        test_app.dependency_overrides[get_current_user] = _fake_user
        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            r1 = await client.post("/limited")
            r2 = await client.post("/limited")
            r3 = await client.post("/limited")
        assert r1.status_code == 200, r1.text
        assert r2.status_code == 200, r2.text
        assert r3.status_code == 429, r3.text
        data = r3.json()
        assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"
        assert "retry_after_seconds" in data
        assert data["retry_after_seconds"] >= 0
        assert r3.headers.get("Retry-After")
        assert r3.headers.get("X-RateLimit-Limit")
        assert r3.headers.get("X-RateLimit-Remaining") == "0"
    finally:
        get_settings.cache_clear()


@pytest.mark.asyncio
async def test_429_response_schema_is_predictable() -> None:
    """429 response has documented shape: error.code, error.message, retry_after_seconds."""
    from fastapi import FastAPI

    from app.core.errors import RateLimitError, register_exception_handlers

    test_app = FastAPI()

    @test_app.get("/rate-limited")
    async def _():
        raise RateLimitError(
            message="Rate limit exceeded. Try again later.",
            retry_after_seconds=42.5,
            limit=10,
            scope="user",
        )

    register_exception_handlers(test_app)

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        res = await client.get("/rate-limited")
    assert res.status_code == 429
    data = res.json()
    assert "error" in data
    assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"
    assert "message" in data["error"]
    assert data["retry_after_seconds"] == 42.5
    assert res.headers["Retry-After"] == "42"
    assert res.headers["X-RateLimit-Limit"] == "10"
    assert res.headers["X-RateLimit-Remaining"] == "0"
