"""In-memory rate limiter for expensive endpoints (chat stream, context ingest).

Uses fixed-window counters per (endpoint, scope, identifier). Configurable via
app.config (per-user and per-IP limits, window seconds). 0 = disabled.
"""

from __future__ import annotations

import asyncio
import time
from typing import Literal

from app.config import get_settings

Scope = Literal["user", "ip"]
Endpoint = Literal["chat_stream", "context_ingest"]

# (endpoint, scope, identifier) -> (count, window_end_ts)
_store: dict[tuple[Endpoint, Scope, str], tuple[int, float]] = {}
_lock = asyncio.Lock()


def clear_store_for_tests() -> None:
    """Clear the in-memory rate limit store. No-op unless ENVIRONMENT=test (safety)."""
    import os

    if os.environ.get("ENVIRONMENT") == "test":
        _store.clear()


def _current_window_end(now: float, window_seconds: int) -> float:
    """Fixed window: align to wall-clock windows (e.g. 0, 60, 120...)."""
    return (int(now // window_seconds) + 1) * window_seconds


async def check_rate_limit(
    endpoint: Endpoint,
    scope: Scope,
    identifier: str,
    limit: int,
    window_seconds: int,
) -> tuple[bool, int, int, float]:
    """Check and consume one request for the given key.

    Returns:
        (allowed, current_count, limit, retry_after_seconds).
        retry_after_seconds is 0 if allowed; else seconds until window resets.
    """
    if limit <= 0:
        return True, 0, limit, 0.0

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


def get_client_ip(request: "object") -> str:
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
