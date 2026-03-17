# Component & file breakdown assessment

Quick assessment of large files and suggested splits to keep the codebase scalable. **No changes have been made**; this is a planning document only.

---

## 1. Web app – frontend (apps/web/src)

### 1.1 Chat page (~3,424 lines) — **highest priority**

**File:** `app/chat/page.tsx`

**Why it’s hard to manage:** Single file holds layout, client picker, history panel, message list, input, right-hand panels (tax/dashboard/scenarios/observations/notes), all chat-specific types, constants, and many inline components.

**Suggested breakdown:**

| Extract | Description | Est. lines | Target |
|--------|-------------|------------|--------|
| **Types** | `Message`, `Insight`, `SavingsBreakdown`, `Observation`, `MeetingNoteData`, `ClientSummary`, `ClientDetail`, `Conversation`, `ScenarioData`, etc. | ~150 | `types/chat.ts` or `app/chat/types.ts` |
| **Constants** | `QUICK_PROMPTS`, `severityConfig`, `GRADIENTS`, `categoryLabels`, `categoryIcons`, `SHIMMER_ROWS`, `DATA_DOTS` | ~80 | `app/chat/constants.ts` |
| **Utils** | `getGradient`, `getRelativeGroup`, `formatConversationTime` | ~30 | `app/chat/utils.ts` or `lib/chat-utils.ts` |
| **ChatTopBar** | Header: logo, history toggle, client selector button, settings | ~80 | `app/chat/ChatTopBar.tsx` |
| **ClientDropdown** | Full dropdown: picker view + client info view, search, list, load more | ~250 | `app/chat/ClientDropdown.tsx` |
| **ChatHistoryPanel** | History sidebar: search, grouped thread list, load more, new chat | ~120 | `app/chat/ChatHistoryPanel.tsx` |
| **ContextRibbon** | Context chips + tax plan toggle (and related UI) | ~80 | `app/chat/ContextRibbon.tsx` |
| **ChatMessage** | Single message bubble (user/assistant, activity, dashboard) | ~90 | `app/chat/ChatMessage.tsx` |
| **ChatActivityList** | Inline activity events list | ~60 | `app/chat/ChatActivityList.tsx` |
| **ContextChip / MiniStat** | Small presentational components | ~50 | `app/chat/ContextChip.tsx` or shared |
| **Panel skeletons** | `PanelGeneratingSkeleton`, `DashboardGeneratingOverlay` | ~120 | `app/chat/panel-skeletons.tsx` |
| **Tax/dashboard panels** | `TaxBreakdown`, `ObservationPreview`, `AllowancesPanel`, `ScenarioComparison`, `ScenariosPanel`, `ObservationsPanel`, `ObservationCard`, `MeetingNotesPanel`, `MeetingNoteCard` | ~700 | `app/chat/panels/` (e.g. `TaxBreakdown.tsx`, `ScenariosPanel.tsx`, `ObservationsPanel.tsx`, `MeetingNotesPanel.tsx`) |
| **Small icons** | `IconCopy`, `IconMaximize`, `IconMinimize` (if not moved to `icons.tsx`) | ~30 | Inline or `components/icons.tsx` |

**Optional hooks (later):**

- `useChatClientList` – client list fetch, search debounce, load more (keeps page.tsx thinner).
- `useChatHistory` – conversations fetch, filtered list, load more, select/delete.
- `usePanelResize` – panel width state and drag logic.

**Result:** Main `page.tsx` becomes a thin layout that composes these components and hooks (~400–600 lines).

---

### 1.2 Clients page (~1,775 lines)

**File:** `app/clients/page.tsx`

**Suggested breakdown:**

| Extract | Description | Target |
|--------|-------------|--------|
| **Types** | `ClientSummary`, `ClientDetail`, `TaxBand`, `Observation`, `TaxProfile`, `HouseholdSummary`, etc. | `types/clients.ts` |
| **ClientRow / HouseholdRow** | Sidebar list rows | `components/clients/ClientRow.tsx`, `HouseholdRow.tsx` |
| **IntelligenceTab** | Observations list + filters + load more | `components/clients/IntelligenceTab.tsx` |
| **ObsItem** | Single observation card | `components/clients/ObsItem.tsx` |
| **Skeleton** | Loading skeleton for client detail | `components/clients/ClientDetailSkeleton.tsx` |
| **HouseholdDetail** | Household view with members | `components/clients/HouseholdDetail.tsx` |
| **Tab content blocks** | Large profile/tax/notes sections could be separate files under `app/clients/sections/` or `components/clients/` | Optional |

**Result:** Page focuses on data loading, sidebar state, and composition; list/detail UI lives in dedicated components.

---

### 1.3 Landing page (~1,499 lines)

**File:** `app/page.tsx`

**Suggested breakdown:**

| Extract | Description | Target |
|--------|-------------|--------|
| **Navbar** | Already a function; move to own file | `components/landing/Navbar.tsx` |
| **Hero** | Hero section with CTAs | `components/landing/Hero.tsx` |
| **Features** | Features section | `components/landing/Features.tsx` |
| **IntegrationsShowcase** | Integrations block | `components/landing/IntegrationsShowcase.tsx` |
| **HowItWorks** | How it works + demo | `components/landing/HowItWorks.tsx` |
| **Stats** | Stats / numbers section | `components/landing/Stats.tsx` |
| **Testimonial** | Testimonial section | `components/landing/Testimonial.tsx` |
| **CTA** | “Ready to start” CTA block | `components/landing/CTA.tsx` |
| **Footer** | Footer links | `components/landing/Footer.tsx` |

**Result:** `app/page.tsx` becomes a short composition of `<Navbar />`, `<Hero />`, etc. Shared hooks (e.g. `useLandingPerformance`) can live in `components/landing/` or `hooks/`.

---

### 1.4 Settings page (~1,335 lines)

**File:** `app/settings/page.tsx`

**Suggested breakdown:**

| Extract | Description | Target |
|--------|-------------|--------|
| **Types / NAV_ITEMS** | `Section`, `NavItem`, section config | `app/settings/types.ts` or inline in section components |
| **Section content** | One component per section (Account, Integrations, Meeting Notes, Notifications, Security, Billing) | `app/settings/sections/AccountSection.tsx`, etc. |

**Result:** Page handles layout and active section; each section owns its form and logic.

---

### 1.5 Other large frontend files (lower priority)

| File | Lines | Suggestion |
|------|-------|------------|
| **edit-client-form.tsx** | ~719 | Extract form sections or field groups (e.g. personal, contact, tax); optional subcomponents for repeated patterns. |
| **how-it-works-demo.tsx** | ~681 | Already a single feature; could split “steps” vs “demo” if it grows. |
| **voice-mode.tsx** | ~630 | Extract subcomponents (e.g. transcript view, controls, status). |
| **useChat.ts** | ~614 | Consider splitting: `useChatStream`, `useChatHistory`, `useChatDashboard` (or keep as one with clear internal sections). |
| **tax-data-form.tsx** | ~550 | Extract income sources table, allowances block, or step-specific components. |
| **add-client-panel.tsx** | ~543 | Extract form body or steps into smaller components. |
| **icons.tsx** | ~466 | Fine as-is (many icons); optional: split by domain (e.g. `icons-chart.tsx`, `icons-ui.tsx`) if it grows. |
| **net-benefit-card.tsx** | ~454 | Already a component; only split if it gains many variants. |
| **motion.tsx** | ~407 | Re-exports / wrappers; keep or move to `lib/motion.ts`. |
| **tax-computation-breakdown.tsx** | ~326 | OK as single component. |
| **scenario-comparison-chart.tsx** | ~325 | OK as single component. |

---

## 2. API – backend (apps/api/app)

### 2.1 Largest files

| File | Lines | Suggestion |
|------|-------|------------|
| **routers/clients.py** | ~1,164 | Split by domain: e.g. `clients_list_detail.py`, `clients_observations.py`, `clients_meeting_notes.py`, or keep one router but group with sub-routers / APIRouter include. |
| **routers/integrations.py** | ~990 | Split by integration (Recall vs others) or by resource (e.g. meetings, transcripts). |
| **services/pdf_report.py** | ~1,056 | Split by report type or stage (data prep, template, sections). |
| **routers/nora.py** | ~699 | Consider extracting “session/meeting” handlers vs “processing” handlers. |
| **services/chat.py** | ~656 | Already a service class; optional: extract “message persistence” and “stream orchestration” into helpers. |
| **services/llm/claude.py** | ~587 | Optional: extract tool definitions, response parsing, or streaming into separate modules. |
| **db/seed.py** | ~424 | Optional: split by entity (users, clients, households) or env (dev vs test). |
| **db/models.py** | ~394 | Optional: split by domain (user, client, conversation, tax, etc.) and re-export from `models/__init__.py`. |
| **tax/observations.py** | ~387 | OK as single module; split only if new observation types add a lot. |
| **services/integrations/recall.py** | ~440 | OK as single integration; extract “auth” vs “API client” if it grows. |

**Result:** Biggest wins are `routers/clients.py` and `routers/integrations.py` (splits by route group) and `services/pdf_report.py` (splits by responsibility). Others can stay as-is until they grow or become hard to navigate.

---

## 3. Suggested order of work

1. **Chat page** – Extract types, constants, utils, then top-level UI (TopBar, ClientDropdown, HistoryPanel), then message and panel components. Do in small PRs to avoid regressions.
2. **Clients page** – Extract types and sidebar/detail components (ClientRow, IntelligenceTab, ObsItem, etc.).
3. **Landing page** – Move each section into `components/landing/` and re-export or import in `app/page.tsx`.
4. **Settings page** – Extract section components.
5. **API** – Split `routers/clients.py` and `routers/integrations.py` when touching those areas; split `pdf_report.py` if report logic grows.

---

## 4. Conventions to keep things scalable

- **Colocate when it helps:** Chat-specific types/constants/utils can live under `app/chat/` so the chat feature is self-contained.
- **Shared types:** Move truly shared types (e.g. `ClientSummary` if used by chat + clients) to `types/` or a shared package.
- **Naming:** Use clear component names (`ChatHistoryPanel` not `Sidebar`) and file names that match the component (`ChatTopBar.tsx`).
- **No giant “utils” files:** Prefer `chat-utils.ts`, `date-utils.ts`, etc., over one huge `utils.ts`.
- **API routers:** Prefer multiple smaller routers included in `main.py` over single 1000+ line router files.

---

*Generated as an assessment only; no code changes were made.*
