"""Nora transcript processing into structured meeting notes."""

from __future__ import annotations

import re
import time
from datetime import UTC, datetime

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import MeetingNote, MeetingSession, TranscriptChunk


def _sentence_split(text: str) -> list[str]:
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    return sentences


def _extract_action_items(lines: list[str]) -> list[str]:
    action_items: list[str] = []
    triggers = ("action", "todo", "next step", "follow up", "will ", "should ")
    for line in lines:
        normalized = line.lower()
        if any(t in normalized for t in triggers):
            action_items.append(line.strip(" -"))
        if len(action_items) >= 6:
            break
    return action_items


def _extract_tags(text: str) -> list[str]:
    mapping = {
        "pension": ["pension", "sipp", "salary sacrifice", "annual allowance"],
        "hicbc": ["hicbc", "child benefit"],
        "tax-planning": ["tax planning", "year end", "allowance"],
        "investments": ["investment", "isa", "cgt", "dividend"],
        "follow-up": ["follow up", "next step", "action item"],
    }
    lowered = text.lower()
    tags = [tag for tag, tokens in mapping.items() if any(tok in lowered for tok in tokens)]
    return tags[:6]


class NoraProcessingService:
    """Builds MeetingNote rows from transcript chunks."""

    async def process_session(
        self,
        *,
        session: AsyncSession,
        meeting_session: MeetingSession,
        auto_publish: bool,
    ) -> MeetingNote:
        started = time.perf_counter()
        meeting_session.status = "processing"
        meeting_session.processing_started_at = datetime.now(UTC)

        result = await session.execute(
            select(TranscriptChunk)
            .where(TranscriptChunk.session_id == meeting_session.id)
            .order_by(TranscriptChunk.ts_start, TranscriptChunk.created_at)
        )
        chunks = list(result.scalars().all())
        if not chunks:
            raise ValueError("No transcript chunks available for processing")

        transcript_lines = [
            f"{(chunk.speaker or 'Speaker')}: {chunk.text.strip()}".strip()
            for chunk in chunks
            if chunk.text and chunk.text.strip()
        ]
        transcript_text = "\n".join(transcript_lines).strip()
        sentences = _sentence_split(transcript_text)

        subject = (meeting_session.agenda or "").strip() or "Nora AI Meeting Notes"
        summary = " ".join(sentences[:5]).strip()
        if not summary:
            summary = transcript_text[:1200]

        action_items = _extract_action_items(transcript_lines)
        if not action_items:
            action_items = [
                "Review Nora summary with adviser and confirm next actions.",
                "Schedule follow-up if any open tax planning decisions remain.",
            ]
        tags = _extract_tags(transcript_text)
        confidence = min(0.95, 0.55 + min(len(transcript_text), 7000) / 20000)

        existing = await session.execute(
            select(MeetingNote)
            .where(MeetingNote.session_id == meeting_session.id)
            .order_by(desc(MeetingNote.created_at))
            .limit(1)
        )
        note = existing.scalar_one_or_none()

        duration_ms = int((time.perf_counter() - started) * 1000)
        if note is None:
            note = MeetingNote(
                client_id=meeting_session.client_id,
                author_id=meeting_session.user_id,
                session_id=meeting_session.id,
                meeting_date=meeting_session.started_at or datetime.now(UTC),
                subject=subject,
                attendees="Nora AI, Client",
                summary=summary,
                action_items=action_items,
                tags=tags,
                source="nora",
                source_id=meeting_session.provider_bot_id or meeting_session.id,
                is_draft=not auto_publish,
                processing_confidence=round(confidence, 2),
                processing_duration_ms=duration_ms,
            )
            session.add(note)
        else:
            note.subject = subject
            note.summary = summary
            note.action_items = action_items
            note.tags = tags
            note.source = "nora"
            note.source_id = meeting_session.provider_bot_id or meeting_session.id
            note.is_draft = not auto_publish
            note.processing_confidence = round(confidence, 2)
            note.processing_duration_ms = duration_ms
            note.meeting_date = meeting_session.started_at or note.meeting_date

        meeting_session.processing_completed_at = datetime.now(UTC)
        meeting_session.status = "ready"
        meeting_session.error_message = None
        return note


async def run_processing_for_session_id(
    session: AsyncSession,
    *,
    session_id: str,
    auto_publish: bool,
) -> MeetingNote | None:
    """Lookup a meeting session by id and process it."""
    row = await session.execute(select(MeetingSession).where(MeetingSession.id == session_id))
    meeting_session = row.scalar_one_or_none()
    if meeting_session is None:
        return None
    processor = NoraProcessingService()
    try:
        return await processor.process_session(
            session=session,
            meeting_session=meeting_session,
            auto_publish=auto_publish,
        )
    except ValueError as exc:
        meeting_session.status = "failed"
        meeting_session.error_message = str(exc)
        return None
