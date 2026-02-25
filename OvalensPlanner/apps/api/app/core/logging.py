"""Structured logging with section tracking and per-request correlation.

Every log line includes:
- request_id: UUID that ties all logs from the same HTTP request together.
- section: which application domain produced the log (e.g. "chat", "tax", "documents").
- module: the Python module name (e.g. "app.routers.chat").

Sections are coarse-grained groupings:
    router   → which API area (chat, clients, documents, health)
    service  → business-logic layer (ai, extraction)
    tax      → calculation engine (income_tax, ani, hicbc, …)
    core     → framework plumbing (middleware, errors, supabase)

Usage in any module:
    from app.core.logging import get_logger
    logger = get_logger(__name__)          # section is inferred from module path
    logger.info("analysing client", client_id="abc")

The request_id is injected automatically by RequestContextMiddleware via
structlog contextvars — no manual threading required.
"""

from __future__ import annotations

import logging
import sys
from enum import StrEnum

import structlog


# ---------------------------------------------------------------------------
# Sections
# ---------------------------------------------------------------------------

class Section(StrEnum):
    """Coarse application sections for log grouping."""

    CHAT = "chat"
    CLIENTS = "clients"
    DOCUMENTS = "documents"
    HEALTH = "health"
    TAX = "tax"
    AI = "ai"
    CORE = "core"
    UNKNOWN = "unknown"


# Map module path prefixes to sections.
_MODULE_SECTION_MAP: list[tuple[str, Section]] = [
    ("app.routers.chat", Section.CHAT),
    ("app.routers.clients", Section.CLIENTS),
    ("app.routers.documents", Section.DOCUMENTS),
    ("app.routers.health", Section.HEALTH),
    ("app.tax", Section.TAX),
    ("app.services.ai", Section.AI),
    ("app.services", Section.AI),
    ("app.core", Section.CORE),
]


def _resolve_section(module_name: str) -> Section:
    """Derive the section from a fully-qualified module name."""
    for prefix, section in _MODULE_SECTION_MAP:
        if module_name.startswith(prefix):
            return section
    return Section.UNKNOWN


# ---------------------------------------------------------------------------
# Structlog processor — injects section if not already bound
# ---------------------------------------------------------------------------

def _inject_section(
    logger: logging.Logger,
    method_name: str,
    event_dict: structlog.types.EventDict,
) -> structlog.types.EventDict:
    """Structlog processor that ensures every log event has a section field."""
    if "section" not in event_dict:
        name: str = event_dict.get("logger", event_dict.get("_logger_name", ""))
        event_dict["section"] = _resolve_section(name)
    return event_dict


# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------

def setup_logging(log_level: str = "DEBUG", environment: str = "development") -> None:
    """Configure structlog for the application.

    Processors run in order:
        1. merge request-scoped contextvars  (request_id, method, path, section)
        2. inject section from logger name   (fallback when not in request scope)
        3. standard enrichment               (level, name, timestamp, …)
    """
    shared_processors: list[structlog.types.Processor] = [
        structlog.contextvars.merge_contextvars,
        _inject_section,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.UnicodeDecoder(),
    ]

    if environment == "production":
        renderer: structlog.types.Processor = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer(colors=True)

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

    formatter = structlog.stdlib.ProcessorFormatter(
        processors=[
            structlog.stdlib.ProcessorFormatter.remove_processors_meta,
            renderer,
        ],
    )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.addHandler(handler)
    root_logger.setLevel(getattr(logging, log_level.upper(), logging.DEBUG))


# ---------------------------------------------------------------------------
# Logger factory
# ---------------------------------------------------------------------------

def get_logger(
    name: str,
    *,
    section: Section | str | None = None,
) -> structlog.stdlib.BoundLogger:
    """Get a structured logger with section pre-bound.

    Args:
        name: Usually ``__name__`` — the Python module path.
        section: Override the auto-detected section. Useful in utility
                 modules that serve multiple sections.

    Returns:
        A BoundLogger with ``section`` already attached.

    Examples::

        # Auto-detect section from module path
        logger = get_logger(__name__)

        # Explicit override
        logger = get_logger(__name__, section="tax")
    """
    resolved = Section(section) if section else _resolve_section(name)
    return structlog.get_logger(name).bind(section=resolved.value)  # type: ignore[no-any-return]
