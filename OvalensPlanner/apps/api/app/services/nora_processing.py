"""Nora transcript processing into structured meeting notes.

Post-processing pipeline: transcript → structured draft (summary, action list, tags).
LLM pipeline (default when API key set) uses Claude with timeout, retries, and validation.
Falls back to heuristic extraction on missing API key or after exhausting retries.
Production: scalable (configurable model/limits), error-resistant (retry, timeout, fallback).
"""

from __future__ import annotations

import asyncio
import json
import re
import time
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import MeetingNote, MeetingSession, TranscriptChunk

# Field limits for DB and safe LLM output
SUBJECT_MAX_LEN = 500
SUMMARY_MAX_LEN = 8000
ACTION_ITEMS_MAX = 20
TAGS_MAX = 12
ERROR_MESSAGE_MAX_LEN = 500


def _sentence_split(text: str) -> list[str]:
    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    return sentences


@dataclass
class PipelineOutput:
    """Structured output from the meeting notes post-processing pipeline."""

    subject: str
    summary: str
    action_items: list[str]
    tags: list[str]


# ─── Heuristic pipeline (sync logic, async interface) ────────────────────────


class MeetingNotesPipeline:
    """
    Post-processing pipeline: raw transcript → subject, summary, action list, tags.
    Default implementation uses heuristics. Use LLMMeetingNotesPipeline for LLM extraction.
    """

    async def run(
        self,
        *,
        transcript_text: str,
        transcript_lines: list[str],
        agenda: str | None = None,
        started_at: datetime | None = None,
    ) -> PipelineOutput:
        """Produce structured meeting note fields from transcript. Default: heuristic extraction."""
        subject = (agenda or "").strip() or "Nora AI Meeting Notes"
        sentences = _sentence_split(transcript_text)
        summary = " ".join(sentences[:5]).strip() or transcript_text[:1200]
        action_items = self._extract_action_items(transcript_lines)
        if not action_items:
            action_items = [
                "Review Nora summary with adviser and confirm next actions.",
                "Schedule follow-up if any open tax planning decisions remain.",
            ]
        tags = self._extract_tags(transcript_text)
        return PipelineOutput(
            subject=subject,
            summary=summary,
            action_items=action_items,
            tags=tags,
        )

    def _extract_action_items(self, lines: list[str]) -> list[str]:
        """Build action list from transcript lines. Override for custom/LLM extraction."""
        action_items: list[str] = []
        triggers = ("action", "todo", "next step", "follow up", "will ", "should ")
        for line in lines:
            normalized = line.lower()
            if any(t in normalized for t in triggers):
                action_items.append(line.strip(" -"))
            if len(action_items) >= 6:
                break
        return action_items

    def _extract_tags(self, text: str) -> list[str]:
        """Extract topic tags from transcript. Override for custom/LLM extraction."""
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


def _extract_action_items(lines: list[str]) -> list[str]:
    """Legacy helper: delegate to default pipeline."""
    return MeetingNotesPipeline()._extract_action_items(lines)


def _extract_tags(text: str) -> list[str]:
    """Legacy helper: delegate to default pipeline."""
    return MeetingNotesPipeline()._extract_tags(text)


# ─── LLM pipeline (Claude) ───────────────────────────────────────────────────

MEETING_NOTES_EXTRACTION_PROMPT = (
    "You are a meeting notes assistant for UK financial advisers. "
    "Given a meeting transcript, output a structured summary and action list.\n\n"
    "Respond with ONLY a valid JSON object (no markdown, no code fence, no explanation) "
    "with exactly these keys:\n"
    '- "subject": string — short meeting title (agenda or from transcript)\n'
    '- "summary": string — 2–4 sentence summary of what was discussed and any decisions\n'
    '- "action_items": array of strings — clear follow-up actions (who will do what). '
    "1–8 items. Empty array if none.\n"
    '- "tags": array of strings — topic tags, e.g. "pension", "tax-planning", '
    '"investments", "hicbc", "follow-up". Lowercase, 1–6 tags.\n\n'
    "Rules:\n"
    "- Action items must be concrete and assignable "
    '(e.g. "Client to send P60 by Friday" not "Discuss tax").\n'
    "- Summary should be neutral and factual.\n"
    "- If the transcript is empty or nonsense, return sensible defaults: "
    'subject "Meeting Notes", summary "No content extracted.", '
    "action_items and tags as empty arrays."
)


def _parse_and_validate_llm_output(text: str) -> PipelineOutput:
    """Parse LLM JSON and validate into PipelineOutput. Raises on invalid data."""
    text = (text or "").strip()
    if text.startswith("```"):
        lines = text.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)
    data = json.loads(text)
    if not isinstance(data, dict):
        raise ValueError("LLM response is not a JSON object")
    subject = str(data.get("subject") or "").strip() or "Meeting Notes"
    summary = str(data.get("summary") or "").strip() or "No content extracted."
    raw_items = data.get("action_items")
    action_items = (
        [str(x).strip() for x in raw_items if str(x).strip()]
        if isinstance(raw_items, list)
        else []
    )
    raw_tags = data.get("tags")
    tags = (
        [str(x).strip().lower() for x in raw_tags if x and str(x).strip()]
        if isinstance(raw_tags, list)
        else []
    )
    if not action_items:
        action_items = [
            "Review meeting summary with adviser and confirm next actions.",
            "Schedule follow-up if any open items remain.",
        ]
    return PipelineOutput(
        subject=subject[:SUBJECT_MAX_LEN],
        summary=summary[:SUMMARY_MAX_LEN],
        action_items=action_items[:ACTION_ITEMS_MAX],
        tags=tags[:TAGS_MAX],
    )


def _is_retryable_anthropic_error(exc: BaseException) -> bool:
    """True for transient errors that warrant a retry (429, 5xx, timeout, connection)."""
    name = type(exc).__name__
    if name in ("APITimeoutError", "APIConnectionError"):
        return True
    if name in ("APIStatusError", "RateLimitError"):
        status = getattr(exc, "status_code", None) or 0
        return status == 429 or status >= 500
    return False


class LLMMeetingNotesPipeline(MeetingNotesPipeline):
    """
    Pipeline that uses Claude to generate summary, action items, and tags.
    Production-hardened: configurable timeout, retries with backoff, output validation,
    structured logging, metrics. Falls back to heuristic on missing key or final failure.
    """

    async def run(
        self,
        *,
        transcript_text: str,
        transcript_lines: list[str],
        agenda: str | None = None,
        started_at: datetime | None = None,
    ) -> PipelineOutput:
        from app.config import get_settings
        from app.core.logging import get_logger
        from app.core.metrics import record_llm_failure

        logger = get_logger(__name__)
        settings = get_settings()
        if not (settings.anthropic_api_key or "").strip():
            logger.info(
                "nora_notes_llm_skipped",
                reason="no_api_key",
                pipeline="heuristic",
            )
            return await super().run(
                transcript_text=transcript_text,
                transcript_lines=transcript_lines,
                agenda=agenda,
                started_at=started_at,
            )

        max_chars = max(1000, min(settings.nora_transcript_max_chars, 100_000))
        if len(transcript_text) > max_chars:
            transcript_text = transcript_text[-max_chars:]
        user_content = f"Agenda (if any): {agenda or 'None'}\n\nTranscript:\n{transcript_text}"
        model = (settings.nora_llm_model or settings.ai_model or "claude-sonnet-4-20250514").strip()
        timeout_seconds = max(10, min(settings.nora_llm_timeout_seconds, 300))
        max_retries = max(0, min(settings.nora_llm_max_retries, 5))
        last_error: BaseException | None = None

        for attempt in range(max_retries + 1):
            try:
                t0 = time.perf_counter()
                out = await asyncio.wait_for(
                    self._call_llm(
                        settings.anthropic_api_key,
                        model=model,
                        user_content=user_content,
                    ),
                    timeout=timeout_seconds,
                )
                duration_ms = int((time.perf_counter() - t0) * 1000)
                logger.info(
                    "nora_notes_llm_success",
                    model=model,
                    transcript_chars=len(transcript_text),
                    duration_ms=duration_ms,
                    attempt=attempt + 1,
                )
                return out
            except TimeoutError as e:
                last_error = e
                logger.warning(
                    "nora_notes_llm_timeout",
                    model=model,
                    timeout_seconds=timeout_seconds,
                    attempt=attempt + 1,
                )
                if attempt < max_retries:
                    await asyncio.sleep(2**attempt)
            except Exception as e:
                last_error = e
                if _is_retryable_anthropic_error(e) and attempt < max_retries:
                    delay = 2**attempt
                    logger.warning(
                        "nora_notes_llm_retry",
                        error_type=type(e).__name__,
                        attempt=attempt + 1,
                        next_delay_s=delay,
                    )
                    await asyncio.sleep(delay)
                else:
                    break

        # Final failure: log, record metric, fallback
        record_llm_failure(model)
        logger.warning(
            "nora_notes_llm_fallback",
            model=model,
            error_type=type(last_error).__name__ if last_error else "unknown",
            error_message=str(last_error)[:ERROR_MESSAGE_MAX_LEN] if last_error else "",
            transcript_chars=len(transcript_text),
        )
        return await super().run(
            transcript_text=transcript_text,
            transcript_lines=transcript_lines,
            agenda=agenda,
            started_at=started_at,
        )

    async def _call_llm(
        self, api_key: str, *, model: str, user_content: str
    ) -> PipelineOutput:
        """Single LLM call; raises on API or parse/validation errors."""
        import anthropic
        client = anthropic.AsyncAnthropic(api_key=api_key)
        response = await client.messages.create(
            model=model,
            max_tokens=2048,
            system=MEETING_NOTES_EXTRACTION_PROMPT,
            messages=[{"role": "user", "content": user_content}],
        )
        text = (response.content[0].text if response.content else "").strip()
        if not text:
            raise ValueError("Empty LLM response")
        return _parse_and_validate_llm_output(text)


def get_default_pipeline() -> MeetingNotesPipeline:
    """Use LLM pipeline when Anthropic API key is set, otherwise heuristic."""
    from app.config import get_settings
    if (get_settings().anthropic_api_key or "").strip():
        return LLMMeetingNotesPipeline()
    return MeetingNotesPipeline()


class NoraProcessingService:
    """Builds MeetingNote rows from transcript chunks using a configurable pipeline."""

    def __init__(self, pipeline: MeetingNotesPipeline | None = None):
        self.pipeline = pipeline or get_default_pipeline()

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

        out = await self.pipeline.run(
            transcript_text=transcript_text,
            transcript_lines=transcript_lines,
            agenda=meeting_session.agenda,
            started_at=meeting_session.started_at,
        )
        subject = out.subject
        summary = out.summary
        action_items = out.action_items
        tags = out.tags
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
) -> tuple[MeetingNote | None, str | None]:
    """
    Lookup a meeting session by id and process it. Returns (note, client_id) for SSE notify.
    On any exception: sets session status to 'failed' and error_message so the caller can
    commit and the UI shows failure. Never leaves the session stuck in 'processing'.
    """
    from app.core.logging import get_logger

    logger = get_logger(__name__)
    row = await session.execute(select(MeetingSession).where(MeetingSession.id == session_id))
    meeting_session = row.scalar_one_or_none()
    if meeting_session is None:
        logger.warning("nora_processing_session_not_found", session_id=session_id)
        return None, None
    processor = NoraProcessingService()
    try:
        note = await processor.process_session(
            session=session,
            meeting_session=meeting_session,
            auto_publish=auto_publish,
        )
        return note, meeting_session.client_id
    except ValueError as exc:
        meeting_session.status = "failed"
        meeting_session.error_message = (str(exc))[:ERROR_MESSAGE_MAX_LEN]
        logger.warning(
            "nora_processing_failed",
            session_id=session_id,
            reason="validation",
            error=str(exc)[:ERROR_MESSAGE_MAX_LEN],
        )
        return None, meeting_session.client_id
    except Exception as exc:
        meeting_session.status = "failed"
        meeting_session.error_message = (str(exc))[:ERROR_MESSAGE_MAX_LEN]
        logger.exception(
            "nora_processing_error",
            session_id=session_id,
            error_type=type(exc).__name__,
        )
        return None, meeting_session.client_id
