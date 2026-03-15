#!/usr/bin/env python3
"""Test Recall.ai async transcription flow without the UI.

Usage (from apps/api, with .env having RECALL_API_KEY and RECALL_API_BASE_URL):

  # 1. Create a bot (paste your meeting URL)
  python scripts/test_nora_async.py create_bot "https://meet.google.com/xxx-xxx-xxx"
  # → Prints BOT_ID. Join the meeting, end it, then get RECORDING_ID (step 2).

  # 2. Get bot details (recordings appear after meeting ends)
  python scripts/test_nora_async.py get_bot <BOT_ID>
  # → Prints bot JSON. From recordings[0].id get RECORDING_ID.

  # 3. Start async transcript for that recording
  python scripts/test_nora_async.py create_transcript <RECORDING_ID>
  # → Prints TRANSCRIPT_ID. Wait for transcript to be ready (~1 min for short meetings).

  # 4. Fetch transcript by id (after transcript.done or when status is done)
  python scripts/test_nora_async.py fetch_transcript <TRANSCRIPT_ID>
  # → Prints transcript chunks and optionally saves to output/transcript.json

See: https://github.com/recallai/sample-apps/tree/main/bot_async_transcription
Docs: https://docs.recall.ai (recording.done → create_transcript → transcript.done → fetch)
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _load_settings():
    from app.config import get_settings
    get_settings.cache_clear()
    return get_settings()


async def cmd_create_bot(meeting_url: str) -> None:
    settings = _load_settings()
    if not (settings.recall_api_key and settings.recall_api_base_url):
        print("Set RECALL_API_KEY and RECALL_API_BASE_URL in .env", file=sys.stderr)
        sys.exit(1)
    from app.services.integrations.recall import RecallClient
    client = RecallClient()
    result = await client.create_bot(
        meeting_url=meeting_url.strip(),
        webhook_url=None,
        metadata=None,
    )
    print("BOT_ID:", result.bot_id)
    print("Join the meeting, end it, then run: python scripts/test_nora_async.py get_bot", result.bot_id)


async def cmd_get_bot(bot_id: str) -> None:
    settings = _load_settings()
    if not (settings.recall_api_key and settings.recall_api_base_url):
        print("Set RECALL_API_KEY and RECALL_API_BASE_URL in .env", file=sys.stderr)
        sys.exit(1)
    import httpx
    base = settings.recall_api_base_url.rstrip("/")
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(
            f"{base}/bot/{bot_id}/",
            headers={"Authorization": f"Token {settings.recall_api_key}"},
        )
    if r.status_code >= 400:
        print("Error:", r.status_code, r.text[:500], file=sys.stderr)
        sys.exit(1)
    data = r.json()
    print(json.dumps(data, indent=2))
    recordings = data.get("recordings") or []
    if recordings:
        rec = recordings[0]
        rec_id = rec.get("id") if isinstance(rec, dict) else None
        if rec_id:
            print("\nRECORDING_ID:", rec_id)
            print("Run: python scripts/test_nora_async.py create_transcript", rec_id)


async def cmd_create_transcript(recording_id: str) -> None:
    settings = _load_settings()
    if not (settings.recall_api_key and settings.recall_api_base_url):
        print("Set RECALL_API_KEY and RECALL_API_BASE_URL in .env", file=sys.stderr)
        sys.exit(1)
    from app.services.integrations.recall import RecallClient
    client = RecallClient()
    transcript_id = await client.create_async_transcript(recording_id, language_code="en")
    print("TRANSCRIPT_ID:", transcript_id)
    print("Wait ~1 min then run: python scripts/test_nora_async.py fetch_transcript", transcript_id)


async def _fetch_transcript_raw(transcript_id: str):
    """GET transcript artifact then download URL; return (artifact, content_json)."""
    settings = _load_settings()
    import httpx
    base = settings.recall_api_base_url.rstrip("/")
    headers = {"Authorization": f"Token {settings.recall_api_key}"}
    async with httpx.AsyncClient(timeout=30) as client:
        r = await client.get(f"{base}/transcript/{transcript_id}/", headers=headers)
        if r.status_code >= 400:
            print("Error:", r.status_code, r.text[:500], file=sys.stderr)
            sys.exit(1)
        artifact = r.json()
        download_url = (artifact.get("data") or {}).get("download_url")
        if not download_url:
            print("No download_url in artifact", file=sys.stderr)
            sys.exit(1)
        down = await client.get(download_url, headers=headers)
        if down.status_code >= 400:
            print("Download error:", down.status_code, file=sys.stderr)
            sys.exit(1)
        return artifact, down.json()


async def cmd_fetch_transcript(transcript_id: str, save: bool = True) -> None:
    settings = _load_settings()
    if not (settings.recall_api_key and settings.recall_api_base_url):
        print("Set RECALL_API_KEY and RECALL_API_BASE_URL in .env", file=sys.stderr)
        sys.exit(1)
    from app.services.integrations.recall import RecallClient
    client = RecallClient()
    chunks = await client.get_transcript_by_id(transcript_id)
    print("Chunks:", len(chunks))
    for i, c in enumerate(chunks[:20]):
        print(f"  [{i}] {c.get('speaker') or '?'}: {(c.get('text') or '')[:80]}...")
    if len(chunks) > 20:
        print("  ...")
    if save and chunks:
        out_dir = Path(__file__).resolve().parent.parent / "output"
        out_dir.mkdir(exist_ok=True)
        path = out_dir / "transcript.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(chunks, f, indent=2)
        print("Saved to", path)
    elif save and not chunks:
        # Save raw so we can fix parser
        _, raw = await _fetch_transcript_raw(transcript_id)
        out_dir = Path(__file__).resolve().parent.parent / "output"
        out_dir.mkdir(exist_ok=True)
        path = out_dir / "transcript_raw.json"
        with open(path, "w", encoding="utf-8") as f:
            json.dump(raw, f, indent=2)
        print("Saved raw to", path, "(parser returned 0 chunks)")


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__, file=sys.stderr)
        sys.exit(0)
    cmd = sys.argv[1].lower()
    if cmd == "create_bot":
        url = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("MEETING_URL")
        if not url:
            print("Usage: python scripts/test_nora_async.py create_bot <MEETING_URL>", file=sys.stderr)
            print("   or: MEETING_URL=... python scripts/test_nora_async.py create_bot", file=sys.stderr)
            sys.exit(1)
        asyncio.run(cmd_create_bot(url))
    elif cmd == "get_bot":
        bot_id = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("BOT_ID")
        if not bot_id:
            print("Usage: python scripts/test_nora_async.py get_bot <BOT_ID>", file=sys.stderr)
            sys.exit(1)
        asyncio.run(cmd_get_bot(bot_id))
    elif cmd == "create_transcript":
        rec_id = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("RECORDING_ID")
        if not rec_id:
            print("Usage: python scripts/test_nora_async.py create_transcript <RECORDING_ID>", file=sys.stderr)
            sys.exit(1)
        asyncio.run(cmd_create_transcript(rec_id))
    elif cmd == "fetch_transcript":
        trans_id = sys.argv[2] if len(sys.argv) > 2 else os.environ.get("TRANSCRIPT_ID")
        if not trans_id:
            print("Usage: python scripts/test_nora_async.py fetch_transcript <TRANSCRIPT_ID>", file=sys.stderr)
            sys.exit(1)
        asyncio.run(cmd_fetch_transcript(trans_id))
    else:
        print("Unknown command:", cmd, file=sys.stderr)
        print("Commands: create_bot, get_bot, create_transcript, fetch_transcript", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
