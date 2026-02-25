"""Request middleware for logging, timing, request tracking, and section detection.

Every inbound HTTP request is assigned:
- request_id: UUID (from X-Request-ID header, or auto-generated).
- section: derived from the URL path prefix so all downstream logs know
  which application domain the request belongs to.

These values are stored in structlog contextvars and automatically appear
on every log line produced while handling the request.
"""

from __future__ import annotations

import time
import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import Section, get_logger

# Map URL path prefixes to sections.
_PATH_SECTION_MAP: list[tuple[str, Section]] = [
    ("/api/chat", Section.CHAT),
    ("/api/clients", Section.CLIENTS),
    ("/api/extract", Section.DOCUMENTS),
    ("/api/documents", Section.DOCUMENTS),
    ("/health", Section.HEALTH),
]


def _section_from_path(path: str) -> Section:
    """Resolve the section from the request URL path."""
    for prefix, section in _PATH_SECTION_MAP:
        if path.startswith(prefix):
            return section
    return Section.UNKNOWN


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Inject request_id, section, and timing into every request.

    Context propagation flow:
        1. Extract or generate request_id.
        2. Detect section from URL path.
        3. Bind both (plus method & path) into structlog contextvars.
        4. All downstream get_logger() calls automatically inherit them.
        5. On response, log a summary line and set X-Request-ID header.
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        section = _section_from_path(request.url.path)
        start_time = time.perf_counter()

        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            section=section.value,
            method=request.method,
            path=request.url.path,
        )

        logger = get_logger(__name__)

        logger.debug("Request started")

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
            logger.exception("Unhandled exception", duration_ms=duration_ms)
            raise

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        response.headers["X-Request-ID"] = request_id

        log_method = logger.info if response.status_code < 400 else logger.warning
        log_method(
            "Request completed",
            status_code=response.status_code,
            duration_ms=duration_ms,
        )

        return response
