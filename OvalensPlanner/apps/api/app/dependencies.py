"""FastAPI dependency injection."""

from __future__ import annotations

from collections.abc import AsyncIterator

import structlog
from fastapi import Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import Section
from app.core.logging import get_logger as _get_logger
from app.db.engine import get_db_session


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
