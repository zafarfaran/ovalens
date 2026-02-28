"""Prometheus metrics for HTTP, chat streams, and LLM.

All metrics use the prefix ``ovalens_``. Expose via GET /metrics when
environment is beta (or production) for scraping by Prometheus/Grafana.
"""

from __future__ import annotations

from prometheus_client import (
    CONTENT_TYPE_LATEST,
    CollectorRegistry,
    Counter,
    Histogram,
    generate_latest,
)

# Separate registry so we don't mix with any default process metrics unless desired.
REGISTRY = CollectorRegistry()

# ---------------------------------------------------------------------------
# HTTP
# ---------------------------------------------------------------------------

HTTP_REQUESTS_TOTAL = Counter(
    "ovalens_http_requests_total",
    "Total HTTP requests",
    ["method", "status_class"],
    registry=REGISTRY,
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "ovalens_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method"],
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
    registry=REGISTRY,
)

# ---------------------------------------------------------------------------
# Chat stream
# ---------------------------------------------------------------------------

CHAT_STREAM_STARTS_TOTAL = Counter(
    "ovalens_chat_stream_starts_total",
    "Chat stream requests started",
    registry=REGISTRY,
)

CHAT_STREAM_COMPLETIONS_TOTAL = Counter(
    "ovalens_chat_stream_completions_total",
    "Chat streams completed successfully",
    registry=REGISTRY,
)

CHAT_STREAM_ERRORS_TOTAL = Counter(
    "ovalens_chat_stream_errors_total",
    "Chat stream errors (LLM or pipeline)",
    registry=REGISTRY,
)

CHAT_TIME_TO_FIRST_TOKEN_SECONDS = Histogram(
    "ovalens_chat_time_to_first_token_seconds",
    "Time from stream start to first token in seconds",
    buckets=(0.5, 1.0, 2.0, 3.0, 5.0, 7.5, 10.0, 15.0, 20.0, 30.0),
    registry=REGISTRY,
)

# ---------------------------------------------------------------------------
# LLM
# ---------------------------------------------------------------------------

LLM_REQUEST_DURATION_SECONDS = Histogram(
    "ovalens_llm_request_duration_seconds",
    "LLM stream request duration in seconds",
    ["model"],
    buckets=(1.0, 2.5, 5.0, 10.0, 15.0, 25.0, 40.0, 60.0, 90.0, 120.0),
    registry=REGISTRY,
)

LLM_TOKENS_IN_TOTAL = Counter(
    "ovalens_llm_tokens_in_total",
    "Total input tokens sent to LLM",
    ["model"],
    registry=REGISTRY,
)

LLM_TOKENS_OUT_TOTAL = Counter(
    "ovalens_llm_tokens_out_total",
    "Total output tokens from LLM",
    ["model"],
    registry=REGISTRY,
)

LLM_REQUESTS_TOTAL = Counter(
    "ovalens_llm_requests_total",
    "Total LLM stream requests",
    ["model"],
    registry=REGISTRY,
)

LLM_FAILURES_TOTAL = Counter(
    "ovalens_llm_failures_total",
    "LLM stream requests that ended in error",
    ["model"],
    registry=REGISTRY,
)


def status_class(status_code: int) -> str:
    """Return status class label for metrics (2xx, 3xx, 4xx, 5xx)."""
    if status_code < 300:
        return "2xx"
    if status_code < 400:
        return "3xx"
    if status_code < 500:
        return "4xx"
    return "5xx"


def record_http_request(method: str, status_code: int, duration_seconds: float) -> None:
    """Record one HTTP request for count, status distribution, and latency."""
    sc = status_class(status_code)
    HTTP_REQUESTS_TOTAL.labels(method=method, status_class=sc).inc()
    HTTP_REQUEST_DURATION_SECONDS.labels(method=method).observe(duration_seconds)


def record_chat_stream_start() -> None:
    """Record that a chat stream was started."""
    CHAT_STREAM_STARTS_TOTAL.inc()


def record_chat_stream_completion() -> None:
    """Record that a chat stream completed successfully."""
    CHAT_STREAM_COMPLETIONS_TOTAL.inc()


def record_chat_stream_error() -> None:
    """Record that a chat stream ended in error."""
    CHAT_STREAM_ERRORS_TOTAL.inc()


def record_chat_time_to_first_token(seconds: float) -> None:
    """Record time from stream start to first token."""
    CHAT_TIME_TO_FIRST_TOKEN_SECONDS.observe(seconds)


def record_llm_request(model: str, duration_seconds: float) -> None:
    """Record one LLM request and its duration."""
    LLM_REQUESTS_TOTAL.labels(model=model).inc()
    LLM_REQUEST_DURATION_SECONDS.labels(model=model).observe(duration_seconds)


def record_llm_tokens(model: str, input_tokens: int, output_tokens: int) -> None:
    """Record token usage for one LLM request."""
    if input_tokens > 0:
        LLM_TOKENS_IN_TOTAL.labels(model=model).inc(input_tokens)
    if output_tokens > 0:
        LLM_TOKENS_OUT_TOTAL.labels(model=model).inc(output_tokens)


def record_llm_failure(model: str) -> None:
    """Record that an LLM request failed."""
    LLM_FAILURES_TOTAL.labels(model=model).inc()


def get_metrics_content_type() -> str:
    """Return Content-Type for Prometheus exposition format."""
    return CONTENT_TYPE_LATEST


def get_metrics_bytes() -> bytes:
    """Return Prometheus text exposition format for the registry."""
    return generate_latest(REGISTRY)
