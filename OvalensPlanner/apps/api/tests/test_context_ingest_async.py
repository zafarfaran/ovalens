"""Async context ingest (Redis queue) integration tests.

With REDIS_URL set: POST /api/context/ingest returns 202 and job status is visible
via GET /api/context/jobs/{job_id}. Queue push/pop is exercised.
If Redis is not available, tests are skipped.
"""

from __future__ import annotations

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import get_settings
from app.core.queue import (
    clear_context_ingest_queue_for_tests,
    pop_context_ingest_job,
    push_context_ingest_job,
)
from app.dependencies import get_current_user
from app.main import app


async def _fake_get_current_user() -> str:
    return "test-user-context-async"


@pytest.mark.asyncio
async def test_post_returns_202_and_job_status_when_redis_configured(
    init_test_db: None,
    redis_url: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """With REDIS_URL set, POST /api/context/ingest returns 202 and GET /context/jobs/{job_id} returns status."""
    monkeypatch.setenv("REDIS_URL", redis_url)
    get_settings.cache_clear()
    app.dependency_overrides[get_current_user] = _fake_get_current_user
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            r = await client.post(
                "/api/context/ingest",
                json={
                    "raw_content": "<p>Hello</p>",
                    "source_url": "https://example.com",
                    "source_title": "Example",
                    "capture_type": "full_page",
                },
            )
            assert r.status_code == 202, r.text
            data = r.json()
            assert data.get("status") == "processing"
            job_id = data.get("job_id")
            assert job_id

            status_r = await client.get(f"/api/context/jobs/{job_id}")
            assert status_r.status_code == 200
            assert status_r.json()["job_id"] == job_id
            assert status_r.json()["status"] == "processing"
    finally:
        app.dependency_overrides.pop(get_current_user, None)
        get_settings.cache_clear()


@pytest.mark.asyncio
async def test_queue_push_pop(redis_url: str, monkeypatch: pytest.MonkeyPatch) -> None:
    """Redis queue: push then pop returns the same snippet_id."""
    monkeypatch.setenv("REDIS_URL", redis_url)
    get_settings.cache_clear()
    try:
        await clear_context_ingest_queue_for_tests()
        ok = await push_context_ingest_job("test-snippet-123")
        assert ok is True
        snippet_id = await pop_context_ingest_job(timeout=2)
        assert snippet_id == "test-snippet-123"
    finally:
        get_settings.cache_clear()
