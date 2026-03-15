"""FastAPI dependency injection."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Literal

import structlog
from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.auth import get_bearer_token, verify_supabase_jwt
from app.core.errors import RateLimitError
from app.core.logging import Section
from app.core.logging import get_logger as _get_logger
from app.core.metrics import record_rate_limit_hit
from app.core.ratelimit import check_rate_limit
from app.db.engine import get_db_session
from app.db.models import User


async def get_db(
    session: AsyncSession = Depends(get_db_session),
) -> AsyncIterator[AsyncSession]:
    """Provide an async SQLAlchemy session as a FastAPI dependency."""
    yield session


def get_request_logger(request: Request) -> structlog.stdlib.BoundLogger:
    """Provide a request-scoped logger as a FastAPI dependency.

    Automatically detects the section from the request's URL path and
    includes the request_id that was already bound by the middleware.

    Usage in a route::

        @router.post("/chat")
        async def chat(logger: BoundLogger = Depends(get_request_logger)):
            logger.info("Processing chat message", tokens=42)
    """
    from app.core.middleware import _section_from_path

    section = _section_from_path(request.url.path)
    return _get_logger(f"api.{section.value}", section=section)


async def get_current_user_id(request: Request) -> str:
    """Validate Supabase JWT and return user id. No DB access. Use for long-lived routes (e.g. SSE)."""
    token = get_bearer_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Missing authorization token")
    payload = verify_supabase_jwt(token)
    return str(payload["sub"])


async def get_current_user(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> str:
    """Validate Supabase JWT and return authenticated user id. Raises 401 if missing or invalid."""
    token = get_bearer_token(request)
    if not token:
        raise HTTPException(status_code=401, detail="Missing authorization token")
    payload = verify_supabase_jwt(token)
    user_id = str(payload["sub"])
    # Ensure User row exists (FK from clients, households, etc.)
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        email = (payload.get("email") or "").strip() or f"{user_id}@placeholder"
        metadata = payload.get("user_metadata") or {}
        full_name = (
            metadata.get("full_name") or metadata.get("name") or payload.get("email") or user_id
        )[:255]
        user = User(id=user_id, email=email, full_name=full_name, role="adviser")
        session.add(user)
        await session.commit()
    return user_id


async def _check_endpoint_rate_limits(
    request: Request,
    user_id: str,
    endpoint: Literal["chat_stream", "context_ingest"],
    per_user_limit: int,
    per_ip_limit: int,
    window_seconds: int,
) -> None:
    """Check per-user and per-IP limits; log and raise RateLimitError if exceeded."""
    from app.core.ratelimit import get_client_ip as _get_ip

    logger = _get_logger(__name__)
    ip = _get_ip(request)

    if per_user_limit > 0:
        allowed, _count, limit, retry = await check_rate_limit(
            endpoint, "user", user_id, per_user_limit, window_seconds
        )
        if not allowed:
            record_rate_limit_hit(endpoint, "user")
            logger.warning(
                "rate_limit_hit",
                endpoint=endpoint,
                scope="user",
                user_id=user_id,
                limit=limit,
                retry_after_seconds=round(retry, 1),
            )
            raise RateLimitError(
                message="Rate limit exceeded. Try again later.",
                retry_after_seconds=retry,
                limit=limit,
                scope="user",
            )

    if per_ip_limit > 0:
        allowed, _count, limit, retry = await check_rate_limit(
            endpoint, "ip", ip, per_ip_limit, window_seconds
        )
        if not allowed:
            record_rate_limit_hit(endpoint, "ip")
            logger.warning(
                "rate_limit_hit",
                endpoint=endpoint,
                scope="ip",
                client_ip=ip,
                limit=limit,
                retry_after_seconds=round(retry, 1),
            )
            raise RateLimitError(
                message="Rate limit exceeded. Try again later.",
                retry_after_seconds=retry,
                limit=limit,
                scope="ip",
            )


async def rate_limit_chat_stream(
    request: Request, user_id: str = Depends(get_current_user)
) -> None:
    """Dependency: enforce per-user and per-IP rate limits for POST /api/chat/stream."""
    settings = get_settings()
    await _check_endpoint_rate_limits(
        request,
        user_id,
        "chat_stream",
        settings.rate_limit_chat_stream_per_user,
        settings.rate_limit_chat_stream_per_ip,
        settings.rate_limit_window_seconds,
    )


async def rate_limit_context_ingest(
    request: Request, user_id: str = Depends(get_current_user)
) -> None:
    """Dependency: enforce per-user and per-IP rate limits for POST /api/context/ingest."""
    settings = get_settings()
    await _check_endpoint_rate_limits(
        request,
        user_id,
        "context_ingest",
        settings.rate_limit_context_ingest_per_user,
        settings.rate_limit_context_ingest_per_ip,
        settings.rate_limit_window_seconds,
    )


def get_section_logger(section: Section | str) -> structlog.stdlib.BoundLogger:
    """Get a logger for a specific section (non-request context).

    Useful in background tasks, CLI scripts, or service-layer code that
    isn't tied to an HTTP request.

    Usage::

        logger = get_section_logger(Section.TAX)
        logger.info("Running batch calculation")
    """
    sec = Section(section) if isinstance(section, str) else section
    return _get_logger(f"app.{sec.value}", section=sec)
