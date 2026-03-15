"""Ovalens API — FastAPI application entry point."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import DEFAULT_CORS_ORIGINS, get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import setup_logging
from app.core.middleware import RequestContextMiddleware
from app.core.observability import init_sentry
from app.routers import (
    chat,
    clients,
    context,
    documents,
    exports,
    health,
    integrations,
    metrics_router,
    nora,
    ready,
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan — startup and shutdown."""
    from app.core.logging import get_logger

    logger = get_logger(__name__)
    settings = get_settings()
    setup_logging(settings.log_level, settings.environment)

    # Sentry (error monitoring); no-op if SENTRY_DSN unset
    init_sentry(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        release=settings.sentry_release or "ovalens-api@0.0.1",
    )

    # When using SQLite (local dev), ensure tables exist so "no such table: users" does not occur.
    # For PostgreSQL, schema is applied via: alembic upgrade head
    if not settings.is_postgres:
        from app.db.engine import init_db

        await init_db()

    logger.info("API started", environment=settings.environment)

    yield


app = FastAPI(
    title="Ovalens API",
    description="UK tax planning assistant for financial advisers",
    version="0.0.1",
    lifespan=lifespan,
)

# CORS — never use empty list so production always has allowed origins
settings = get_settings()
cors_origins = settings.cors_origins or DEFAULT_CORS_ORIGINS
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom middleware
app.add_middleware(RequestContextMiddleware)

# Exception handlers
register_exception_handlers(app)


@app.get("/")
def root() -> dict[str, str]:
    """Root route so GET / returns a friendly response instead of 404."""
    return {
        "service": "Ovalens API",
        "docs": "/docs",
        "health": "/health",
        "ready": "/ready",
    }


# Routers (health = liveness, ready = readiness)
app.include_router(health.router)
app.include_router(ready.router)
if settings.should_expose_metrics:
    app.include_router(metrics_router.router)
app.include_router(chat.router, prefix="/api")
app.include_router(clients.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(context.router, prefix="/api")
app.include_router(exports.router, prefix="/api")
app.include_router(integrations.router, prefix="/api")
app.include_router(nora.router, prefix="/api")
