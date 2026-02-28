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
from app.routers import chat, clients, context, documents, exports, health, metrics_router


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

    try:
        from app.db.engine import get_session_factory, init_db, init_fts
        from app.db.seed import seed_if_empty

        await init_db()
        async with get_session_factory()() as session:
            await seed_if_empty(session)
        await init_fts()
    except Exception as e:  # noqa: BLE001
        logger.exception(
            "startup_failed",
            error=str(e),
            msg="DB or seed failed; API may return 500 for data routes",
        )
        # Continue so the app can still respond (e.g. CORS preflight, health)

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

# Routers
app.include_router(health.router)
if settings.should_expose_metrics:
    app.include_router(metrics_router.router)
app.include_router(chat.router, prefix="/api")
app.include_router(clients.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(context.router, prefix="/api")
app.include_router(exports.router, prefix="/api")
