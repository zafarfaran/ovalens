"""Context ingest: programmatic cleanup, LLM cleanup, and run for a snippet (sync or worker)."""

from __future__ import annotations

import re

import anthropic
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.logging import get_logger
from app.db.models import ContextSnippet

logger = get_logger(__name__)

BOILERPLATE_PHRASES = frozenset(
    [
        "accept all cookies",
        "accept cookies",
        "reject all",
        "reject cookies",
        "skip to main content",
        "skip to content",
        "skip navigation",
        "subscribe to newsletter",
        "subscribe to our newsletter",
        "cookie policy",
        "privacy policy",
        "terms of use",
        "terms of service",
        "terms and conditions",
        "manage cookie preferences",
        "cookie settings",
        "we use cookies",
        "this site uses cookies",
    ]
)

CLEANUP_PROMPT = (
    "Convert this raw web page text into clean, structured markdown. "
    "Preserve all substantive content, tables, lists, and data. "
    "Keep it concise. Do NOT add commentary — just the cleaned content."
)


def programmatic_cleanup(raw: str) -> str:
    """Strip obvious noise before LLM processing."""
    lines = raw.splitlines()
    cleaned_lines: list[str] = []
    for line in lines:
        stripped = line.strip()
        if not stripped:
            cleaned_lines.append("")
            continue
        if re.match(r"^https?://\S+$", stripped):
            continue
        if re.match(r"^[-=*_]{3,}$", stripped):
            continue
        if stripped.lower() in BOILERPLATE_PHRASES:
            continue
        cleaned_lines.append(line.rstrip())
    result = "\n".join(cleaned_lines)
    result = re.sub(r"\n{3,}", "\n\n", result)
    return result.strip()


async def clean_with_llm(raw_content: str) -> str:
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
        return raw_content


async def run_cleanup_for_snippet(session: AsyncSession, snippet_id: str) -> None:
    """Load snippet by id, run programmatic + LLM cleanup, update snippet and commit."""
    result = await session.execute(select(ContextSnippet).where(ContextSnippet.id == snippet_id))
    snippet = result.scalar_one_or_none()
    if not snippet:
        logger.warning("context_ingest_worker_snippet_not_found", snippet_id=snippet_id)
        return
    pre_cleaned = programmatic_cleanup(snippet.raw_content or "")
    cleaned = await clean_with_llm(pre_cleaned)
    snippet.cleaned_markdown = cleaned
    snippet.status = "ready"
    await session.commit()
    logger.info("context_ingest_worker_done", snippet_id=snippet_id, cleaned_length=len(cleaned))
