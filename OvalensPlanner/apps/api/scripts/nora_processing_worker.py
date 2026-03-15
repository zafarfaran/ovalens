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

# Flush so Railway/logs show output immediately (no TTY = buffered by default)
def _log(msg: str, *, err: bool = False) -> None:
    (sys.stderr if err else sys.stdout).write(msg + "\n")
    (sys.stderr if err else sys.stdout).flush()


async def run_worker() -> None:
    from app.config import get_settings
    from app.core.queue import (
        NORA_PROCESSING_QUEUE,
        pop_nora_processing_job,
        publish_nora_client_update,
    )
    from app.db.engine import get_session_factory
    from app.services.nora_processing import run_processing_for_session_id

    get_settings.cache_clear()
    settings = get_settings()
    if not (settings.redis_url and settings.redis_url.strip()):
        _log("REDIS_URL is not set. Exiting.", err=True)
        sys.exit(1)

    session_factory = get_session_factory()
    _log(f"Nora worker started. Consuming from {NORA_PROCESSING_QUEUE}.")
    while True:
        session_id = await pop_nora_processing_job(timeout=5)
        if session_id is None:
            continue
        try:
            async with session_factory() as session:
                note, client_id = await run_processing_for_session_id(
                    session,
                    session_id=session_id,
                    auto_publish=settings.nora_auto_publish_notes,
                )
                await session.commit()
                if note:
                    _log(f"Nora worker processed session {session_id} (note created).")
                    if client_id:
                        await publish_nora_client_update(client_id)
                else:
                    _log(f"Nora worker skipped session {session_id} (no session or no chunks).")
        except Exception as e:
            _log(f"Nora worker error for {session_id}: {e}", err=True)


if __name__ == "__main__":
    _log("Nora worker process starting...")
    asyncio.run(run_worker())
