"""Structured logging with section tracking and per-request correlation.

Every log line includes:
- request_id: UUID that ties all logs from the same HTTP request together.
- section: which application domain produced the log (e.g. "chat", "tax", "documents").
- service: service name (e.g. "api").
- env: environment (e.g. "development", "production").
- event: standardized event name for filtering (e.g. "conversation_created").
- duration_ms: duration in milliseconds where relevant (e.g. request, stream).
- module: the Python module name (e.g. "app.routers.chat").

Sensitive fields (PII, secrets, raw user content) are redacted before output.

Sections are coarse-grained groupings:
    router   → which API area (chat, clients, documents, health)
    service  → business-logic layer (ai, extraction)
    tax      → calculation engine (income_tax, ani, hicbc, …)
    core     → framework plumbing (middleware, errors, supabase)

Usage in any module:
    from app.core.logging import get_logger
    logger = get_logger(__name__)          # section is inferred from module path
    logger.info("conversation_created", conversation_id=id)

The request_id, service, and env are injected by RequestContextMiddleware via
structlog contextvars — no manual threading required.
"""

from __future__ import annotations

import logging
import re
import sys
from enum import StrEnum

import structlog

# Keys (case-insensitive) whose values are redacted to avoid PII/secrets in logs.
_SENSITIVE_KEYS: frozenset[str] = frozenset({
    "password", "secret", "api_key", "token", "authorization", "cookie",
    "content", "raw", "tool_input", "first_name", "last_name", "client_name",
    "member_names", "email", "notes", "description", "input", "system",
    "messages", "system_prompt", "error",
})
_SENSITIVE_PATTERN = re.compile(
    r"^(.*)(password|secret|key|token|auth|cookie)(.*)$",
    re.IGNORECASE,
)
_REDACTED = "[REDACTED]"

# ---------------------------------------------------------------------------
# Sections
# ---------------------------------------------------------------------------


class Section(StrEnum):
    """Coarse application sections for log grouping."""

    CHAT = "chat"
    CLIENTS = "clients"
    CONTEXT = "context"
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
    ("app.routers.context", Section.CONTEXT),
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


def _redact_sensitive(
    logger: logging.Logger,
    method_name: str,
    event_dict: structlog.types.EventDict,
) -> structlog.types.EventDict:
    """Redact sensitive field values to avoid PII and secrets in logs."""
    for key in list(event_dict.keys()):
        if key.startswith("_"):
            continue
        key_lower = key.lower()
        if key_lower in _SENSITIVE_KEYS or _SENSITIVE_PATTERN.search(key_lower):
            event_dict[key] = _REDACTED
    return event_dict


def _inject_service_env(
    logger: logging.Logger,
    method_name: str,
    event_dict: structlog.types.EventDict,
) -> structlog.types.EventDict:
    """Ensure every log has service and env (from context or defaults)."""
    if "service" not in event_dict:
        event_dict["service"] = "api"
    if "env" not in event_dict:
        try:
            from app.config import get_settings
            event_dict["env"] = get_settings().environment
        except Exception:
            event_dict["env"] = "unknown"
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
        _inject_service_env,
        _redact_sensitive,
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
