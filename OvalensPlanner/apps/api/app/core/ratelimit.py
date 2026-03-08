"""Rate limiter for expensive endpoints (chat stream, context ingest).

When REDIS_URL is set: uses Redis-backed fixed-window counters (shared across instances).
When Redis is unavailable or REDIS_URL unset: falls back to in-memory counters.
On Redis errors we fail open (allow the request) so traffic is not blocked by Redis outages.
"""

from __future__ import annotations

import asyncio
import time
from typing import Literal

from app.config import get_settings

Scope = Literal["user", "ip"]
Endpoint = Literal["chat_stream", "context_ingest"]

# In-memory fallback: (endpoint, scope, identifier) -> (count, window_end_ts)
_store: dict[tuple[Endpoint, Scope, str], tuple[int, float]] = {}
_lock = asyncio.Lock()

# Redis client (lazy, when redis_url is set)
_redis: object | None = None


def _get_redis():
    """Return async Redis client or None if Redis not configured."""
    global _redis
    settings = get_settings()
    if not (settings.redis_url and settings.redis_url.strip()):
        return None
    if _redis is None:
        try:
            from redis.asyncio import from_url
            _redis = from_url(settings.redis_url.strip(), decode_responses=True)
        except Exception:
            return None
    return _redis


def clear_store_for_tests() -> None:
    """Clear the in-memory rate limit store. No-op unless ENVIRONMENT=test (safety)."""
    import os

    if os.environ.get("ENVIRONMENT") == "test":
        _store.clear()


def reset_redis_client_for_tests() -> None:
    """Drop the cached Redis client so next check uses fresh config.

    No-op unless ENVIRONMENT=test.
    """
    import os

    global _redis
    if os.environ.get("ENVIRONMENT") == "test":
        _redis = None


async def clear_redis_rate_limit_for_tests() -> None:
    """Flush Redis DB used for rate limit keys so tests start clean.

    No-op unless ENVIRONMENT=test.
    """
    import os

    if os.environ.get("ENVIRONMENT") != "test":
        return
    client = _get_redis()
    if client is None:
        return
    try:
        await client.flushdb()
    except Exception:
        pass
    finally:
        reset_redis_client_for_tests()


def _current_window_end(now: float, window_seconds: int) -> float:
    """Fixed window: align to wall-clock windows (e.g. 0, 60, 120...)."""
    return (int(now // window_seconds) + 1) * window_seconds


async def _check_rate_limit_redis(
    endpoint: Endpoint,
    scope: Scope,
    identifier: str,
    limit: int,
    window_seconds: int,
) -> tuple[bool, int, int, float] | None:
    """Return (allowed, count, limit, retry_after) or None on error (caller will fail open)."""
    redis_client = _get_redis()
    if redis_client is None:
        return None
    now = time.time()
    window_id = int(now // window_seconds)
    key = f"ratelimit:{endpoint}:{scope}:{identifier}:{window_id}"
    try:
        pipe = redis_client.pipeline()
        pipe.incr(key)
        pipe.expire(key, window_seconds + 1)
        results = await pipe.execute()
        count = results[0]
        if count > limit:
            ttl = await redis_client.ttl(key)
            retry_after = max(0.0, float(ttl)) if ttl >= 0 else 0.0
            return False, count, limit, retry_after
        return True, count, limit, 0.0
    except Exception:
        return None


async def _check_rate_limit_memory(
    endpoint: Endpoint,
    scope: Scope,
    identifier: str,
    limit: int,
    window_seconds: int,
) -> tuple[bool, int, int, float]:
    """In-memory fixed-window rate limit."""
    now = time.time()
    key = (endpoint, scope, identifier)
    async with _lock:
        count, window_end = _store.get(key, (0, 0.0))
        if now >= window_end:
            count = 0
            window_end = _current_window_end(now, window_seconds)
        count += 1
        _store[key] = (count, window_end)
        if count > limit:
            retry_after = max(0.0, window_end - time.time())
            return False, count, limit, retry_after
        return True, count, limit, 0.0


async def check_rate_limit(
    endpoint: Endpoint,
    scope: Scope,
    identifier: str,
    limit: int,
    window_seconds: int,
) -> tuple[bool, int, int, float]:
    """Check and consume one request for the given key.

    Uses Redis when REDIS_URL is set; otherwise in-memory.
    On Redis errors, fails open (allows request).
    Returns:
        (allowed, current_count, limit, retry_after_seconds).
        retry_after_seconds is 0 if allowed; else seconds until window resets.
    """
    if limit <= 0:
        return True, 0, limit, 0.0

    result = await _check_rate_limit_redis(endpoint, scope, identifier, limit, window_seconds)
    if result is not None:
        return result
    return await _check_rate_limit_memory(endpoint, scope, identifier, limit, window_seconds)


def get_client_ip(request: object) -> str:
    """Extract client IP from Starlette Request.

    When rate_limit_trust_proxy is True, uses the first value of X-Forwarded-For
    (set by your trusted reverse proxy). When False, uses request.client.host only
    to avoid IP spoofing via a client-sent X-Forwarded-For header.
    """
    from starlette.requests import Request

    req = request if isinstance(request, Request) else request
    settings = get_settings()
    if settings.rate_limit_trust_proxy:
        forwarded = req.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
    if req.client:
        return req.client.host
    return "unknown"
