# Helio Web Extension — Design Document

**Date:** 2026-02-17
**Status:** Approved

## Goal

Build a Chrome extension that lets financial advisers capture web page content (HMRC guidance, financial articles, tax references) and feed it as context into the Helio chat — so the AI assistant can reason about external information alongside the client's tax data.

## Architecture

The extension is a **capture tool only** — no chat UI, no LLM calls, no client awareness. It extracts page content, sends it to the Helio API for LLM-powered markdown cleanup, and the cleaned context surfaces in the Helio web app as an attachable "context pill" above the chat input.

**Three components:**
1. **Chrome Extension (MV3)** — captures page content, POSTs to API
2. **API Backend** — receives raw content, cleans via Claude Haiku, stores as `ContextSnippet`
3. **Web App** — polls for pending snippets, shows context pills, includes context in chat messages

## Stack

- Extension: React + TypeScript + Vite + Tailwind (existing scaffold at `helio/apps/extension/`)
- Backend: FastAPI + SQLAlchemy + Claude Haiku (existing stack)
- Frontend: Next.js + Framer Motion + Tailwind (existing stack)

---

## 1. Chrome Extension

### Popup UI
- Small panel (~320px wide) with Helio branding
- Two buttons: "Capture Page" (full page) and "Capture Selection" (grayed out when nothing highlighted)
- After capture: spinner → success confirmation with "Open Helio" link
- Status indicator: green dot when Helio web app tab is detected open

### Content Script
- Extracts text from the page DOM with **aggressive programmatic cleanup** before sending to the API:
  - Full page:
    1. Clone `document.body` (non-destructive)
    2. Strip structural junk: `<script>`, `<style>`, `<nav>`, `<footer>`, `<header>`, `<aside>`, `<iframe>`, `<noscript>`, `<svg>`
    3. Strip common noise by selector: cookie/consent banners (`[class*="cookie"]`, `[class*="consent"]`, `[id*="gdpr"]`), ad containers (`[class*="advert"]`, `[class*="ad-"]`, `[class*="sponsor"]`), social widgets (`[class*="share"]`, `[class*="social"]`), skip-nav links (`[class*="skip"]`)
    4. Strip hidden elements: `[aria-hidden="true"]`, `[role="complementary"]`, `[hidden]`, `[style*="display:none"]`, `[style*="display: none"]`
    5. Read `clone.innerText`
    6. Collapse runs of 3+ newlines to 2, trim whitespace-only lines
  - Selection: `window.getSelection().toString()` (no cleanup needed)
- Grabs page URL (`window.location.href`) and title (`document.title`) as metadata
- Sends payload to background service worker via `chrome.runtime.sendMessage`

### Background Service Worker
- Receives captured content from content script
- POSTs to `POST /api/context/ingest`
- On success: notifies Helio web app tab (if open) via `chrome.tabs.sendMessage` that new context is available
- On failure: sends error back to popup for display

---

## 2. API Backend

### New Endpoint: `POST /api/context/ingest`

**Request:**
```json
{
  "raw_content": "The extracted text from the page...",
  "source_url": "https://www.gov.uk/income-tax-rates",
  "source_title": "Income Tax rates and Personal Allowances - GOV.UK",
  "capture_type": "full_page" | "selection"
}
```

**Processing:**
1. Truncate `raw_content` to 50,000 characters if larger
2. **Server-side programmatic cleanup** (before LLM, reduces token cost):
   - Strip residual URL-only lines (lines that are just `http://...` or `https://...`)
   - Collapse 3+ consecutive newlines to 2
   - Remove repeated separator patterns (`---`, `===`, `***` lines)
   - Strip common boilerplate phrases ("Accept all cookies", "Skip to main content", "Subscribe to newsletter", "Cookie policy", "Privacy policy", "Terms of use")
   - Trim trailing whitespace per line
3. Call Claude Haiku with prompt: "Convert this raw web page text into clean, structured markdown. Preserve all substantive content, tables, lists, and data. Keep it concise. Do NOT add commentary."
4. Store result as `ContextSnippet` with `status="ready"`
5. On LLM failure: use the regex-cleaned content from step 2, store with `status="ready"` (degraded but usable)

**Response:**
```json
{
  "id": "snippet-uuid",
  "title": "Income Tax rates - GOV.UK",
  "markdown_preview": "## Income Tax rates and Personal Allow...",
  "status": "ready",
  "created_at": "2026-02-17T14:30:00Z"
}
```

### New Endpoint: `GET /api/context/pending`

Returns unconsumed context snippets for the current user (ordered by `created_at` DESC).

**Response:**
```json
{
  "snippets": [
    {
      "id": "snippet-uuid",
      "source_url": "https://...",
      "source_title": "Income Tax rates - GOV.UK",
      "capture_type": "full_page",
      "markdown_preview": "## Income Tax rates...",
      "created_at": "2026-02-17T14:30:00Z"
    }
  ]
}
```

### New DB Model: `ContextSnippet`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | str | FK → User |
| source_url | str | Page URL |
| source_title | str | Page title |
| raw_content | Text | Original extracted text |
| cleaned_markdown | Text | LLM-cleaned markdown |
| capture_type | str | "full_page" or "selection" |
| status | str | "processing", "ready", "failed" |
| is_consumed | bool | false → true after used in a message |
| created_at | datetime | |

### Chat Integration

**Changes to `POST /api/chat/stream` body:**
```json
{
  "conversation_id": "...",
  "client_id": "...",
  "message": "...",
  "tax_plan_mode": false,
  "context_snippet_ids": ["snippet-uuid-1"]
}
```

**Changes to `ChatService.stream_message()`:**
- If `context_snippet_ids` provided, load those `ContextSnippet` rows
- Append their `cleaned_markdown` to the system prompt under `## External Web Context`
- Format: source title, URL, then the markdown content
- Mark snippets as `is_consumed = true`

---

## 3. Web App UI

### Context Pills

When the web app detects pending context snippets (polled every 5 seconds from `GET /api/context/pending`), it renders compact "context pills" above the input textarea:

```
┌──────────────────────────────────────────────────┐
│ 📎 Income Tax rates - GOV.UK              ✕      │
│    Full page · just now                          │
├──────────────────────────────────────────────────┤
│ Ask Helio about this context...            Send  │
└──────────────────────────────────────────────────┘
```

- Pill shows source title, capture type, relative time
- Clicking the pill expands to show a preview of the cleaned markdown
- ✕ button dismisses (marks consumed without using)
- Multiple pills can stack
- When user sends a message, pending snippet IDs are included in the POST body
- Use frontend-design skill for the UI implementation

---

## 4. Error Handling

| Scenario | Handling |
|----------|----------|
| API unreachable | Extension popup: "Can't reach Helio" + retry button |
| Claude cleanup fails | Fall back to regex-cleaned raw content |
| Very large page (>50k chars) | Truncate + warn in extension popup |
| Helio tab not open | Extension shows "Open Helio" button. Context stored in DB regardless. |

---

## 5. Out of Scope (YAGNI)

- Context history/library UI
- Editing captured content before sending
- Multi-page document stitching
- Authentication (continues using hardcoded demo-user)
- Firefox/Safari support
- Right-click context menu
