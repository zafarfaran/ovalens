"""Custom exception classes and FastAPI exception handlers.

All exception handlers log the error with the current request's section
and request_id (both automatically present via structlog contextvars).
"""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.core.logging import get_logger

logger = get_logger(__name__)


class AppError(Exception):
    """Base application error."""

    def __init__(
        self,
        message: str,
        code: str = "INTERNAL_ERROR",
        status_code: int = 500,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code


class ValidationError(AppError):
    """Request validation error (400)."""

    def __init__(self, message: str, issues: list[dict[str, str]] | None = None) -> None:
        super().__init__(message, code="VALIDATION_ERROR", status_code=400)
        self.issues = issues or []


class TaxCalculationError(AppError):
    """Tax calculation error (422)."""

    def __init__(
        self,
        message: str,
        calculator: str = "",
        context: dict[str, object] | None = None,
    ) -> None:
        super().__init__(message, code="TAX_CALCULATION_ERROR", status_code=422)
        self.calculator = calculator
        self.context = context or {}


class APIError(AppError):
    """External API error (502)."""

    def __init__(self, message: str, provider: str = "") -> None:
        super().__init__(message, code="API_ERROR", status_code=502)
        self.provider = provider


class NotFoundError(AppError):
    """Resource not found (404)."""

    def __init__(self, resource: str, id: str = "") -> None:
        super().__init__(f"{resource} not found: {id}", code="NOT_FOUND", status_code=404)
        self.resource = resource
        self.resource_id = id


class RateLimitError(AppError):
    """Rate limit exceeded (429). Response body is predictable for clients.

    Schema::
        {
          "error": { "code": "RATE_LIMIT_EXCEEDED", "message": "..." },
          "retry_after_seconds": <number>
        }
    """

    def __init__(
        self,
        message: str = "Rate limit exceeded. Try again later.",
        retry_after_seconds: float = 0,
        limit: int = 0,
        scope: str = "",
    ) -> None:
        super().__init__(message, code="RATE_LIMIT_EXCEEDED", status_code=429)
        self.retry_after_seconds = retry_after_seconds
        self.limit = limit
        self.scope = scope


def register_exception_handlers(app: FastAPI) -> None:
    """Register custom exception handlers on the FastAPI app.

    Logged fields (automatically included via contextvars):
    - request_id, section, method, path

    Additional fields per error type:
    - TaxCalculationError  → calculator, context
    - APIError             → provider
    - NotFoundError        → resource, resource_id
    - ValidationError      → issues
    """

    @app.exception_handler(AppError)
    async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
        log_kwargs: dict[str, object] = {
            "error_code": exc.code,
            "status_code": exc.status_code,
        }

        if isinstance(exc, TaxCalculationError):
            log_kwargs["calculator"] = exc.calculator
            log_kwargs["calc_context"] = exc.context
        elif isinstance(exc, APIError):
            log_kwargs["provider"] = exc.provider
        elif isinstance(exc, NotFoundError):
            log_kwargs["resource"] = exc.resource
            log_kwargs["resource_id"] = exc.resource_id
        elif isinstance(exc, ValidationError):
            log_kwargs["issues"] = exc.issues
        elif isinstance(exc, RateLimitError):
            log_kwargs["retry_after_seconds"] = exc.retry_after_seconds
            log_kwargs["scope"] = exc.scope

        if exc.status_code >= 500:
            logger.error(exc.message, **log_kwargs)
        else:
            logger.warning(exc.message, **log_kwargs)

        content: dict[str, object] = {
            "error": {
                "code": exc.code,
                "message": exc.message,
            }
        }
        if isinstance(exc, RateLimitError):
            content["retry_after_seconds"] = round(exc.retry_after_seconds, 1)
        response = JSONResponse(status_code=exc.status_code, content=content)
        if isinstance(exc, RateLimitError):
            response.headers["Retry-After"] = str(max(1, int(exc.retry_after_seconds)))
            if exc.limit > 0:
                response.headers["X-RateLimit-Limit"] = str(exc.limit)
                response.headers["X-RateLimit-Remaining"] = "0"
        return response

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
        """Catch-all so every 500 returns JSON; frontend can parse and show a message."""
        logger.exception(
            "unhandled_exception",
            error=str(exc),
            exc_info=True,
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "A server error occurred. Check API logs for details.",
                }
            },
        )
