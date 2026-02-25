# Backend Chat + Streaming Architecture Design

> Approved design for wiring the Helio frontend to a FastAPI backend with real-time LLM streaming, conversation persistence, and modular AI service layer.

**Date:** 2026-02-17
**Approach:** Monolithic FastAPI + SSE Streaming (Approach A)
**Decisions:** Anthropic Claude, FastAPI (Python), SQLite, Rich status updates

---

## Architecture Overview

```
Next.js (Frontend) ──HTTP/SSE──▶ FastAPI (Backend)
                                    ├── LLM Service (modular, provider-agnostic)
                                    │     └── Claude Adapter (Anthropic SDK)
                                    ├── Chat Service (conversations, messages)
                                    ├── SQLite (via SQLAlchemy + aiosqlite)
                                    └── Status Emitter (thinking phases → SSE events)
```

---

## Section 1: LLM Service Layer (Modular)

Provider-agnostic interface that any part of the app can reuse.

### File Structure

```
app/services/llm/
├── __init__.py
├── base.py          # Abstract LLMProvider protocol
├── claude.py        # Anthropic Claude adapter
├── types.py         # Shared types: StreamEvent, StatusPhase, etc.
└── factory.py       # get_llm_provider() → reads config, returns adapter
```

### LLMProvider Protocol

```python
class LLMProvider(Protocol):
    async def stream_chat(
        self,
        messages: list[Message],
        system_prompt: str,
        tools: list[Tool] | None = None,
    ) -> AsyncGenerator[StreamEvent, None]: ...
```

### StreamEvent Union

```python
StreamEvent = TokenEvent | StatusEvent | ToolCallEvent | ToolResultEvent | DoneEvent | ErrorEvent
```

- `TokenEvent` — a chunk of text content
- `StatusEvent` — a phase update ("Analysing income sources...")
- `ToolCallEvent` — Claude is calling a tool (e.g. calculateANI)
- `ToolResultEvent` — tool returned a result
- `DoneEvent` — stream complete, includes usage stats
- `ErrorEvent` — something went wrong

### Status Phases

Emitted by the Claude adapter based on tool calls and content patterns:

| Phase | Trigger | User sees |
|-------|---------|-----------|
| `understanding` | Stream starts | "Understanding your question..." |
| `analyzing_income` | References income data | "Analysing income sources..." |
| `checking_allowances` | References allowances | "Checking allowance status..." |
| `calculating` | Tool call (calculateANI, etc.) | "Running tax calculations..." |
| `generating_response` | Text content starts | "Generating response..." |
| `complete` | Stream ends | (hidden, triggers done state) |

### Modularity

To add a new provider:
1. Create `openai.py` implementing `LLMProvider`
2. Register it in `factory.py`
3. Set `AI_MODEL` in config
4. Nothing else changes

---

## Section 2: SSE Streaming Endpoint

### Primary Endpoint

`POST /api/chat/stream` → `text/event-stream`

**Request:**
```json
{
    "conversation_id": "uuid | null",
    "client_id": "uuid",
    "message": "What pension options does Sarah have?"
}
```

**SSE Event Stream:**
```
event: status
data: {"phase": "understanding", "message": "Understanding your question..."}

event: status
data: {"phase": "analyzing_income", "message": "Analysing income sources..."}

event: token
data: {"content": "Based"}

event: token
data: {"content": " on"}

event: status
data: {"phase": "calculating", "message": "Running tax calculations..."}

event: tool_call
data: {"tool": "calculateANI", "status": "running"}

event: tool_result
data: {"tool": "calculateANI", "result": {...}}

event: token
data: {"content": "The adjusted net income is..."}

event: done
data: {"conversation_id": "uuid", "message_id": "uuid", "usage": {"input_tokens": 1200, "output_tokens": 450}}
```

### Flow

1. Frontend sends POST with message
2. Backend loads conversation history from SQLite, loads system prompt, builds message array
3. Passes to `llm_provider.stream_chat()`
4. Iterates the async generator, serializing each `StreamEvent` as an SSE event
5. On completion, persists user message + assistant response to SQLite
6. Uses FastAPI's `StreamingResponse` with `text/event-stream` content type

### REST Endpoints (Conversations)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/chat/conversations?client_id=` | List conversations for a client (sidebar) |
| `GET` | `/api/chat/conversations/{id}/messages` | Load messages for a thread |
| `POST` | `/api/chat/conversations` | Create new conversation (requires `client_id`) |
| `DELETE` | `/api/chat/conversations/{id}` | Delete conversation |
| `PATCH` | `/api/chat/conversations/{id}` | Update title/status |

**Key constraint:** `client_id` is required on conversations — every chat is tied to a client.

---

## Section 3: SQLite Database Layer

### File Structure

```
app/db/
├── __init__.py
├── engine.py        # async SQLite engine (aiosqlite + SQLAlchemy async)
├── models.py        # SQLAlchemy ORM models (8 tables from prototype schema)
└── seed.py          # Seed sample data (Mitchell household)
```

### Tables (from helio_schema_prototype.md)

| # | Table | Purpose |
|---|-------|---------|
| 1 | `users` | Advisers (single-tenant) |
| 2 | `households` | Client groupings |
| 3 | `clients` | Individual taxpayers |
| 4 | `tax_profiles` | Tax data with JSON expansion joints |
| 5 | `documents` | Uploads with inline extraction |
| 6 | `conversations` | Chat threads with cached sidebar fields |
| 7 | `messages` | Individual messages with insights/tool_calls as JSON |
| 8 | `observations` | AI-generated alerts |

### SQLite-Specific Notes

- JSON columns stored as TEXT, parsed on read (SQLAlchemy `JSON` type handles this)
- No RLS — filter by `user_id` in application queries
- UUIDs stored as TEXT
- DECIMAL mapped to REAL (acceptable for MVP)
- Conversation cache updated in application code (not triggers)
- Migration to Postgres: swap engine URL, JSON columns become native JSONB

### Seed Data

Pre-populate on first run:
- One adviser user
- Mitchell household
- Sarah Mitchell client with full tax profile (matching existing frontend mock data)
- Sample conversation with a few messages
- Observations (PA taper, pension headroom, HICBC)

---

## Section 4: Chat Service (Business Logic)

### File Structure

```
app/services/
├── __init__.py
├── chat.py          # ChatService — conversation management + LLM orchestration
├── llm/             # (Section 1)
└── system_prompt.py # Load + template system prompt with client context
```

### ChatService Responsibilities

1. **Create conversation** — insert into `conversations` with required `client_id`
2. **Send message** (main flow):
   - Save user message to `messages`
   - Load conversation history (last 50 messages for context window management)
   - Load client's `tax_profile` (inject as context)
   - Build system prompt: base from `system_prompt.md` + client tax data
   - Call `llm_provider.stream_chat()`, yield events
   - On completion: save assistant message, update conversation cache fields
3. **List conversations** — query by `client_id`, order by `last_message_at DESC`
4. **Get messages** — paginated fetch for a thread
5. **Delete conversation** — soft delete (status → 'deleted')

### system_prompt.py

- Reads `docs/system_prompt.md` once at startup, caches it
- Appends `## Current Client Context` with the client's tax profile summary
- Claude always has full tax context without the frontend resending it

### Context Window Management

- System prompt + client context first
- Last 50 messages of conversation history
- New user message last

---

## Section 5: Frontend Changes

Wire the existing chat UI (mock data) to the live backend.

### Custom `useChat` Hook

- Sends message via `POST /api/chat/stream`
- Reads SSE stream using `fetch` + `ReadableStream` (not `EventSource` — POST not supported by EventSource)
- Accumulates tokens into assistant message in real-time
- Exposes `status` state for thinking animation
- Handles reconnection and error states

### Thinking/Status Animation

Replaces static typing indicator:
- Pulsing dot + phase text ("Analysing income sources...")
- Framer Motion `AnimatePresence` for smooth transitions between phases
- Subtle shimmer/pulse effect while thinking
- Disappears when first token arrives (or stays as a header above streaming text)

### Conversation Sidebar (Live)

- Loads from `GET /api/chat/conversations?client_id=`
- "New chat" → `POST /api/chat/conversations`
- Select thread → `GET /api/chat/conversations/{id}/messages`
- Delete → `DELETE /api/chat/conversations/{id}`
- Filtered by currently selected client

### Streaming Message Rendering

- Assistant messages start empty, grow as tokens arrive
- Smooth scroll-to-bottom on new content
- Markdown rendering for final message

### Client Selector

- Loads clients from `GET /api/clients`
- Selecting a client fetches their conversations + tax profile
- Context ribbon populated from real `tax_profile` data

---

## Section 6: System Prompt Modifications

### Additions to system_prompt.md

1. **Response formatting** — use markdown (headers, bold for figures, bullets for observations) for frontend rendering

2. **Streaming-friendly behavior** — start responding immediately, lead with brief acknowledgment then analysis (avoids long pause → wall of text)

3. **Client context template** — `## Current Client Context` block dynamically injected with tax profile data. Claude references this rather than asking user to repeat it

4. **Conversation continuity** — reference prior messages, don't re-ask answered questions

### What Stays the Same

- Full UK tax system fundamentals
- Analysis workflow (Steps 1-8)
- All guardrails and constraints
- Tax calendar
- Example responses

---

## Implementation Order

Each section is implemented and verified independently before moving to the next:

| Step | Section | Depends On |
|------|---------|-----------|
| 1 | Section 3: SQLite Database Layer | Nothing — foundation |
| 2 | Section 1: LLM Service Layer | Nothing — independent |
| 3 | Section 6: System Prompt Mods | Nothing — independent |
| 4 | Section 4: Chat Service | Sections 1, 3, 6 |
| 5 | Section 2: SSE Streaming Endpoint | Section 4 |
| 6 | Section 5: Frontend Changes | Section 2 |

---

## Migration Path

- **SQLite → Postgres**: Swap engine URL in config, JSON columns become JSONB
- **Claude → OpenAI**: Write `openai.py` adapter, change `AI_MODEL` in config
- **Prototype → Production schema**: Extract JSONB into normalized tables per `helio_schema_prototype.md` migration guide
