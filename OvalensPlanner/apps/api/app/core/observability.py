"""Sentry error monitoring: init, request correlation, and PII scrubbing.

- Environment and release tags for filtering in Sentry.
- Request correlation: request_id and section from structlog contextvars.
- before_send: redact PII from headers, request body, and extra data.
"""

from __future__ import annotations

import re
from typing import Any

import structlog

# Headers and keys that must be redacted (case-insensitive).
_REDACT_HEADERS = frozenset(
    {
        "authorization",
        "cookie",
        "x-api-key",
        "x-auth-token",
        "proxy-authorization",
        "set-cookie",
    }
)

# Keys in payloads (request data, extra) that suggest PII (redact value).
_PII_KEYS_PATTERN = re.compile(
    r"^(password|secret|token|api_key|apikey|auth|credential|email|phone|ssn|nin|address)$",
    re.I,
)


def _scrub_headers(headers: dict[str, str] | None) -> dict[str, str] | None:
    if not headers:
        return headers
    out: dict[str, str] = {}
    for k, v in headers.items():
        key_lower = k.lower()
        if key_lower in _REDACT_HEADERS:
            out[k] = "[REDACTED]"
        else:
            out[k] = v
    return out


def _scrub_dict(obj: Any) -> Any:
    """Recursively redact values for keys that look like PII."""
    if obj is None:
        return None
    if isinstance(obj, str):
        return obj
    if isinstance(obj, (int, float, bool)):
        return obj
    if isinstance(obj, list):
        return [_scrub_dict(i) for i in obj]
    if isinstance(obj, dict):
        return {
            k: "[REDACTED]" if _PII_KEYS_PATTERN.match(k) else _scrub_dict(v)
            for k, v in obj.items()
        }
    return obj


def _before_send(event: dict[str, Any], hint: dict[str, Any]) -> dict[str, Any] | None:
    """Scrub PII and attach request correlation tags before sending to Sentry."""
    # Drop shutdown noise (Ctrl+C, asyncio cancellation) so only real errors create issues
    exc_info = hint.get("exc_info")
    if exc_info and len(exc_info) >= 2:
        exc_type, exc_value = exc_info[0], exc_info[1]
        if exc_type is KeyboardInterrupt:
            return None
        if exc_value is not None and exc_value.__class__.__name__ == "CancelledError":
            return None

    # Service tag (monorepo: filter api vs web in one Sentry project)
    tags = event.setdefault("tags", {})
    if isinstance(tags, dict):
        tags["service"] = "api"
    # Request correlation from structlog context
    try:
        ctx = structlog.contextvars.get_contextvars()
        if isinstance(tags, dict):
            if "request_id" in ctx:
                tags["request_id"] = str(ctx["request_id"])
            if "section" in ctx:
                tags["section"] = str(ctx["section"])
    except Exception:  # noqa: BLE001
        pass

    # Scrub request headers
    if "request" in event and isinstance(event["request"], dict):
        req = event["request"]
        if "headers" in req and isinstance(req["headers"], dict):
            req["headers"] = _scrub_headers(req["headers"])
        if "data" in req:
            req["data"] = _scrub_dict(req["data"])

    # Scrub extra / contexts
    if "extra" in event and isinstance(event["extra"], dict):
        event["extra"] = _scrub_dict(event["extra"])
    if "contexts" in event and isinstance(event["contexts"], dict):
        event["contexts"] = _scrub_dict(event["contexts"])

    return event


def init_sentry(
    *,
    dsn: str | None = None,
    environment: str = "development",
    release: str | None = None,
    send_default_pii: bool = False,
) -> None:
    """Initialize Sentry for the FastAPI app.

    Call once at startup (e.g. in lifespan). No-op if dsn is empty.
    """
    if not (dsn and dsn.strip()):
        return

    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration

    sentry_sdk.init(
        dsn=dsn.strip(),
        environment=environment,
        release=release or "ovalens-api@0.0.1",
        before_send=_before_send,
        send_default_pii=send_default_pii,
        integrations=[FastApiIntegration()],
    )
    # Tag all API events with environment (dev/staging/production) for filtering
    sentry_sdk.set_tag("environment", environment)
