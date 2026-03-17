# Chat & API: Bottlenecks and Improvements

Staff-engineer-style review of the chat flow, API, and related paths. Items are ordered by impact.

---

## 1. **Precompute blocks time-to-first-byte (TTFB)**

**Where:** `apps/api/app/services/chat.py` — before the async generator yields anything, we run a full `compute_tax_position` when client has tax profile + income sources.

**Impact:** User waits for precompute (often 1–3s) before any SSE event. Stream feels slow to start.

**Options:**
- Run precompute in parallel with the first LLM round and merge dashboard when ready; or
- Yield a “computing_tax” status immediately, then do precompute, then yield tool_result + dashboard_update; or
- Make precompute optional (e.g. only when UI explicitly requests a “refresh” card).

**Current choice:** Precompute is intentional so the UI always has deterministic tax cards even if the model skips the tool. Acceptable tradeoff; consider moving to “status first, then precompute” if TTFB becomes a complaint.

---

## 2. **Client disconnect does not cancel server work**

**Where:** `apps/api/app/routers/chat.py` — `StreamingResponse(event_generator(), ...)`. FastAPI/Starlette do not automatically cancel the async generator when the client closes the connection.

**Impact:** User hits “Stop” or navigates away; the backend keeps running (LLM call, tool calls, DB writes). Wastes tokens, DB load, and cost.

**Options:**
- Inject `Request` and poll `await request.is_disconnected()` inside the generator (platform-dependent; not all ASGI servers support it).
- Use a shared cancellation token (e.g. from request state) and pass it into `stream_message` / provider so long-running steps check it.
- At minimum: document that stream cancellation is “best effort” and that backend may complete the turn.

**Recommendation:** Add a short comment in the router that client disconnect does not guarantee generator cancellation; consider `request.is_disconnected()` if your deployment supports it.

---

## 3. **SSE parsing robustness (fixed)**

**Where:** `apps/web/src/hooks/useChat.ts` — parsing each `data:` line with `JSON.parse`.

**Risk:** Malformed or chunked payloads could throw and break the whole stream loop.

**Change made:** Wrapped `JSON.parse` in try/catch; skip invalid lines and continue. Guard for non-object `data` added.

---

## 4. **History load: computationData restored (fixed)**

**Where:** `apps/web/src/hooks/useChat.ts` — `loadMessages()`.

**Issue:** Messages loaded from API had `dashboard_data` but no `computationData` on assistant messages, so inline tax cards did not show when reopening a conversation.

**Change made:** When mapping API messages, assistant messages with `dashboard_data` now get `computationData: { taxPosition, dashboardData }` so the same UI as live streaming is used.

---

## 5. **Conversation history size and context length**

**Where:** `apps/api/app/services/chat.py` — `_load_history(conversation_id)` loads last **50 messages**; sent to the LLM as full content.

**Impact:** Long conversations grow context (tokens). No truncation or summarization; 50 messages of mixed length can approach or exceed context limits for some models, and increases latency/cost.

**Options:**
- Reduce limit (e.g. 20–30) and/or truncate by total token count.
- Summarize older turns and send summary + last N messages.
- Let the model/config define max context and enforce a token budget for history.

**Recommendation:** Monitor token usage and latency; add a configurable `chat_history_message_limit` and consider a token-based cap later.

---

## 6. **Persist effect and streaming**

**Where:** `apps/web/src/hooks/useChat.ts` — auto-persist effect skips when `isStreaming` is true, then writes after 300 ms debounce.

**Risk:** If stream ends and state is updated many times in quick succession (e.g. final token flush + status + done), the effect can run multiple times. Acceptable; 300 ms debounce limits write frequency.

**Minor:** `restoredRef.current = true` is set in `requestAnimationFrame` so the persist effect does not overwrite with empty state. In theory a very fast tick could run the persist effect before rAF; in practice unlikely. No change needed unless we see rare “empty state after refresh” reports.

---

## 7. **Rate limiting and abuse**

**Where:** `apps/api` — chat stream is rate-limited per user and per IP; message length is capped via `chat_max_message_length`.

**Status:** Reasonable. Ensure production has `chat_max_message_length` set (default 32_000). Redis-backed rate limiting recommended for multi-instance deployments so limits are shared.

---

## 8. **Error path: assistant message not saved**

**Where:** `apps/api/app/services/chat.py` — after the stream loop we save the assistant message and update conversation (message_count += 2, etc.). If an exception occurs after the loop but before commit, the user message is already committed; assistant message and conversation update are not.

**Impact:** Conversation shows the user message but no assistant reply; message_count can be wrong on retry. Rare if the only failure point is DB commit.

**Options:** Wrap save + conversation update in a transaction; or on failure, log and optionally mark conversation for repair. No change made; acceptable for now.

---

## 9. **Token streaming: many React updates**

**Where:** `apps/web/src/hooks/useChat.ts` — we call `flushTokenNow()` on every token event.

**Impact:** Many `setState` updates per second during streaming. React 18 batches when it can, but each token is from an async callback so batching is limited. For long replies this can mean hundreds of updates.

**Options:** Reintroduce light batching (e.g. requestAnimationFrame or small buffer) if profiling shows UI jank; otherwise keep current behavior for perceived smoothness.

---

## 10. **Pagination for list endpoints (chat history implemented)**

**Implemented:** Chat conversation list is now paginated so the app does not load all conversations at once.

- **API:** `GET /api/chat/conversations` accepts `limit` (default 20, max 100) and `offset`, and returns `{ conversations, has_more }`.
- **Frontend:** Chat page loads the first page when the client changes or after streaming; a “Load more” button appends the next page.
- **Messages:** `GET /api/chat/conversations/{id}/messages` accepts `limit` (default 50, max 100) and `offset`, and returns `{ messages, has_more }`. The frontend still loads one page (e.g. 50) when opening a thread; “load older messages” can be added later if needed.

**Other list endpoints that may benefit from pagination (not yet implemented):**

| Endpoint / usage | Notes |
|------------------|--------|
| `GET /api/clients` | Clients list (clients page, chat client picker). Add `limit`/`offset` or cursor if user count grows. |
| `GET /api/households` | Households list. Same as above. |
| `GET /api/clients/{id}/meeting-notes` | Meeting notes for a client. Paginate if notes can be many. |
| `GET /api/context/pending` | Pending context snippets. Usually small; paginate if needed. |
| Nora sessions/meetings (`use-api.ts`) | Session and meeting lists; add pagination if lists grow. |

---

## Summary of code changes in this pass

| Area              | Change |
|-------------------|--------|
| SSE parsing       | Try/catch around `JSON.parse`; skip bad lines and non-object `data`. |
| Load from history | Restore `computationData` (taxPosition + dashboardData) for assistant messages that have `dashboard_data`. |
| Pagination        | Conversation list: API limit/offset + `has_more`; frontend “Load more”. Messages endpoint: limit/offset + `has_more` exposed. |
| Docs              | This file: bottlenecks, client-disconnect behavior, pagination, and optional next steps. |

No backend logic changes beyond the two frontend fixes above. Recommended follow-ups: optional client-disconnect handling in the stream endpoint, and a configurable history message/context limit.
