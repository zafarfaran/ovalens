"""Ovalens API — FastAPI application entry point."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import setup_logging
from app.core.middleware import RequestContextMiddleware
from app.routers import chat, clients, context, documents, exports, health


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan — startup and shutdown."""
    settings = get_settings()
    setup_logging(settings.log_level, settings.environment)

    # Initialise the database (SQLite or PostgreSQL/Supabase) and seed demo data
    from app.db.engine import get_session_factory, init_db, init_fts
    from app.db.seed import seed_if_empty

    await init_db()
    async with get_session_factory()() as session:
        await seed_if_empty(session)
    await init_fts()

    yield


app = FastAPI(
    title="Ovalens API",
    description="UK tax planning assistant for financial advisers",
    version="0.0.1",
    lifespan=lifespan,
)

# CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
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
app.include_router(chat.router, prefix="/api")
app.include_router(clients.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(context.router, prefix="/api")
app.include_router(exports.router, prefix="/api")
