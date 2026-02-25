"""Document extraction endpoints."""

from fastapi import APIRouter, Depends
from structlog.stdlib import BoundLogger

from app.dependencies import get_request_logger

router = APIRouter(tags=["documents"])


@router.post("/extract")
async def extract_document(
    logger: BoundLogger = Depends(get_request_logger),
) -> dict[str, str]:
    """PDF document extraction (placeholder)."""
    logger.info("Document extraction requested")
    return {"message": "Document extraction — not yet implemented"}
