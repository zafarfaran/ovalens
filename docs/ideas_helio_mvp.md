# Helio MVP — Web App + Browser Extension (Hybrid)

> A UK-specific tax planning assistant for financial advisers. Chat interface with rich dashboards, plus a browser extension that bridges the adviser's existing tools.

---

## The Concept

Two pieces that work together:

1. **Helio Web App** — The home base. Chat with the AI, upload documents, view dashboards, run "what if" scenarios. This is where the heavy analysis happens.
2. **Helio Browser Extension** — A lightweight companion that sits on top of the adviser's existing tools (CRM, investment platforms, HMRC). One-click to pull context into the web app. No app-switching, no copy-pasting.

```
┌──────────────────────────────────────────────────────────────────┐
│                     ADVISER'S BROWSER                             │
│                                                                   │
│  ┌───────────────────────────────┐  ┌──────────────────────────┐ │
│  │                               │  │                          │ │
│  │     EXISTING PLATFORM         │  │    HELIO WEB APP         │ │
│  │                               │  │                          │ │
│  │  • CRM (Salesforce, etc.)     │  │  ┌──────┐ ┌──────────┐  │ │
│  │  • Hargreaves Lansdown        │  │  │ Chat │ │Dashboard │  │ │
│  │  • AJ Bell                    │  │  │      │ │          │  │ │
│  │  • HMRC Online                │  │  │  AI  │ │ Tax      │  │ │
│  │  • Xero / QuickBooks          │  │  │ conv-│ │ summary  │  │ │
│  │                               │  │  │ ersa-│ │ Allowance│  │ │
│  │  ┌─────────────────────────┐  │  │  │ tion │ │ tracker  │  │ │
│  │  │  HELIO EXTENSION        │  │  │  │      │ │ Pension  │  │ │
│  │  │  ┌───────────────────┐  │  │  │  │      │ │ planner  │  │ │
│  │  │  │ "Analyse in Helio"│──│──│──│─▶│      │ │ Scenarios│  │ │
│  │  │  └───────────────────┘  │  │  │  │      │ │          │  │ │
│  │  └─────────────────────────┘  │  │  └──────┘ └──────────┘  │ │
│  │                               │  │                          │ │
│  └───────────────────────────────┘  └──────────────────────────┘ │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Why This Approach

| Problem | How Helio Solves It |
|---------|---------------------|
| Advisers live in 5+ different tools all day | Extension meets them where they are |
| Copy-pasting client data into a chat is tedious | Extension scrapes/captures context automatically |
| Tax dashboards need space — popups are too small | Web app gives full-screen real estate for charts and tables |
| Advisers need to reference the analysis while working | Two tabs open side by side — their platform + Helio |
| Context is lost between sessions | Web app persists client history and prior analyses |

---

## Part 1: Helio Web App

### What It Is

A full-screen web application with two panels:

```
┌─────────────────────────────────────────────────────────────┐
│  HELIO — UK Tax Planning Assistant                           │
├────────────────────────┬────────────────────────────────────┤
│                        │                                     │
│   CHAT PANEL           │   DASHBOARD PANEL                   │
│                        │                                     │
│   ┌──────────────────┐ │   ┌─────────────────────────────┐  │
│   │ Upload SA100/P60 │ │   │  TAX SUMMARY                │  │
│   └──────────────────┘ │   │  Income: £159,800            │  │
│                        │   │  ANI: £147,425               │  │
│   You: "Analyse this   │   │  PA: £0 (LOST)              │  │
│   return for the       │   │  Tax: £56,091               │  │
│   Mitchells"           │   │  NI: £4,841                 │  │
│                        │   │  Effective rate: 35.1%       │  │
│   Helio: "I've found   │   ├─────────────────────────────┤  │
│   James has lost his   │   │  ALLOWANCES TRACKER         │  │
│   full PA. A pension   │   │  ISA:     ████████░░ £8k    │  │
│   contribution of      │   │  Pension: ███░░░░░░░ £40k   │  │
│   £47,425 would save   │   │  CGT AEA: ░░░░░░░░░ £3k    │  │
│   £18,812..."          │   ├─────────────────────────────┤  │
│                        │   │  🔴 PA Fully Lost            │  │
│   You: "What if he     │   │  🔴 HICBC Full Clawback     │  │
│   salary sacrifices     │   │  ⚠️ CGT AEA Unused          │  │
│   £50K?"               │   │  ⚠️ ISA Not Maxed            │  │
│                        │   ├─────────────────────────────┤  │
│   Helio: "That would   │   │  SCENARIO: £50K Sacrifice   │  │
│   restore full PA,     │   │  New ANI: £97,425           │  │
│   eliminate HICBC..."  │   │  PA restored: £12,570       │  │
│                        │   │  Tax saving: £24,024        │  │
│                        │   │  Effective relief: 48%      │  │
│                        │   └─────────────────────────────┘  │
│                        │                                     │
├────────────────────────┴────────────────────────────────────┤
│  Client: Mitchell Household  │  Tax Year: 2025/26  │  48d   │
└─────────────────────────────────────────────────────────────┘
```

### Core Features (MVP)

1. **Chat Interface**
   - Natural language conversation with the AI
   - Upload documents (SA100, P60, P11D, platform statements)
   - Ask "what if" questions
   - AI responds with brief text + updates the dashboard

2. **Dashboard Panel**
   - Tax summary with band breakdown
   - Allowance tracker with traffic lights (green/amber/red)
   - Critical alerts (PA taper, HICBC, expiring allowances)
   - Scenario comparison (before vs after)
   - Updates in real-time as the conversation progresses

3. **Client Management**
   - Save and switch between clients/households
   - Persist analysis history per client
   - Notes and bookmarks on prior analyses

4. **Document Handling**
   - Drag and drop SA100, P60, P11D PDFs
   - Extract data automatically
   - Show extraction confidence and flag uncertainties

### Tech Stack (Suggested)

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Frontend | Next.js + React | Fast, SSR for initial load, good ecosystem |
| UI Components | shadcn/ui + Tailwind | Clean, modern, accessible out of the box |
| Charts | Recharts or Tremor | Good for tax band visualisations, simple API |
| Chat UI | Custom or Vercel AI SDK | Stream AI responses, handle tool calls |
| Backend | Next.js API routes or FastAPI | API routes for MVP simplicity, FastAPI if you need Python tools |
| AI | Claude API / OpenAI | Structured outputs, tool calling, long context for tax returns |
| Database | PostgreSQL + Prisma | Client data, analysis history, user accounts |
| Auth | Clerk or NextAuth | Adviser login, firm-level access control |
| File Storage | S3 / R2 | Uploaded tax documents |
| PDF Extraction | pdf.js (client) + PyMuPDF (server) | Extract text from SA100/P60 PDFs |
| Hosting | Vercel (frontend) + Railway/Fly (backend) | Simple deployment, scales later |

---

## Part 2: Helio Browser Extension

### What It Is

A small browser extension (Chrome/Edge) that appears as:
- A **toolbar icon** with a popup for quick actions
- A **floating button** on supported pages (CRM, investment platforms, HMRC)
- A **context menu** option ("Analyse in Helio")

### What It Does

```
┌─────────────────────────────────────────────────────────┐
│                                                          │
│   ADVISER IS VIEWING CLIENT ON HARGREAVES LANSDOWN       │
│                                                          │
│   ┌──────────────────────────────────────────────────┐  │
│   │  James Mitchell — Portfolio Summary               │  │
│   │                                                   │  │
│   │  ISA:   £185,000  (Global tracker, UK equity)     │  │
│   │  SIPP:  £420,000  (Multi-asset, bonds)            │  │
│   │  GIA:   £65,000   (Unrealised gain: £12,400)      │  │
│   │                                                   │  │
│   └──────────────────────────────────────────────────┘  │
│                                                          │
│   ┌──────────────────────────┐                          │
│   │  HELIO EXTENSION         │                          │
│   │                          │                          │
│   │  📋 Client detected:     │                          │
│   │  James Mitchell          │                          │
│   │                          │                          │
│   │  I can see:              │                          │
│   │  • ISA: £185k            │                          │
│   │  • SIPP: £420k           │                          │
│   │  • GIA: £65k (£12.4k    │                          │
│   │    unrealised gain)      │                          │
│   │                          │                          │
│   │  ┌────────────────────┐  │                          │
│   │  │ Analyse in Helio →│  │                          │
│   │  └────────────────────┘  │                          │
│   │                          │                          │
│   │  ┌────────────────────┐  │                          │
│   │  │ Bed & ISA Check   │  │                          │
│   │  └────────────────────┘  │                          │
│   │                          │                          │
│   │  ┌────────────────────┐  │                          │
│   │  │ Add to Client File│  │                          │
│   │  └────────────────────┘  │                          │
│   │                          │                          │
│   └──────────────────────────┘                          │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Extension Features (MVP)

1. **Page Context Capture**
   - Detect which platform the adviser is on (HL, AJ Bell, HMRC, CRM)
   - Extract visible client data from the page (holdings, balances, income figures)
   - Package it as structured context

2. **One-Click Analyse**
   - "Analyse in Helio" button opens the web app with the captured data pre-loaded
   - No copy-pasting — context flows automatically

3. **Quick Actions**
   - "Bed & ISA Check" — quick calculation based on GIA holdings visible on the page
   - "CGT AEA Status" — how much of the £3,000 exemption is used
   - "Add to Client File" — save this page's data to the client's Helio record

4. **Notifications / Badges**
   - Badge on the extension icon: "3 clients approaching 5 April deadline"
   - Alert when viewing a client who has unused allowances

### Extension Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Extension Framework | Chrome Manifest V3 | Standard, works on Chrome + Edge |
| UI | React + Tailwind (popup) | Consistent with web app styling |
| Content Scripts | Vanilla JS | Lightweight page scraping, platform-specific selectors |
| Communication | Chrome messaging API → Web App API | Extension sends captured data to Helio backend |
| Storage | chrome.storage.local | Cache client mappings, preferences |

### Supported Platforms (MVP — start with 2-3)

| Platform | What to Capture |
|----------|-----------------|
| Hargreaves Lansdown | ISA/SIPP/GIA holdings, valuations, unrealised gains |
| HMRC Online (Gateway) | SA302 tax calculations, PAYE coding notices, NI record |
| Xero / FreeAgent | Self-employment income, expenses, VAT status |

Expand later: AJ Bell, Interactive Investor, Vanguard, Sage, Salesforce (CRM)

---

## How They Connect

```
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│   BROWSER    │          │   HELIO      │          │   HELIO      │
│   EXTENSION  │────API──▶│   BACKEND    │────AI───▶│   WEB APP    │
│              │          │              │          │              │
│  Captures:   │          │  Processes:  │          │  Displays:   │
│  • Page data │          │  • PDF parse │          │  • Chat      │
│  • Client ID │          │  • Tax calc  │          │  • Dashboard │
│  • Holdings  │          │  • AI calls  │          │  • Scenarios │
│  • Context   │          │  • Storage   │          │  • Alerts    │
└──────────────┘          └──────────────┘          └──────────────┘
                                │
                                ▼
                    ┌──────────────────────┐
                    │   DATABASE           │
                    │                      │
                    │  • Client profiles   │
                    │  • Analysis history  │
                    │  • Uploaded docs     │
                    │  • Extracted data    │
                    │  • Allowance status  │
                    └──────────────────────┘
```

### Data Flow: Extension → Web App

1. Adviser views client portfolio on Hargreaves Lansdown
2. Extension detects the page, extracts holdings data
3. Adviser clicks "Analyse in Helio"
4. Extension sends structured data to Helio backend API
5. Backend stores it against the client profile
6. Web app opens (or focuses existing tab) with client context pre-loaded
7. AI has the holdings data ready — adviser can immediately ask questions

---

## MVP Scope — What to Build First

### Phase 1: Web App Core (Weeks 1-3)

- [ ] Chat interface (text input, streaming AI responses)
- [ ] Document upload (PDF drag & drop)
- [ ] Basic tax data extraction from SA100/P60
- [ ] Dashboard panel with tax summary
- [ ] Allowance tracker (ISA, Pension AA, CGT AEA)
- [ ] Critical alerts (PA taper, HICBC)
- [ ] Single "what if" scenario (pension contribution slider)
- [ ] Client save/load (basic persistence)

### Phase 2: Extension MVP (Weeks 3-4)

- [ ] Chrome extension scaffold (Manifest V3)
- [ ] Popup UI with "Analyse in Helio" button
- [ ] Content script for 1 platform (Hargreaves Lansdown)
- [ ] Extract: ISA/SIPP/GIA balances, holdings list
- [ ] Send captured data to Helio backend
- [ ] Deep link to web app with client context

### Phase 3: Intelligence (Weeks 4-6)

- [ ] Full UK tax calculation engine (income ordering, PA taper, NI classes)
- [ ] HICBC calculator
- [ ] Pension AA with carry forward
- [ ] Salary sacrifice modelling
- [ ] Bed & ISA opportunity detection
- [ ] Scottish rate comparison
- [ ] Multiple scenario comparison
- [ ] Year-end checklist generator

### Phase 4: Polish & Expand (Weeks 6-8)

- [ ] Additional platform support in extension (AJ Bell, HMRC)
- [ ] IHT estimator
- [ ] Director remuneration optimiser
- [ ] PDF export of analysis (client-ready report)
- [ ] Multi-user (firm-level accounts, multiple advisers)
- [ ] CRM integration (Salesforce, etc.)

---

## Key Design Decisions (To Be Made)

| Decision | Options | Considerations |
|----------|---------|----------------|
| AI Provider | Claude / OpenAI / Both | Claude has strong structured output; OpenAI has wider tool ecosystem |
| Where tax calc runs | Server-side (Python) vs AI-generated | Server = deterministic + fast; AI = flexible but slower |
| Extension page scraping | DOM selectors vs screenshot + vision | Selectors are fragile to platform changes; vision is slower but resilient |
| Client data storage | Your DB vs adviser's existing CRM | Own DB is simpler for MVP; CRM integration adds value but complexity |
| Auth model | Per-adviser vs per-firm | Start per-adviser, add firm-level later |
| Dashboard rendering | React components vs iframe artifact | React = full control; iframe = closer to existing Hazel `generate_dashboard` |

---

## Why "Helio"

(Placeholder name — change it whenever you want. "Helio" suggests light/clarity, which fits the idea of making opaque tax situations transparent.)
