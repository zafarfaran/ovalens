#!/usr/bin/env python3
"""Seed the database with demo data (development only).

Usage (from apps/api):
  python scripts/seed_db.py
  or: uv run python scripts/seed_db.py

Requires ENVIRONMENT=development (or test). Refuses to run in production/beta.
Also runs init_db and init_fts so a fresh SQLite/Postgres DB is ready for use.
"""
from __future__ import annotations

import asyncio
import os
import sys

# Ensure app is importable
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


async def main() -> None:
    from app.config import get_settings

    get_settings.cache_clear()
    settings = get_settings()
    if settings.environment in ("production", "beta"):
        print("Refusing to seed: ENVIRONMENT is production or beta.", file=sys.stderr)
        sys.exit(1)

    from app.db.engine import get_session_factory, init_db, init_fts
    from app.db.seed import seed_if_empty

    print("Initialising database (tables)...")
    await init_db()
    print("Seeding demo data (if empty)...")
    async with get_session_factory()() as session:
        await seed_if_empty(session)
    print("Initialising full-text search...")
    await init_fts()
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
