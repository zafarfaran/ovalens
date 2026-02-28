"""Health check endpoint."""

from fastapi import APIRouter, Depends
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
