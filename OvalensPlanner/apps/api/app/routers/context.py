"""Context ingestion — browser extension sends captured web pages here."""

import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from structlog.stdlib import BoundLogger

from app.config import get_settings
from app.core.logging import get_logger
from app.core.queue import push_context_ingest_job
from app.db.engine import get_db_session
from app.db.models import ContextSnippet
from app.dependencies import get_current_user, get_request_logger, rate_limit_context_ingest
from app.services.context_ingest import programmatic_cleanup, run_cleanup_for_snippet

logger = get_logger(__name__)
router = APIRouter(tags=["context"])

MAX_RAW_CONTENT_LENGTH = 50000


class IngestRequest(BaseModel):
    raw_content: str
    source_url: str
    source_title: str = ""
    capture_type: str = "full_page"


def _use_async_ingest() -> bool:
    """True when Redis is configured so we enqueue and return 202."""
    settings = get_settings()
    return bool(settings.redis_url and settings.redis_url.strip())


@router.post(
    "/context/ingest",
    responses={
        202: {"description": "Accepted for async processing (when Redis queue is enabled)."},
        429: {
            "description": "Rate limit exceeded",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": "RATE_LIMIT_EXCEEDED",
                            "message": "Rate limit exceeded. Try again later.",
                        },
                        "retry_after_seconds": 45,
                    }
                }
            },
        }
    },
)
async def ingest_context(
    body: IngestRequest,
    session: AsyncSession = Depends(get_db_session),
    log: BoundLogger = Depends(get_request_logger),
    user_id: str = Depends(get_current_user),
    _rate_limit: None = Depends(rate_limit_context_ingest),
):
    """Receive raw web page content; when Redis is set, enqueue and return 202.

    Else clean inline and return 200.
    """
    snippet_id = str(uuid.uuid4())
    raw = body.raw_content[:MAX_RAW_CONTENT_LENGTH]

    log.info(
        "Context ingest received",
        snippet_id=snippet_id,
        source_url=body.source_url,
        capture_type=body.capture_type,
        raw_length=len(raw),
    )

    if _use_async_ingest():
        # Create snippet with status=processing; worker will run cleanup and set status=ready
        snippet = ContextSnippet(
            id=snippet_id,
            user_id=user_id,
            source_url=body.source_url,
            source_title=body.source_title or body.source_url,
            raw_content=raw,
            cleaned_markdown="",
            capture_type=body.capture_type,
            status="processing",
            is_consumed=False,
        )
        session.add(snippet)
        await session.commit()
        enqueued = await push_context_ingest_job(snippet_id)
        if not enqueued:
            # Redis down: run sync cleanup so request still succeeds
            log.warning("context_ingest_redis_unavailable_running_sync", snippet_id=snippet_id)
            await run_cleanup_for_snippet(session, snippet_id)
            await session.refresh(snippet)
            return {
                "id": snippet_id,
                "title": snippet.source_title,
                "markdown_preview": (snippet.cleaned_markdown or "")[:200],
                "status": "ready",
                "created_at": snippet.created_at.isoformat() if snippet.created_at else None,
            }
        return JSONResponse(
            status_code=202,
            content={"job_id": snippet_id, "status": "processing"},
        )
    else:
        # Synchronous: programmatic + LLM cleanup then save
        pre_cleaned = programmatic_cleanup(raw)
        from app.services.context_ingest import clean_with_llm
        cleaned = await clean_with_llm(pre_cleaned)
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


@router.get("/context/jobs/{job_id}")
async def get_context_job_status(
    job_id: str,
    session: AsyncSession = Depends(get_db_session),
    user_id: str = Depends(get_current_user),
):
    """Return status of an async context ingest job (job_id from 202 response)."""
    result = await session.execute(
        select(ContextSnippet)
        .where(ContextSnippet.id == job_id)
        .where(ContextSnippet.user_id == user_id)
    )
    snippet = result.scalar_one_or_none()
    if not snippet:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "job_id": job_id,
        "status": snippet.status,
        "snippet_id": snippet.id,
        "created_at": snippet.created_at.isoformat() if snippet.created_at else None,
    }


@router.get("/context/pending")
async def get_pending_context(
    session: AsyncSession = Depends(get_db_session),
    log: BoundLogger = Depends(get_request_logger),
    user_id: str = Depends(get_current_user),
):
    """Return unconsumed context snippets for the current user."""

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
    user_id: str = Depends(get_current_user),
):
    """Dismiss a context snippet without using it (mark as consumed)."""
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
