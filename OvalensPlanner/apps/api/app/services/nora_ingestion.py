"""Nora webhook ingestion and transcript persistence."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import MeetingSession, TranscriptChunk

logger = get_logger(__name__)


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = value.replace("Z", "+00:00")
    try:
        return datetime.fromisoformat(normalized)
    except ValueError:
        return None


def _extract_bot_id(payload: dict[str, Any]) -> str | None:
    """Extract Recall bot id from webhook payload. Recall sends data.bot.id; Svix may wrap."""
    data = payload.get("data") or {}
    inner = data.get("payload") or data.get("event_payload") or data
    if not isinstance(inner, dict):
        inner = {}
    candidates = [
        payload.get("bot_id"),
        payload.get("botId"),
        data.get("bot_id"),
        (data.get("bot") or {}).get("id"),
        (inner.get("bot") or {}).get("id"),
        inner.get("bot_id"),
    ]
    for candidate in candidates:
        if candidate is not None and str(candidate).strip():
            return str(candidate).strip()
    return None


def _extract_event_type(payload: dict[str, Any]) -> str:
    return str(payload.get("event") or payload.get("type") or "").strip().lower()


def _extract_transcript(payload: dict[str, Any]) -> dict[str, Any]:
    data = payload.get("data") or {}
    transcript = data.get("transcript") or payload.get("transcript") or {}
    return transcript if isinstance(transcript, dict) else {}


def _extract_recording_id(payload: dict[str, Any]) -> str | None:
    data = payload.get("data") or {}
    rec = data.get("recording") if isinstance(data, dict) else None
    if isinstance(rec, dict) and rec.get("id"):
        return str(rec["id"])
    return None


def _extract_transcript_id_from_payload(payload: dict[str, Any]) -> str | None:
    data = payload.get("data") or {}
    trans = data.get("transcript") if isinstance(data, dict) else None
    if isinstance(trans, dict) and trans.get("id"):
        return str(trans["id"])
    return None


class NoraIngestionService:
    """Handles Recall webhook events and stores session/transcript state."""

    STATUS_MAP = {
        "bot_joined": "recording",
        "bot.joining_call": "joining",
        "bot.in_waiting_room": "joining",
        "bot.in_call_not_recording": "recording",
        "bot.recording_permission_allowed": "recording",
        "bot.recording_permission_denied": "recording",
        "bot.recording_started": "recording",
        "bot.in_call_recording": "recording",
        "recording.started": "recording",
        "recording.done": "processing",  # async: ready for create_transcript
        "bot_left": "processing",
        "bot.call_ended": "processing",
        "bot.done": "processing",
        "bot.recording_stopped": "processing",
        "recording.stopped": "processing",
        "transcript_ready": "processing",
        "transcript.completed": "processing",
        "transcript.done": "processing",  # async: transcript ready, fetch and process
        "transcript.failed": "failed",
        "bot_failed": "failed",
        "bot.fatal": "failed",
        "bot.error": "failed",
    }

    async def ingest_event(
        self,
        *,
        session: AsyncSession,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        bot_id = _extract_bot_id(payload)
        if not bot_id:
            return {"ok": False, "reason": "missing_bot_id"}

        stmt = select(MeetingSession).where(
            MeetingSession.provider == "recall",
            MeetingSession.provider_bot_id == bot_id,
        )
        result = await session.execute(stmt)
        meeting_session = result.scalar_one_or_none()
        if meeting_session is None:
            # Log a short prefix for debugging (match against provider_bot_id in DB)
            prefix = (bot_id[:12] + "…") if len(bot_id) > 12 else bot_id
            logger.warning(
                "nora_unknown_bot",
                bot_id_prefix=prefix,
                bot_id_length=len(bot_id),
                hint=(
                    "Session must have provider_bot_id from create_bot; "
                    "webhook uses data.bot.id"
                ),
            )
            return {"ok": False, "reason": "unknown_bot"}

        event_type = _extract_event_type(payload)
        now = datetime.now(UTC)

        if event_type in self.STATUS_MAP:
            meeting_session.status = self.STATUS_MAP[event_type]
            if meeting_session.status == "recording" and meeting_session.started_at is None:
                meeting_session.started_at = now
            if meeting_session.status == "processing":
                meeting_session.ended_at = meeting_session.ended_at or now
            if meeting_session.status == "failed":
                detail = (payload.get("error") or payload.get("message") or "").strip()
                meeting_session.error_message = detail or "Recall reported a bot failure"

        transcript = _extract_transcript(payload)
        text = str(transcript.get("text") or "").strip()
        provider_event_id = str(
            payload.get("event_id")
            or payload.get("id")
            or transcript.get("id")
            or ""
        ).strip() or None
        if text:
            duplicate = None
            if provider_event_id:
                existing = await session.execute(
                    select(TranscriptChunk).where(
                        TranscriptChunk.provider_event_id == provider_event_id
                    )
                )
                duplicate = existing.scalar_one_or_none()
            if duplicate is None:
                session.add(
                    TranscriptChunk(
                        session_id=meeting_session.id,
                        speaker=(
                            transcript.get("speaker")
                            or transcript.get("participant")
                            or None
                        ),
                        text=text,
                        ts_start=_parse_dt(
                            transcript.get("start_at")
                            or transcript.get("start_time")
                        ),
                        ts_end=_parse_dt(transcript.get("end_at") or transcript.get("end_time")),
                        provider_event_id=provider_event_id,
                    )
                )

        should_process = event_type in {
            "transcript_ready",
            "transcript.completed",
            "recording.stopped",
            "bot.recording_stopped",
        }
        return {
            "ok": True,
            "session_id": meeting_session.id,
            "client_id": meeting_session.client_id,
            "should_process": should_process,
            "event_type": event_type,
        }
