"""Nora AI meeting bot endpoints (Recall live join + webhook ingestion)."""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field
from sqlalchemy import delete, desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from structlog.stdlib import BoundLogger

from app.config import get_settings
from app.core.queue import push_nora_processing_job
from app.db.engine import get_db_session
from app.db.models import Client, MeetingSession, TranscriptChunk
from app.dependencies import get_current_user, get_request_logger
from app.services.integrations.recall import RecallClient, verify_recall_webhook_signature
from app.services.nora_ingestion import (
    NoraIngestionService,
    _extract_recording_id,
    _extract_transcript_id_from_payload,
)
from app.services.nora_processing import NoraProcessingService

router = APIRouter(tags=["nora"])


class CreateNoraSessionRequest(BaseModel):
    meeting_url: str = Field(min_length=8)
    agenda: str | None = None
    metadata: dict[str, Any] | None = None


class CreateNoraMeetingRequest(BaseModel):
    meeting_url: str = Field(min_length=8)
    agenda: str | None = None
    scheduled_for: datetime | None = None
    metadata: dict[str, Any] | None = None


def _assert_nora_enabled() -> None:
    settings = get_settings()
    if not settings.nora_enabled:
        raise HTTPException(status_code=404, detail="Nora AI is disabled")
    if not settings.recall_api_key:
        raise HTTPException(status_code=500, detail="RECALL_API_KEY is not configured")
    if not settings.recall_webhook_secret:
        raise HTTPException(status_code=500, detail="RECALL_WEBHOOK_SECRET is not configured")


async def _ensure_client_owned(
    session: AsyncSession, *, client_id: str, user_id: str
) -> Client:
    result = await session.execute(
        select(Client).where(Client.id == client_id).where(Client.user_id == user_id)
    )
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")
    return client


def _serialize_session(s: MeetingSession) -> dict[str, Any]:
    return {
        "id": s.id,
        "client_id": s.client_id,
        "provider": s.provider,
        "provider_bot_id": s.provider_bot_id,
        "status": s.status,
        "agenda": s.agenda,
        "meeting_url": s.meeting_url,
        "error_message": s.error_message,
        "scheduled_for": s.scheduled_for.isoformat() if s.scheduled_for else None,
        "started_at": s.started_at.isoformat() if s.started_at else None,
        "ended_at": s.ended_at.isoformat() if s.ended_at else None,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


def _is_localhost_url(url: str) -> bool:
    base = (url or "").strip().lower()
    return base.startswith("http://127.0.0.1/") or base.startswith("http://localhost") or "localhost" in base or "127.0.0.1" in base


async def _start_recall_bot_for_session(
    *,
    request: Request,
    nora_session: MeetingSession,
    metadata: dict[str, Any] | None = None,
) -> None:
    settings = get_settings()
    base = (settings.nora_webhook_base_url or "").strip() if settings else ""
    if base:
        webhook_url = base.rstrip("/") + "/api/nora/webhooks/recall"
    else:
        inferred = str(request.base_url).rstrip("/") + "/api/nora/webhooks/recall"
        webhook_url = None if _is_localhost_url(inferred) else inferred
    if webhook_url and settings and settings.environment in {"production", "beta"} and not webhook_url.startswith("https://"):
        raise HTTPException(status_code=500, detail="Webhook URL must be HTTPS in production")

    merged_metadata = {
        "client_id": nora_session.client_id,
        "user_id": nora_session.user_id,
        "session_id": nora_session.id,
        **(metadata or {}),
    }
    recall = RecallClient()
    try:
        created = await recall.create_bot(
            meeting_url=(nora_session.meeting_url or "").strip(),
            webhook_url=webhook_url,
            metadata=merged_metadata,
        )
        nora_session.provider_bot_id = created.bot_id
        nora_session.status = "joining"
        nora_session.started_at = datetime.now(UTC)
        nora_session.error_message = None
    except HTTPException:
        nora_session.status = "failed"
        nora_session.error_message = "Failed to create Recall bot"
        raise


@router.post("/clients/{client_id}/nora/meetings", status_code=201)
async def create_nora_meeting(
    client_id: str,
    body: CreateNoraMeetingRequest,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
    user_id: str = Depends(get_current_user),
):
    _assert_nora_enabled()
    await _ensure_client_owned(session, client_id=client_id, user_id=user_id)

    meeting_url = body.meeting_url.strip()
    meeting_url_hash = hashlib.sha256(meeting_url.encode()).hexdigest()
    nora_meeting = MeetingSession(
        client_id=client_id,
        user_id=user_id,
        provider="recall",
        meeting_url=meeting_url,
        meeting_url_hash=meeting_url_hash,
        agenda=body.agenda,
        scheduled_for=body.scheduled_for,
        status="scheduled",
    )
    session.add(nora_meeting)
    await session.flush()
    logger.info(
        "nora_meeting_created",
        session_id=nora_meeting.id,
        client_id=client_id,
        user_id=user_id,
        scheduled_for=nora_meeting.scheduled_for.isoformat() if nora_meeting.scheduled_for else None,
    )
    return _serialize_session(nora_meeting)


@router.post("/clients/{client_id}/nora/meetings/{meeting_id}/start")
async def start_nora_meeting(
    client_id: str,
    meeting_id: str,
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
    user_id: str = Depends(get_current_user),
):
    _assert_nora_enabled()
    await _ensure_client_owned(session, client_id=client_id, user_id=user_id)
    result = await session.execute(
        select(MeetingSession)
        .where(MeetingSession.id == meeting_id)
        .where(MeetingSession.client_id == client_id)
        .where(MeetingSession.user_id == user_id)
    )
    nora_meeting = result.scalar_one_or_none()
    if nora_meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if not (nora_meeting.meeting_url or "").strip():
        raise HTTPException(status_code=400, detail="Meeting URL is required")

    await _start_recall_bot_for_session(request=request, nora_session=nora_meeting)
    await session.flush()
    logger.info(
        "nora_meeting_started",
        session_id=nora_meeting.id,
        client_id=client_id,
        provider_bot_id=nora_meeting.provider_bot_id,
    )
    return _serialize_session(nora_meeting)


@router.post("/clients/{client_id}/nora/sessions", status_code=201)
async def create_nora_session(
    client_id: str,
    body: CreateNoraSessionRequest,
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
    user_id: str = Depends(get_current_user),
):
    _assert_nora_enabled()
    await _ensure_client_owned(session, client_id=client_id, user_id=user_id)

    meeting_url = body.meeting_url.strip()
    meeting_url_hash = hashlib.sha256(meeting_url.encode()).hexdigest()
    nora_session = MeetingSession(
        client_id=client_id,
        user_id=user_id,
        provider="recall",
        meeting_url=meeting_url,
        meeting_url_hash=meeting_url_hash,
        agenda=body.agenda,
        status="scheduled",
    )
    session.add(nora_session)
    await session.flush()

    await _start_recall_bot_for_session(
        request=request,
        nora_session=nora_session,
        metadata=body.metadata,
    )

    logger.info(
        "nora_session_created",
        session_id=nora_session.id,
        client_id=client_id,
        user_id=user_id,
        provider_bot_id=nora_session.provider_bot_id,
    )
    return _serialize_session(nora_session)


@router.get("/clients/{client_id}/nora/sessions")
async def list_nora_sessions(
    client_id: str,
    session: AsyncSession = Depends(get_db_session),
    user_id: str = Depends(get_current_user),
):
    _assert_nora_enabled()
    await _ensure_client_owned(session, client_id=client_id, user_id=user_id)
    result = await session.execute(
        select(MeetingSession)
        .where(MeetingSession.client_id == client_id)
        .where(MeetingSession.user_id == user_id)
        .order_by(desc(MeetingSession.created_at))
        .limit(30)
    )
    rows = list(result.scalars().all())
    return {"sessions": [_serialize_session(s) for s in rows]}


@router.get("/clients/{client_id}/nora/meetings")
async def list_nora_meetings(
    client_id: str,
    session: AsyncSession = Depends(get_db_session),
    user_id: str = Depends(get_current_user),
):
    _assert_nora_enabled()
    await _ensure_client_owned(session, client_id=client_id, user_id=user_id)
    result = await session.execute(
        select(MeetingSession)
        .where(MeetingSession.client_id == client_id)
        .where(MeetingSession.user_id == user_id)
        .order_by(desc(MeetingSession.created_at))
        .limit(30)
    )
    rows = list(result.scalars().all())
    return {"meetings": [_serialize_session(s) for s in rows]}


@router.post("/clients/{client_id}/nora/sessions/{session_id}/process")
async def process_nora_session(
    client_id: str,
    session_id: str,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
    user_id: str = Depends(get_current_user),
):
    _assert_nora_enabled()
    await _ensure_client_owned(session, client_id=client_id, user_id=user_id)
    result = await session.execute(
        select(MeetingSession)
        .where(MeetingSession.id == session_id)
        .where(MeetingSession.client_id == client_id)
        .where(MeetingSession.user_id == user_id)
    )
    nora_session = result.scalar_one_or_none()
    if nora_session is None:
        raise HTTPException(status_code=404, detail="Session not found")

    enqueued = await push_nora_processing_job(nora_session.id)
    if enqueued:
        nora_session.status = "processing"
        await session.flush()
        logger.info(
            "nora_session_processing_queued",
            session_id=nora_session.id,
            client_id=client_id,
        )
        return {"success": True, "queued": True, "session_id": nora_session.id}

    processor = NoraProcessingService()
    try:
        note = await processor.process_session(
            session=session,
            meeting_session=nora_session,
            auto_publish=get_settings().nora_auto_publish_notes,
        )
        await session.flush()
    except ValueError as exc:
        nora_session.status = "failed"
        nora_session.error_message = str(exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    logger.info(
        "nora_session_processed_sync",
        session_id=nora_session.id,
        note_id=note.id,
        client_id=client_id,
    )
    return {"success": True, "queued": False, "session_id": nora_session.id, "note_id": note.id}


@router.post("/clients/{client_id}/nora/sessions/{session_id}/fetch-transcript")
async def fetch_transcript_and_process(
    client_id: str,
    session_id: str,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
    user_id: str = Depends(get_current_user),
):
    """Fetch transcript from Recall for this session, save to DB, and generate meeting note.
    Use when the bot recorded but webhooks were not received (e.g. localhost)."""
    _assert_nora_enabled()
    await _ensure_client_owned(session, client_id=client_id, user_id=user_id)
    result = await session.execute(
        select(MeetingSession)
        .where(MeetingSession.id == session_id)
        .where(MeetingSession.client_id == client_id)
        .where(MeetingSession.user_id == user_id)
    )
    nora_session = result.scalar_one_or_none()
    if nora_session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    bot_id = (nora_session.provider_bot_id or "").strip()
    if not bot_id:
        raise HTTPException(status_code=400, detail="No Recall bot linked to this session")

    recall = RecallClient()
    try:
        chunks = await recall.get_bot_transcript(bot_id)
    except HTTPException:
        raise

    if not chunks:
        raise HTTPException(
            status_code=404,
            detail="Transcript not ready yet. Wait a few minutes after the meeting ends and try again.",
        )

    # Replace any existing chunks for this session (from a previous fetch or partial webhook)
    await session.execute(delete(TranscriptChunk).where(TranscriptChunk.session_id == session_id))
    base_ts = nora_session.started_at or datetime.now(UTC)
    for i, c in enumerate(chunks):
        ts_start = ts_end = None
        if c.get("ts_start") is not None and isinstance(c["ts_start"], (int, float)):
            ts_start = base_ts + timedelta(seconds=float(c["ts_start"]))
        if c.get("ts_end") is not None and isinstance(c["ts_end"], (int, float)):
            ts_end = base_ts + timedelta(seconds=float(c["ts_end"]))
        session.add(
            TranscriptChunk(
                session_id=session_id,
                speaker=str(c.get("speaker") or "").strip() or None,
                text=str(c.get("text") or "").strip() or "(no text)",
                ts_start=ts_start,
                ts_end=ts_end,
                provider_event_id=f"recall-fetch-{bot_id}-{i}",
            )
        )
    nora_session.status = "processing"
    nora_session.ended_at = nora_session.ended_at or datetime.now(UTC)
    await session.flush()

    # Process into a meeting note (sync or queue)
    enqueued = await push_nora_processing_job(nora_session.id)
    if enqueued:
        logger.info(
            "nora_fetch_transcript_queued",
            session_id=nora_session.id,
            client_id=client_id,
            chunks=len(chunks),
        )
        return {
            "success": True,
            "queued": True,
            "session_id": nora_session.id,
            "chunks_saved": len(chunks),
            "message": "Transcript fetched. Note will be generated shortly by the worker.",
        }

    processor = NoraProcessingService()
    try:
        note = await processor.process_session(
            session=session,
            meeting_session=nora_session,
            auto_publish=get_settings().nora_auto_publish_notes,
        )
        await session.flush()
    except ValueError as exc:
        nora_session.status = "failed"
        nora_session.error_message = str(exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    logger.info(
        "nora_fetch_transcript_processed",
        session_id=nora_session.id,
        note_id=note.id,
        client_id=client_id,
        chunks=len(chunks),
    )
    return {
        "success": True,
        "queued": False,
        "session_id": nora_session.id,
        "note_id": note.id,
        "chunks_saved": len(chunks),
    }


@router.post("/nora/webhooks/recall")
async def recall_webhook(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    _assert_nora_enabled()
    raw_body = await request.body()
    verified, reason = verify_recall_webhook_signature(raw_body, dict(request.headers))
    if not verified:
        logger.warning("nora_webhook_signature_rejected", reason=reason)
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    payload = await request.json()
    logger.info(
        "nora_webhook_received",
        event=str(payload.get("event") or payload.get("type") or "unknown"),
    )
    ingestor = NoraIngestionService()
    result = await ingestor.ingest_event(session=session, payload=payload)
    if not result.get("ok"):
        logger.warning("nora_webhook_ignored", reason=result.get("reason"))
        return {"ok": True, "ignored": True, "reason": result.get("reason")}

    event_type = result.get("event_type") or ""
    session_id = result.get("session_id")

    # Async transcription: when recording is done, kick off Create Async Transcript
    if event_type == "recording.done":
        recording_id = _extract_recording_id(payload)
        if recording_id:
            try:
                recall = RecallClient()
                transcript_id = await recall.create_async_transcript(recording_id)
                logger.info(
                    "nora_async_transcript_started",
                    recording_id=recording_id,
                    transcript_id=transcript_id,
                    session_id=session_id,
                )
            except HTTPException as e:
                logger.warning(
                    "nora_async_transcript_failed",
                    recording_id=recording_id,
                    detail=str(e.detail),
                )

    # Async transcription: when transcript.done, fetch transcript and process into note
    if event_type == "transcript.done" and session_id:
        transcript_id = _extract_transcript_id_from_payload(payload)
        if transcript_id:
            row = await session.execute(
                select(MeetingSession).where(MeetingSession.id == session_id)
            )
            nora_session = row.scalar_one_or_none()
            if nora_session:
                try:
                    recall = RecallClient()
                    chunks = await recall.get_transcript_by_id(transcript_id)
                    if chunks:
                        await session.execute(
                            delete(TranscriptChunk).where(TranscriptChunk.session_id == session_id)
                        )
                        base_ts = nora_session.started_at or datetime.now(UTC)
                        for i, c in enumerate(chunks):
                            ts_start = ts_end = None
                            if c.get("ts_start") is not None and isinstance(c["ts_start"], (int, float)):
                                ts_start = base_ts + timedelta(seconds=float(c["ts_start"]))
                            if c.get("ts_end") is not None and isinstance(c["ts_end"], (int, float)):
                                ts_end = base_ts + timedelta(seconds=float(c["ts_end"]))
                            session.add(
                                TranscriptChunk(
                                    session_id=session_id,
                                    speaker=str(c.get("speaker") or "").strip() or None,
                                    text=str(c.get("text") or "").strip() or "(no text)",
                                    ts_start=ts_start,
                                    ts_end=ts_end,
                                    provider_event_id=f"recall-async-{transcript_id}-{i}",
                                )
                            )
                        nora_session.status = "processing"
                        nora_session.ended_at = nora_session.ended_at or datetime.now(UTC)
                        queued = await push_nora_processing_job(session_id)
                        if queued:
                            logger.info(
                                "nora_transcript_done_queued",
                                session_id=session_id,
                                transcript_id=transcript_id,
                                chunks=len(chunks),
                            )
                        else:
                            processor = NoraProcessingService()
                            await processor.process_session(
                                session=session,
                                meeting_session=nora_session,
                                auto_publish=get_settings().nora_auto_publish_notes,
                            )
                            logger.info(
                                "nora_transcript_done_processed",
                                session_id=session_id,
                                transcript_id=transcript_id,
                                chunks=len(chunks),
                            )
                except HTTPException as e:
                    logger.warning(
                        "nora_transcript_done_fetch_failed",
                        session_id=session_id,
                        transcript_id=transcript_id,
                        detail=str(e.detail),
                    )
                    nora_session.status = "failed"
                    nora_session.error_message = str(e.detail)

    if result.get("should_process") and event_type not in ("recording.done", "transcript.done"):
        queued = await push_nora_processing_job(result["session_id"])
        if queued:
            row = await session.execute(
                select(MeetingSession).where(MeetingSession.id == result["session_id"])
            )
            nora_session = row.scalar_one_or_none()
            if nora_session:
                nora_session.status = "processing"
                nora_session.error_message = None
        else:
            row = await session.execute(
                select(MeetingSession).where(MeetingSession.id == result["session_id"])
            )
            nora_session = row.scalar_one_or_none()
            if nora_session:
                try:
                    processor = NoraProcessingService()
                    await processor.process_session(
                        session=session,
                        meeting_session=nora_session,
                        auto_publish=get_settings().nora_auto_publish_notes,
                    )
                except ValueError as exc:
                    nora_session.status = "failed"
                    nora_session.error_message = str(exc)
                except Exception:
                    nora_session.status = "failed"
                    nora_session.error_message = "Unexpected processing error"

    await session.flush()
    logger.info(
        "nora_webhook_processed",
        session_id=result.get("session_id"),
        should_process=result.get("should_process", False),
    )
    return {"ok": True, "received_at": datetime.now(UTC).isoformat()}
