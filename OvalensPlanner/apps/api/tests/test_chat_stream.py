"""Critical API integration tests: chat stream endpoint."""

from __future__ import annotations

from collections.abc import AsyncGenerator
from unittest.mock import patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.dependencies import get_current_user
from app.main import app
from app.services.llm.types import DoneEvent, ErrorEvent, TokenEvent


async def _fake_user() -> str:
    return "test-user-chat-stream"


@pytest.fixture
async def chat_client(init_test_db: None):
    """Authenticated client for chat endpoints; DB initialized."""
    app.dependency_overrides[get_current_user] = _fake_user
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            yield client
    finally:
        app.dependency_overrides.pop(get_current_user, None)


async def _mock_stream_success(*args, **kwargs) -> AsyncGenerator[TokenEvent | DoneEvent, None]:
    yield TokenEvent(content="Hello")
    yield DoneEvent(conversation_id="conv-1", message_id="msg-1")


async def _mock_stream_error_event(
    *args: object, **kwargs: object
) -> AsyncGenerator[TokenEvent | ErrorEvent, None]:
    yield TokenEvent(content="x")
    yield ErrorEvent(error="Simulated LLM failure", code="TEST_ERROR")


@pytest.mark.asyncio
async def test_chat_stream_happy_path(chat_client: AsyncClient) -> None:
    """POST /api/chat/stream returns 200 and SSE stream with token and done events (mocked LLM)."""
    with patch("app.routers.chat.ChatService") as mock_service:
        instance = mock_service.return_value
        instance.stream_message = _mock_stream_success  # async generator, not coroutine
        response = await chat_client.post(
            "/api/chat/stream",
            json={
                "client_id": "client-sarah",
                "message": "What is my tax position?",
            },
        )
    assert response.status_code == 200
    assert response.headers.get("content-type", "").startswith("text/event-stream")
    text = response.text
    assert "event: token" in text
    assert "event: done" in text
    assert "Hello" in text


@pytest.mark.asyncio
async def test_chat_stream_failure_path(chat_client: AsyncClient) -> None:
    """When stream yields an error event, response body contains event: error."""
    with patch("app.routers.chat.ChatService") as mock_service:
        instance = mock_service.return_value
        instance.stream_message = _mock_stream_error_event  # async generator
        response = await chat_client.post(
            "/api/chat/stream",
            json={
                "client_id": "client-sarah",
                "message": "Fail please",
            },
        )
    assert response.status_code == 200
    text = response.text
    assert "event: error" in text
    assert "Simulated LLM failure" in text


@pytest.mark.asyncio
async def test_request_correlation_header(chat_client: AsyncClient) -> None:
    """X-Request-ID sent in request is returned in response (correlation)."""
    request_id = "test-correlation-id-12345"
    response = await chat_client.get(
        "/api/chat/conversations",
        headers={"X-Request-ID": request_id},
    )
    assert response.status_code == 200
    assert response.headers.get("X-Request-ID") == request_id
