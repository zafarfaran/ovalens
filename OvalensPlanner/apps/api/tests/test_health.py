"""Health endpoint tests."""

from httpx import AsyncClient


async def test_health_returns_ok(async_client: AsyncClient) -> None:
    """Health check should return status ok with database info."""
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "helio-api"
    assert data["version"] == "0.0.1"
    assert data["database"] == "sqlite"
