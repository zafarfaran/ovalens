# Dashboard Enrichment v2 — Design

> Enriching the Intelligence Panel with expandable observation savings breakdowns, a Scenarios tab with what-if modelling, and documenting future enhancements.

---

## Scope

### Now (this sprint)
1. **Enhanced Observations** — expandable savings breakdown cards with math, actions, and scenario linking
2. **Scenarios Tab** — before/after comparison, AI-generated + manual quick-model slider

### Later (documented for future pickup)
3. Income Breakdown Tab — source table, donut chart, income ordering stack
4. Full Tax Computation Tab — income tax by band, NI by class, dividend tax, HICBC, ANI, total summary
5. Interactive Charts — install Recharts for waterfall, donut, grouped bar charts
6. Component Extraction — break page.tsx into separate files per tab

---

## Architecture Decision

**Approach A: Inline Enhancement** — build directly in `page.tsx` matching the existing pattern. No file restructuring. The 2,120-line file grows to ~2,600 lines, but ships fast. Component extraction is a separate future task.

---

## 1. Enhanced Observations

### Current State
Observation cards show: severity icon, title, description, category chip, potentialSaving (small emerald text), and action text. Cards are flat — no expand/collapse.

### Design

#### 1.1 Total Potential Savings Banner
At the top of the Observations tab, a prominent banner:

```
┌─ Total Potential Savings ─────────────────────────────┐
│  £13,098/yr  │  £1,091/mo  │  4 actionable findings  │
└───────────────────────────────────────────────────────┘
```

Sums `potentialSaving` across all observations. Shows annual and monthly figures plus count of actionable items (severity != "info").

#### 1.2 Expandable Observation Cards
Each card gets a chevron toggle. Collapsed = current design. Expanded reveals:

**Savings Breakdown Panel:**
- Current state vs recommended action (key-value pairs)
- Tax impact table (income tax saved, NI saved, total annual, total monthly)
- Cost note (e.g., "Net take-home reduces by X but pension pot grows by Y")
- Effective relief percentage where applicable

**Action Buttons:**
- "Model This Scenario" — injects a pre-built prompt into the chat input (e.g., "Model salary sacrifice at £18,860 for this client") which triggers the salary sacrifice tool, populates the Scenarios tab, and auto-switches to it
- "Copy Summary" — copies a plain-text summary to clipboard for client communications

#### 1.3 Expand/Collapse Animation
- `framer-motion` `AnimatePresence` with `initial={{ height: 0, opacity: 0 }}` → `animate={{ height: "auto", opacity: 1 }}`
- Chevron rotates 180 degrees on toggle

#### 1.4 Data Shape — Enhanced Observation

The Python engine's `observations.py` needs to return richer data:

```typescript
interface ObservationSavingsBreakdown {
  currentState: { label: string; value: string }[];
  recommendedAction: { label: string; value: string }[];
  taxImpact: { label: string; annual: number; monthly: number }[];
  totalAnnual: number;
  totalMonthly: number;
  costNote?: string;
  effectiveRelief?: number;
  modelPrompt?: string;
}

// Added to existing Observation interface
interface Observation {
  // ... existing fields ...
  savingsBreakdown?: ObservationSavingsBreakdown;
}
```

#### 1.5 Which observations get breakdowns

Not all observations need a savings breakdown. The following do:

| Observation | Has Breakdown | Why |
|-------------|:---:|-----|
| 60% tax trap (PA taper) | Yes | Show pension sacrifice to escape the trap |
| PA fully lost | Yes | Show pension sacrifice to restore PA |
| HICBC clawback | Yes | Show income reduction to avoid charge |
| Pension headroom | Yes | Show tax relief on additional contributions |
| ISA unused | No | No calculation needed, just a reminder |
| CGT AEA unused | No | No calculation needed, just a reminder |

Info-severity observations ("ISA reminder") stay as simple cards — no expand.

---

## 2. Scenarios Tab

### Current State
- `Scenario` type exists in `packages/shared/src/types/scenarios.ts`
- `model_salary_sacrifice` tool exists in `apps/api/app/tax/salary_sacrifice.py`
- Tab type is `"overview" | "allowances" | "observations"` — no "scenarios" value
- No UI, no SSE event, no state management for scenarios

### Design

#### 2.1 Tab Addition
Add `"scenarios"` to the `activeTab` union type. Tab order becomes:

```
[Overview]  [Allowances]  [Scenarios]  [Observations]
```

Scenarios before Observations because it's the "do something about it" tab that observations link to.

#### 2.2 Empty State
When no scenarios exist yet:

```
┌─ No Scenarios Yet ──────────────────────────────────┐
│                                                      │
│  🔮  Ask Claude to model a scenario:                │
│                                                      │
│  "What if I increase pension sacrifice to £20k?"     │
│  "Model salary sacrifice at £18,860"                 │
│  "What's the optimal sacrifice to restore my PA?"    │
│                                                      │
│  Or use the Quick Model slider below:                │
│                                                      │
│  [Quick Model panel...]                              │
└──────────────────────────────────────────────────────┘
```

#### 2.3 Scenario List
When scenarios exist, a horizontal scrollable list at the top:

```
┌─ Scenarios ─────────────────────────────────────────┐
│  ● Current Position    ○ Sacrifice £18k (saves £5k) │
│                        ○ Max sacrifice (saves £12k) │
└─────────────────────────────────────────────────────┘
```

Clicking a scenario shows its before/after comparison below.

#### 2.4 Before / After Comparison
Side-by-side glass cards:

| Field | Current | Proposed | Delta |
|-------|--------:|--------:|------:|
| Gross Income | £195,500 | £195,500 | — |
| Pension Sacrifice | £6,000 | £18,000 | +£12,000 |
| ANI | £189,500 | £177,500 | -£12,000 |
| Personal Allowance | £0 | £0 | — |
| Income Tax | £51,832 | £47,032 | -£4,800 |
| NI (Employee) | £5,151 | £4,911 | -£240 |
| HICBC | £2,213 | £2,213 | — |
| Total Tax | £59,196 | £54,156 | -£5,040 |
| Net Take-Home | £136,304 | £129,344 | -£6,960 |
| Into Pension | £6,000 | £18,000 | +£12,000 |

Delta column: green text for savings, amber for costs, grey for no change.

#### 2.5 Net Impact Summary
Below the comparison:

```
┌─ Net Impact ────────────────────────────────────────┐
│                                                      │
│  Tax Saved:           £5,040/yr    £420/mo           │
│  NI Saved:            £240/yr      £20/mo            │
│  Employer NI Saved:   £1,656/yr    £138/mo           │
│  ───────────────────────────────────                 │
│  Total Tax Benefit:   £6,936/yr    £578/mo           │
│                                                      │
│  Take-Home Reduced:   -£6,960/yr   -£580/mo          │
│  Extra Into Pension:  +£12,000/yr  +£1,000/mo        │
│                                                      │
│  For every £1 of take-home sacrificed,               │
│  £1.72 goes into the pension pot.                    │
│  Effective relief: 172%                              │
└──────────────────────────────────────────────────────┘
```

#### 2.6 Quick Model Slider
A collapsible section with:
- Range slider: £0 → max annual allowance (£60,000)
- Current value displayed
- "Calculate Impact" button
- Calls the backend salary sacrifice tool and adds the result as a new scenario

#### 2.7 Data Flow

**AI-generated scenarios:**
1. Adviser asks Claude to model something → Claude calls `model_salary_sacrifice` tool
2. Backend computes before/after → returns structured data
3. SSE pipeline sends a `scenario_update` event (new event type)
4. Frontend appends to `scenarios` state array → auto-switches to Scenarios tab

**Manual Quick Model:**
1. User adjusts slider → clicks "Calculate Impact"
2. Frontend sends a chat message like "Model salary sacrifice at £X for this client"
3. Claude processes it through the normal tool-calling pipeline
4. Same SSE flow as above

**From observations:**
1. User clicks "Model This Scenario" on an observation
2. Pre-built prompt is injected into the chat input and auto-submitted
3. Same flow as AI-generated

#### 2.8 Scenario Data Shape

```typescript
interface ScenarioData {
  id: string;
  name: string;
  description: string;
  current: {
    grossIncome: number;
    pensionSacrifice: number;
    ani: number;
    personalAllowance: number;
    incomeTax: number;
    ni: number;
    hicbc: number;
    totalTax: number;
    netTakeHome: number;
  };
  proposed: {
    grossIncome: number;
    pensionSacrifice: number;
    ani: number;
    personalAllowance: number;
    incomeTax: number;
    ni: number;
    hicbc: number;
    totalTax: number;
    netTakeHome: number;
  };
  savings: {
    incomeTax: number;
    ni: number;
    employerNi: number;
    hicbc: number;
    total: number;
  };
  netPayImpact: { annual: number; monthly: number };
  pensionImpact: { before: number; after: number; extra: number };
  effectiveRelief: number;
}
```

#### 2.9 State Management

```typescript
// In page.tsx, add:
const [scenarios, setScenarios] = useState<ScenarioData[]>([]);
const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

// Extend activeTab type:
type TabType = "overview" | "allowances" | "scenarios" | "observations";
```

---

## 3. Backend Changes Required

### 3.1 Enhanced observations.py
Each observation that has a savings calculation should include a `savings_breakdown` dict:

```python
@dataclass
class SavingsBreakdown:
    current_state: list[dict]       # [{"label": "Pension sacrifice", "value": "£6,000"}]
    recommended_action: list[dict]  # [{"label": "Increase to", "value": "£18,860"}]
    tax_impact: list[dict]          # [{"label": "Income tax saved", "annual": 6285, "monthly": 524}]
    total_annual: float
    total_monthly: float
    cost_note: str | None
    effective_relief: float | None
    model_prompt: str | None        # Pre-built prompt for "Model This Scenario"
```

### 3.2 Scenario SSE event
The `model_salary_sacrifice` tool result needs to be sent as a `scenario_update` SSE event in addition to (or instead of) being embedded in the assistant message. This ensures the Scenarios tab auto-populates.

### 3.3 salary_sacrifice.py output mapping
The existing output needs to map to the `ScenarioData` shape above. The `_position_to_dashboard()` pattern in `tax_engine.py` can be followed.

---

## 4. Styling

All new UI follows the existing glass-morphism pattern:
- `bg-white/50 dark:bg-slate-900/50`
- `border border-slate-200/40`
- `backdrop-blur-sm`
- `rounded-xl`
- Severity accents: red for critical, amber for warning, emerald for opportunity/savings
- Numbers in tabular-nums font
- Currency formatting: `£X,XXX` with commas
- Animations: framer-motion spring transitions matching existing panel animations

---

## 5. Future Enhancements (Documented for Later)

### 5.1 Income Breakdown Tab
- Source table: employment, rental, dividends with gross/expenses/net/percentage
- Donut chart showing income composition (needs Recharts)
- Income ordering stack: non-savings → savings → dividends

### 5.2 Full Tax Computation Tab
- Income tax by band table (Basic/Higher/Additional or Scottish 6-band)
- Dividend tax table
- NI by class table (Class 1 or Class 2+4)
- HICBC detail table
- ANI + PA taper breakdown with visual indicator
- Total tax summary ("mini SA100")

### 5.3 Interactive Charts (Recharts)
- Waterfall chart: gross → deductions → taxable → tax → net (Summary tab)
- Donut chart: income source composition (Income tab)
- Grouped bar: scenario before/after comparison (Scenarios tab)
- Install: `npm install recharts`

### 5.4 Component Extraction
- Break `page.tsx` into: `IntelligencePanel.tsx`, `SummaryTab.tsx`, `IncomeTab.tsx`, `TaxTab.tsx`, `AllowancesTab.tsx`, `ScenariosTab.tsx`, `ObservationsTab.tsx`
- Shared components: `DataTable.tsx`, `MiniStat.tsx`, `ProgressBar.tsx`

### 5.5 Additional Features
- Full-width panel toggle (sidebar → full-screen mode)
- PDF/print export for client reports
- Year-on-year comparison
- Dedicated `/dashboard/:clientId` route

---

## Implementation Priority

| # | Feature | Effort | Impact |
|---|---------|--------|--------|
| 1 | Observations: total savings banner | Low | High |
| 2 | Observations: expandable cards with breakdown | Medium | High |
| 3 | Observations: "Model This Scenario" button | Low | High |
| 4 | Backend: enrich observations with savingsBreakdown | Medium | High |
| 5 | Scenarios tab: empty state + tab type | Low | Medium |
| 6 | Scenarios tab: before/after comparison UI | Medium | Very High |
| 7 | Scenarios tab: net impact summary | Low | High |
| 8 | Scenarios tab: scenario list (multiple) | Medium | High |
| 9 | Scenarios tab: Quick Model slider | Medium | High |
| 10 | Backend: scenario SSE event | Medium | High |
| 11 | Wire "Model This Scenario" → Scenarios tab | Low | High |
