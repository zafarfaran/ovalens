"""Context ingestion — browser extension sends captured web pages here."""

import re
import uuid

import anthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from structlog.stdlib import BoundLogger

from app.config import get_settings
from app.core.logging import get_logger
from app.db.engine import get_db_session
from app.db.models import ContextSnippet
from app.dependencies import get_request_logger

logger = get_logger(__name__)
router = APIRouter(tags=["context"])

MAX_RAW_CONTENT_LENGTH = 50_000

# Boilerplate phrases to strip (case-insensitive, matched as whole lines)
BOILERPLATE_PHRASES = frozenset([
    "accept all cookies", "accept cookies", "reject all", "reject cookies",
    "skip to main content", "skip to content", "skip navigation",
    "subscribe to newsletter", "subscribe to our newsletter",
    "cookie policy", "privacy policy", "terms of use", "terms of service",
    "terms and conditions", "manage cookie preferences", "cookie settings",
    "we use cookies", "this site uses cookies",
])

CLEANUP_PROMPT = (
    "Convert this raw web page text into clean, structured markdown. "
    "Preserve all substantive content, tables, lists, and data. "
    "Keep it concise. Do NOT add commentary — just the cleaned content."
)


class IngestRequest(BaseModel):
    raw_content: str
    source_url: str
    source_title: str = ""
    capture_type: str = "full_page"


@router.post("/context/ingest")
async def ingest_context(
    body: IngestRequest,
    session: AsyncSession = Depends(get_db_session),
    log: BoundLogger = Depends(get_request_logger),
):
    """Receive raw web page content, clean it with an LLM, and store it."""
    user_id = "demo-user"
    snippet_id = str(uuid.uuid4())

    raw = body.raw_content[:MAX_RAW_CONTENT_LENGTH]

    log.info(
        "Context ingest received",
        snippet_id=snippet_id,
        source_url=body.source_url,
        capture_type=body.capture_type,
        raw_length=len(raw),
    )

    # Step 1: Programmatic cleanup (reduces noise before LLM, saves tokens)
    pre_cleaned = _programmatic_cleanup(raw)
    log.info("Pre-cleaned content", raw_length=len(raw), cleaned_length=len(pre_cleaned))

    # Step 2: LLM cleanup for semantic structuring
    cleaned = await _clean_with_llm(pre_cleaned)

    snippet = ContextSnippet(
        id=snippet_id,
        user_id=user_id,
        source_url=body.source_url,
        source_title=body.source_title or body.source_url,
        raw_content=raw,
        cleaned_markdown=cleaned,
        capture_type=body.capture_type,
        status="ready",
        is_consumed=False,
    )
    session.add(snippet)
    await session.commit()
    await session.refresh(snippet)

    log.info("Context snippet stored", snippet_id=snippet_id, cleaned_length=len(cleaned))

    return {
        "id": snippet_id,
        "title": snippet.source_title,
        "markdown_preview": cleaned[:200],
        "status": "ready",
        "created_at": snippet.created_at.isoformat() if snippet.created_at else None,
    }


@router.get("/context/pending")
async def get_pending_context(
    session: AsyncSession = Depends(get_db_session),
    log: BoundLogger = Depends(get_request_logger),
):
    """Return unconsumed context snippets for the current user."""
    user_id = "demo-user"

    result = await session.execute(
        select(ContextSnippet)
        .where(ContextSnippet.user_id == user_id)
        .where(ContextSnippet.is_consumed == False)  # noqa: E712
        .where(ContextSnippet.status == "ready")
        .order_by(ContextSnippet.created_at.desc())
    )
    snippets = list(result.scalars().all())

    log.debug("Pending context fetched", count=len(snippets))

    return {
        "snippets": [
            {
                "id": s.id,
                "source_url": s.source_url,
                "source_title": s.source_title,
                "capture_type": s.capture_type,
                "markdown_preview": s.cleaned_markdown[:200],
                "cleaned_markdown": s.cleaned_markdown,
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in snippets
        ]
    }


@router.delete("/context/{snippet_id}")
async def dismiss_context(
    snippet_id: str,
    session: AsyncSession = Depends(get_db_session),
    log: BoundLogger = Depends(get_request_logger),
):
    """Dismiss a context snippet without using it (mark as consumed)."""
    user_id = "demo-user"
    result = await session.execute(
        update(ContextSnippet)
        .where(ContextSnippet.id == snippet_id)
        .where(ContextSnippet.user_id == user_id)
        .values(is_consumed=True)
    )
    await session.commit()
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Snippet not found")
    log.info("Context snippet dismissed", snippet_id=snippet_id)
    return {"ok": True}


def _programmatic_cleanup(raw: str) -> str:
    """Server-side programmatic cleanup before LLM processing.

    Strips obvious noise that doesn't need an LLM to identify:
    URL-only lines, boilerplate phrases, repeated separators, excessive whitespace.
    """
    lines = raw.splitlines()
    cleaned_lines: list[str] = []

    for line in lines:
        stripped = line.strip()

        # Skip empty lines (we'll normalize later)
        if not stripped:
            cleaned_lines.append("")
            continue

        # Skip URL-only lines
        if re.match(r"^https?://\S+$", stripped):
            continue

        # Skip separator-only lines (---, ===, ***, etc.)
        if re.match(r"^[-=*_]{3,}$", stripped):
            continue

        # Skip boilerplate phrases (case-insensitive exact match)
        if stripped.lower() in BOILERPLATE_PHRASES:
            continue

        cleaned_lines.append(line.rstrip())

    result = "\n".join(cleaned_lines)

    # Collapse 3+ consecutive newlines -> 2
    result = re.sub(r"\n{3,}", "\n\n", result)

    return result.strip()


async def _clean_with_llm(raw_content: str) -> str:
    """Use Claude Haiku to convert raw text to clean markdown."""
    settings = get_settings()
    if not settings.anthropic_api_key:
        logger.warning("No Anthropic API key — returning raw content as-is")
        return raw_content

    try:
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
            messages=[{"role": "user", "content": f"{CLEANUP_PROMPT}\n\n---\n\n{raw_content}"}],
        )
        return response.content[0].text
    except Exception as e:
        logger.exception("LLM cleanup failed, returning pre-cleaned content", error=str(e))
        return raw_content  # Falls back to _programmatic_cleanup output (already cleaner than raw)
