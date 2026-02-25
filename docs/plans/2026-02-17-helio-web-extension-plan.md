# Helio Web Extension Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Chrome extension that captures web page content, sends it to the Helio API for LLM-powered markdown cleanup, and surfaces the cleaned context in the Helio chat UI as attachable "context pills".

**Architecture:** Extension captures raw text → API cleans via Claude Haiku → stores as `ContextSnippet` → web app polls for pending snippets → shows context pills above chat input → includes context in system prompt when user sends a message.

**Tech Stack:** Chrome MV3 extension (React, Vite, CRXJS, Tailwind), FastAPI backend (Python 3.12+, SQLAlchemy, Anthropic SDK), Next.js frontend (React, Framer Motion, Tailwind).

**Design doc:** `docs/plans/2026-02-17-helio-web-extension-design.md`

---

## Context

The Helio system has three apps in a monorepo:
- `helio/apps/api/` — FastAPI backend with SQLAlchemy models, Claude LLM streaming, tax engine tools
- `helio/apps/web/` — Next.js chat UI with dashboard panel
- `helio/apps/extension/` — Chrome MV3 skeleton (popup + background worker + content script, all empty)

The extension scaffold already exists with `@crxjs/vite-plugin`, React, Tailwind, and Chrome types configured. The popup renders a placeholder `<h1>Helio</h1>`.

All API endpoints use hardcoded `user_id = "demo-user"`. CORS allows `localhost:3000-3003`.

---

## Task 1: Backend — ContextSnippet DB Model

**Files:**
- Modify: `helio/apps/api/app/db/models.py`

### Step 1: Add the ContextSnippet model

Add this model after the existing `Document` model in `models.py`:

```python
class ContextSnippet(Base):
    """Web page content captured by the browser extension."""

    __tablename__ = "context_snippets"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=False)
    source_url: Mapped[str] = mapped_column(String, nullable=False)
    source_title: Mapped[str] = mapped_column(String, nullable=False, default="")
    raw_content: Mapped[str] = mapped_column(Text, nullable=False)
    cleaned_markdown: Mapped[str] = mapped_column(Text, nullable=False, default="")
    capture_type: Mapped[str] = mapped_column(String, nullable=False, default="full_page")
    status: Mapped[str] = mapped_column(String, nullable=False, default="processing")
    is_consumed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
```

Make sure to import `Boolean` from `sqlalchemy` if not already imported (check the existing imports at the top of the file — `Boolean` may already be there alongside `String`, `Text`, `Integer`, `Float`, `DateTime`, `ForeignKey`).

### Step 2: Verify the model loads

```bash
cd helio/apps/api
source .venv/bin/activate
python -c "
from app.db.models import ContextSnippet
print(f'Table: {ContextSnippet.__tablename__}')
print(f'Columns: {[c.name for c in ContextSnippet.__table__.columns]}')
print('ContextSnippet model OK')
"
```

Expected: prints table name and column list without errors.

### Step 3: Verify existing tests still pass

```bash
cd helio/apps/api && source .venv/bin/activate && python -m pytest tests/ -v --tb=short
```

Expected: all 50 tests pass (health + tax tests).

### Step 4: Commit

```
feat(db): add ContextSnippet model for web extension captures
```

---

## Task 2: Backend — Context Ingest Endpoint

**Files:**
- Create: `helio/apps/api/app/routers/context.py`
- Modify: `helio/apps/api/app/main.py` (register router)
- Modify: `helio/apps/api/app/config.py` (add extension origin to CORS)

### Step 1: Create the context router

Create `helio/apps/api/app/routers/context.py`:

```python
"""Context ingestion — browser extension sends captured web pages here."""

import uuid

import anthropic
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from structlog.stdlib import BoundLogger

from app.config import get_settings
from app.core.logging import get_logger
from app.db.engine import get_db_session
from app.db.models import ContextSnippet
from app.dependencies import get_request_logger

logger = get_logger(__name__)
router = APIRouter(tags=["context"])

MAX_RAW_CONTENT_LENGTH = 50_000

# Boilerplate phrases to strip (case-insensitive, matched as whole lines)
BOILERPLATE_PHRASES = [
    "accept all cookies", "accept cookies", "reject all", "reject cookies",
    "skip to main content", "skip to content", "skip navigation",
    "subscribe to newsletter", "subscribe to our newsletter",
    "cookie policy", "privacy policy", "terms of use", "terms of service",
    "terms and conditions", "manage cookie preferences", "cookie settings",
    "we use cookies", "this site uses cookies",
]

CLEANUP_PROMPT = (
    "Convert this raw web page text into clean, structured markdown. "
    "Preserve all substantive content, tables, lists, and data. "
    "Keep it concise. Do NOT add commentary — just the cleaned content."
)


class IngestRequest(BaseModel):
    raw_content: str
    source_url: str
    source_title: str = ""
    capture_type: str = "full_page"


@router.post("/context/ingest")
async def ingest_context(
    body: IngestRequest,
    session: AsyncSession = Depends(get_db_session),
    log: BoundLogger = Depends(get_request_logger),
):
    """Receive raw web page content, clean it with an LLM, and store it."""
    user_id = "demo-user"
    snippet_id = str(uuid.uuid4())

    raw = body.raw_content[:MAX_RAW_CONTENT_LENGTH]

    log.info(
        "Context ingest received",
        snippet_id=snippet_id,
        source_url=body.source_url,
        capture_type=body.capture_type,
        raw_length=len(raw),
    )

    # Step 1: Programmatic cleanup (reduces noise before LLM, saves tokens)
    pre_cleaned = _programmatic_cleanup(raw)
    log.info("Pre-cleaned content", raw_length=len(raw), cleaned_length=len(pre_cleaned))

    # Step 2: LLM cleanup for semantic structuring
    cleaned = await _clean_with_llm(pre_cleaned)

    snippet = ContextSnippet(
        id=snippet_id,
        user_id=user_id,
        source_url=body.source_url,
        source_title=body.source_title or body.source_url,
        raw_content=raw,
        cleaned_markdown=cleaned,
        capture_type=body.capture_type,
        status="ready",
        is_consumed=False,
    )
    session.add(snippet)
    await session.commit()

    log.info("Context snippet stored", snippet_id=snippet_id, cleaned_length=len(cleaned))

    return {
        "id": snippet_id,
        "title": snippet.source_title,
        "markdown_preview": cleaned[:200],
        "status": "ready",
        "created_at": snippet.created_at.isoformat() if snippet.created_at else None,
    }


def _programmatic_cleanup(raw: str) -> str:
    """Server-side programmatic cleanup before LLM processing.

    Strips obvious noise that doesn't need an LLM to identify:
    URL-only lines, boilerplate phrases, repeated separators, excessive whitespace.
    """
    import re

    lines = raw.splitlines()
    cleaned_lines: list[str] = []

    for line in lines:
        stripped = line.strip()

        # Skip empty lines (we'll normalize later)
        if not stripped:
            cleaned_lines.append("")
            continue

        # Skip URL-only lines
        if re.match(r"^https?://\S+$", stripped):
            continue

        # Skip separator-only lines (---, ===, ***, etc.)
        if re.match(r"^[-=*_]{3,}$", stripped):
            continue

        # Skip boilerplate phrases (case-insensitive exact match)
        if stripped.lower() in BOILERPLATE_PHRASES:
            continue

        cleaned_lines.append(line.rstrip())

    result = "\n".join(cleaned_lines)

    # Collapse 3+ consecutive newlines → 2
    result = re.sub(r"\n{3,}", "\n\n", result)

    return result.strip()


async def _clean_with_llm(raw_content: str) -> str:
    """Use Claude Haiku to convert raw text to clean markdown."""
    settings = get_settings()
    if not settings.anthropic_api_key:
        logger.warning("No Anthropic API key — returning raw content as-is")
        return raw_content

    try:
        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        response = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
            messages=[{"role": "user", "content": f"{CLEANUP_PROMPT}\n\n---\n\n{raw_content}"}],
        )
        return response.content[0].text
    except Exception as e:
        logger.exception("LLM cleanup failed, returning pre-cleaned content", error=str(e))
        return raw_content  # Falls back to _programmatic_cleanup output (already cleaner than raw)
```

### Step 2: Create the pending snippets endpoint

Add this to the same file (`context.py`), below the `ingest_context` function:

```python
from sqlalchemy import select


@router.get("/context/pending")
async def get_pending_context(
    session: AsyncSession = Depends(get_db_session),
    log: BoundLogger = Depends(get_request_logger),
):
    """Return unconsumed context snippets for the current user."""
    user_id = "demo-user"

    result = await session.execute(
        select(ContextSnippet)
        .where(ContextSnippet.user_id == user_id)
        .where(ContextSnippet.is_consumed == False)  # noqa: E712
        .where(ContextSnippet.status == "ready")
        .order_by(ContextSnippet.created_at.desc())
    )
    snippets = list(result.scalars().all())

    log.debug("Pending context fetched", count=len(snippets))

    return {
        "snippets": [
            {
                "id": s.id,
                "source_url": s.source_url,
                "source_title": s.source_title,
                "capture_type": s.capture_type,
                "markdown_preview": s.cleaned_markdown[:200],
                "created_at": s.created_at.isoformat() if s.created_at else None,
            }
            for s in snippets
        ]
    }


@router.delete("/context/{snippet_id}")
async def dismiss_context(
    snippet_id: str,
    session: AsyncSession = Depends(get_db_session),
    log: BoundLogger = Depends(get_request_logger),
):
    """Dismiss a context snippet without using it (mark as consumed)."""
    from sqlalchemy import update

    await session.execute(
        update(ContextSnippet)
        .where(ContextSnippet.id == snippet_id)
        .values(is_consumed=True)
    )
    await session.commit()
    log.info("Context snippet dismissed", snippet_id=snippet_id)
    return {"ok": True}
```

### Step 3: Register the router in main.py

In `helio/apps/api/app/main.py`, add the import and router registration:

```python
from app.routers import chat, clients, context, documents, health
```

And add after the documents router:

```python
app.include_router(context.router, prefix="/api")
```

### Step 4: Add Chrome extension origin to CORS

In `helio/apps/api/app/config.py`, update the `cors_origins` default to include a wildcard pattern for the extension. Since Chrome extensions use `chrome-extension://` URLs, add this:

```python
cors_origins: list[str] = [
    "http://localhost:3000", "http://localhost:8000",
    "http://localhost:3001", "http://localhost:3002", "http://localhost:3003",
    "chrome-extension://*",
]
```

**Note:** FastAPI CORS middleware does not support wildcards within origins. The actual fix is simpler — the Chrome extension's background service worker can bypass CORS by adding `host_permissions` in the manifest (Task 5). So instead, just leave CORS as-is. The extension will use `host_permissions` to bypass it.

**Skip the CORS change.** We handle it in the manifest instead (Task 5).

### Step 5: Delete old DB and verify server starts

```bash
cd helio/apps/api
rm -f helio.db
source .venv/bin/activate
python -c "
import asyncio
from app.db.engine import init_db, engine
from app.db.models import Base, ContextSnippet

async def check():
    await init_db()
    async with engine.begin() as conn:
        tables = await conn.run_sync(lambda sync_conn: sync_conn.dialect.get_table_names(sync_conn))
    assert 'context_snippets' in tables, f'Missing context_snippets table. Found: {tables}'
    print(f'Tables: {tables}')
    print('context_snippets table created OK')

asyncio.run(check())
"
```

Expected: prints table list including `context_snippets`.

### Step 6: Run all tests

```bash
cd helio/apps/api && source .venv/bin/activate && python -m pytest tests/ -v --tb=short
```

Expected: all 50 tests pass.

### Step 7: Commit

```
feat(api): add context ingest and pending endpoints for web extension
```

**STOP — Review with user before proceeding to Task 3.**

---

## Task 3: Backend — Chat Integration with Context Snippets

**Files:**
- Modify: `helio/apps/api/app/routers/chat.py`
- Modify: `helio/apps/api/app/services/chat.py`
- Modify: `helio/apps/api/app/services/system_prompt.py`

### Step 1: Add `context_snippet_ids` to the chat stream request

In `helio/apps/api/app/routers/chat.py`, update the `ChatStreamRequest` model:

```python
class ChatStreamRequest(BaseModel):
    conversation_id: str | None = None
    client_id: str
    message: str
    tax_plan_mode: bool = False
    context_snippet_ids: list[str] | None = None
```

And pass it through to the service in the `chat_stream` endpoint:

```python
async for event in service.stream_message(
    conversation_id=body.conversation_id,
    user_id=user_id,
    client_id=body.client_id,
    content=body.message,
    tax_plan_mode=body.tax_plan_mode,
    context_snippet_ids=body.context_snippet_ids,
):
```

### Step 2: Load and inject context snippets in ChatService

In `helio/apps/api/app/services/chat.py`, update the `stream_message` method signature:

```python
async def stream_message(
    self,
    conversation_id: str | None,
    user_id: str,
    client_id: str,
    content: str,
    tax_plan_mode: bool = False,
    context_snippet_ids: list[str] | None = None,
) -> AsyncGenerator[StreamEvent, None]:
```

After building the system prompt (step 5 in the existing flow), add context snippet loading:

```python
# 5b. Load and inject context snippets if provided
external_context = ""
if context_snippet_ids:
    external_context = await self._load_and_consume_snippets(context_snippet_ids)

if external_context:
    system_prompt += external_context
```

Add the helper method to the class:

```python
async def _load_and_consume_snippets(self, snippet_ids: list[str]) -> str:
    """Load context snippets, mark as consumed, return formatted context."""
    from app.db.models import ContextSnippet

    result = await self.session.execute(
        select(ContextSnippet)
        .where(ContextSnippet.id.in_(snippet_ids))
        .where(ContextSnippet.is_consumed == False)  # noqa: E712
    )
    snippets = list(result.scalars().all())

    if not snippets:
        return ""

    # Mark as consumed
    for s in snippets:
        s.is_consumed = True
    await self.session.commit()

    # Format for the system prompt
    lines = ["\n\n## External Web Context\n"]
    lines.append("The adviser has captured the following web page(s) for reference:\n")
    for s in snippets:
        lines.append(f"### {s.source_title}")
        lines.append(f"**Source:** {s.source_url}")
        lines.append(f"**Captured:** {s.capture_type.replace('_', ' ')}\n")
        lines.append(s.cleaned_markdown)
        lines.append("")

    logger.info("Context snippets injected", count=len(snippets), ids=snippet_ids)
    return "\n".join(lines)
```

### Step 3: Verify existing tests still pass

```bash
cd helio/apps/api && source .venv/bin/activate && python -m pytest tests/ -v --tb=short
```

Expected: all 50 tests pass (the new parameter is optional, so nothing breaks).

### Step 4: Commit

```
feat(chat): integrate context snippets into chat system prompt
```

**STOP — Review with user before proceeding to Task 4.**

---

## Task 4: Extension — Content Script (Page Capture)

**Files:**
- Modify: `helio/apps/extension/src/content/index.ts`

### Step 1: Implement the content script

Replace the content of `helio/apps/extension/src/content/index.ts`:

```typescript
/**
 * Helio content script — extracts page content on demand.
 * Listens for messages from the popup/background and responds
 * with the page text (full page or selection).
 *
 * Performs aggressive client-side cleanup to strip noise before
 * sending to the API, reducing payload size and LLM token cost.
 */

// Structural elements to remove entirely
const STRIP_TAGS = ["script", "style", "nav", "footer", "header", "noscript", "svg", "iframe", "aside"];

// Noise selectors — cookie banners, ads, social widgets, hidden elements
const NOISE_SELECTORS = [
  // Cookie / consent / GDPR
  '[class*="cookie"]', '[class*="consent"]', '[id*="cookie"]', '[id*="consent"]',
  '[id*="gdpr"]', '[class*="gdpr"]',
  // Ads
  '[class*="advert"]', '[class*="ad-"]', '[class*="sponsor"]', '[id*="advert"]',
  // Social
  '[class*="share"]', '[class*="social"]',
  // Skip nav
  '[class*="skip"]',
  // Hidden / complementary
  '[aria-hidden="true"]', '[role="complementary"]', '[hidden]',
  '[style*="display:none"]', '[style*="display: none"]',
];

function cleanText(raw: string): string {
  return raw
    .replace(/\n{3,}/g, "\n\n")       // collapse 3+ newlines → 2
    .replace(/^[ \t]+$/gm, "")        // trim whitespace-only lines
    .trim();
}

function extractFullPage(): string {
  // Clone the body so we can strip elements without affecting the live page
  const clone = document.body.cloneNode(true) as HTMLElement;

  // 1. Strip structural junk tags
  for (const tag of STRIP_TAGS) {
    clone.querySelectorAll(tag).forEach((el) => el.remove());
  }

  // 2. Strip noise elements by selector
  for (const sel of NOISE_SELECTORS) {
    try {
      clone.querySelectorAll(sel).forEach((el) => el.remove());
    } catch {
      // Invalid selector on some pages — skip
    }
  }

  // 3. Extract text and clean whitespace
  return cleanText(clone.innerText);
}

function extractSelection(): string | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed) return null;
  return sel.toString().trim() || null;
}

// Listen for capture requests from the popup/background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "CAPTURE_PAGE") {
    const text = extractFullPage();
    sendResponse({
      success: true,
      content: text,
      url: window.location.href,
      title: document.title,
      captureType: "full_page",
    });
  } else if (message.type === "CAPTURE_SELECTION") {
    const text = extractSelection();
    if (text) {
      sendResponse({
        success: true,
        content: text,
        url: window.location.href,
        title: document.title,
        captureType: "selection",
      });
    } else {
      sendResponse({ success: false, error: "No text selected" });
    }
  }
  // Return true for async sendResponse
  return true;
});
```

### Step 2: Verify the extension builds

```bash
cd helio/apps/extension && npm run build
```

If this fails due to missing deps, run `npm install` first. Expected: build succeeds (or at minimum, TypeScript compiles without errors via `npm run type-check`).

### Step 3: Commit

```
feat(ext): implement content script for page/selection capture
```

---

## Task 5: Extension — Background Service Worker

**Files:**
- Modify: `helio/apps/extension/src/background/index.ts`
- Modify: `helio/apps/extension/manifest.json`

### Step 1: Add host_permissions to the manifest

In `manifest.json`, add `host_permissions` so the background worker can POST to the API without CORS issues:

```json
{
  "manifest_version": 3,
  "name": "Helio — Tax Planning Assistant",
  "description": "UK tax planning companion for financial advisers",
  "version": "0.0.1",
  "permissions": ["storage", "activeTab"],
  "host_permissions": [
    "http://localhost:8000/*"
  ],
  "action": {
    "default_popup": "src/popup/index.html",
    "default_title": "Helio"
  },
  "background": {
    "service_worker": "src/background/index.ts",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["src/content/index.ts"],
      "run_at": "document_idle"
    }
  ]
}
```

### Step 2: Implement the background service worker

Replace `helio/apps/extension/src/background/index.ts`:

```typescript
/**
 * Helio background service worker.
 * Receives captured content from content script/popup,
 * sends it to the Helio API for processing,
 * and notifies the Helio web app tab when context is ready.
 */

const API_BASE = "http://localhost:8000";

interface CapturePayload {
  content: string;
  url: string;
  title: string;
  captureType: "full_page" | "selection";
}

interface IngestResponse {
  id: string;
  title: string;
  markdown_preview: string;
  status: string;
  created_at: string | null;
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "SEND_TO_API") {
    const payload = message.payload as CapturePayload;
    sendToApi(payload)
      .then((result) => {
        sendResponse({ success: true, data: result });
        // Notify Helio web app tab if open
        notifyHelioTab();
      })
      .catch((err) => {
        sendResponse({ success: false, error: String(err) });
      });
    return true; // async sendResponse
  }
});

async function sendToApi(payload: CapturePayload): Promise<IngestResponse> {
  const res = await fetch(`${API_BASE}/api/context/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      raw_content: payload.content,
      source_url: payload.url,
      source_title: payload.title,
      capture_type: payload.captureType,
    }),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

async function notifyHelioTab(): Promise<void> {
  try {
    const tabs = await chrome.tabs.query({ url: "http://localhost:3000/*" });
    for (const tab of tabs) {
      if (tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: "CONTEXT_UPDATED" }).catch(() => {
          // Tab might not have a content script listener — that's fine
        });
      }
    }
  } catch {
    // No matching tabs — ignore
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("Helio extension installed");
});
```

### Step 3: Build and verify

```bash
cd helio/apps/extension && npm run build
```

Expected: builds without errors.

### Step 4: Commit

```
feat(ext): implement background worker with API integration
```

---

## Task 6: Extension — Popup UI

> **For Claude:** Use the `frontend-design` skill when implementing this popup UI.

**Files:**
- Modify: `helio/apps/extension/src/popup/App.tsx`

### Step 1: Implement the popup

Replace `helio/apps/extension/src/popup/App.tsx`:

```tsx
import { useState, useEffect } from "react";

type CaptureState = "idle" | "capturing" | "sending" | "success" | "error";

export default function App() {
  const [state, setState] = useState<CaptureState>("idle");
  const [hasSelection, setHasSelection] = useState(false);
  const [error, setError] = useState("");
  const [helioTabOpen, setHelioTabOpen] = useState(false);

  // Check for Helio tab and selection state on mount
  useEffect(() => {
    // Check if Helio web app is open
    chrome.tabs.query({ url: "http://localhost:3000/*" }, (tabs) => {
      setHelioTabOpen(tabs.length > 0);
    });

    // Check if there's a text selection on the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "CHECK_SELECTION" }, (response) => {
          if (chrome.runtime.lastError) return; // content script not loaded
          setHasSelection(!!response?.hasSelection);
        });
      }
    });
  }, []);

  const capture = async (captureType: "CAPTURE_PAGE" | "CAPTURE_SELECTION") => {
    setState("capturing");
    setError("");

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error("No active tab");

      // Ask content script to extract content
      const response = await chrome.tabs.sendMessage(tab.id, { type: captureType });

      if (!response?.success) {
        throw new Error(response?.error || "Capture failed");
      }

      setState("sending");

      // Send to background worker → API
      const apiResponse = await chrome.runtime.sendMessage({
        type: "SEND_TO_API",
        payload: {
          content: response.content,
          url: response.url,
          title: response.title,
          captureType: response.captureType,
        },
      });

      if (!apiResponse?.success) {
        throw new Error(apiResponse?.error || "API request failed");
      }

      setState("success");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const openHelio = () => {
    chrome.tabs.create({ url: "http://localhost:3000/chat" });
  };

  return (
    <div className="w-80 bg-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold">H</span>
            </div>
            <span className="text-sm font-semibold text-slate-800">Helio</span>
          </div>
          {/* Status dot */}
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${helioTabOpen ? "bg-emerald-500" : "bg-slate-300"}`} />
            <span className="text-[10px] text-slate-400">
              {helioTabOpen ? "Connected" : "Not open"}
            </span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-2">
        {state === "idle" && (
          <>
            <button
              onClick={() => capture("CAPTURE_PAGE")}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              Capture Page
            </button>
            <button
              onClick={() => capture("CAPTURE_SELECTION")}
              disabled={!hasSelection}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                hasSelection
                  ? "bg-violet-50 hover:bg-violet-100 text-violet-700"
                  : "bg-slate-50 text-slate-300 cursor-not-allowed"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
              </svg>
              Capture Selection
            </button>
          </>
        )}

        {(state === "capturing" || state === "sending") && (
          <div className="flex items-center gap-2.5 px-3 py-4 text-sm text-slate-500">
            <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            {state === "capturing" ? "Extracting content..." : "Sending to Helio..."}
          </div>
        )}

        {state === "success" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-emerald-50 text-emerald-700 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              Sent to Helio
            </div>
            <button
              onClick={openHelio}
              className="w-full px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
            >
              Open Helio
            </button>
            <button
              onClick={() => setState("idle")}
              className="w-full text-[11px] text-slate-400 hover:text-slate-500 transition-colors"
            >
              Capture another
            </button>
          </div>
        )}

        {state === "error" && (
          <div className="space-y-2">
            <div className="px-3 py-2.5 rounded-lg bg-red-50 text-red-600 text-sm">
              {error || "Something went wrong"}
            </div>
            <button
              onClick={() => setState("idle")}
              className="w-full px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

### Step 2: Add CHECK_SELECTION handler to content script

In `helio/apps/extension/src/content/index.ts`, add this to the `onMessage` listener:

```typescript
// Inside the chrome.runtime.onMessage.addListener callback, add:
else if (message.type === "CHECK_SELECTION") {
  const sel = window.getSelection();
  sendResponse({ hasSelection: !!(sel && !sel.isCollapsed && sel.toString().trim()) });
}
```

### Step 3: Build and verify

```bash
cd helio/apps/extension && npm run build
```

Expected: builds without errors.

### CHECKPOINT: Extension Manual Test

1. Load the extension in Chrome: `chrome://extensions/` → Enable developer mode → Load unpacked → select `helio/apps/extension/dist`
2. Navigate to any web page (e.g. `gov.uk`)
3. Click the Helio extension icon — popup should show with "Capture Page" and "Capture Selection" buttons
4. "Capture Selection" should be grayed out (no text selected)
5. Select some text on the page → reopen popup → "Capture Selection" should be active
6. If the API is running, click "Capture Page" → should show spinner → success

### Step 4: Commit

```
feat(ext): implement popup UI and selection detection
```

**STOP — Review with user before proceeding to Task 7.**

---

## Task 7: Web App — Context Pills UI

> **For Claude:** Use the `frontend-design` skill when building the context pills component.

**Files:**
- Create: `helio/apps/web/src/hooks/useContextSnippets.ts`
- Create: `helio/apps/web/src/components/context-pills.tsx`
- Modify: `helio/apps/web/src/hooks/useChat.ts`
- Modify: `helio/apps/web/src/app/chat/page.tsx`

### Step 1: Create the polling hook

Create `helio/apps/web/src/hooks/useContextSnippets.ts`:

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ContextSnippet {
  id: string;
  source_url: string;
  source_title: string;
  capture_type: string;
  markdown_preview: string;
  created_at: string | null;
}

export function useContextSnippets() {
  const [snippets, setSnippets] = useState<ContextSnippet[]>([]);

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/context/pending`);
      if (!res.ok) return;
      const data = await res.json();
      setSnippets(data.snippets || []);
    } catch {
      // Silently fail — polling
    }
  }, []);

  const dismiss = useCallback(async (snippetId: string) => {
    try {
      await fetch(`${API_BASE}/api/context/${snippetId}`, { method: "DELETE" });
      setSnippets((prev) => prev.filter((s) => s.id !== snippetId));
    } catch {
      // Silently fail
    }
  }, []);

  const consumeAll = useCallback(() => {
    // Returns current IDs and clears local state
    // (backend marks them consumed when the message is sent)
    const ids = snippets.map((s) => s.id);
    setSnippets([]);
    return ids;
  }, [snippets]);

  // Poll every 5 seconds
  useEffect(() => {
    fetchPending();
    const interval = setInterval(fetchPending, 5000);
    return () => clearInterval(interval);
  }, [fetchPending]);

  // Listen for extension notifications via custom event
  useEffect(() => {
    const handler = () => fetchPending();
    window.addEventListener("helio-context-updated", handler);
    return () => window.removeEventListener("helio-context-updated", handler);
  }, [fetchPending]);

  return { snippets, dismiss, consumeAll };
}
```

### Step 2: Create the context pills component

Create `helio/apps/web/src/components/context-pills.tsx`. Use the `frontend-design` skill for this component.

The component should:
- Accept `snippets: ContextSnippet[]`, `onDismiss: (id: string) => void`, `onExpand?: (id: string) => void`
- Render compact pills above the input area with: source title, capture type ("Full page" / "Selection"), relative time, ✕ dismiss button
- Match the existing Helio glass-morphism style (brand colors, Outfit font, subtle borders, backdrop blur)
- Clicking a pill toggles an expanded preview showing the first ~200 chars of the cleaned markdown
- Animate pill appearance/dismissal with framer-motion

```tsx
"use client";

import { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ContextSnippet } from "@/hooks/useContextSnippets";
import { IconFileText } from "@/components/icons";

const ease = [0.16, 1, 0.3, 1] as const;

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const ContextPills = memo(function ContextPills({
  snippets,
  onDismiss,
}: {
  snippets: ContextSnippet[];
  onDismiss: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (snippets.length === 0) return null;

  return (
    <div className="space-y-1.5 mb-2">
      <AnimatePresence mode="popLayout">
        {snippets.map((s) => (
          <motion.div
            key={s.id}
            layout
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.25, ease }}
            className="rounded-xl border border-brand-200/30 dark:border-brand-800/20 bg-brand-50/40 dark:bg-brand-950/20 backdrop-blur-sm overflow-hidden"
          >
            <button
              onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-left group"
            >
              <span className="flex-shrink-0 w-5 h-5 rounded-md bg-brand-500/10 dark:bg-brand-500/15 flex items-center justify-center">
                <IconFileText className="w-3 h-3 text-brand-500 dark:text-brand-400" />
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-medium text-slate-700 dark:text-zinc-300 truncate block">
                  {s.source_title}
                </span>
                <span className="text-[9px] font-light text-slate-400 dark:text-zinc-600">
                  {s.capture_type === "full_page" ? "Full page" : "Selection"} &middot; {relativeTime(s.created_at)}
                </span>
              </div>
              {/* Dismiss button */}
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss(s.id);
                }}
                className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:text-zinc-600 dark:hover:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-800/30 transition-colors"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </span>
            </button>

            {/* Expanded preview */}
            <AnimatePresence>
              {expandedId === s.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease }}
                  className="overflow-hidden"
                >
                  <div className="px-3 pb-2.5 pt-0.5 border-t border-brand-200/20 dark:border-brand-800/10">
                    <p className="text-[10px] font-light text-slate-500 dark:text-zinc-500 leading-relaxed line-clamp-4">
                      {s.markdown_preview}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
});
```

### Step 3: Wire context snippets into the chat page

In `helio/apps/web/src/app/chat/page.tsx`:

**Add imports:**
```typescript
import { useContextSnippets } from "@/hooks/useContextSnippets";
import { ContextPills } from "@/components/context-pills";
```

**Add the hook** inside `ChatPage()`, after the existing `useChat` hook:
```typescript
const { snippets: contextSnippets, dismiss: dismissSnippet, consumeAll: consumeAllSnippets } = useContextSnippets();
```

**Render context pills** above the textarea in the input area. Find the `<textarea>` element and add the pills just before it:
```tsx
{/* Context pills from web extension */}
<ContextPills snippets={contextSnippets} onDismiss={dismissSnippet} />
```

### Step 4: Include snippet IDs when sending a message

In `helio/apps/web/src/hooks/useChat.ts`, update the `sendMessage` function to accept optional snippet IDs:

Update the `sendMessage` callback to accept a second parameter:

```typescript
const sendMessage = useCallback(
  async (content: string, contextSnippetIds?: string[]) => {
```

And include them in the POST body:

```typescript
body: JSON.stringify({
  conversation_id: conversationId,
  client_id: clientId,
  message: content,
  tax_plan_mode: taxPlanMode,
  context_snippet_ids: contextSnippetIds || undefined,
}),
```

Then in `page.tsx`, update the submit handler to consume snippets when sending:

```typescript
// In the handleSubmit or wherever sendMessage is called:
const snippetIds = consumeAllSnippets();
sendMessage(input, snippetIds.length > 0 ? snippetIds : undefined);
```

### Step 5: Build and verify

```bash
cd helio/apps/web && PATH="/opt/homebrew/bin:$PATH" && npx tsc --noEmit -p tsconfig.json
```

Expected: no TypeScript errors.

### CHECKPOINT: Full Integration Test

1. Start the API: `cd helio/apps/api && source .venv/bin/activate && uvicorn app.main:app --reload`
2. Start the web app: `cd helio/apps/web && npm run dev`
3. Load the extension in Chrome
4. Navigate to a web page, click "Capture Page" in extension popup
5. Switch to the Helio chat tab — context pill should appear above the input within 5 seconds
6. Type a message and send — the context should be included in the system prompt (check API logs)
7. Context pill should disappear after sending

### Step 6: Commit

```
feat(web): add context pills UI and extension integration
```

**STOP — Final review with user.**

---

## Verification

### Unit tests
```bash
cd helio/apps/api && source .venv/bin/activate && python -m pytest tests/ -v --tb=short
```

All existing tests must still pass.

### Extension build
```bash
cd helio/apps/extension && npm run build
```

Must produce a `dist/` directory loadable in Chrome.

### Web app build
```bash
cd helio/apps/web && npx next build
```

Must compile and build without errors.

### End-to-end manual test
1. API running, web app running, extension loaded
2. Capture a page → pill appears in chat → send message with context → Claude receives the context in its system prompt
3. Dismiss a pill → it disappears (snippet marked consumed)
4. Capture with selection → works correctly

---

## File Summary

**New files (4):**
- `helio/apps/api/app/routers/context.py` — ingest + pending + dismiss endpoints
- `helio/apps/web/src/hooks/useContextSnippets.ts` — polling hook
- `helio/apps/web/src/components/context-pills.tsx` — UI component

**Modified files (8):**
- `helio/apps/api/app/db/models.py` — add `ContextSnippet` model
- `helio/apps/api/app/main.py` — register context router
- `helio/apps/api/app/routers/chat.py` — add `context_snippet_ids` to request
- `helio/apps/api/app/services/chat.py` — load + inject snippets into system prompt
- `helio/apps/api/app/services/system_prompt.py` — (no changes needed — injection happens in chat.py)
- `helio/apps/extension/manifest.json` — add `host_permissions`
- `helio/apps/extension/src/content/index.ts` — page capture logic
- `helio/apps/extension/src/background/index.ts` — API communication
- `helio/apps/extension/src/popup/App.tsx` — capture UI
- `helio/apps/web/src/hooks/useChat.ts` — accept snippet IDs in sendMessage
- `helio/apps/web/src/app/chat/page.tsx` — wire context pills + consume on send
