"""Integration tests for Nora meeting bot endpoints."""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from datetime import UTC, datetime
from unittest.mock import patch

import jwt
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select

from app.config import get_settings
from app.db.engine import get_session_factory
from app.db.models import MeetingSession, TranscriptChunk
from app.main import app
from app.services.integrations.recall import RecallBotCreateResult

AUDIENCE = "authenticated"
ALGORITHM = "HS256"
TEST_SECRET = "test-jwt-secret-for-integration-tests"


def _make_token(sub: str, secret: str = TEST_SECRET, exp_delta_seconds: int = 3600) -> str:
    payload = {
        "sub": sub,
        "aud": AUDIENCE,
        "exp": int(time.time()) + exp_delta_seconds,
        "iat": int(time.time()),
    }
    return jwt.encode(payload, secret, algorithm=ALGORITHM)


@pytest.fixture
async def nora_client(monkeypatch: pytest.MonkeyPatch, init_test_db: None):
    monkeypatch.setenv("SUPABASE_JWT_SECRET", TEST_SECRET)
    monkeypatch.setenv("NORA_ENABLED", "true")
    monkeypatch.setenv("NORA_AUTO_PUBLISH_NOTES", "true")
    monkeypatch.setenv("RECALL_API_KEY", "test-recall-key")
    # Recall workspace secret format: whsec_<base64(key)>
    monkeypatch.setenv(
        "RECALL_WEBHOOK_SECRET",
        "whsec_" + base64.b64encode(b"test-webhook-secret").decode(),
    )
    monkeypatch.delenv("REDIS_URL", raising=False)
    get_settings.cache_clear()
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            yield client
    finally:
        get_settings.cache_clear()


@pytest.mark.asyncio
async def test_nora_session_create_scoped_by_user(nora_client: AsyncClient) -> None:
    with patch("app.routers.nora.RecallClient.create_bot") as create_bot:
        create_bot.return_value = RecallBotCreateResult(bot_id="bot-test-1", raw={"id": "bot-test-1"})

        ok = await nora_client.post(
            "/api/clients/client-sarah/nora/sessions",
            headers={"Authorization": f"Bearer {_make_token('demo-user')}"},
            json={"meeting_url": "https://meet.google.com/test-call", "agenda": "Year-end review"},
        )
        assert ok.status_code == 201
        payload = ok.json()
        assert payload["provider"] == "recall"
        assert payload["provider_bot_id"] == "bot-test-1"
        assert payload["status"] in {"scheduled", "joining"}

    denied = await nora_client.post(
        "/api/clients/client-sarah/nora/sessions",
        headers={"Authorization": f"Bearer {_make_token('another-user')}"},
        json={"meeting_url": "https://meet.google.com/other-call"},
    )
    assert denied.status_code == 404


@pytest.mark.asyncio
async def test_nora_webhook_signature_and_idempotency(nora_client: AsyncClient) -> None:
    with patch("app.routers.nora.RecallClient.create_bot") as create_bot:
        create_bot.return_value = RecallBotCreateResult(bot_id="bot-test-2", raw={"id": "bot-test-2"})
        created = await nora_client.post(
            "/api/clients/client-sarah/nora/sessions",
            headers={"Authorization": f"Bearer {_make_token('demo-user')}"},
            json={"meeting_url": "https://meet.google.com/idempotent-call"},
        )
        assert created.status_code == 201

    payload = {
        "event": "transcript.completed",
        "event_id": "evt-nora-1",
        "bot_id": "bot-test-2",
        "transcript": {
            "id": "tr-1",
            "speaker": "Adviser",
            "text": "Action: send year-end pension contribution summary.",
            "start_at": datetime.now(UTC).isoformat(),
            "end_at": datetime.now(UTC).isoformat(),
        },
    }
    body = json.dumps(payload).encode()
    msg_id = "msg_test_evt_nora_1"
    ts = str(int(time.time()))
    key = b"test-webhook-secret"
    to_sign = f"{msg_id}.{ts}.{body.decode()}"
    sig_b64 = base64.b64encode(hmac.new(key, to_sign.encode(), hashlib.sha256).digest()).decode()
    headers = {
        "webhook-id": msg_id,
        "webhook-timestamp": ts,
        "webhook-signature": f"v1,{sig_b64}",
    }

    first = await nora_client.post("/api/nora/webhooks/recall", content=body, headers=headers)
    second = await nora_client.post("/api/nora/webhooks/recall", content=body, headers=headers)
    assert first.status_code == 200
    assert second.status_code == 200

    async with get_session_factory()() as session:
        stmt = select(func.count(TranscriptChunk.id)).where(
            TranscriptChunk.provider_event_id == "evt-nora-1"
        )
        count = (await session.execute(stmt)).scalar_one()
        assert count == 1


@pytest.mark.asyncio
async def test_nora_process_generates_structured_note(nora_client: AsyncClient) -> None:
    async with get_session_factory()() as session:
        session_row = MeetingSession(
            client_id="client-sarah",
            user_id="demo-user",
            provider="recall",
            provider_bot_id="bot-test-3",
            meeting_url="https://meet.google.com/process-call",
            status="processing",
        )
        session.add(session_row)
        await session.flush()
        session.add(
            TranscriptChunk(
                session_id=session_row.id,
                speaker="Client",
                text="Next step: we should increase pension contributions before 5 April.",
                provider_event_id="evt-nora-2",
            )
        )
        await session.commit()
        nora_session_id = session_row.id

    response = await nora_client.post(
        f"/api/clients/client-sarah/nora/sessions/{nora_session_id}/process",
        headers={"Authorization": f"Bearer {_make_token('demo-user')}"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["note_id"]

    notes = await nora_client.get(
        "/api/clients/client-sarah/meeting-notes",
        headers={"Authorization": f"Bearer {_make_token('demo-user')}"},
    )
    assert notes.status_code == 200
    note = next(n for n in notes.json()["meeting_notes"] if n.get("session_id") == nora_session_id)
    assert note["source"] == "nora"
    assert isinstance(note["action_items"], list)
    assert isinstance(note["tags"], list)
    assert isinstance(note["summary"], str) and len(note["summary"]) > 0


@pytest.mark.asyncio
async def test_nora_create_meeting_then_start(nora_client: AsyncClient) -> None:
    created_meeting = await nora_client.post(
        "/api/clients/client-sarah/nora/meetings",
        headers={"Authorization": f"Bearer {_make_token('demo-user')}"},
        json={
            "meeting_url": "https://meet.google.com/scheduled-call",
            "agenda": "Quarterly review",
            "scheduled_for": datetime.now(UTC).isoformat(),
        },
    )
    assert created_meeting.status_code == 201
    meeting = created_meeting.json()
    assert meeting["status"] == "scheduled"
    assert meeting["scheduled_for"]

    with patch("app.routers.nora.RecallClient.create_bot") as create_bot:
        create_bot.return_value = RecallBotCreateResult(bot_id="bot-test-4", raw={"id": "bot-test-4"})
        started = await nora_client.post(
            f"/api/clients/client-sarah/nora/meetings/{meeting['id']}/start",
            headers={"Authorization": f"Bearer {_make_token('demo-user')}"},
        )
    assert started.status_code == 200
    started_payload = started.json()
    assert started_payload["provider_bot_id"] == "bot-test-4"
    assert started_payload["status"] == "joining"
