"""Critical API integration tests: rate limiting returns 429."""

from __future__ import annotations

import pytest
from fastapi import Depends, FastAPI
from httpx import ASGITransport, AsyncClient

from app.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.ratelimit import clear_store_for_tests
from app.dependencies import get_current_user, rate_limit_context_ingest


@pytest.mark.asyncio
async def test_rate_limit_returns_429(monkeypatch: pytest.MonkeyPatch) -> None:
    """Deprecated duplicate of tests/test_ratelimit.py canonical 429 rate-limit test."""
    pytest.skip("Covered by canonical integration test in tests/test_ratelimit.py")
