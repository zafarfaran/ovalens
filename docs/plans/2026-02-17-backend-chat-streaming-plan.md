# Backend Chat + Streaming Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Wire the Helio frontend to a FastAPI backend with real-time LLM streaming, SQLite persistence, and rich thinking animations.

**Architecture:** FastAPI + SSE streaming + modular LLM service (Claude adapter) + SQLite (SQLAlchemy async) + Next.js frontend consuming SSE events. All services use the existing structlog infrastructure for request-correlated logging.

**Tech Stack:** FastAPI, SQLAlchemy (async + aiosqlite), Anthropic Python SDK, SSE (Server-Sent Events), Next.js, Framer Motion, TypeScript.

**Implementation order:** Database (foundation) → LLM Service (independent) → System Prompt (independent) → Chat Service (orchestration) → SSE Endpoints (transport) → Frontend (consumer).

---

## Phase 1: SQLite Database Layer

### Task 1: Add SQLAlchemy + aiosqlite dependencies

**Files:**
- Modify: `helio/apps/api/pyproject.toml`

**Step 1: Add dependencies to pyproject.toml**

Add `sqlalchemy[asyncio]>=2.0.0` and `aiosqlite>=0.20.0` to the `dependencies` list. Remove `supabase>=2.10.0` (we're replacing it for MVP).

**Step 2: Install dependencies**

Run: `cd helio/apps/api && pip install -e ".[dev]"`
Expected: Successful install with no errors

**Step 3: Commit**

```bash
git add helio/apps/api/pyproject.toml
git commit -m "deps: add sqlalchemy + aiosqlite, remove supabase for MVP"
```

---

### Task 2: Create database engine and session

**Files:**
- Create: `helio/apps/api/app/db/__init__.py`
- Create: `helio/apps/api/app/db/engine.py`

**Step 1: Create db package init**

Empty `__init__.py`.

**Step 2: Create engine.py**

```python
"""Async SQLite database engine and session factory."""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__, section="core")

_engine = None
_session_factory = None


def get_engine():
    global _engine
    if _engine is None:
        settings = get_settings()
        db_url = getattr(settings, "database_url", "sqlite+aiosqlite:///./helio.db")
        _engine = create_async_engine(db_url, echo=settings.environment == "development")
        logger.info("Database engine created", url=db_url)
    return _engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(get_engine(), expire_on_commit=False)
    return _session_factory


async def get_db_session() -> AsyncSession:
    """FastAPI dependency — yields an async DB session."""
    factory = get_session_factory()
    async with factory() as session:
        yield session
```

**Step 3: Add database_url to Settings**

In `helio/apps/api/app/config.py`, add:
```python
database_url: str = "sqlite+aiosqlite:///./helio.db"
```

**Step 4: Verify import works**

Run: `cd helio/apps/api && python -c "from app.db.engine import get_engine; print('OK')"`
Expected: `OK`

**Step 5: Commit**

```bash
git add helio/apps/api/app/db/ helio/apps/api/app/config.py
git commit -m "feat: add async SQLite engine and session factory"
```

---

### Task 3: Create SQLAlchemy ORM models

**Files:**
- Create: `helio/apps/api/app/db/models.py`

**Step 1: Write ORM models**

8 tables from `docs/helio_schema_prototype.md`. Key design:
- All primary keys: UUID stored as String(36)
- JSON columns for expansion joints (income_sources, pension_data, allowances, hicbc, scenarios)
- Conversation cache fields (last_message_preview, last_message_at, message_count)
- Use SQLAlchemy `JSON` type (works as TEXT in SQLite, JSONB in Postgres)
- `client_id` on conversations is NOT NULL (every chat tied to a client)

Tables to create:
1. `users` — id, email, full_name, role, preferences(JSON), created_at, updated_at
2. `households` — id, user_id(FK), name, notes, created_at, updated_at
3. `clients` — id, household_id(FK), user_id(FK), first_name, last_name, email, date_of_birth, ni_number, utr, region, employment_status, metadata(JSON), created_at, updated_at
4. `tax_profiles` — id, client_id(FK), tax_year, [cached summary columns], [flag columns], [JSONB expansion joints], status, data_confidence, created_at, updated_at + UNIQUE(client_id, tax_year)
5. `documents` — id, client_id(FK), uploaded_by(FK), document_type, tax_year, file_name, file_path, file_size, mime_type, extraction_status, extracted_data(JSON), extraction_confidence, created_at, updated_at
6. `conversations` — id, user_id(FK), client_id(FK, NOT NULL), title, status, last_message_preview, last_message_at, message_count, unread, tags(JSON), tax_plan_mode, created_at, updated_at
7. `messages` — id, conversation_id(FK), role, content, insights(JSON), tool_calls(JSON), dashboard_data(JSON), model, input_tokens, output_tokens, created_at
8. `observations` — id, client_id(FK), tax_year, title, description, severity, priority, category, potential_saving, deadline, action_required, is_dismissed, created_at, updated_at

Use a shared `Base = declarative_base()` and a `generate_uuid()` default for IDs.

**Step 2: Verify models compile**

Run: `cd helio/apps/api && python -c "from app.db.models import Base; print(f'{len(Base.metadata.tables)} tables defined')"`
Expected: `8 tables defined`

**Step 3: Commit**

```bash
git add helio/apps/api/app/db/models.py
git commit -m "feat: add SQLAlchemy ORM models (8-table prototype schema)"
```

---

### Task 4: Create database initialization and seed data

**Files:**
- Create: `helio/apps/api/app/db/seed.py`
- Modify: `helio/apps/api/app/db/engine.py` (add init_db function)

**Step 1: Add init_db to engine.py**

```python
async def init_db():
    """Create all tables if they don't exist."""
    from app.db.models import Base
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables initialized")
```

**Step 2: Create seed.py**

Seed data matching the frontend mock data:
- User: "Demo Adviser" (adviser role)
- Household: "Mitchell Household"
- Client: Sarah Mitchell (england, employed, DOB 15 Mar 1982, NI: QQ 12 34 56 C)
- Tax profile for 2025/26:
  - total_income: 195500, total_tax: 52847, effective_rate: 27.0, marginal_rate: 40
  - income_sources JSON: employment £145,000 + dividends £32,500 + rental £18,000
  - pension_data JSON: contributions £18,000, AA remaining £42,000
  - allowances JSON: PA fully used, pension AA £42k remaining, ISA £20k remaining, CGT £3k remaining
  - hicbc JSON: applies, ~£860 charge
  - in_pa_taper_zone: true
- Observations: 4 matching SAMPLE_OBSERVATIONS in chat/page.tsx
  - critical: "Personal allowance tapered to £0"
  - opportunity: "£42,000 pension headroom"
  - opportunity: "Unused ISA allowance"
  - warning: "HICBC applicable"
- One sample conversation with the 3 SAMPLE_MESSAGES from chat/page.tsx

Include an `async def seed_if_empty(session)` function that checks if users table has rows before seeding.

**Step 3: Wire init_db and seed into app lifespan**

Modify `helio/apps/api/app/main.py` lifespan:
```python
from app.db.engine import init_db, get_session_factory

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    setup_logging(settings.log_level, settings.environment)
    await init_db()
    # Seed sample data
    from app.db.seed import seed_if_empty
    factory = get_session_factory()
    async with factory() as session:
        await seed_if_empty(session)
    yield
```

**Step 4: Test DB init and seed**

Run: `cd helio/apps/api && python -c "
import asyncio
from app.db.engine import init_db, get_session_factory
from app.db.seed import seed_if_empty
async def test():
    await init_db()
    factory = get_session_factory()
    async with factory() as session:
        await seed_if_empty(session)
        print('Seed OK')
asyncio.run(test())
"`
Expected: `Seed OK`

**Step 5: Commit**

```bash
git add helio/apps/api/app/db/ helio/apps/api/app/main.py
git commit -m "feat: add DB init, seed data matching frontend mocks"
```

---

### Task 5: Update dependencies.py for SQLite

**Files:**
- Modify: `helio/apps/api/app/dependencies.py`

**Step 1: Replace Supabase dependency with SQLite session**

Remove `get_db()` Supabase client. Add:
```python
from app.db.engine import get_db_session

async def get_db(session: AsyncSession = Depends(get_db_session)):
    return session
```

Keep `get_request_logger` and `get_section_logger` unchanged.

**Step 2: Remove supabase import and core/supabase.py reference**

The `core/supabase.py` file stays (don't delete others' code) but `dependencies.py` no longer imports it.

**Step 3: Verify server starts**

Run: `cd helio/apps/api && timeout 5 uvicorn app.main:app --port 8000 || true`
Expected: Server starts without import errors (will timeout after 5s which is fine)

**Step 4: Commit**

```bash
git add helio/apps/api/app/dependencies.py
git commit -m "feat: wire SQLite session into FastAPI dependencies"
```

---

### Task 6: Test health endpoint with DB

**Files:**
- Modify: `helio/apps/api/app/routers/health.py`
- Modify: `helio/apps/api/tests/test_health.py`

**Step 1: Update health endpoint to report DB status**

```python
@router.get("/health")
async def health(logger: BoundLogger = Depends(get_request_logger)):
    logger.debug("Health check")
    return {"status": "ok", "service": "helio-api", "version": "0.0.1", "database": "sqlite"}
```

**Step 2: Write integration test**

```python
import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_health():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r = await client.get("/health")
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "ok"
        assert data["database"] == "sqlite"
```

**Step 3: Run test**

Run: `cd helio/apps/api && pytest tests/test_health.py -v`
Expected: PASS

**Step 4: Commit**

```bash
git add helio/apps/api/app/routers/health.py helio/apps/api/tests/test_health.py
git commit -m "test: health endpoint with DB status check"
```

---

## Phase 2: LLM Service Layer

### Task 7: Create LLM types

**Files:**
- Create: `helio/apps/api/app/services/llm/__init__.py`
- Create: `helio/apps/api/app/services/llm/types.py`

**Step 1: Create llm package init**

```python
"""Modular LLM service layer — provider-agnostic streaming interface."""
```

**Step 2: Create types.py**

Define the event types that flow through the SSE stream:

```python
"""Stream event types for LLM responses."""

from dataclasses import dataclass, field
from enum import StrEnum


class StatusPhase(StrEnum):
    UNDERSTANDING = "understanding"
    ANALYZING_INCOME = "analyzing_income"
    CHECKING_ALLOWANCES = "checking_allowances"
    CALCULATING = "calculating"
    GENERATING_RESPONSE = "generating_response"
    COMPLETE = "complete"


STATUS_MESSAGES: dict[StatusPhase, str] = {
    StatusPhase.UNDERSTANDING: "Understanding your question...",
    StatusPhase.ANALYZING_INCOME: "Analysing income sources...",
    StatusPhase.CHECKING_ALLOWANCES: "Checking allowance status...",
    StatusPhase.CALCULATING: "Running tax calculations...",
    StatusPhase.GENERATING_RESPONSE: "Generating response...",
    StatusPhase.COMPLETE: "",
}


@dataclass
class TokenEvent:
    content: str
    type: str = field(default="token", init=False)


@dataclass
class StatusEvent:
    phase: StatusPhase
    message: str = ""
    type: str = field(default="status", init=False)

    def __post_init__(self):
        if not self.message:
            self.message = STATUS_MESSAGES.get(self.phase, "")


@dataclass
class ToolCallEvent:
    tool: str
    tool_input: dict
    type: str = field(default="tool_call", init=False)


@dataclass
class ToolResultEvent:
    tool: str
    result: dict
    type: str = field(default="tool_result", init=False)


@dataclass
class DoneEvent:
    conversation_id: str
    message_id: str
    input_tokens: int = 0
    output_tokens: int = 0
    type: str = field(default="done", init=False)


@dataclass
class ErrorEvent:
    error: str
    code: str = "LLM_ERROR"
    type: str = field(default="error", init=False)


StreamEvent = TokenEvent | StatusEvent | ToolCallEvent | ToolResultEvent | DoneEvent | ErrorEvent
```

**Step 3: Verify import**

Run: `cd helio/apps/api && python -c "from app.services.llm.types import StreamEvent, StatusPhase; print('OK')"`
Expected: `OK`

**Step 4: Commit**

```bash
git add helio/apps/api/app/services/llm/
git commit -m "feat: add LLM stream event types and status phases"
```

---

### Task 8: Create LLM provider protocol

**Files:**
- Create: `helio/apps/api/app/services/llm/base.py`

**Step 1: Define the protocol**

```python
"""Abstract LLM provider protocol."""

from collections.abc import AsyncGenerator
from typing import Protocol

from app.services.llm.types import StreamEvent


class LLMProvider(Protocol):
    """Provider-agnostic interface for streaming LLM responses.

    Implement this protocol to add a new LLM provider.
    See claude.py for the reference implementation.
    """

    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        system_prompt: str,
    ) -> AsyncGenerator[StreamEvent, None]:
        """Stream a chat response as a sequence of events.

        Args:
            messages: Conversation history as [{"role": "user"|"assistant", "content": "..."}]
            system_prompt: The full system prompt including client context.

        Yields:
            StreamEvent instances (Token, Status, ToolCall, Done, Error).
        """
        ...
```

**Step 2: Commit**

```bash
git add helio/apps/api/app/services/llm/base.py
git commit -m "feat: add LLMProvider protocol"
```

---

### Task 9: Create Claude adapter

**Files:**
- Create: `helio/apps/api/app/services/llm/claude.py`

**Step 1: Implement the Claude streaming adapter**

This is the core of the LLM layer. It:
- Uses the Anthropic Python SDK's streaming API (`client.messages.stream()`)
- Emits `StatusEvent(UNDERSTANDING)` at start
- Emits `StatusEvent(GENERATING_RESPONSE)` when first text token arrives
- Emits `TokenEvent` for each text delta
- Emits `DoneEvent` at the end with usage stats
- Logs all interactions via structlog

```python
"""Anthropic Claude LLM adapter."""

from collections.abc import AsyncGenerator

import anthropic

from app.config import get_settings
from app.core.logging import get_logger
from app.services.llm.types import (
    DoneEvent,
    ErrorEvent,
    StatusEvent,
    StatusPhase,
    StreamEvent,
    TokenEvent,
)

logger = get_logger(__name__)


class ClaudeProvider:
    """Anthropic Claude streaming adapter."""

    def __init__(self):
        settings = get_settings()
        if not settings.anthropic_api_key:
            raise ValueError("ANTHROPIC_API_KEY is required")
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        self.model = settings.ai_model
        logger.info("Claude provider initialized", model=self.model)

    async def stream_chat(
        self,
        messages: list[dict[str, str]],
        system_prompt: str,
    ) -> AsyncGenerator[StreamEvent, None]:
        logger.info(
            "Starting Claude stream",
            message_count=len(messages),
            model=self.model,
        )

        yield StatusEvent(phase=StatusPhase.UNDERSTANDING)

        first_token = True
        input_tokens = 0
        output_tokens = 0

        try:
            async with self.client.messages.stream(
                model=self.model,
                max_tokens=4096,
                system=system_prompt,
                messages=messages,
            ) as stream:
                async for event in stream:
                    if event.type == "content_block_delta":
                        if hasattr(event.delta, "text"):
                            if first_token:
                                yield StatusEvent(phase=StatusPhase.GENERATING_RESPONSE)
                                first_token = False
                            yield TokenEvent(content=event.delta.text)

                    elif event.type == "message_start":
                        if event.message and event.message.usage:
                            input_tokens = event.message.usage.input_tokens

                    elif event.type == "message_delta":
                        if hasattr(event, "usage") and event.usage:
                            output_tokens = event.usage.output_tokens

            logger.info(
                "Claude stream completed",
                input_tokens=input_tokens,
                output_tokens=output_tokens,
            )

            yield StatusEvent(phase=StatusPhase.COMPLETE)
            # DoneEvent is yielded by the ChatService after saving the message

        except anthropic.APIError as e:
            logger.error("Claude API error", error=str(e), status_code=getattr(e, 'status_code', None))
            yield ErrorEvent(error=str(e), code="CLAUDE_API_ERROR")
        except Exception as e:
            logger.exception("Unexpected error during Claude stream")
            yield ErrorEvent(error=str(e), code="LLM_STREAM_ERROR")
```

**Step 2: Commit**

```bash
git add helio/apps/api/app/services/llm/claude.py
git commit -m "feat: add Claude streaming adapter with status phases"
```

---

### Task 10: Create LLM factory

**Files:**
- Create: `helio/apps/api/app/services/llm/factory.py`

**Step 1: Implement factory**

```python
"""LLM provider factory — returns the configured provider."""

from functools import lru_cache

from app.config import get_settings
from app.core.logging import get_logger
from app.services.llm.claude import ClaudeProvider

logger = get_logger(__name__)

_provider = None


def get_llm_provider() -> ClaudeProvider:
    """Get the configured LLM provider (cached singleton)."""
    global _provider
    if _provider is None:
        settings = get_settings()
        if settings.anthropic_api_key:
            _provider = ClaudeProvider()
            logger.info("LLM provider: Claude", model=settings.ai_model)
        else:
            raise RuntimeError("No LLM provider configured — set ANTHROPIC_API_KEY")
    return _provider
```

**Step 2: Verify import chain**

Run: `cd helio/apps/api && python -c "from app.services.llm.factory import get_llm_provider; print('Factory OK')"`
Expected: `Factory OK` (will fail at runtime without API key, but import works)

**Step 3: Commit**

```bash
git add helio/apps/api/app/services/llm/factory.py
git commit -m "feat: add LLM provider factory"
```

---

## Phase 3: System Prompt

### Task 11: Update system_prompt.md

**Files:**
- Modify: `docs/system_prompt.md`

**Step 1: Add streaming-friendly additions**

Append these sections to the end of the existing system prompt:

```markdown
---

## Response Formatting

Format your responses using markdown for the chat interface:
- Use **bold** for key figures (tax amounts, rates, savings)
- Use bullet lists for observations and recommendations
- Use numbered lists for step-by-step analysis
- Keep paragraphs short — 2-3 sentences max
- Lead with a brief acknowledgment, then dive into analysis

## Conversation Behaviour

- You have access to the full conversation history. Reference prior messages rather than re-asking questions already answered.
- Start responding immediately — don't wait to compose a full answer. A brief acknowledgment followed by analysis feels more natural in a streaming interface.
- When the client's tax profile is provided in the context below, reference that data directly. Don't ask the user to provide information you already have.

## Current Client Context

{{CLIENT_CONTEXT}}
```

The `{{CLIENT_CONTEXT}}` placeholder gets replaced at runtime with the client's tax profile data.

**Step 2: Commit**

```bash
git add docs/system_prompt.md
git commit -m "feat: add streaming-friendly sections to system prompt"
```

---

### Task 12: Create system prompt loader

**Files:**
- Create: `helio/apps/api/app/services/system_prompt.py`

**Step 1: Implement the loader**

```python
"""System prompt loader with client context injection."""

import json
from pathlib import Path

from app.core.logging import get_logger

logger = get_logger(__name__)

_BASE_PROMPT: str | None = None
_PROMPT_PATH = Path(__file__).resolve().parents[3] / "docs" / "system_prompt.md"  # helio/apps/api -> project root -> docs/


def _load_base_prompt() -> str:
    """Load and cache the base system prompt from docs/system_prompt.md."""
    global _BASE_PROMPT
    if _BASE_PROMPT is None:
        # Try multiple paths (handles different working directories)
        paths = [
            _PROMPT_PATH,
            Path("docs/system_prompt.md"),
            Path("../../docs/system_prompt.md"),
        ]
        for p in paths:
            if p.exists():
                _BASE_PROMPT = p.read_text(encoding="utf-8")
                logger.info("System prompt loaded", path=str(p), length=len(_BASE_PROMPT))
                return _BASE_PROMPT
        # Fallback
        _BASE_PROMPT = "You are Hazel, a UK tax planning assistant for financial advisers."
        logger.warning("System prompt file not found, using fallback")
    return _BASE_PROMPT


def build_system_prompt(client_context: dict | None = None) -> str:
    """Build the full system prompt with optional client context.

    Args:
        client_context: Dict with client tax data to inject. If None,
                       the {{CLIENT_CONTEXT}} placeholder is replaced
                       with a note that no client is selected.
    """
    base = _load_base_prompt()

    if client_context:
        context_text = _format_client_context(client_context)
    else:
        context_text = "No client currently selected. Ask the adviser which client they'd like to discuss."

    prompt = base.replace("{{CLIENT_CONTEXT}}", context_text)
    logger.debug("System prompt built", has_client=client_context is not None, length=len(prompt))
    return prompt


def _format_client_context(ctx: dict) -> str:
    """Format client tax data as readable context for the LLM."""
    lines = []

    if "client" in ctx:
        c = ctx["client"]
        lines.append(f"**Client:** {c.get('first_name', '')} {c.get('last_name', '')}")
        lines.append(f"**Region:** {c.get('region', 'england').title()}")
        lines.append(f"**Employment status:** {c.get('employment_status', 'employed')}")

    if "tax_profile" in ctx:
        tp = ctx["tax_profile"]
        lines.append(f"\n**Tax Year:** {tp.get('tax_year', '2025/26')}")
        lines.append(f"**Total Income:** £{tp.get('total_income', 0):,.2f}")
        lines.append(f"**Adjusted Net Income:** £{tp.get('adjusted_net_income', 0):,.2f}")
        lines.append(f"**Total Tax:** £{tp.get('total_tax', 0):,.2f}")
        lines.append(f"**Effective Rate:** {tp.get('effective_rate', 0):.1f}%")
        lines.append(f"**Marginal Rate:** {tp.get('marginal_rate', 0):.0f}%")
        lines.append(f"**Personal Allowance Status:** {tp.get('pa_status', 'full')}")

        if tp.get('in_pa_taper_zone'):
            lines.append("**Alert:** Client is in the PA taper zone (£100k-£125,140)")
        if tp.get('hicbc_applies'):
            lines.append("**Alert:** HICBC applies")

        if tp.get('income_sources'):
            lines.append("\n**Income Sources:**")
            for src in tp['income_sources']:
                lines.append(f"- {src.get('label', src.get('source_type', 'Unknown'))}: £{src.get('gross_amount', 0):,.2f}")

        if tp.get('allowances'):
            lines.append("\n**Allowances:**")
            for a in tp['allowances']:
                lines.append(f"- {a.get('label', a.get('type', ''))}: £{a.get('remaining', 0):,.0f} remaining of £{a.get('annual_limit', 0):,.0f}")

    if "observations" in ctx:
        lines.append("\n**Current Observations:**")
        for obs in ctx["observations"]:
            lines.append(f"- [{obs.get('severity', 'info').upper()}] {obs.get('title', '')}: {obs.get('description', '')}")

    return "\n".join(lines)
```

**Step 2: Test the loader**

Run: `cd helio/apps/api && python -c "
from app.services.system_prompt import build_system_prompt
prompt = build_system_prompt({'client': {'first_name': 'Sarah', 'last_name': 'Mitchell'}})
print(f'Prompt length: {len(prompt)} chars')
print('Has client context:', 'Sarah Mitchell' in prompt)
"`
Expected: Prompt loads with client name embedded

**Step 3: Commit**

```bash
git add helio/apps/api/app/services/system_prompt.py docs/system_prompt.md
git commit -m "feat: system prompt loader with client context injection"
```

---

## Phase 4: Chat Service

### Task 13: Create chat service

**Files:**
- Create: `helio/apps/api/app/services/chat.py`

**Step 1: Implement ChatService**

The orchestration layer. Responsibilities:
- Create/list/delete conversations (always tied to a client_id)
- Send message: save user msg → load history → build context → stream LLM → save assistant msg → update conversation cache
- Load client tax context for system prompt injection

```python
"""Chat service — orchestrates conversations, LLM calls, and persistence."""

import json
import uuid
from collections.abc import AsyncGenerator
from datetime import datetime, timezone

from sqlalchemy import select, update, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.models import Client, Conversation, Message, TaxProfile, Observation
from app.services.llm.factory import get_llm_provider
from app.services.llm.types import (
    DoneEvent,
    ErrorEvent,
    StreamEvent,
    TokenEvent,
)
from app.services.system_prompt import build_system_prompt

logger = get_logger(__name__)

MAX_HISTORY_MESSAGES = 50


class ChatService:
    def __init__(self, session: AsyncSession):
        self.session = session

    # ── Conversations ──

    async def create_conversation(self, user_id: str, client_id: str, title: str | None = None) -> Conversation:
        conv = Conversation(
            id=str(uuid.uuid4()),
            user_id=user_id,
            client_id=client_id,
            title=title or "New conversation",
            status="active",
            message_count=0,
            unread=False,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        self.session.add(conv)
        await self.session.commit()
        await self.session.refresh(conv)
        logger.info("Conversation created", conversation_id=conv.id, client_id=client_id)
        return conv

    async def list_conversations(self, user_id: str, client_id: str | None = None) -> list[Conversation]:
        stmt = (
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .where(Conversation.status != "deleted")
            .order_by(desc(Conversation.last_message_at), desc(Conversation.created_at))
        )
        if client_id:
            stmt = stmt.where(Conversation.client_id == client_id)
        result = await self.session.execute(stmt)
        convs = result.scalars().all()
        logger.debug("Conversations listed", count=len(convs), client_id=client_id)
        return list(convs)

    async def get_conversation(self, conversation_id: str) -> Conversation | None:
        result = await self.session.execute(
            select(Conversation).where(Conversation.id == conversation_id)
        )
        return result.scalar_one_or_none()

    async def delete_conversation(self, conversation_id: str):
        await self.session.execute(
            update(Conversation)
            .where(Conversation.id == conversation_id)
            .values(status="deleted", updated_at=datetime.now(timezone.utc))
        )
        await self.session.commit()
        logger.info("Conversation deleted", conversation_id=conversation_id)

    async def update_conversation(self, conversation_id: str, **kwargs):
        kwargs["updated_at"] = datetime.now(timezone.utc)
        await self.session.execute(
            update(Conversation)
            .where(Conversation.id == conversation_id)
            .values(**kwargs)
        )
        await self.session.commit()

    # ── Messages ──

    async def get_messages(self, conversation_id: str, limit: int = 100, offset: int = 0) -> list[Message]:
        result = await self.session.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
            .offset(offset)
            .limit(limit)
        )
        return list(result.scalars().all())

    # ── Stream message ──

    async def stream_message(
        self,
        conversation_id: str,
        user_id: str,
        client_id: str,
        content: str,
    ) -> AsyncGenerator[StreamEvent, None]:
        """Send a message and stream the LLM response.

        1. Save user message
        2. Load conversation history
        3. Build system prompt with client context
        4. Stream LLM response
        5. Save assistant message
        6. Update conversation cache
        7. Yield DoneEvent
        """
        # Auto-create conversation if needed
        if not conversation_id:
            conv = await self.create_conversation(user_id, client_id)
            conversation_id = conv.id

        # Save user message
        user_msg = Message(
            id=str(uuid.uuid4()),
            conversation_id=conversation_id,
            role="user",
            content=content,
            created_at=datetime.now(timezone.utc),
        )
        self.session.add(user_msg)
        await self.session.commit()
        logger.info("User message saved", conversation_id=conversation_id, length=len(content))

        # Load history
        history = await self._load_history(conversation_id)

        # Build system prompt with client context
        client_context = await self._load_client_context(client_id)
        system_prompt = build_system_prompt(client_context)

        # Format messages for LLM
        llm_messages = [{"role": m.role, "content": m.content} for m in history]

        # Stream LLM response
        llm = get_llm_provider()
        full_response = ""
        assistant_msg_id = str(uuid.uuid4())

        async for event in llm.stream_chat(llm_messages, system_prompt):
            if isinstance(event, TokenEvent):
                full_response += event.content
            elif isinstance(event, ErrorEvent):
                logger.error("LLM error during stream", error=event.error)

            yield event

        # Save assistant message
        if full_response:
            assistant_msg = Message(
                id=assistant_msg_id,
                conversation_id=conversation_id,
                role="assistant",
                content=full_response,
                model=get_llm_provider().model,
                created_at=datetime.now(timezone.utc),
            )
            self.session.add(assistant_msg)

            # Update conversation cache
            preview = full_response[:120] if full_response else ""
            await self.session.execute(
                update(Conversation)
                .where(Conversation.id == conversation_id)
                .values(
                    last_message_preview=preview,
                    last_message_at=datetime.now(timezone.utc),
                    message_count=Conversation.message_count + 2,  # user + assistant
                    title=content[:80] if not (await self.get_conversation(conversation_id)).title or (await self.get_conversation(conversation_id)).title == "New conversation" else Conversation.title,
                    updated_at=datetime.now(timezone.utc),
                )
            )
            await self.session.commit()
            logger.info("Assistant message saved", conversation_id=conversation_id, length=len(full_response))

        # Final done event
        yield DoneEvent(
            conversation_id=conversation_id,
            message_id=assistant_msg_id,
        )

    # ── Private helpers ──

    async def _load_history(self, conversation_id: str) -> list[Message]:
        result = await self.session.execute(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
            .limit(MAX_HISTORY_MESSAGES)
        )
        return list(result.scalars().all())

    async def _load_client_context(self, client_id: str) -> dict | None:
        if not client_id:
            return None

        # Load client
        result = await self.session.execute(
            select(Client).where(Client.id == client_id)
        )
        client = result.scalar_one_or_none()
        if not client:
            return None

        # Load tax profile (latest)
        result = await self.session.execute(
            select(TaxProfile)
            .where(TaxProfile.client_id == client_id)
            .order_by(desc(TaxProfile.created_at))
            .limit(1)
        )
        tax_profile = result.scalar_one_or_none()

        # Load observations
        result = await self.session.execute(
            select(Observation)
            .where(Observation.client_id == client_id)
            .where(Observation.is_dismissed == False)
            .order_by(Observation.created_at)
        )
        observations = list(result.scalars().all())

        context = {
            "client": {
                "first_name": client.first_name,
                "last_name": client.last_name,
                "region": client.region,
                "employment_status": client.employment_status,
            },
        }

        if tax_profile:
            context["tax_profile"] = {
                "tax_year": tax_profile.tax_year,
                "total_income": float(tax_profile.total_income or 0),
                "adjusted_net_income": float(tax_profile.adjusted_net_income or 0),
                "total_tax": float(tax_profile.total_tax or 0),
                "effective_rate": float(tax_profile.effective_rate or 0),
                "marginal_rate": float(tax_profile.marginal_rate or 0),
                "pa_status": tax_profile.pa_status,
                "in_pa_taper_zone": tax_profile.in_pa_taper_zone,
                "hicbc_applies": tax_profile.hicbc_applies,
                "income_sources": tax_profile.income_sources or [],
                "allowances": tax_profile.allowances or [],
            }

        if observations:
            context["observations"] = [
                {
                    "severity": obs.severity,
                    "title": obs.title,
                    "description": obs.description,
                    "potential_saving": float(obs.potential_saving) if obs.potential_saving else None,
                }
                for obs in observations
            ]

        logger.debug("Client context loaded", client_id=client_id, has_tax_profile=tax_profile is not None)
        return context
```

**Step 2: Verify import**

Run: `cd helio/apps/api && python -c "from app.services.chat import ChatService; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```bash
git add helio/apps/api/app/services/chat.py
git commit -m "feat: ChatService with conversation management and LLM streaming"
```

---

## Phase 5: SSE Streaming Endpoint

### Task 14: Implement chat router with SSE streaming

**Files:**
- Modify: `helio/apps/api/app/routers/chat.py`

**Step 1: Implement the streaming endpoint and conversation REST endpoints**

```python
"""Chat endpoints — SSE streaming + conversation management."""

import json
from dataclasses import asdict

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from structlog.stdlib import BoundLogger

from app.db.engine import get_db_session
from app.dependencies import get_request_logger
from app.services.chat import ChatService

router = APIRouter(tags=["chat"])


# ── Request/Response models ──

class ChatStreamRequest(BaseModel):
    conversation_id: str | None = None
    client_id: str
    message: str


class CreateConversationRequest(BaseModel):
    client_id: str
    title: str | None = None


class UpdateConversationRequest(BaseModel):
    title: str | None = None
    status: str | None = None


# ── SSE Streaming ──

@router.post("/chat/stream")
async def chat_stream(
    body: ChatStreamRequest,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """Stream an AI response as Server-Sent Events."""
    logger.info("Chat stream requested", client_id=body.client_id, conversation_id=body.conversation_id)

    # Hardcoded user_id for MVP (no auth yet)
    user_id = "demo-user"

    service = ChatService(session)

    async def event_generator():
        async for event in service.stream_message(
            conversation_id=body.conversation_id or "",
            user_id=user_id,
            client_id=body.client_id,
            content=body.message,
        ):
            data = json.dumps(asdict(event))
            yield f"event: {event.type}\ndata: {data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Conversation CRUD ──

@router.get("/chat/conversations")
async def list_conversations(
    client_id: str | None = None,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """List conversations, optionally filtered by client."""
    service = ChatService(session)
    convs = await service.list_conversations(user_id="demo-user", client_id=client_id)
    logger.info("Conversations listed", count=len(convs))
    return {
        "conversations": [
            {
                "id": c.id,
                "client_id": c.client_id,
                "title": c.title,
                "status": c.status,
                "last_message_preview": c.last_message_preview,
                "last_message_at": c.last_message_at.isoformat() if c.last_message_at else None,
                "message_count": c.message_count,
                "unread": c.unread,
                "created_at": c.created_at.isoformat() if c.created_at else None,
            }
            for c in convs
        ]
    }


@router.post("/chat/conversations")
async def create_conversation(
    body: CreateConversationRequest,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """Create a new conversation for a client."""
    service = ChatService(session)
    conv = await service.create_conversation(
        user_id="demo-user",
        client_id=body.client_id,
        title=body.title,
    )
    logger.info("Conversation created", conversation_id=conv.id)
    return {"id": conv.id, "title": conv.title, "client_id": conv.client_id}


@router.get("/chat/conversations/{conversation_id}/messages")
async def get_messages(
    conversation_id: str,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """Get messages for a conversation."""
    service = ChatService(session)
    messages = await service.get_messages(conversation_id)
    logger.info("Messages loaded", conversation_id=conversation_id, count=len(messages))
    return {
        "messages": [
            {
                "id": m.id,
                "role": m.role,
                "content": m.content,
                "insights": m.insights,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ]
    }


@router.patch("/chat/conversations/{conversation_id}")
async def update_conversation(
    conversation_id: str,
    body: UpdateConversationRequest,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """Update conversation title or status."""
    service = ChatService(session)
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    await service.update_conversation(conversation_id, **updates)
    return {"ok": True}


@router.delete("/chat/conversations/{conversation_id}")
async def delete_conversation(
    conversation_id: str,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """Soft-delete a conversation."""
    service = ChatService(session)
    await service.delete_conversation(conversation_id)
    logger.info("Conversation deleted", conversation_id=conversation_id)
    return {"ok": True}
```

**Step 2: Commit**

```bash
git add helio/apps/api/app/routers/chat.py
git commit -m "feat: chat router with SSE streaming and conversation CRUD"
```

---

### Task 15: Implement clients router

**Files:**
- Modify: `helio/apps/api/app/routers/clients.py`

**Step 1: Implement client list and detail endpoints**

The frontend needs:
- `GET /api/clients` — list clients (for the client selector dropdown)
- `GET /api/clients/{id}` — client detail with tax profile (for context ribbon)

```python
"""Client endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from structlog.stdlib import BoundLogger

from app.db.engine import get_db_session
from app.db.models import Client, TaxProfile, Observation
from app.dependencies import get_request_logger

router = APIRouter(tags=["clients"])


@router.get("/clients")
async def list_clients(
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """List all clients with their latest tax summary."""
    result = await session.execute(
        select(Client).where(Client.user_id == "demo-user").order_by(Client.last_name)
    )
    clients = result.scalars().all()

    response = []
    for c in clients:
        # Get latest tax profile for summary
        tp_result = await session.execute(
            select(TaxProfile)
            .where(TaxProfile.client_id == c.id)
            .order_by(TaxProfile.created_at.desc())
            .limit(1)
        )
        tp = tp_result.scalar_one_or_none()

        response.append({
            "id": c.id,
            "first_name": c.first_name,
            "last_name": c.last_name,
            "email": c.email,
            "region": c.region,
            "employment_status": c.employment_status,
            "tax_year": tp.tax_year if tp else None,
            "total_income": float(tp.total_income) if tp else None,
            "total_tax": float(tp.total_tax) if tp else None,
            "effective_rate": float(tp.effective_rate) if tp else None,
            "marginal_rate": float(tp.marginal_rate) if tp else None,
        })

    logger.info("Clients listed", count=len(response))
    return {"clients": response}


@router.get("/clients/{client_id}")
async def get_client(
    client_id: str,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """Get client detail with full tax profile and observations."""
    result = await session.execute(select(Client).where(Client.id == client_id))
    client = result.scalar_one_or_none()
    if not client:
        return {"error": "Client not found"}, 404

    # Tax profile
    tp_result = await session.execute(
        select(TaxProfile)
        .where(TaxProfile.client_id == client_id)
        .order_by(TaxProfile.created_at.desc())
        .limit(1)
    )
    tp = tp_result.scalar_one_or_none()

    # Observations
    obs_result = await session.execute(
        select(Observation)
        .where(Observation.client_id == client_id)
        .where(Observation.is_dismissed == False)
    )
    observations = obs_result.scalars().all()

    return {
        "client": {
            "id": client.id,
            "first_name": client.first_name,
            "last_name": client.last_name,
            "email": client.email,
            "region": client.region,
            "date_of_birth": client.date_of_birth,
            "ni_number": client.ni_number,
            "employment_status": client.employment_status,
        },
        "tax_profile": {
            "tax_year": tp.tax_year,
            "total_income": float(tp.total_income or 0),
            "adjusted_net_income": float(tp.adjusted_net_income or 0),
            "total_tax": float(tp.total_tax or 0),
            "effective_rate": float(tp.effective_rate or 0),
            "marginal_rate": float(tp.marginal_rate or 0),
            "income_tax": float(tp.income_tax or 0),
            "national_insurance": float(tp.national_insurance or 0),
            "dividend_tax": float(tp.dividend_tax or 0),
            "personal_allowance": float(tp.personal_allowance or 0),
            "pa_status": tp.pa_status,
            "in_pa_taper_zone": tp.in_pa_taper_zone,
            "hicbc_applies": tp.hicbc_applies,
            "income_sources": tp.income_sources or [],
            "pension_data": tp.pension_data or {},
            "allowances": tp.allowances or [],
            "hicbc": tp.hicbc or {},
            "tax_breakdown": tp.tax_breakdown or [],
            "ni_breakdown": tp.ni_breakdown or {},
        } if tp else None,
        "observations": [
            {
                "id": o.id,
                "severity": o.severity,
                "title": o.title,
                "description": o.description,
                "category": o.category,
                "potential_saving": float(o.potential_saving) if o.potential_saving else None,
            }
            for o in observations
        ],
    }
```

**Step 2: Commit**

```bash
git add helio/apps/api/app/routers/clients.py
git commit -m "feat: client endpoints with tax profile and observations"
```

---

### Task 16: Verify backend end-to-end

**Step 1: Create a .env file**

Create `helio/apps/api/.env`:
```
ANTHROPIC_API_KEY=your-key-here
DATABASE_URL=sqlite+aiosqlite:///./helio.db
```

**Step 2: Start the server**

Run: `cd helio/apps/api && uvicorn app.main:app --reload --port 8000`

**Step 3: Test endpoints manually**

```bash
# Health
curl http://localhost:8000/health

# List clients
curl http://localhost:8000/api/clients

# Get client detail
curl http://localhost:8000/api/clients/{client_id}

# List conversations
curl http://localhost:8000/api/chat/conversations?client_id={client_id}

# Create conversation
curl -X POST http://localhost:8000/api/chat/conversations \
  -H "Content-Type: application/json" \
  -d '{"client_id": "{client_id}"}'

# Stream a message
curl -N http://localhost:8000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"client_id": "{client_id}", "message": "What is Sarah'\''s current tax position?"}'
```

**Step 4: Verify SSE events stream correctly**

Expected: See `event: status`, `event: token`, and `event: done` lines streaming in real-time.

---

## Phase 6: Frontend Changes

### Task 17: Create useChat hook

**Files:**
- Create: `helio/apps/web/src/hooks/useChat.ts`

**Step 1: Implement the SSE streaming hook**

```typescript
"use client";

import { useState, useCallback, useRef } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  insights?: { label: string; value: string; color: string }[];
}

export type StatusPhase =
  | "idle"
  | "understanding"
  | "analyzing_income"
  | "checking_allowances"
  | "calculating"
  | "generating_response"
  | "complete";

const STATUS_MESSAGES: Record<StatusPhase, string> = {
  idle: "",
  understanding: "Understanding your question...",
  analyzing_income: "Analysing income sources...",
  checking_allowances: "Checking allowance status...",
  calculating: "Running tax calculations...",
  generating_response: "Generating response...",
  complete: "",
};

export function useChat(clientId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<StatusPhase>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      // Add user message
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setStatus("understanding");
      setStatusMessage(STATUS_MESSAGES.understanding);

      // Prepare assistant placeholder
      const assistantId = crypto.randomUUID();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Start SSE stream
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`${API_BASE}/api/chat/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: conversationId,
            client_id: clientId,
            message: content,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6));

              if (eventType === "token") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: m.content + data.content } : m
                  )
                );
              } else if (eventType === "status") {
                const phase = data.phase as StatusPhase;
                setStatus(phase);
                setStatusMessage(data.message || STATUS_MESSAGES[phase] || "");
              } else if (eventType === "done") {
                if (data.conversation_id) {
                  setConversationId(data.conversation_id);
                }
              } else if (eventType === "error") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: `Error: ${data.error}` }
                      : m
                  )
                );
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Stream error:", err);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: "Sorry, something went wrong. Please try again." }
                : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
        setStatus("idle");
        setStatusMessage("");
        abortRef.current = null;
      }
    },
    [clientId, conversationId, isStreaming]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const loadMessages = useCallback(
    async (convId: string) => {
      setConversationId(convId);
      try {
        const res = await fetch(`${API_BASE}/api/chat/conversations/${convId}/messages`);
        const data = await res.json();
        setMessages(
          data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.created_at
              ? new Date(m.created_at).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "",
            insights: m.insights,
          }))
        );
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    },
    []
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(null);
  }, []);

  return {
    messages,
    status,
    statusMessage,
    isStreaming,
    conversationId,
    sendMessage,
    stopStreaming,
    loadMessages,
    clearMessages,
  };
}
```

**Step 2: Commit**

```bash
git add helio/apps/web/src/hooks/useChat.ts
git commit -m "feat: useChat hook with SSE streaming and status phases"
```

---

### Task 18: Create ThinkingIndicator component

**Files:**
- Create: `helio/apps/web/src/components/thinking-indicator.tsx`

**Step 1: Build the thinking animation component**

A component that shows the current LLM phase with animated transitions. Uses Framer Motion AnimatePresence for smooth phase changes. Displays a pulsing dot + phase text that transitions between states.

Key states:
- `understanding` → brain icon + "Understanding your question..."
- `analyzing_income` → chart icon + "Analysing income sources..."
- `checking_allowances` → shield icon + "Checking allowance status..."
- `calculating` → calculator icon + "Running tax calculations..."
- `generating_response` → sparkles icon + "Generating response..."

Design: Matches the existing Helio design language — light weight fonts, brand colors, subtle animations. Should sit above the streaming message content with the Helio avatar.

**Step 2: Commit**

```bash
git add helio/apps/web/src/components/thinking-indicator.tsx
git commit -m "feat: ThinkingIndicator with animated phase transitions"
```

---

### Task 19: Wire up chat page to live backend

**Files:**
- Modify: `helio/apps/web/src/app/chat/page.tsx`

**Step 1: Replace static data with live hooks**

Major changes to `chat/page.tsx`:

1. **Import and use `useChat` hook** — replace `const [messages] = useState(SAMPLE_MESSAGES)` with the hook
2. **Import and use `ThinkingIndicator`** — show when `status !== "idle"`
3. **Wire send button** — call `sendMessage(input)` on click and Enter key
4. **Wire conversation sidebar** — fetch from API, handle new/select/delete
5. **Wire client selector** — fetch clients from API, update context ribbon with real data
6. **Add API client utility** for non-streaming calls (conversations, clients)
7. **Keep all existing UI/animation code** — only swap data sources

Key state changes:
- `const { messages, status, statusMessage, isStreaming, sendMessage, loadMessages, clearMessages } = useChat(selectedClientId)`
- Add `selectedClientId` state, default to first client from API
- Add `conversations` state fetched from API
- Add `clientData` state fetched from API (for context ribbon + dropdown)
- Remove `SAMPLE_MESSAGES`, `SAMPLE_OBSERVATIONS`, `CHAT_HISTORY` constants (replaced by API data)
- Keep `QUICK_PROMPTS` (static, no backend needed)

The send flow:
1. User types message, hits Enter or clicks send
2. `sendMessage(input)` called → adds user bubble, starts streaming
3. `ThinkingIndicator` appears showing phases
4. Tokens stream in, building assistant message
5. On done, thinking indicator hides, message is complete
6. Sidebar auto-refreshes to show updated conversation

**Step 2: Add .env.local for API URL**

Create `helio/apps/web/.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

**Step 3: Commit**

```bash
git add helio/apps/web/src/app/chat/page.tsx helio/apps/web/.env.local
git commit -m "feat: wire chat page to live backend with SSE streaming"
```

---

### Task 20: End-to-end verification

**Step 1: Start backend**

Run: `cd helio/apps/api && uvicorn app.main:app --reload --port 8000`

**Step 2: Start frontend**

Run: `cd helio/apps/web && npm run dev`

**Step 3: Test the full flow**

1. Open `http://localhost:3000/chat`
2. Verify client selector shows Sarah Mitchell with real data
3. Verify conversation sidebar loads (shows seed conversation)
4. Type a message: "What is Sarah's current tax position?"
5. Verify:
   - User message appears immediately
   - Thinking indicator shows phases ("Understanding your question..." → "Generating response...")
   - Tokens stream in real-time
   - Message completes and thinking indicator disappears
   - Sidebar updates with new conversation
6. Click "New chat" → verify new conversation starts
7. Switch between conversations → verify messages load correctly
8. Delete a conversation → verify it disappears

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete chat backend with streaming, persistence, and frontend integration"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | Tasks 1-6 | SQLite database layer (8 tables, seed data) |
| 2 | Tasks 7-10 | Modular LLM service (types, protocol, Claude adapter, factory) |
| 3 | Tasks 11-12 | System prompt loader with client context injection |
| 4 | Task 13 | Chat service (orchestration layer) |
| 5 | Tasks 14-16 | SSE endpoint + conversation/client REST routes |
| 6 | Tasks 17-20 | Frontend hooks, thinking animations, page wiring |

Each phase is independent and testable. Phases 1, 2, and 3 can be built in parallel. Phase 4 depends on all three. Phase 5 depends on 4. Phase 6 depends on 5.
