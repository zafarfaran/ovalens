"""FastAPI dependency injection."""

from __future__ import annotations

from collections.abc import AsyncIterator

import structlog
from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_bearer_token, verify_supabase_jwt
from app.core.logging import Section
from app.core.logging import get_logger as _get_logger
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
        full_name = (metadata.get("full_name") or metadata.get("name") or payload.get("email") or user_id)[:255]
        user = User(id=user_id, email=email, full_name=full_name, role="adviser")
        session.add(user)
        await session.commit()
    return user_id


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
