"""Health endpoint tests."""

from httpx import AsyncClient


async def test_health_returns_ok(async_client: AsyncClient) -> None:
    """Health check should return status ok with database info."""
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "ovalens-api"
    assert data["version"] == "0.0.1"
    # Database is sqlite when DATABASE_URL is unset (default), postgresql when set
    assert data["database"] in ("sqlite", "postgresql")
