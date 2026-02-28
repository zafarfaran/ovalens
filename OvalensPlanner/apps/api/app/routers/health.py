"""Health check endpoint."""

import asyncio

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from structlog.stdlib import BoundLogger

from app.config import get_settings
from app.dependencies import get_request_logger

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(
    logger: BoundLogger = Depends(get_request_logger),
) -> dict[str, str]:
    """Service health check."""
    logger.debug("Health check")
    settings = get_settings()
    database = "postgresql" if settings.is_postgres else "sqlite"
    return {"status": "ok", "service": "ovalens-api", "version": "0.0.1", "database": database}


@router.get("/health/sentry-test")
async def sentry_test() -> JSONResponse:
    """Send a test event to Sentry in a background thread and return 500 immediately."""
    message = "Sentry API test — synthetic exception for error monitoring verification"

    def _send() -> None:
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(RuntimeError(message))
        except Exception:  # noqa: BLE001
            pass

    asyncio.get_running_loop().run_in_executor(None, _send)

    return JSONResponse(
        status_code=500,
        content={"error": "sentry_test", "message": message},
    )
