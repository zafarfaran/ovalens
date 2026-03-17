# Pagination audit: where to avoid loading everything

Places that currently load unbounded (or large fixed) lists and should get pagination or a safe cap.

**Implemented:** All endpoints below now support pagination (limit/offset or cap) and return `has_more` where applicable. Frontend can add "Load more" using these params when needed.

---

## Already paginated (before this pass)

| Endpoint | Notes |
|----------|--------|
| `GET /api/chat/conversations` | Has `limit` (default 20, max 100), `offset`, and `has_more`. Frontend uses "Load more". |
| `GET /api/chat/conversations/{id}/messages` | Has `limit` (default 50, max 100), `offset`, and `has_more`. |

---

## Implemented (this pass)

### 1. **GET /api/clients**

- **Backend:** `limit` (default 50, max 100), `offset`, `has_more`. Order: `created_at desc`.

---

### 2. **GET /api/households**

- **Backend:** `limit` (default 50, max 100), `offset`, `has_more`. Order: `created_at desc`.

---

### 3. **GET /api/clients/{client_id}** (client detail) + **GET /api/clients/{id}/observations**

- **Detail:** Observations in client detail are capped at 30 (`.limit(30)`).
- **New endpoint:** `GET /api/clients/{client_id}/observations` — `limit` (default 30, max 100), `offset`, `has_more`. Use for "Load more" observations.

---

### 4. **GET /api/clients/{client_id}/meeting-notes**

- **Backend:** `limit` (default 30, max 100), `offset`, `has_more`. Order: `meeting_date desc`.

---

### 5. **GET /api/context/pending**

- **Backend:** `limit` (default 50, max 100), `offset`, `has_more`. Order: `created_at desc`.

---

### 6. **GET /api/chat/conversations/{conversation_id}/messages**

- **Backend:** Already exposes `limit` (default 50, max 100), `offset`, and `has_more`. Frontend can add "Load older" using `offset`.

---

## Fixed limit, no cursor/offset (optional pagination)

| Endpoint | Current behaviour | Recommendation |
|----------|-------------------|----------------|
| `GET /api/clients/{id}/nora/sessions` | `.limit(30)` | Add `offset` or cursor if sessions can exceed 30. |
| `GET /api/clients/{id}/nora/meetings` | `.limit(30)` | Same. |

---

## Internal / stream (cap already present)

- **Chat stream history:** `_load_history(conversation_id)` uses `.limit(50)`. Capped; could later make configurable or token-based.

---

## Summary table

| Location | Endpoint or area | Status |
|----------|-------------------|--------|
| `routers/clients.py` | `GET /clients` | Done — limit (default 50), offset, has_more |
| `routers/clients.py` | `GET /households` | Done — limit (default 50), offset, has_more |
| `routers/clients.py` | `GET /clients/{id}` | Done — observations capped at 30 in detail |
| `routers/clients.py` | `GET /clients/{id}/observations` | Done — new endpoint, limit/offset, has_more |
| `routers/clients.py` | `GET /clients/{id}/meeting-notes` | Done — limit (default 30), offset, has_more |
| `routers/context.py` | `GET /context/pending` | Done — limit (default 50), offset, has_more |
| `routers/chat.py` | `GET /conversations/{id}/messages` | Done — limit (default 50), offset, has_more |
| `routers/nora.py` | Nora sessions/meetings | Optional — add offset if >30 needed |

**Frontend "Load more" (all implemented):**

| List | Location | Behaviour |
|------|----------|-----------|
| Conversations | Chat page sidebar | Button "Load more", append next page |
| Clients | Clients page sidebar | Button "Load more", append next page (limit 50) |
| Households | Clients page sidebar | Button "Load more", append next page (limit 50) |
| Meeting notes | `MeetingNotesTimeline` (clients + chat) | Button "Load more", append (limit 20) |
| Context pending | Chat page context pills | Button "Load more", append (limit 20) |
| Observations | Clients page Intelligence tab | Button "Load more", append (limit 30) |

Conversation messages: API supports `offset`/`has_more`; optional "Load older" in thread not yet added.
