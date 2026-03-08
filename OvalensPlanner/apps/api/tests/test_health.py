"""Health (liveness) and readiness endpoint tests."""

import pytest
from httpx import AsyncClient

from app.routers import ready as ready_router


async def test_health_returns_ok(async_client: AsyncClient) -> None:
    """GET /health (liveness) returns 200 and does not check DB."""
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "ovalens-api"
    assert data["version"] == "0.0.1"
    assert data["database"] in ("sqlite", "postgresql")


async def test_ready_returns_200_when_db_and_config_ok(async_client: AsyncClient) -> None:
    """GET /ready returns 200 when DB is reachable and critical config is satisfied."""
    response = await async_client.get("/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "ovalens-api"
    assert data["version"] == "0.0.1"
    assert data["database"] in ("sqlite", "postgresql")
    assert data["checks"]["database"] == "ok"
    assert data["checks"]["config"] == "ok"
    # details may contain only "llm" (informational when ANTHROPIC_API_KEY unset); no error details
    if "details" in data and data["details"]:
        assert set(data["details"].keys()) <= {"llm"}


async def test_ready_returns_503_when_db_unreachable(
    async_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """GET /ready returns 503 and details when DB check fails."""
    async def _fail_db() -> tuple[bool, str]:
        return False, "connection refused"

    monkeypatch.setattr(ready_router, "_check_database", _fail_db)
    response = await async_client.get("/ready")
    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "unavailable"
    assert data["checks"]["database"] == "error"
    assert "details" in data
    assert "database" in data["details"]
    assert "connection refused" in data["details"]["database"]


async def test_ready_returns_503_when_critical_config_missing(
    async_client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    """GET /ready returns 503 when critical config (e.g. JWT secret in prod) is missing."""
    def _fail_config() -> tuple[bool, str]:
        return False, "SUPABASE_JWT_SECRET is required in beta/production"

    monkeypatch.setattr(ready_router, "_check_critical_config", _fail_config)
    response = await async_client.get("/ready")
    assert response.status_code == 503
    data = response.json()
    assert data["status"] == "unavailable"
    assert data["checks"]["config"] == "error"
    assert "details" in data
    assert "config" in data["details"]
