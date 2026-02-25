# Helio Chat Interface — Implementation Map

> Reference doc for wiring up the chat frontend. Every section lists what exists today (static UI) and what needs building to make it functional.

---

## Overview

The chat interface lives at `/helio/apps/web/src/app/chat/page.tsx`. Everything currently renders with hardcoded sample data. The API client exists at `src/lib/api/client.ts` (generic GET/POST/PUT/DELETE) but is **never called**. Backend routes at `apps/api/app/routers/` are all placeholders returning stub messages.

### Current State at a Glance

| Layer | Status |
|-------|--------|
| **UI components** | Done — animations, layout, responsive |
| **Local state** | Done — toggles, tabs, input, search all work |
| **API calls** | None — APIClient exists but unused |
| **Backend routes** | Placeholders — `/chat`, `/clients`, `/extract` return stubs |
| **Auth** | Supabase client exists (`src/lib/supabase/`) but not integrated into chat |
| **Real-time** | Not started |

---

## 1. Chat Messaging (Core)

**Files**: `chat/page.tsx` lines 56–83, 282–283, 552–566

### What exists
- `messages` state holds `SAMPLE_MESSAGES` (3 hardcoded messages)
- `ChatMessage` component renders user/assistant bubbles with auto-formatting (pound amounts, percentages, numbered lists, key-value pairs)
- Insight chips render below assistant messages
- Messages auto-scroll on update

### What needs building

| Task | Detail |
|------|--------|
| **Send message to API** | Wire send button + Enter key to `POST /chat` with `{ message, clientId, threadId }`. Handle streaming or polling for the response. |
| **Append response to state** | Push assistant response into `messages` array. Handle loading/typing indicator while waiting. |
| **Streaming support** | If using SSE/streaming from the API, incrementally render assistant text word-by-word (the `ChatMessage` component already handles formatted text). |
| **Message persistence** | Store conversation threads in DB (Supabase). Load on page mount / thread switch. |
| **Insights extraction** | Backend should return structured `insights[]` alongside the message text. Frontend already renders them. |
| **Error handling** | Show error state in chat if API call fails. Retry option. |
| **Loading indicator** | Add a typing/thinking indicator (animated dots) while waiting for assistant response. |

### Backend needed
- `POST /chat` — accept message, return AI response + optional insights
- `GET /chat/threads/{threadId}/messages` — paginated message history
- WebSocket or SSE endpoint for streaming responses

---

## 2. Chat History Sidebar

**Files**: `chat/page.tsx` lines 139–243 (data), 476–526 (panel)

### What exists
- `CHAT_HISTORY` — 8 hardcoded threads grouped by Today/Yesterday/This Week/Earlier
- Search filtering with `useMemo` (works client-side)
- Thread cards show client avatar, title, preview, tag, message count, unread dot
- Delete with confirmation overlay (Yes/No)
- "New chat" button in header
- Active thread indicator

### What needs building

| Task | Detail |
|------|--------|
| **Fetch thread list** | `GET /chat/threads` — return user's conversations sorted by last activity. Replace `CHAT_HISTORY` with API data. |
| **Thread switching** | Clicking a thread should: update active thread state, fetch that thread's messages, update `messages` state, update context ribbon with client's data. |
| **Create new thread** | "New chat" button should open a client picker or create a blank thread. |
| **Delete thread** | "Yes" button in confirmation should call `DELETE /chat/threads/{id}` and remove from local state. |
| **Unread tracking** | Track which threads have new messages since last viewed. |
| **Search (server-side)** | Current client-side filter works for cached threads. For full history, may need `GET /chat/threads?q=search_term`. |
| **Real-time updates** | When a background thread gets a new message, update its preview/time/unread status. |

### Backend needed
- `GET /chat/threads` — list threads with last message preview, client info, counts
- `POST /chat/threads` — create new thread
- `DELETE /chat/threads/{id}` — delete thread
- `PATCH /chat/threads/{id}/read` — mark as read

---

## 3. Client Selector Dropdown

**Files**: `chat/page.tsx` lines 364–446

### What exists
- Hardcoded "Sarah Mitchell" with static stats (Gross: £195,500, Tax: £52,847, Effective: 27.0%)
- Dropdown menu with: View client profile, Tax documents (12), Scenario history (3), Meeting notes, Observation alerts (4)
- Footer: "Switch client" and "Export summary" buttons
- Outside-click-to-close via `useRef` + `useEffect`

### What needs building

| Task | Detail |
|------|--------|
| **Load active client** | Fetch client data on mount from `GET /clients/{id}`. Populate name, initials, NI, DOB, tax stats. |
| **Switch client** | "Switch client" should open a searchable client list. On selection, update all page state (context ribbon, panel stats, messages). |
| **Menu item actions** | Wire each menu item: navigate to client profile page, open documents view, open scenario history, open meeting notes, open observations filtered by client. |
| **Export summary** | Generate PDF or download of client's current tax position + observations. |
| **Badge counts** | Fetch real counts for documents, scenarios, alerts from the API. |

### Backend needed
- `GET /clients` — list all clients (searchable)
- `GET /clients/{id}` — full client profile with tax summary
- `GET /clients/{id}/documents` — count + list
- `GET /clients/{id}/scenarios` — count + list
- `GET /clients/{id}/observations` — count + list

---

## 4. Context Ribbon

**Files**: `chat/page.tsx` lines 532–579

### What exists
- 4 hardcoded `ContextChip` components: Gross £195,500, Tax £52,847, Effective 27.0%, Marginal 40%
- Tax Plan checkbox (toggles `taxPlanMode` state, opens intelligence panel)
- "Updated just now" timestamp

### What needs building

| Task | Detail |
|------|--------|
| **Dynamic values** | Populate chips from active client's `TaxCalculation` data. Should update when client switches or when a new scenario is modelled. |
| **Tax Plan mode** | When enabled, send a flag with chat messages so the backend knows to generate dashboards/visualisations alongside text. |
| **Live timestamp** | Show actual last-updated time from the API response. |
| **Scenario comparison** | Consider showing delta (arrow up/down + amount) when a scenario changes the values vs. baseline. |

### Backend needed
- `GET /clients/{id}/tax-summary` — current gross, tax, effective rate, marginal rate
- Tax calculation engine already exists in `apps/api/app/tax/`

---

## 5. Intelligence Panel (Right Side)

**Files**: `chat/page.tsx` lines 759–837

### What exists
- 3 tabs: Overview, Allowances, Observations
- **Overview (TaxBreakdown)**: Hardcoded bar chart + breakdown rows (Income Tax, NI, Dividend Tax, HICBC) totalling £52,847
- **Allowances**: 5 hardcoded allowance progress bars (Personal Allowance, Pension AA, ISA, Dividend, CGT)
- **Observations**: 4 hardcoded severity-coded observations
- Mini stat cards: 4 hardcoded values
- "Export" button (no handler)

### What needs building

| Task | Detail |
|------|--------|
| **Fetch tax breakdown** | Call `GET /clients/{id}/tax-breakdown` to get categorised tax amounts. Populate TaxBreakdown component. |
| **Fetch allowances** | Call `GET /clients/{id}/allowances` to get used/total for each allowance. Populate AllowancesPanel. |
| **Fetch observations** | Call `GET /clients/{id}/observations` to get severity-coded alerts. Populate ObservationsPanel. |
| **Live updates** | When chat produces new insights (e.g. "pension sacrifice saves £16,800"), update the panel in real-time without full page refresh. |
| **Export** | Wire export button to generate PDF/CSV of current panel data. |
| **Scenario overlay** | In Tax Plan mode, show side-by-side comparison (current vs. proposed) in the panel. |

### Backend needed
- `GET /clients/{id}/tax-breakdown` — categorised tax liability
- `GET /clients/{id}/allowances` — allowance usage
- `GET /clients/{id}/observations` — AI-generated observations
- All three rely on the tax engine in `apps/api/app/tax/`

---

## 6. Chat Input & Voice

**Files**: `chat/page.tsx` lines 599–755

### What exists
- Auto-resizing textarea with gradient border on focus
- Send button (activates visually when input is non-empty, no API call)
- Quick prompts (4 buttons, set input text on click)
- Voice button toggles `isListening` state
- 32-bar CSS waveform animation when listening
- 5-bar ambient waveform placeholder when idle
- Mic pulse ring animation

### What needs building

| Task | Detail |
|------|--------|
| **Send handler** | On send button click / Enter: call chat API, clear input, show typing indicator, append response. |
| **Voice recording** | Use Web Speech API (`SpeechRecognition`) or a service like Whisper to capture audio and transcribe. Set transcribed text as input. |
| **Voice → send** | Option to auto-send after transcription completes, or let user review first. |
| **Quick prompts** | Currently just fill the input. Consider auto-sending on click for faster workflow. |
| **File/document upload** | Add a paperclip/upload button to attach documents for the AI to analyse. |
| **Multi-line support** | Shift+Enter already works for new lines. Ensure API handles multi-line messages. |

### Backend needed
- `POST /chat` — the core chat endpoint
- `POST /extract` — for document upload + AI extraction (route exists as stub)
- Consider WebSocket for real-time transcription streaming

---

## 7. Settings Page

**Files**: `settings/page.tsx`

### What exists
All 6 sections are built with hardcoded data:

| Section | Static Data | Needs Wiring |
|---------|-------------|--------------|
| **Account** | James Thornton, firm details, 3 preference toggles | `GET/PUT /users/me`, `GET/PUT /firms/{id}`, `PUT /users/me/preferences` |
| **Integrations** | 6 services (3 connected, 3 available) with brand logos | `GET /integrations`, `POST /integrations/{id}/connect`, `DELETE /integrations/{id}` |
| **Meeting Notes** | 4 transcription toggles, 4 templates, storage bar | `GET/PUT /settings/meetings`, `GET /meetings/templates`, `GET /storage/usage` |
| **Notifications** | 7 notification toggles, quiet hours | `GET/PUT /settings/notifications` |
| **Security & API** | 2FA/SSO toggles, 2 API keys, compliance info | `GET /api-keys`, `POST /api-keys`, `DELETE /api-keys/{id}`, `PUT /settings/security` |
| **Billing** | Pro plan card, Visa payment, 3 usage bars, 3 invoices | `GET /billing/subscription`, `GET /billing/usage`, `GET /billing/invoices` |

### Key tasks
- **Save button**: Wire to PATCH/PUT endpoints for each section
- **Toggle persistence**: Each `ToggleRow` has local state — needs to sync with backend
- **Integration connect/disconnect**: OAuth flows for Salesforce, Xero, etc.
- **API key management**: Generate, revoke, copy-to-clipboard
- **Billing**: Stripe integration for payment method updates and plan changes

---

## 8. Shared Infrastructure Needed

These cut across all features:

| Concern | Detail |
|---------|--------|
| **Auth context** | Supabase client exists at `src/lib/supabase/`. Need an auth provider wrapping the app, session management, protected routes. |
| **API client integration** | `src/lib/api/client.ts` is ready. Need to instantiate it with the base URL (`NEXT_PUBLIC_API_URL`) and Supabase token getter. |
| **Global state** | Active client, user profile, and preferences need to be accessible across pages. Consider React Context or Zustand. |
| **Error boundaries** | Wrap main content areas with error boundaries for graceful failure. |
| **Loading states** | Skeleton loaders for panels, messages, history. The animations are there — just need conditional rendering on data fetch status. |
| **Optimistic updates** | For toggles and quick actions, update UI immediately and reconcile with API response. |

---

## 9. Implementation Priority

Suggested order based on dependencies:

```
Phase 1 — Foundation
├── Auth context + protected routes
├── API client instantiation
├── Global client state (Context/Zustand)
└── Loading/skeleton states

Phase 2 — Core Chat
├── POST /chat endpoint (backend)
├── Wire send button → API
├── Streaming/typing indicator
├── Message persistence (DB)
└── Thread CRUD (create, load, delete)

Phase 3 — Client Data
├── GET /clients with search
├── Client selector → real data
├── Context ribbon → live tax summary
├── Intelligence panel → live data
└── Tax engine integration

Phase 4 — History & Real-time
├── Thread list from API
├── Thread switching loads messages
├── Unread tracking
├── WebSocket for live updates
└── Search (server-side for full history)

Phase 5 — Settings & Integrations
├── User profile CRUD
├── Preferences persistence
├── OAuth flows for integrations
├── Notification settings
└── Billing (Stripe)

Phase 6 — Advanced
├── Voice input (Web Speech API)
├── Document upload + extraction
├── PDF export
├── Scenario comparison in panel
└── Meeting transcription pipeline
```

---

## File Reference

| File | Purpose |
|------|---------|
| `apps/web/src/app/chat/page.tsx` | Chat interface (all UI) |
| `apps/web/src/app/settings/page.tsx` | Settings interface (all UI) |
| `apps/web/src/components/icons.tsx` | All SVG icons |
| `apps/web/src/components/theme-provider.tsx` | Dark mode provider |
| `apps/web/src/lib/api/client.ts` | Generic API client (unused) |
| `apps/web/src/lib/supabase/client.ts` | Supabase browser client |
| `apps/web/src/lib/supabase/server.ts` | Supabase server client |
| `apps/web/src/types/index.ts` | Shared types re-export |
| `apps/api/app/routers/chat.py` | Chat route (stub) |
| `apps/api/app/routers/clients.py` | Clients route (stub) |
| `apps/api/app/routers/documents.py` | Documents route (stub) |
| `apps/api/app/tax/` | Tax calculation engine (implemented) |
| `packages/shared/src/types/` | Shared TypeScript types |
