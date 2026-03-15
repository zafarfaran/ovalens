"""Redis-backed job queue for async processing (e.g. context ingest)."""

from __future__ import annotations

CONTEXT_INGEST_QUEUE = "context_ingest_queue"
NORA_PROCESSING_QUEUE = "nora_processing_queue"


def _get_redis():
    """Return async Redis client or None."""
    from app.config import get_settings
    settings = get_settings()
    if not (settings.redis_url and settings.redis_url.strip()):
        return None
    try:
        from redis.asyncio import from_url
        return from_url(settings.redis_url.strip(), decode_responses=True)
    except Exception:
        return None


async def push_context_ingest_job(snippet_id: str) -> bool:
    """Push snippet_id to the context ingest queue.

    Returns True if enqueued, False if Redis unavailable.
    """
    client = _get_redis()
    if client is None:
        return False
    try:
        await client.lpush(CONTEXT_INGEST_QUEUE, snippet_id)
        return True
    except Exception:
        return False


async def pop_context_ingest_job(timeout: int = 5) -> str | None:
    """Block until a job is available or timeout. Returns snippet_id or None."""
    client = _get_redis()
    if client is None:
        return None
    try:
        result = await client.brpop(CONTEXT_INGEST_QUEUE, timeout=timeout)
        if result is None:
            return None
        _key, snippet_id = result
        return snippet_id
    except Exception:
        return None


async def clear_context_ingest_queue_for_tests() -> None:
    """Delete the context ingest queue key. No-op unless ENVIRONMENT=test (safety)."""
    import os

    if os.environ.get("ENVIRONMENT") != "test":
        return
    client = _get_redis()
    if client is None:
        return
    try:
        await client.delete(CONTEXT_INGEST_QUEUE)
    except Exception:
        pass


async def push_nora_processing_job(session_id: str) -> bool:
    """Push meeting session id to Nora processing queue."""
    client = _get_redis()
    if client is None:
        return False
    try:
        await client.lpush(NORA_PROCESSING_QUEUE, session_id)
        return True
    except Exception:
        return False


async def pop_nora_processing_job(timeout: int = 5) -> str | None:
    """Block until a Nora processing job is available."""
    client = _get_redis()
    if client is None:
        return None
    try:
        result = await client.brpop(NORA_PROCESSING_QUEUE, timeout=timeout)
        if result is None:
            return None
        _key, session_id = result
        return session_id
    except Exception:
        return None


async def clear_nora_processing_queue_for_tests() -> None:
    """Delete Nora queue in tests only."""
    import os

    if os.environ.get("ENVIRONMENT") != "test":
        return
    client = _get_redis()
    if client is None:
        return
    try:
        await client.delete(NORA_PROCESSING_QUEUE)
    except Exception:
        pass
