"""Abstract LLM provider protocol."""

from collections.abc import AsyncGenerator
from typing import Protocol

from app.services.llm.types import StreamEvent


class LLMProvider(Protocol):
    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        system_prompt: str,
    ) -> AsyncGenerator[StreamEvent, None]: ...
