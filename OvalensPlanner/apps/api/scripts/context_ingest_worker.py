#!/usr/bin/env python3
"""Worker that processes context ingest jobs from Redis.

Run when REDIS_URL and DATABASE_URL are set. Processes snippets (LLM cleanup) and updates DB.
Usage (from apps/api):
  python scripts/context_ingest_worker.py
  or: uv run python scripts/context_ingest_worker.py
"""
from __future__ import annotations

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


async def run_worker() -> None:
    from app.config import get_settings
    from app.core.queue import CONTEXT_INGEST_QUEUE, pop_context_ingest_job
    from app.db.engine import get_session_factory
    from app.services.context_ingest import run_cleanup_for_snippet

    get_settings.cache_clear()
    settings = get_settings()
    if not (settings.redis_url and settings.redis_url.strip()):
        print("REDIS_URL is not set. Exiting.", file=sys.stderr)
        sys.exit(1)

    session_factory = get_session_factory()
    print(f"Worker started. Consuming from {CONTEXT_INGEST_QUEUE}.")
    while True:
        snippet_id = await pop_context_ingest_job(timeout=5)
        if snippet_id is None:
            continue
        try:
            async with session_factory() as session:
                await run_cleanup_for_snippet(session, snippet_id)
        except Exception as e:
            print(f"Worker error for {snippet_id}: {e}", file=sys.stderr)


if __name__ == "__main__":
    asyncio.run(run_worker())
