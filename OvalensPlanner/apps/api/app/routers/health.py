"""Health check endpoint."""

from fastapi import APIRouter, Depends
from structlog.stdlib import BoundLogger

from app.dependencies import get_request_logger

router = APIRouter(tags=["health"])


@router.get("/health")
async def health(
    logger: BoundLogger = Depends(get_request_logger),
) -> dict[str, str]:
    """Service health check."""
    logger.debug("Health check")
    return {"status": "ok", "service": "helio-api", "version": "0.0.1", "database": "sqlite"}
