"""Redis-backed rate limiter integration tests.

Run with Redis available (e.g. REDIS_URL=redis://localhost:6379/1) to verify
production behaviour. If Redis is not available, tests are skipped.
"""

from __future__ import annotations

import pytest

from app.config import get_settings
from app.core.ratelimit import (
    check_rate_limit,
    clear_redis_rate_limit_for_tests,
    clear_store_for_tests,
    reset_redis_client_for_tests,
)


@pytest.mark.asyncio
async def test_redis_rate_limit_enforced(redis_url: str, monkeypatch: pytest.MonkeyPatch) -> None:
    """With REDIS_URL set, rate limit is enforced via Redis (shared across instances)."""
    monkeypatch.setenv("REDIS_URL", redis_url)
    get_settings.cache_clear()
    reset_redis_client_for_tests()
    clear_store_for_tests()
    await clear_redis_rate_limit_for_tests()

    limit = 2
    for _ in range(limit):
        allowed, count, _, _ = await check_rate_limit(
            "context_ingest", "user", "redis-test-user", limit=limit, window_seconds=60
        )
        assert allowed is True, count

    allowed, count, lim, retry = await check_rate_limit(
        "context_ingest", "user", "redis-test-user", limit=limit, window_seconds=60
    )
    assert allowed is False
    assert count == limit + 1
    assert lim == limit
    assert retry > 0


@pytest.mark.asyncio
async def test_redis_fail_open_when_unavailable(monkeypatch: pytest.MonkeyPatch) -> None:
    """When Redis is unreachable, rate limiter fails open (in-memory fallback, no exception)."""
    monkeypatch.setenv("REDIS_URL", "redis://127.0.0.1:9999/0")
    get_settings.cache_clear()
    reset_redis_client_for_tests()
    clear_store_for_tests()

    allowed, count, _, retry = await check_rate_limit(
        "context_ingest", "user", "fail-open-user", limit=5, window_seconds=60
    )
    assert allowed is True
    assert count == 1
    assert retry == 0.0
