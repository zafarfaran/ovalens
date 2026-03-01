"""Critical API integration tests: rate limiting returns 429."""

from __future__ import annotations

import pytest
from fastapi import Depends, FastAPI
from httpx import ASGITransport, AsyncClient

from app.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.ratelimit import clear_store_for_tests
from app.dependencies import get_current_user, rate_limit_context_ingest


@pytest.mark.asyncio
async def test_rate_limit_returns_429(monkeypatch: pytest.MonkeyPatch) -> None:
    """Exceeding per-user rate limit returns 429 with predictable body and headers."""
    monkeypatch.setenv("RATE_LIMIT_CONTEXT_INGEST_PER_USER", "2")
    monkeypatch.setenv("RATE_LIMIT_CONTEXT_INGEST_PER_IP", "100")
    get_settings.cache_clear()
    clear_store_for_tests()

    try:
        test_app = FastAPI()
        register_exception_handlers(test_app)

        @test_app.post("/limited")
        async def _limited(_: None = Depends(rate_limit_context_ingest)):
            return {"ok": True}

        async def _fake_user() -> str:
            return "test-user-rate-limit"

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
        assert r3.headers.get("Retry-After")
        assert r3.headers.get("X-RateLimit-Remaining") == "0"
    finally:
        get_settings.cache_clear()
