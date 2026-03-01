"""Critical API integration tests: auth enforcement."""

from __future__ import annotations

import time

import jwt
import pytest
from httpx import ASGITransport, AsyncClient

from app.config import get_settings
from app.main import app

# Supabase JWT audience required by app.core.auth
AUDIENCE = "authenticated"
ALGORITHM = "HS256"
TEST_SECRET = "test-jwt-secret-for-integration-tests"


def _make_token(sub: str, secret: str = TEST_SECRET, exp_delta_seconds: int = 3600) -> str:
    """Build a HS256 JWT that the API will accept when SUPABASE_JWT_SECRET matches."""
    payload = {
        "sub": sub,
        "aud": AUDIENCE,
        "exp": int(time.time()) + exp_delta_seconds,
        "iat": int(time.time()),
    }
    return jwt.encode(payload, secret, algorithm=ALGORITHM)


@pytest.fixture
async def auth_client(monkeypatch: pytest.MonkeyPatch, init_test_db: None):
    """Client with test JWT secret; depends on init_test_db for tables."""
    monkeypatch.setenv("SUPABASE_JWT_SECRET", TEST_SECRET)
    get_settings.cache_clear()
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            yield client
    finally:
        get_settings.cache_clear()


@pytest.mark.asyncio
async def test_auth_valid_token_accepts_request(auth_client: AsyncClient) -> None:
    """With a valid Bearer token, protected endpoint returns 200."""
    token = _make_token("user-valid")
    response = await auth_client.get(
        "/api/chat/conversations",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "conversations" in data


@pytest.mark.asyncio
async def test_auth_invalid_token_returns_401(auth_client: AsyncClient) -> None:
    """With an invalid or malformed Bearer token, API returns 401."""
    response = await auth_client.get(
        "/api/chat/conversations",
        headers={"Authorization": "Bearer invalid-token"},
    )
    assert response.status_code == 401
    data = response.json()
    assert "detail" in data


@pytest.mark.asyncio
async def test_auth_expired_token_returns_401(auth_client: AsyncClient) -> None:
    """With an expired JWT, API returns 401."""
    token = _make_token("user-expired", exp_delta_seconds=-60)
    response = await auth_client.get(
        "/api/chat/conversations",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_auth_missing_token_returns_401(auth_client: AsyncClient) -> None:
    """With no Authorization header, protected endpoint returns 401."""
    response = await auth_client.get("/api/chat/conversations")
    assert response.status_code == 401
    data = response.json()
    assert "detail" in data


@pytest.mark.asyncio
async def test_auth_cross_user_access_blocked(auth_client: AsyncClient) -> None:
    """User B cannot access user A's conversation (404, not 200)."""
    # Use seeded demo user and client so FK exists (seed creates demo-user, client-sarah)
    token_a = _make_token("demo-user")
    token_b = _make_token("user-b")

    # User A (demo-user) creates a conversation for seeded client
    create = await auth_client.post(
        "/api/chat/conversations",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"client_id": "client-sarah", "title": "A's conversation"},
    )
    assert create.status_code == 200
    conv_id = create.json()["id"]

    # User B tries to get messages for A's conversation -> 404
    get_messages = await auth_client.get(
        f"/api/chat/conversations/{conv_id}/messages",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert get_messages.status_code == 404
    assert get_messages.json().get("detail") == "Conversation not found"
