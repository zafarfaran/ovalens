"""Redis-backed job queue for async processing (e.g. context ingest)."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Literal

CONTEXT_INGEST_QUEUE = "context_ingest_queue"
NORA_PROCESSING_QUEUE = "nora_processing_queue"

# Channel for notifying clients when a Nora webhook has updated session/notes for a client.
NORA_UPDATES_CHANNEL_PREFIX = "nora:updates:"


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


async def nora_processing_queue_length() -> int | None:
    """Return current length of Nora processing queue, or None if Redis unavailable."""
    client = _get_redis()
    if client is None:
        return None
    try:
        return await client.llen(NORA_PROCESSING_QUEUE)
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


async def publish_nora_client_update(client_id: str) -> bool:
    """Publish a message so SSE subscribers for this client refetch sessions/notes.
    Call after processing a Recall webhook so the UI updates without polling.
    Returns True if Redis published, False if Redis unavailable.
    """
    client = _get_redis()
    if client is None:
        return False
    try:
        channel = f"{NORA_UPDATES_CHANNEL_PREFIX}{client_id}"
        await client.publish(channel, "1")
        return True
    except Exception:
        return False


async def stream_nora_updates(
    client_id: str,
    *,
    keepalive_seconds: int = 15,
) -> AsyncIterator[Literal["session_updated", "keepalive"]]:
    """Async generator for SSE: yields 'session_updated' when a webhook was processed for this
    client, or 'keepalive' on timeout so the connection stays open.
    When Redis is unavailable, yields keepalives only (avoids reconnect spam).
    """
    import asyncio

    client = _get_redis()
    if client is None:
        # No Redis: keep stream open with keepalives to avoid client reconnect spam
        while True:
            yield "keepalive"
            await asyncio.sleep(keepalive_seconds)

    channel = f"{NORA_UPDATES_CHANNEL_PREFIX}{client_id}"
    pubsub = client.pubsub()
    try:
        await pubsub.subscribe(channel)
        while True:
            msg = await pubsub.get_message(
                ignore_subscribe_messages=True,
                timeout=keepalive_seconds,
            )
            if msg and msg.get("type") == "message":
                yield "session_updated"
            else:
                yield "keepalive"
    finally:
        try:
            await pubsub.unsubscribe(channel)
            await pubsub.close()
        except Exception:
            pass
        try:
            await client.aclose()
        except Exception:
            pass
