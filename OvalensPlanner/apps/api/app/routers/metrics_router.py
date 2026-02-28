"""Prometheus /metrics endpoint — scrape-focused with optional token guard."""

import secrets

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import PlainTextResponse, Response

from app.config import get_settings
from app.core.logging import get_logger
from app.core.metrics import get_metrics_bytes, get_metrics_content_type

router = APIRouter(tags=["observability"])
logger = get_logger(__name__)


@router.get("/metrics")
async def metrics(x_metrics_token: str | None = Header(default=None)) -> Response:
    """Prometheus text exposition format. Scrape this endpoint for Grafana."""
    settings = get_settings()
    if settings.metrics_token and not secrets.compare_digest(
        x_metrics_token or "",
        settings.metrics_token,
    ):
        raise HTTPException(status_code=401, detail="Unauthorized metrics access")
    try:
        return Response(
            content=get_metrics_bytes(),
            media_type=get_metrics_content_type(),
        )
    except Exception as e:
        logger.exception("metrics_endpoint_error", error=str(e))
        return PlainTextResponse(
            content=f"# metrics error: {e!s}\n",
            status_code=500,
            media_type="text/plain; charset=utf-8",
        )
