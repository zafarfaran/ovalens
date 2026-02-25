# Helio Build Plan — Chunked for AI-Assisted Development

> Each task is sized so you can hand it to the AI in a single session. Work top-to-bottom. Check the box when done. Don't skip ahead — later tasks depend on earlier ones.

---

## How to Use This Plan

1. **Pick the next unchecked task**
2. **Copy the task title + description into a new AI chat** (or reference this file)
3. **Build it, test it, check the box**
4. **Move on**

Each task has:
- **What:** What you're building
- **Why:** Why it matters / what it unlocks
- **Inputs:** What you need before starting (files, context, prior tasks)
- **Output:** The concrete deliverable
- **Prompt hint:** A starter prompt you can give the AI

---

## Legend

- `[ ]` = Not started
- `[~]` = In progress
- `[x]` = Done
- `[!]` = Blocked / needs decision

---

# MILESTONE 0 — Project Scaffold

> Get the monorepo set up so every future task has a place to land.

---

### 0.1 — Initialise the monorepo

- [ ] **What:** Create a monorepo structure with two workspaces: `web` (Next.js app) and `extension` (Chrome extension). Shared config at root.
- **Why:** Every task from here on needs to know where files go.
- **Inputs:** None.
- **Output:**
  ```
  helio/
  ├── package.json              (workspaces: ["web", "extension"])
  ├── turbo.json                (optional, for monorepo scripts)
  ├── .gitignore
  ├── web/
  │   ├── package.json
  │   ├── next.config.js
  │   ├── tsconfig.json
  │   ├── tailwind.config.ts
  │   ├── app/
  │   │   ├── layout.tsx
  │   │   └── page.tsx
  │   └── components/
  └── extension/
      ├── package.json
      ├── manifest.json          (Manifest V3)
      ├── tsconfig.json
      └── src/
  ```
- **Prompt hint:** *"Set up a TypeScript monorepo with pnpm workspaces. Two packages: `web` (Next.js 14 App Router, Tailwind, shadcn/ui) and `extension` (Chrome Manifest V3, React + Tailwind for popup). No pages yet — just the scaffold and a health-check page that says 'Helio is running'."*

---

### 0.2 — Install core dependencies

- [ ] **What:** Add the base packages to each workspace.
- **Why:** Avoids dependency confusion in later tasks.
- **Inputs:** Task 0.1 complete.
- **Output:**
  - `web`: next, react, tailwindcss, shadcn/ui initialised, lucide-react (icons), ai (Vercel AI SDK)
  - `extension`: react, react-dom, tailwindcss, webextension-polyfill
  - Root: typescript, eslint, prettier
- **Prompt hint:** *"In my monorepo, install these deps in the right workspaces: [list]. Initialise shadcn/ui in the web package. Make sure `pnpm dev` runs the Next.js app and everything compiles."*

---

### 0.3 — Design tokens and shared styles

- [ ] **What:** Define the Helio colour palette, typography, spacing, and dark mode toggle in Tailwind config. Both `web` and `extension` import from the same tokens.
- **Why:** Consistent look from day one. Prevents style drift between app and extension.
- **Inputs:** Task 0.2 complete.
- **Output:** Shared `tailwind.preset.ts` at root. Both workspaces extend it. Dark/light mode works.
- **Prompt hint:** *"Create a shared Tailwind preset at the monorepo root with a professional colour palette (blues, grays, green/amber/red for status). Both `web` and `extension` should extend it. Add CSS variables for dark mode. Show me a test page with colour swatches."*

---

# MILESTONE 1 — The Shell (Layout + Navigation)

> Get the two-panel layout on screen with placeholder content. No AI, no data — just the frame.

---

### 1.1 — App layout: two-panel split

- [ ] **What:** Build the main app layout — left panel (chat) and right panel (dashboard). Resizable divider between them. Full viewport height.
- **Why:** This is the skeleton that everything plugs into.
- **Inputs:** Task 0.3 complete.
- **Output:** `/app/page.tsx` with a `<ChatPanel />` (left, ~40% width) and `<DashboardPanel />` (right, ~60% width). Both show placeholder text. Draggable divider to resize.
- **Prompt hint:** *"Build a two-panel layout in Next.js App Router. Left panel 'Chat' (40%), right panel 'Dashboard' (60%). Full viewport height. Resizable with a draggable divider. Use Tailwind. Mobile: stack vertically with a tab switcher (Chat | Dashboard). Put placeholder content in each."*

---

### 1.2 — Chat panel: message list + input

- [ ] **What:** Build the chat UI shell. Message list (scrollable), text input at bottom, send button. No AI yet — just hardcoded messages for layout.
- **Why:** Visual proof of the chat experience before wiring up AI.
- **Inputs:** Task 1.1 complete.
- **Output:** `<ChatPanel />` with `<MessageList />`, `<MessageBubble />` (user vs assistant styles), `<ChatInput />`. Hardcode 3-4 example messages showing a tax conversation.
- **Prompt hint:** *"Build the chat panel for my tax advisor app. Message list with scroll, user messages on right (blue), assistant messages on left (gray). Input box at bottom with send button and a file upload icon (non-functional for now). Hardcode some example messages about UK tax analysis. Use shadcn/ui components."*

---

### 1.3 — Dashboard panel: card grid

- [ ] **What:** Build the dashboard shell with placeholder cards: Tax Summary, Allowances Tracker, Alerts, Scenarios. Each card is a shadcn Card with a title and placeholder content.
- **Why:** Establishes the dashboard component structure before we fill it with real data.
- **Inputs:** Task 1.1 complete.
- **Output:** `<DashboardPanel />` with a responsive grid of `<DashboardCard />` components. Hardcoded tax data matching the Mitchell example from our docs.
- **Prompt hint:** *"Build the dashboard panel with 4 cards in a responsive grid: (1) Tax Summary — show income £159,800, ANI £147,425, PA £0 LOST, Tax £56,091, Effective rate 35.1%. (2) Allowances Tracker — progress bars for ISA (£8k/£20k), Pension (£20k/£60k), CGT AEA (£0/£3k) with green/amber/red colours. (3) Alerts — list with red/amber icons. (4) Scenarios — empty placeholder. Use shadcn/ui Card components and Tailwind."*

---

### 1.4 — Top bar and client selector

- [ ] **What:** A top navigation bar with: Helio logo/name, client selector dropdown (hardcoded names), tax year selector, and a settings gear icon.
- **Why:** Frames the app properly and introduces client context.
- **Inputs:** Task 1.1 complete.
- **Output:** `<TopBar />` component rendered above the two panels.
- **Prompt hint:** *"Add a top navigation bar to my Next.js app. Left: 'Helio' text logo. Centre: client selector dropdown (hardcoded: 'Mitchell Household', 'Sarah Chen', 'Tom Davies') and tax year selector ('2025/26', '2024/25'). Right: settings icon. Use shadcn/ui Select and Button. Subtle border-bottom, clean professional look."*

---

# MILESTONE 2 — Chat + AI Integration

> Wire up the chat panel to an actual LLM. Text only — no tools, no dashboard updates yet.

---

### 2.1 — Backend: AI chat API route

- [ ] **What:** Create a Next.js API route (`/api/chat`) that streams responses from Claude (or OpenAI). Use the Vercel AI SDK. System prompt loaded from `docs/system_prompt.md`.
- **Why:** The brain of the app — everything else is UI on top of this.
- **Inputs:** Tasks 1.2 complete. An API key for Claude or OpenAI (set in `.env.local`).
- **Output:** `POST /api/chat` that accepts `{ messages: [...] }` and streams back an AI response. The system prompt primes the AI as a UK tax adviser.
- **Prompt hint:** *"Create an API route at `/api/chat` using the Vercel AI SDK (`ai` package). Use the Anthropic provider (Claude 3.5 Sonnet). Load the system prompt from a constant string (I'll paste the content). The route should accept a messages array and stream the response. Set up `.env.local` for the API key. Don't add tools yet — just plain text chat."*

---

### 2.2 — Frontend: wire chat to API

- [ ] **What:** Replace the hardcoded messages with the `useChat` hook from Vercel AI SDK. User types a message, it streams back from the AI.
- **Why:** The core interaction loop works end-to-end.
- **Inputs:** Tasks 2.1 + 1.2 complete.
- **Output:** Real streaming chat in the browser. Type "What is the Personal Allowance?" and get a real answer.
- **Prompt hint:** *"Wire up my ChatPanel to the `/api/chat` route using the `useChat` hook from `ai/react`. Replace hardcoded messages with real ones. Show a typing indicator while streaming. Auto-scroll to bottom on new messages. Handle errors gracefully."*

---

### 2.3 — Chat: message formatting and markdown

- [ ] **What:** Render AI responses as formatted markdown (headers, bold, lists, tables, code blocks). Use `react-markdown` or similar.
- **Why:** Tax responses are much more readable with formatting — tables for tax bands, bold for key numbers, etc.
- **Inputs:** Task 2.2 complete.
- **Output:** AI responses render markdown properly. Numbers are formatted with `£` signs and commas.
- **Prompt hint:** *"Add markdown rendering to assistant messages in my chat. Use `react-markdown` with `remark-gfm` for tables. Style headings, bold, lists, and tables to match my Tailwind theme. Make sure code blocks and tables render nicely. Keep user messages as plain text."*

---

### 2.4 — System prompt: load from file + tax context

- [ ] **What:** Load the system prompt from our `docs/system_prompt.md` and inject current tax year context (rates, bands) from `docs/tax_reference.md` as part of the system message.
- **Why:** The AI needs UK tax knowledge baked in, not relying on training data alone.
- **Inputs:** Tasks 2.1 complete. `docs/system_prompt.md` and `docs/tax_reference.md` exist.
- **Output:** The API route reads both files and concatenates them into the system prompt. AI responses are now UK-tax-aware.
- **Prompt hint:** *"Update my `/api/chat` route to load the system prompt from two files: `docs/system_prompt.md` (role definition) and `docs/tax_reference.md` (UK tax rates/bands). Concatenate them as the system message. The AI should now answer UK tax questions accurately using these rates. Cache the file reads so we don't hit the filesystem on every request."*

---

# MILESTONE 3 — UK Tax Calculation Engine

> Deterministic tax calculation functions. These run server-side and give exact numbers — no AI guessing.

---

### 3.1 — Core: UK income tax calculator

- [ ] **What:** A TypeScript module that calculates UK income tax given gross income, residence (England/Scotland), and income types. Handles: Personal Allowance, basic/higher/additional rates, Scottish rates, income ordering (non-savings, savings, dividends).
- **Why:** This is the foundation calculation everything else depends on.
- **Inputs:** `docs/tax_reference.md` for rates. No prior tasks needed (pure function).
- **Output:** `web/lib/tax/income-tax.ts` exporting `calculateIncomeTax(input) => result`. Unit tests in `web/lib/tax/__tests__/income-tax.test.ts`. At least 5 test cases.
- **Prompt hint:** *"Create a UK income tax calculator in TypeScript. Input: { grossIncome, residence ('england' | 'scotland'), incomeBreakdown: { employment, selfEmployment, dividends, savingsInterest, rental, pension } }. Output: { personalAllowance, taxableIncome, taxByBand: [{ band, amount, rate, tax }], totalTax, effectiveRate, marginalRate }. Handle Scottish rates. Handle income ordering (non-savings first, then savings, then dividends). Include dividend allowance (£500) and savings allowance. Write Jest tests."*

---

### 3.2 — Core: Adjusted Net Income + PA taper

- [ ] **What:** Calculate ANI and the Personal Allowance taper. Detect the 60% trap zone (£100k-£125,140).
- **Why:** The #1 planning lever for UK higher earners. Every scenario will call this.
- **Inputs:** Task 3.1 complete.
- **Output:** `web/lib/tax/ani.ts` exporting `calculateANI(input) => result`. Includes PA taper logic, effective marginal rate in taper zone. Tests covering: below £100k, in taper zone, above £125,140.
- **Prompt hint:** *"Create an ANI calculator in TypeScript. Input: { totalIncome, pensionContributions: { employee, personal, employer }, giftAidNet, tradeUnionSubs }. Output: { adjustedNetIncome, personalAllowance, paStatus: 'full' | 'tapered' | 'lost', taperAmount, inTaperZone, effectiveMarginalRate, workingNotes }. PA taper: £1 lost per £2 over £100k. Standard PA = £12,570. Write tests for: income of £80k (full PA), £110k (tapered), £130k (lost), and £107.5k with pension contributions that take ANI below £100k."*

---

### 3.3 — Core: National Insurance calculator

- [ ] **What:** Calculate NI contributions — Class 1 (employees), Class 2 + Class 4 (self-employed). Include employer NI.
- **Why:** NI is separate from income tax and affects salary sacrifice calculations.
- **Inputs:** `docs/tax_reference.md` for NI rates.
- **Output:** `web/lib/tax/national-insurance.ts`. Tests for employed, self-employed, and director scenarios.
- **Prompt hint:** *"Create a National Insurance calculator in TypeScript. Input: { employmentIncome, selfEmploymentProfit, isDirector }. Output: { class1: { employee, employer }, class2, class4, totalEmployee, totalEmployer }. Rates: Employee 8% (£12,570-£50,270), 2% above. Employer 13.8% above £9,100. Class 2: £3.45/week. Class 4: 6% (£12,570-£50,270), 2% above. Write tests."*

---

### 3.4 — Core: HICBC calculator

- [ ] **What:** Calculate the High Income Child Benefit Charge.
- **Why:** Common trap for parents earning £60k-£80k. Key planning scenario.
- **Inputs:** HICBC rates from `docs/tax_reference.md`.
- **Output:** `web/lib/tax/hicbc.ts`. Tests for: below £60k, at £70k, above £80k.
- **Prompt hint:** *"Create a HICBC calculator in TypeScript. Input: { higherEarnerANI, numberOfChildren }. Output: { applies, childBenefitEntitlement, clawbackPercentage, hicbcCharge, netBenefit, recommendation }. Child Benefit: first child £25.60/week (£1,331.20/yr), additional £16.95/week (£881.40/yr). Clawback: 1% per £200 over £60,000, full at £80,000. Write tests."*

---

### 3.5 — Core: Pension Annual Allowance + carry forward

- [ ] **What:** Calculate available pension AA including 3-year carry forward, taper for high earners, and MPAA if flexibly accessed.
- **Why:** Pension contributions are the primary tax planning tool in the UK.
- **Inputs:** Pension rules from `docs/tax_reference.md`.
- **Output:** `web/lib/tax/pension-aa.ts`. Tests covering standard AA, carry forward, tapered AA, and MPAA.
- **Prompt hint:** *"Create a Pension Annual Allowance calculator in TypeScript. Input: { currentYearContributions, priorYears: [{ year, contributions }], thresholdIncome, adjustedIncome, hasAccessedFlexibly }. Output: { standardAA (£60k), taperApplies, taperedAA, carryForward: { byYear, total, expiringThisYear }, totalAvailable, used, remaining, mpaaApplies, warnings }. Taper: threshold income > £200k AND adjusted income > £260k, reduce £1 per £2 over £260k, min £10k. MPAA: £10k if flexibly accessed. Write tests."*

---

### 3.6 — Core: Salary sacrifice calculator

- [ ] **What:** Calculate the full benefit of salary sacrifice — income tax saving, employee NI saving, employer NI saving, impact on ANI/PA/HICBC.
- **Why:** The most impactful "what if" scenario for employed clients.
- **Inputs:** Tasks 3.1, 3.2, 3.3, 3.4 (composes the other calculators).
- **Output:** `web/lib/tax/salary-sacrifice.ts`. Tests showing a before/after comparison.
- **Prompt hint:** *"Create a salary sacrifice calculator that composes my existing income tax, ANI, NI, and HICBC calculators. Input: { currentSalary, sacrificeAmount, isScottish, numberOfChildren, existingPensionContributions, employerSharesNISaving }. Output: { before: { grossSalary, incomeTax, employeeNI, hicbc, netPay }, after: { ... }, savings: { incomeTax, employeeNI, employerNI, hicbcAvoided, paRestored, totalBenefit, effectiveRelief }, warnings }. Write a test for someone on £120k sacrificing £30k."*

---

### 3.7 — Core: Bed & ISA calculator

- [ ] **What:** Calculate the benefit of selling GIA holdings within CGT AEA and rebuying in ISA.
- **Why:** Common year-end planning action for clients with GIA holdings.
- **Inputs:** CGT rates from `docs/tax_reference.md`.
- **Output:** `web/lib/tax/bed-and-isa.ts`. Tests with sample holdings.
- **Prompt hint:** *"Create a Bed & ISA calculator in TypeScript. Input: { holdings: [{ name, currentValue, costBasis }], cgtAEAUsed, taxpayerStatus: 'basic' | 'higher' | 'additional', isaAllowanceRemaining }. Output: { availableAEA, recommendedSales: [{ holding, sellValue, gain, cgtSaved }], totalGainsCrystallised, totalCGTSaved, isaContribution, warnings, steps }. CGT AEA = £3,000. CGT rates: basic 10%/18%, higher 20%/24%. Write tests."*

---

### 3.8 — Barrel export + integration test

- [ ] **What:** Create a barrel export file (`web/lib/tax/index.ts`) that re-exports all calculators. Write one integration test that runs a full client analysis using all calculators together (the Mitchell household example).
- **Why:** Proves the calculation engine works end-to-end before wiring to UI.
- **Inputs:** Tasks 3.1-3.7 complete.
- **Output:** `web/lib/tax/index.ts` + `web/lib/tax/__tests__/integration.test.ts`. The integration test should match the numbers from our `planning_strategies.md` Mitchell example.
- **Prompt hint:** *"Create a barrel export for all my tax calculators at `web/lib/tax/index.ts`. Then write an integration test that analyses the Mitchell household: James earns £141,500 employment + £8,200 dividends + £2,800 savings + £7,300 rental = £159,800. He has £8k employee pension and £12k employer. £3,500 net Gift Aid. 2 children on Child Benefit. Calculate: ANI, PA status, income tax, NI, HICBC. Then model a £50k salary sacrifice and verify the savings."*

---

# MILESTONE 4 — Dashboard with Real Data

> Connect the tax engine to the dashboard so it shows real calculated numbers.

---

### 4.1 — State: tax data store

- [ ] **What:** Create a Zustand (or React context) store for the current client's tax data. Shape it to match the `relevantTaxData` schema from `docs/tool_definitions.md`.
- **Why:** Single source of truth that both chat and dashboard read from.
- **Inputs:** `docs/tool_definitions.md` (the `relevantTaxData` schema). Task 1.3 complete.
- **Output:** `web/lib/store/tax-store.ts` with typed state, actions to set/update data, and a `useTaxData()` hook.
- **Prompt hint:** *"Create a Zustand store for UK tax data. The shape should follow this schema: [paste relevantTaxData from tool_definitions.md]. Export a `useTaxStore` hook. Actions: `setClientData(data)`, `updateScenario(scenario)`, `clearData()`. Type everything with TypeScript interfaces."*

---

### 4.2 — Dashboard: Tax Summary card (live)

- [ ] **What:** Replace the hardcoded Tax Summary card with a component that reads from the Zustand store and displays real numbers. Include income breakdown, tax by band (bar chart), PA status, effective rate.
- **Why:** First real dashboard card powered by actual data.
- **Inputs:** Tasks 4.1 + 1.3 complete.
- **Output:** `<TaxSummaryCard />` that renders from store data. Pre-load the store with Mitchell example data on mount.
- **Prompt hint:** *"Replace my hardcoded Tax Summary dashboard card with a live component that reads from my Zustand tax store. Show: total income, ANI, PA (with status badge: green/amber/red), income tax (with a horizontal stacked bar chart showing band breakdown using Recharts), NI, effective rate, marginal rate. Pre-populate the store with example data on page load."*

---

### 4.3 — Dashboard: Allowances Tracker card (live)

- [ ] **What:** Build the allowance tracker with progress bars and traffic light colours. Reads from store.
- **Why:** Visual instant-glance view of what's been used and what's at risk.
- **Inputs:** Tasks 4.1 + 1.3 complete.
- **Output:** `<AllowancesTrackerCard />` with progress bars for ISA, Pension AA, CGT AEA, Dividend Allowance. Green/amber/red colouring based on usage.
- **Prompt hint:** *"Build an Allowances Tracker card that reads from my Zustand store. Show progress bars for: ISA (£20k), Pension AA (£60k), CGT AEA (£3k), Dividend Allowance (£500). Colour logic: <50% used = green, 50-80% = amber, >80% or expired = red. Show 'used / total' and 'remaining'. Add a days-until-year-end countdown (5 April 2026). Use shadcn/ui Progress component."*

---

### 4.4 — Dashboard: Alerts card (live)

- [ ] **What:** Show critical observations from the store as an alert list with priority icons and expandable details.
- **Why:** The "what's wrong / what to do" at a glance.
- **Inputs:** Tasks 4.1 + 1.3 complete.
- **Output:** `<AlertsCard />` reading from `store.observations`. Sorted by priority. Expandable detail on click. Potential saving shown where available.
- **Prompt hint:** *"Build an Alerts card that reads `observations` from my Zustand store. Each observation has: type (critical/warning/opportunity/info), priority, title, detail, potentialSaving, action. Render as a list sorted by priority. Use red/amber/green/blue left border based on type. Click to expand detail. Show '£X potential saving' badge where applicable. Use shadcn/ui Accordion or Collapsible."*

---

### 4.5 — Dashboard: Scenario comparison card

- [ ] **What:** Show before vs after when a planning scenario is active. Side-by-side or stacked comparison of key metrics.
- **Why:** The "what if" answer — the most exciting part of the tool.
- **Inputs:** Tasks 4.1 complete. Task 3.6 (salary sacrifice calc) for the logic.
- **Output:** `<ScenarioCard />` reading from `store.planningScenarios`. Shows: scenario name, before ANI vs after ANI, before tax vs after tax, total saving, effective relief rate. Green highlight on improvements.
- **Prompt hint:** *"Build a Scenario Comparison card. Read `planningScenarios` from my Zustand store. If a scenario exists, show a before/after comparison: two columns with metrics (ANI, PA, income tax, NI, HICBC, net pay). Highlight improvements in green, degradations in red. Show total saving prominently at the top. If no scenario, show 'Ask Helio a what-if question to see scenarios here'. Use shadcn/ui Table."*

---

# MILESTONE 5 — AI Tool Calling (Chat Drives the Dashboard)

> The magic moment: user asks a question in chat → AI calls tools → dashboard updates.

---

### 5.1 — Define tools for the AI

- [ ] **What:** Define tool schemas (JSON) that the AI can call: `analyseClient`, `runScenario`, `updateDashboard`. These are the bridge between chat and dashboard.
- **Why:** Tool calling is how the AI goes from "text output" to "drives the UI".
- **Inputs:** `docs/tool_definitions.md` for tool shapes. Vercel AI SDK tool calling docs.
- **Output:** `web/lib/ai/tools.ts` defining tool schemas and their server-side handler functions.
- **Prompt hint:** *"Define AI tool schemas for the Vercel AI SDK. Tools: (1) `analyseClient` — takes client income data, runs the tax engine, returns full analysis. (2) `runScenario` — takes a scenario (e.g., salary sacrifice amount), calculates before/after. (3) `updateDashboard` — takes a `relevantTaxData` object, updates the Zustand store. Define the schemas as Zod objects. Write handler functions that call my tax calculators from `web/lib/tax/`."*

---

### 5.2 — Wire tools to the API route

- [ ] **What:** Update the `/api/chat` route to register the tools and handle tool calls. When the AI calls a tool, execute it server-side and return the result.
- **Why:** Completes the chat → tool → response loop.
- **Inputs:** Tasks 5.1 + 2.1 complete.
- **Output:** Updated `/api/chat` route. The AI can now call tools mid-conversation.
- **Prompt hint:** *"Update my `/api/chat` route to support tool calling with the Vercel AI SDK. Register my tools from `web/lib/ai/tools.ts`. When the AI calls `analyseClient`, run the tax engine and return the result. When it calls `updateDashboard`, send the data to the client via a custom event so the frontend can update the Zustand store. Use `maxSteps: 3` so the AI can call multiple tools."*

---

### 5.3 — Frontend: handle tool results and update dashboard

- [ ] **What:** When the AI calls `updateDashboard`, the frontend receives the data and pushes it into the Zustand store. The dashboard updates in real-time.
- **Why:** The end-to-end loop: user asks → AI analyses → dashboard shows the answer.
- **Inputs:** Tasks 5.2 + 4.1-4.5 complete.
- **Output:** Typing "Analyse James Mitchell: £141,500 employment income, 2 kids, £8k pension" in the chat should produce a real dashboard with calculated numbers.
- **Prompt hint:** *"Wire up the frontend to handle tool call results from my AI chat. When the `useChat` hook receives a tool result from `updateDashboard`, extract the `relevantTaxData` payload and push it into the Zustand store using `setClientData()`. The dashboard cards should reactively update. Test: type a message asking to analyse a client with specific income, and verify the dashboard populates."*

---

### 5.4 — Chat: "what if" scenario flow

- [ ] **What:** When the user asks a "what if" question, the AI calls `runScenario`, calculates before/after, and updates the dashboard with the scenario card.
- **Why:** This is the killer feature — "what if I salary sacrifice £50k?" → instant answer with numbers.
- **Inputs:** Tasks 5.3 + 3.6 complete.
- **Output:** Asking "What if James salary sacrifices £50k?" in the chat should update the Scenario card with before/after comparison.
- **Prompt hint:** *"Update my AI tools so that when the user asks a 'what if' question (e.g., salary sacrifice, pension contribution), the AI calls `runScenario` which: (1) Takes the current client data from context, (2) Applies the scenario using my salary sacrifice calculator, (3) Returns before/after comparison, (4) Calls `updateDashboard` with the scenario data. Test with: 'What if James salary sacrifices £50k to pension?'"*

---

# MILESTONE 6 — Document Upload + Extraction

> Let advisers upload SA100/P60 PDFs and have the AI extract the data.

---

### 6.1 — File upload UI

- [ ] **What:** Add drag-and-drop file upload to the chat panel. Accept PDF files. Show upload progress and a file pill/chip in the message.
- **Why:** Advisers need to upload tax returns, not type numbers manually.
- **Inputs:** Task 1.2 (chat panel) complete.
- **Output:** Upload button + drag zone in chat input. Files show as chips. Clicking sends the file with the message.
- **Prompt hint:** *"Add file upload to my chat input. Support drag-and-drop and a paperclip button. Accept PDFs only (max 10MB). Show uploaded files as removable chips above the input. When the user sends a message with files, include the file data in the request. Use shadcn/ui and react-dropzone."*

---

### 6.2 — Backend: PDF text extraction

- [ ] **What:** API route (`/api/extract`) that accepts a PDF upload, extracts text using `pdf-parse` (or `pdfjs-dist`), and returns the raw text.
- **Why:** First step before the AI can understand a tax return.
- **Inputs:** None (standalone utility).
- **Output:** `POST /api/extract` → `{ text: string, pages: number }`. Works with SA100 and P60 test PDFs.
- **Prompt hint:** *"Create an API route at `/api/extract` that accepts a PDF file upload (multipart form data), extracts all text using `pdf-parse`, and returns `{ text, pageCount }`. Handle errors gracefully (corrupt PDF, too large, wrong file type). Add a 10MB file size limit."*

---

### 6.3 — AI-powered data extraction from tax returns

- [ ] **What:** Send the extracted PDF text to the AI with a specialised extraction prompt. The AI identifies and structures the data (income sources, tax paid, NI, etc.) into the `relevantTaxData` format.
- **Why:** AI is much better than regex at understanding messy PDF extractions.
- **Inputs:** Tasks 6.2 + 5.1 complete.
- **Output:** Upload a sample SA100 → AI extracts structured data → populates the store → dashboard shows the numbers. Include confidence scores on each extracted field.
- **Prompt hint:** *"When a user uploads a PDF in chat, extract the text server-side, then send it to the AI with a specialised prompt: 'Extract all UK tax data from this document into structured format. Identify: income sources, pension contributions, Gift Aid, tax paid, NI paid. Return as a relevantTaxData object. Flag confidence (high/medium/low) on each field. If uncertain, say so.' The AI should call `updateDashboard` with the extracted data."*

---

# MILESTONE 7 — Client Persistence

> Save client data to a database so it survives page refresh.

---

### 7.1 — Database schema + setup

- [ ] **What:** Set up PostgreSQL with Prisma. Schema: `Client` (name, tax year, data JSON), `Conversation` (messages, client FK), `Document` (filename, extracted data, client FK).
- **Why:** Without persistence, everything is lost on refresh.
- **Inputs:** None (infrastructure task).
- **Output:** Prisma schema, migration, seed script with Mitchell household example.
- **Prompt hint:** *"Set up Prisma with PostgreSQL in my Next.js app. Schema: Client (id, name, taxYear, taxData JSON, createdAt, updatedAt), Conversation (id, clientId FK, messages JSON, createdAt), Document (id, clientId FK, filename, extractedText, structuredData JSON, uploadedAt). Generate migration. Write a seed script that creates the Mitchell household with sample tax data."*

---

### 7.2 — Client CRUD API routes

- [ ] **What:** API routes: `GET/POST /api/clients`, `GET/PUT /api/clients/[id]`, `GET /api/clients/[id]/conversations`.
- **Why:** The client selector dropdown needs to load and save real data.
- **Inputs:** Task 7.1 complete.
- **Output:** Working CRUD routes. The top bar client selector loads from the database.
- **Prompt hint:** *"Create CRUD API routes for clients using Prisma: GET /api/clients (list all), POST /api/clients (create), GET /api/clients/[id] (get one with tax data), PUT /api/clients/[id] (update). Also GET /api/clients/[id]/conversations to list past chats. Wire the top bar client selector to load from GET /api/clients."*

---

### 7.3 — Conversation persistence

- [ ] **What:** Save chat messages to the database per client. Load conversation history when switching clients.
- **Why:** Advisers need to continue where they left off.
- **Inputs:** Tasks 7.2 + 2.2 complete.
- **Output:** Messages persist across page refresh. Switching clients loads their conversation. New conversation button.
- **Prompt hint:** *"Persist chat messages to the database. After each message exchange, save the updated messages array to the Conversation model. When the user selects a client from the dropdown, load their most recent conversation and populate the chat. Add a 'New conversation' button that starts fresh for the same client."*

---

# MILESTONE 8 — Chrome Extension (MVP)

> Build the companion extension that captures data from financial platforms.

---

### 8.1 — Extension scaffold

- [ ] **What:** Set up the Chrome extension with Manifest V3: popup (React), background service worker, content script placeholder. Extension icon.
- **Why:** Gets the extension loading in Chrome so we can build features on top.
- **Inputs:** Task 0.1 (monorepo structure already has `extension/`).
- **Output:** Load the unpacked extension in Chrome → see a popup that says "Helio" with the logo and a "No client detected" message.
- **Prompt hint:** *"Build a Chrome Manifest V3 extension in my monorepo's `extension/` workspace. React + Tailwind popup (match the web app styles using our shared Tailwind preset). Background service worker (empty for now). Content script (empty for now). Use the Helio branding. Popup shows: 'Helio' header, 'No client detected' message, and a disabled 'Analyse in Helio' button. Add a build script that outputs to `extension/dist/`."*

---

### 8.2 — Extension: popup UI

- [ ] **What:** Build the popup with: detected client info area, "Analyse in Helio" button, quick action buttons (Bed & ISA, CGT check), and connection status to the web app.
- **Why:** The popup is the user-facing surface of the extension.
- **Inputs:** Task 8.1 complete.
- **Output:** A polished popup matching the designs from `ideas_helio_mvp.md`. All buttons disabled until a platform page is detected.
- **Prompt hint:** *"Build the extension popup UI in React + Tailwind. Layout: (1) Header: 'Helio' logo + connection dot (green = connected to web app, red = not). (2) Client area: 'Client detected: [name]' or 'No client detected'. (3) Data summary: bullet list of what was captured (ISA, SIPP, GIA amounts). (4) Buttons: 'Analyse in Helio' (primary), 'Bed & ISA Check' (secondary), 'Add to Client File' (secondary). All disabled when no data detected. Match the web app's colour scheme."*

---

### 8.3 — Extension: content script for platform detection

- [ ] **What:** Write a content script that detects when the user is on a supported platform (start with a mock/test page). Extract client name and holdings data from the DOM.
- **Why:** This is the core value of the extension — automatically capturing data.
- **Inputs:** Task 8.1 complete.
- **Output:** Content script that: (1) detects the platform, (2) extracts data, (3) sends it to the popup via `chrome.runtime.sendMessage`. Build a test HTML page that mimics a platform's portfolio view.
- **Prompt hint:** *"Create a content script for my Chrome extension. First, create a test HTML page (`extension/test/mock-platform.html`) that mimics a portfolio page with: client name, ISA balance, SIPP balance, GIA balance with unrealised gains. Then write a content script that: detects when on this page, extracts the data using DOM selectors, and sends it to the background script via chrome.runtime.sendMessage. The popup should update to show the detected data."*

---

### 8.4 — Extension ↔ Web app communication

- [ ] **What:** When the user clicks "Analyse in Helio", open the web app in a new tab with the captured data as URL parameters (or POST to an API route). The web app receives the data and pre-populates the store.
- **Why:** The handoff from extension to web app — the bridge that makes the hybrid work.
- **Inputs:** Tasks 8.3 + 7.2 complete.
- **Output:** Click "Analyse in Helio" on the mock platform page → web app opens with the client data pre-loaded → dashboard shows the captured holdings.
- **Prompt hint:** *"Wire up the 'Analyse in Helio' button in my extension. When clicked: (1) Take the captured platform data from the content script. (2) POST it to `/api/clients/import` on the web app (create this route). (3) The route creates/updates the client and returns a client ID. (4) Open a new tab to `http://localhost:3000/client/[id]`. (5) The web app loads the client data and populates the dashboard. Handle: web app not running (show error), data already exists for this client (merge)."*

---

# MILESTONE 9 — Polish + Quality of Life

> Refinements that make it feel like a real product.

---

### 9.1 — Loading states and skeletons

- [ ] **What:** Add loading skeletons to all dashboard cards and the chat. Show shimmer placeholders while data loads.
- **Why:** Feels polished and professional instead of jarring content pops.
- **Inputs:** Tasks 4.2-4.5 complete.
- **Output:** Every card shows a skeleton on initial load. Chat shows typing indicator properly.
- **Prompt hint:** *"Add skeleton loading states to all my dashboard cards using shadcn/ui Skeleton. When the tax store has no data, show appropriate shimmer placeholders: fake bar chart bars, fake progress bars, fake text lines. Add a proper typing indicator (animated dots) to the chat when the AI is responding. Ensure smooth transitions when data arrives."*

---

### 9.2 — Error handling and edge cases

- [ ] **What:** Handle: AI API errors, PDF upload failures, empty responses, invalid tax data, network offline.
- **Why:** Real users will hit every edge case.
- **Inputs:** All milestone 2-6 tasks.
- **Output:** Toast notifications for errors. Retry buttons. Graceful fallbacks.
- **Prompt hint:** *"Add comprehensive error handling: (1) AI API errors → show toast with 'Failed to get response, try again' + retry button. (2) PDF upload fails → show inline error on the file chip. (3) Tax calculation returns NaN → show 'Unable to calculate' with debug info. (4) Network offline → show banner at top. Use shadcn/ui Toast. Add a global error boundary. Make sure the app never shows a blank screen."*

---

### 9.3 — Responsive design and mobile

- [ ] **What:** Make the app work on tablet and mobile. Stack panels vertically on small screens with a tab switcher.
- **Why:** Advisers use iPads in meetings.
- **Inputs:** Task 1.1 layout.
- **Output:** Below 768px: panels stack, tab bar (Chat | Dashboard) at bottom. Tablet: side-by-side works but with adjusted widths.
- **Prompt hint:** *"Make my two-panel layout responsive. Desktop (>1024px): side-by-side as-is. Tablet (768-1024px): side-by-side but 50/50 split, smaller fonts. Mobile (<768px): full-width panels with a bottom tab bar to switch between Chat and Dashboard. Use Tailwind responsive prefixes. Test that all dashboard cards and the chat work on mobile viewport."*

---

### 9.4 — Dark mode

- [ ] **What:** Toggle between light and dark mode. Persist preference. Respect system preference by default.
- **Why:** Many advisers work long hours; dark mode reduces eye strain.
- **Inputs:** Task 0.3 (design tokens already have dark mode CSS variables).
- **Output:** Toggle in the top bar settings. All components look good in both modes.
- **Prompt hint:** *"Add dark mode toggle using next-themes. Settings icon in top bar opens a dropdown with Light/Dark/System options. All shadcn/ui components already support dark mode. Make sure my custom dashboard cards, charts (Recharts), and chat bubbles look good in both modes. Persist preference in localStorage."*

---

### 9.5 — PDF export of analysis

- [ ] **What:** "Export as PDF" button on the dashboard that generates a client-ready report.
- **Why:** Advisers need to share the analysis with clients or keep it on file.
- **Inputs:** Tasks 4.2-4.5 (dashboard cards).
- **Output:** A PDF with: client name, date, tax summary, allowances tracker, alerts, and scenario comparison. Professional formatting.
- **Prompt hint:** *"Add an 'Export PDF' button to the dashboard. Use @react-pdf/renderer or html2canvas + jsPDF to generate a PDF report containing: (1) Header: Helio logo, client name, tax year, date. (2) Tax Summary section. (3) Allowances Tracker section. (4) Key Alerts. (5) Scenario Comparison (if active). (6) Footer: disclaimer that this is for informational purposes. Style it professionally."*

---

# MILESTONE 10 — Advanced Intelligence

> Beyond MVP — the features that make Helio truly powerful.

---

### 10.1 — Scottish rate comparison

- [ ] **What:** If a client is in Scotland, show a comparison card: "You pay £X more/less than if you lived in England."
- **Inputs:** Task 3.1 (income tax calc handles Scottish rates). Task 4.1 (store).
- **Output:** `<ScottishComparisonCard />` showing side-by-side band breakdown.

### 10.2 — Year-end planning checklist

- [ ] **What:** Auto-generated checklist based on client data: "ISA not maxed — £12k remaining", "Pension AA expiring — £35k unused carry forward from 2022/23", etc.
- **Inputs:** Tasks 3.1-3.7 (all calculators). Store.
- **Output:** `<YearEndChecklistCard />` with actionable items and deadlines.

### 10.3 — Multi-scenario comparison

- [ ] **What:** Compare 2-3 scenarios side by side (e.g., salary sacrifice £30k vs £50k vs £60k).
- **Inputs:** Task 4.5 (scenario card).
- **Output:** Table/chart comparing multiple "what if" options.

### 10.4 — IHT estimator dashboard card

- [ ] **What:** Estate value, NRB/RNRB, projected IHT liability, gift tracking.
- **Inputs:** IHT rules from `docs/tax_reference.md`.
- **Output:** `<IHTCard />` with estate breakdown and projected liability.

### 10.5 — Director remuneration optimiser

- [ ] **What:** Calculate optimal salary + dividend split for company directors.
- **Inputs:** Corporation tax rates, dividend tax rates.
- **Output:** `<DirectorRemunerationCard />` showing optimal split.

---

# Quick Reference: Task Dependency Graph

```
0.1 → 0.2 → 0.3
                 ↘
                  1.1 → 1.2 → 2.1 → 2.2 → 2.3 → 2.4
                   ↓      ↘
                  1.3      6.1 → 6.2 → 6.3
                   ↓
                  1.4
                   ↓
              3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6 → 3.7 → 3.8
                                                              ↓
              4.1 → 4.2 → 4.3 → 4.4 → 4.5 ←────────────────┘
                                         ↓
              5.1 → 5.2 → 5.3 → 5.4
                              ↓
              7.1 → 7.2 → 7.3
                         ↓
              8.1 → 8.2 → 8.3 → 8.4
                                   ↓
              9.1 → 9.2 → 9.3 → 9.4 → 9.5
                                         ↓
              10.1 → 10.2 → 10.3 → 10.4 → 10.5
```

Note: Milestones 3 (tax engine) and 1-2 (UI + chat) can be built **in parallel** by different people or in alternating sessions. They converge at Milestone 4.

---

# Estimated Effort

| Milestone | Tasks | Est. Sessions | Focus |
|-----------|-------|---------------|-------|
| 0: Scaffold | 3 | 1-2 | Setup |
| 1: Shell | 4 | 2-3 | UI |
| 2: Chat + AI | 4 | 2-3 | Backend + Frontend |
| 3: Tax Engine | 8 | 4-5 | Pure logic |
| 4: Dashboard | 5 | 2-3 | Data binding |
| 5: Tool Calling | 4 | 3-4 | Integration |
| 6: Doc Upload | 3 | 2-3 | Feature |
| 7: Persistence | 3 | 2-3 | Infrastructure |
| 8: Extension | 4 | 3-4 | Separate app |
| 9: Polish | 5 | 3-4 | Quality |
| 10: Advanced | 5 | 4-5 | Features |
| **Total** | **48** | **~28-39** | |

Each "session" = one focused AI-assisted building session (1-3 hours).

---

*Last updated: 16 Feb 2026*
