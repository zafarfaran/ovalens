"""Readiness endpoint — can the API accept traffic?

Checks DB connectivity and critical config. Returns 503 when dependencies
are unavailable so load balancers/orchestrators stop sending traffic.
"""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import get_settings
from app.db.engine import engine
from app.routers.health import SERVICE_VERSION

router = APIRouter(tags=["health"])


async def _check_database() -> tuple[bool, str]:
    """Run a lightweight DB query. Returns (ok, error_message)."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return True, ""
    except Exception as e:  # noqa: BLE001
        return False, str(e)


def _check_critical_config() -> tuple[bool, str]:
    """Verify critical config for the current environment. Returns (ok, error_message)."""
    settings = get_settings()
    if settings.environment not in ("beta", "production"):
        return True, ""
    if not (settings.supabase_jwt_secret or "").strip():
        return False, "SUPABASE_JWT_SECRET is required in beta/production"
    return True, ""


@router.get("/ready")
async def ready() -> JSONResponse:
    """Readiness probe: DB and critical config are available. Returns 503 if not."""
    settings = get_settings()
    database_type = "postgresql" if settings.is_postgres else "sqlite"

    db_ok, db_error = await _check_database()
    config_ok, config_error = _check_critical_config()

    checks = {
        "database": "ok" if db_ok else "error",
        "config": "ok" if config_ok else "error",
    }
    details: dict[str, str] = {}
    if not db_ok:
        details["database"] = db_error
    if not config_ok:
        details["config"] = config_error

    body: dict[str, object] = {
        "status": "ok" if (db_ok and config_ok) else "unavailable",
        "service": "ovalens-api",
        "version": SERVICE_VERSION,
        "database": database_type,
        "checks": checks,
    }
    if details:
        body["details"] = details

    if db_ok and config_ok:
        return JSONResponse(status_code=200, content=body)
    return JSONResponse(status_code=503, content=body)
