#!/usr/bin/env python3
"""Worker that processes Nora note jobs from Redis.

Usage (from apps/api):
  python scripts/nora_processing_worker.py
  or: uv run python scripts/nora_processing_worker.py
"""

from __future__ import annotations

import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


async def run_worker() -> None:
    from app.config import get_settings
    from app.core.queue import NORA_PROCESSING_QUEUE, pop_nora_processing_job
    from app.db.engine import get_session_factory
    from app.services.nora_processing import run_processing_for_session_id

    get_settings.cache_clear()
    settings = get_settings()
    if not (settings.redis_url and settings.redis_url.strip()):
        print("REDIS_URL is not set. Exiting.", file=sys.stderr)
        sys.exit(1)

    session_factory = get_session_factory()
    print(f"Nora worker started. Consuming from {NORA_PROCESSING_QUEUE}.")
    while True:
        session_id = await pop_nora_processing_job(timeout=5)
        if session_id is None:
            continue
        try:
            async with session_factory() as session:
                await run_processing_for_session_id(
                    session,
                    session_id=session_id,
                    auto_publish=settings.nora_auto_publish_notes,
                )
                await session.commit()
        except Exception as e:
            print(f"Nora worker error for {session_id}: {e}", file=sys.stderr)


if __name__ == "__main__":
    asyncio.run(run_worker())
