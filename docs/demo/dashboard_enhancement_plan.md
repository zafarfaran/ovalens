# Dashboard Enhancement Plan

> Turning the Intelligence Panel from a summary view into a detailed, adviser-grade tax analysis dashboard.

---

## What Exists Today

The Intelligence Panel is a **420px slide-over sidebar** with 3 tabs:

| Tab | What it shows | How it shows it |
|-----|--------------|-----------------|
| **Overview** | Tax breakdown by band + NI + HICBC + total | Stacked color bar + card rows |
| **Allowances** | 5 allowance utilisations (PA, ISA, Pension AA, CGT, Dividend) | Progress bars with % |
| **Observations** | AI-detected insights with severity | Severity-coded cards |

**Header**: 4 MiniStat cards — Gross income, Tax liability, Effective rate, Net income.

**What's not there**:
- No income breakdown by source
- No adjusted net income / PA taper display
- No NI breakdown (Class 1 vs 2 vs 4)
- No dividend tax or savings tax sections
- No tables anywhere — everything is cards
- No charts (zero charting libraries)
- No scenarios tab (type exists, UI doesn't)
- No potential savings shown on observations
- No waterfall view (gross → deductions → taxable → tax → net)
- No year-on-year comparison
- No export or print-friendly view

---

## The Enhancement Strategy

Rather than cramming everything into a 420px sidebar, the approach is:

1. **Widen the panel** — or make it full-screen toggleable (sidebar → full-width mode)
2. **Add more tabs** — go from 3 to 6 tabs
3. **Add proper tables** within tabs alongside the existing visual cards
4. **Add one charting library** for proper visualizations
5. **Expand the data shape** — feed richer data from the deterministic tax engine

---

## Proposed Tab Structure

```
Current:  [Overview]  [Allowances]  [Observations]

Proposed: [Summary]  [Income]  [Tax]  [Allowances]  [Scenarios]  [Observations]
```

### Tab 1: Summary (enhanced "Overview")

The at-a-glance view. Replaces the current Overview tab with a richer layout.

**Top section — Key figures grid (2×3)**:
| Gross Income | Total Tax | Effective Rate |
|:---:|:---:|:---:|
| £195,500 | £55,481 | 28.4% |
| **Taxable Income** | **Net Income** | **Marginal Rate** |
| £177,500 | £140,019 | 47% |

**Middle section — Tax waterfall**:

A horizontal stacked bar or mini waterfall chart showing how gross income becomes net income:

```
Gross     ████████████████████████████████████████  £195,500
          ├─ Income Tax ─────────────┤
          │  -£46,501                │
          ├─ NI ──────┤              │
          │  -£4,911  │              │
          ├─ HICBC ─┤ │              │
          │  -£2,213 │ │              │
Net       ████████████████████████████              £141,875
```

**Bottom section — Observations summary**:

Just the top 2-3 observations with potential savings highlighted, linking to the Observations tab.

| # | Observation | Potential Saving |
|---|-------------|-----------------|
| 1 | 60% tax trap — PA fully lost | £6,285/yr via pension sacrifice |
| 2 | HICBC full clawback | £2,213/yr if income ≤ £60k |
| 3 | ISA allowance unused | £4,000/yr tax-free growth |

**Data needed from engine**:
```typescript
// Already available from compute_tax_position output
totalIncome, taxableIncome, incomeTax, nationalInsurance,
hicbc, totalTax, effectiveRate, marginalRate, netIncome
// Plus the top observations with potentialSaving
```

---

### Tab 2: Income (NEW)

Shows where the money comes from. This is completely missing today.

**Section 1 — Income source breakdown table**:

| Source | Gross | Expenses | Net | % of Total |
|--------|------:|--------:|----:|-----------:|
| Employment (Meridian Partners) | £145,000 | — | £145,000 | 74.2% |
| Rental (2 BTL properties) | £24,000 | £6,000 | £18,000 | 9.2% |
| Dividends (ISA + GIA) | £32,500 | — | £32,500 | 16.6% |
| **Total** | **£201,500** | **£6,000** | **£195,500** | **100%** |

**Section 2 — Income composition donut chart**:

A donut chart showing the split: Employment (74%), Rental (9%), Dividends (17%). Each segment is clickable to show detail.

**Section 3 — Income ordering stack** (the technical bit advisers care about):

Shows how income is ordered for tax purposes (non-savings → savings → dividends):

| Layer | Amount | Fills Bands |
|-------|-------:|-------------|
| Non-savings (employment + rental) | £163,000 | Basic → Higher → Additional |
| Savings income | £0 | (PSA: £0 at additional rate) |
| Dividends | £32,500 | Additional rate (£500 allowance) |

**Data needed from engine**:
```typescript
interface IncomeBreakdown {
  sources: {
    type: string;        // "employment" | "rental" | "dividends" | etc.
    label: string;       // "Meridian Partners LLP"
    gross: number;
    expenses: number;
    net: number;
  }[];
  ordering: {
    nonSavings: number;
    savings: number;
    dividends: number;
  };
  totalGross: number;
  totalExpenses: number;
  totalNet: number;
}
```

---

### Tab 3: Tax (enhanced "Overview" detail)

The meaty tab. Full tax computation broken down in tables.

**Section 1 — Income Tax by Band table**:

For England:

| Band | Taxable Income | Rate | Tax |
|------|---------------:|-----:|----:|
| Personal Allowance | £0 | 0% | £0 |
| Basic Rate | £37,700 | 20% | £7,540 |
| Higher Rate | £74,870 | 40% | £29,948 |
| Additional Rate | £52,430 | 45% | £23,594 |
| **Total Income Tax** | **£165,000** | | **£61,082** |

For Scottish clients, show the 6-band table instead (Starter → Advanced).

**Section 2 — Dividend Tax table**:

| Band | Dividends | Rate | Tax |
|------|----------:|-----:|----:|
| Dividend Allowance | £500 | 0% | £0 |
| At Additional Rate | £32,000 | 39.35% | £12,592 |
| **Total Dividend Tax** | **£32,500** | | **£12,592** |

**Section 3 — National Insurance table**:

| Class | Earnings Band | Rate | Amount |
|-------|--------------|-----:|-------:|
| Class 1 — main rate | £12,570 – £50,270 | 8% | £3,016 |
| Class 1 — upper rate | £50,270 – £145,000 | 2% | £1,895 |
| **Total Employee NI** | | | **£4,911** |
| Employer NI | £9,100 – £145,000 | 13.8% | £18,753 |

Show Class 4 + Class 2 rows instead if self-employed.

**Section 4 — HICBC table** (if applicable):

| Item | Value |
|------|------:|
| Child Benefit (2 children) | £2,213/yr |
| Higher earner's ANI | £177,500 |
| Clawback percentage | 100% |
| **HICBC charge** | **£2,213** |
| Net benefit retained | £0 |

**Section 5 — Adjusted Net Income breakdown**:

| Item | Amount |
|------|-------:|
| Total income | £195,500 |
| Less: Pension contributions (gross) | -£18,000 |
| Less: Gift Aid (grossed up) | £0 |
| **Adjusted Net Income** | **£177,500** |
| PA threshold | £100,000 |
| PA taper zone | £100,000 – £125,140 |
| **Personal Allowance** | **£0** (fully lost) |

With a visual indicator: `🔴 PA fully lost — ANI exceeds £125,140`

**Section 6 — Total Tax Summary table** (the "mini SA100"):

| Component | Amount |
|-----------|-------:|
| Income Tax (non-savings) | £61,082 |
| Dividend Tax | £12,592 |
| National Insurance (employee) | £4,911 |
| HICBC | £2,213 |
| Student Loan repayment | £0 |
| **Total tax liability** | **£80,798** |
| Effective rate | 41.3% |
| Marginal rate | 47% |

**Data needed from engine** (most already planned):
```typescript
interface TaxDetail {
  incomeTaxBands: { band: string; income: number; rate: number; tax: number }[];
  dividendBands: { band: string; income: number; rate: number; tax: number }[];
  niBands: { class: string; band: string; rate: number; amount: number }[];
  hicbc: { applies: boolean; benefit: number; clawback_pct: number; charge: number; net: number };
  ani: { total_income: number; pension: number; gift_aid: number; ani: number; pa: number; pa_status: string };
  summary: { income_tax: number; dividend_tax: number; ni: number; hicbc: number; student_loan: number; total: number };
}
```

---

### Tab 4: Allowances (enhanced)

Keep the existing progress bars, but add a detail table below each one.

**Enhanced allowance card** (example: Pension Annual Allowance):

```
┌─────────────────────────────────────────────┐
│  Pension Annual Allowance                    │
│  ████████████░░░░░░░░░░░░  £18,000 / £60,000│
│  30% used · £42,000 remaining                │
│                                              │
│  ┌─ Carry Forward ─────────────────────────┐ │
│  │ 2024/25  £60,000 AA  £15,000 used  £45k │ │
│  │ 2023/24  £60,000 AA  £14,000 used  £46k │ │
│  │ 2022/23  £40,000 AA  £12,000 used  £28k │ │
│  │ Total carry forward available:    £119k  │ │
│  └──────────────────────────────────────────┘ │
│  Total available (AA + CF): £179,000         │
│  Remaining headroom: £161,000                │
└─────────────────────────────────────────────┘
```

**Allowances summary table** (new, at the top):

| Allowance | Limit | Used | Remaining | Status |
|-----------|------:|-----:|----------:|--------|
| Personal Allowance | £12,570 | £12,570 | £0 | 🔴 Lost (taper) |
| ISA | £20,000 | £0 | £20,000 | ⚪ Unused |
| Pension AA | £60,000 | £18,000 | £42,000 | 🟢 30% |
| CGT Annual Exempt | £3,000 | £0 | £3,000 | ⚪ Unused |
| Dividend Allowance | £500 | £500 | £0 | 🔴 Fully used |
| **Savings PSA** | **£0** | **—** | **£0** | 🔴 None (additional rate) |

Note the addition of the **Personal Savings Allowance** which is rate-dependent (£1,000 for basic, £500 for higher, £0 for additional).

**Data needed from engine**:
```typescript
interface AllowanceDetail {
  name: string;
  annualLimit: number;
  used: number;
  remaining: number;
  status: "unused" | "partial" | "full" | "lost";
  carryForward?: {
    year: string;
    available: number;
    used: number;
    unused: number;
  }[];
  notes?: string;  // e.g., "Lost due to PA taper" or "£0 at additional rate"
}
```

---

### Tab 5: Scenarios (NEW — replaces nothing)

The `Scenario` type already exists in shared types but has zero UI. This is where "what-if" modelling lives.

**Layout: Before / After comparison**:

```
┌─ Current Position ──────────────┬─ Proposed Position ─────────────┐
│                                 │                                 │
│  Gross: £195,500                │  Gross: £195,500                │
│  Pension sacrifice: £6,000      │  Pension sacrifice: £18,000 ⬆   │
│  ANI: £189,500                  │  ANI: £177,500                  │
│  PA: £0 (lost)                  │  PA: £0 (still lost)            │
│  Income tax: £51,832            │  Income tax: £47,032  ✅ -£4,800│
│  NI: £5,151                     │  NI: £4,911  ✅ -£240           │
│  HICBC: £2,213                  │  HICBC: £2,213                  │
│  Total tax: £59,196             │  Total tax: £54,156             │
│                                 │                                 │
│  Net take-home: £136,304        │  Net take-home: £129,344        │
│  Pension pot: £6,000            │  Pension pot: £18,000  ⬆ +£12k  │
│                                 │                                 │
└─────────────────────────────────┴─────────────────────────────────┘

┌─ Net Impact ────────────────────────────────────────────────────────┐
│                                                                     │
│  Tax saved:       £5,040                                            │
│  Net pay reduced: -£6,960                                           │
│  Extra into pension: £12,000                                        │
│  Effective pension relief: 141.7%                                   │
│  ─────────────────────────────                                      │
│  For every £1 of take-home sacrificed,                              │
│  £1.72 goes into the pension pot.                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

**Savings breakdown table**:

| Saving Type | Annual | Monthly |
|-------------|-------:|--------:|
| Income tax saved | £4,800 | £400 |
| NI saved (employee) | £240 | £20 |
| HICBC avoided | £0 | £0 |
| NI saved (employer) | £1,656 | £138 |
| **Total tax benefit** | **£6,696** | **£558** |

**Multiple scenarios list** (sidebar within the tab):

The adviser can ask Claude to model multiple scenarios. Each gets saved and listed:

| Scenario | Sacrifice | Tax Saved | |
|----------|----------:|----------:|-|
| Current position | £6,000 | — | Active |
| Increase to £18k | £18,000 | £5,040 | ✅ Best |
| Max (to PA restore) | £34,360 | £12,680 | Aggressive |

**Data needed from engine**:
```typescript
// Already defined in salary_sacrifice.py output from the deterministic engine plan
interface ScenarioComparison {
  current: FullTaxPosition;
  proposed: FullTaxPosition;
  savings: {
    incomeTax: number;
    ni: number;
    hicbc: number;
    employerNi: number;
    total: number;
  };
  netPayImpact: {
    annual: number;
    monthly: number;
  };
  pensionImpact: {
    before: number;
    after: number;
    extraIntoPot: number;
  };
  effectiveRelief: number;
}
```

---

### Tab 6: Observations (enhanced)

Keep the existing severity-coded cards, but add:

**Section 1 — Summary table** (new, at top):

| # | Observation | Severity | Potential Saving | Action |
|---|-------------|----------|----------------:|--------|
| 1 | 60% tax trap — PA fully lost | 🔴 Critical | £6,285/yr | Increase pension sacrifice |
| 2 | HICBC full clawback | 🟠 Warning | £2,213/yr | Reduce ANI below £60k |
| 3 | ISA allowance unused | 🟢 Opportunity | £4,000/yr | Bed & ISA strategy |
| 4 | CGT AEA unused | 🟢 Opportunity | £600/yr | Realise gains up to £3k |
| | | **Total potential** | **£13,098/yr** | |

The existing severity cards remain below, with the addition of:
- **Potential saving** amount displayed prominently on each card
- **"Model this" button** on each observation that takes the adviser to the Scenarios tab with a pre-populated scenario
- **Category grouping**: Group by category (income structuring, pension, allowances, compliance)

**Data needed from engine** (already in the Observation type, just unused):
```typescript
interface Observation {
  id: string;
  title: string;
  description: string;
  severity: "info" | "warning" | "opportunity" | "action_required";
  category: string;
  potentialSaving?: number;   // ← THIS FIELD EXISTS but isn't rendered
  suggestedAction?: string;   // New: what the adviser should consider
  scenarioLink?: string;      // New: links to a pre-built scenario
}
```

---

## Panel Layout Changes

### Option A: Wider Sidebar (Recommended for prototype)

```
Current: Chat area (flex-1) | Panel (420px fixed)
Proposed: Chat area (flex-1) | Panel (520px fixed)
```

520px gives enough room for 4-column tables. Minimal change to layout code.

### Option B: Full-width Toggle (Recommended for production)

Add a "maximise" button to the panel header. When clicked:

```
Collapsed: Chat area (flex-1) | Panel (520px)
Expanded:  Chat area (hidden) | Panel (100% with 2-column grid layout)
```

In expanded mode, the tabs get more room and can show side-by-side comparisons (e.g., Scenarios tab with before/after columns).

### Option C: Separate Dashboard Page (long-term)

A dedicated `/dashboard/:clientId` route that shows the full analysis outside of the chat context. The chat panel becomes a secondary overlay.

**Recommendation**: Start with **Option A** (widen to 520px), add the **maximise toggle** from Option B when there's time. Option C is a post-demo enhancement.

---

## Charting Library

Currently: **zero** charting libraries. All visuals are CSS/Tailwind divs.

**Recommendation**: Add **Recharts** (built on D3, but React-native, small bundle, composable).

```bash
npm install recharts
```

What to use it for:

| Chart Type | Where | Why |
|-----------|-------|-----|
| **Donut chart** | Income tab — source composition | Shows proportion at a glance |
| **Waterfall chart** | Summary tab — gross to net flow | Shows how deductions reduce income |
| **Stacked bar** | Tax tab — band breakdown | More precise than CSS bars |
| **Grouped bar** | Scenarios tab — before/after comparison | Side-by-side visual diff |
| **Progress/gauge** | Allowances tab — utilisation | Keep existing CSS bars, Recharts optional |

The existing CSS stacked bar in Overview is fine — don't replace it, just add Recharts where tables alone aren't enough.

---

## Data Shape Changes

The current `dashboardData` is **untyped `any`** and consumed with loose property access. This needs to change.

### New Typed Dashboard Data Interface

```typescript
// packages/shared/src/types/dashboard.ts — REPLACE current interface

export interface DashboardData {
  // ─── Summary ───
  summary: {
    totalIncome: number;
    taxableIncome: number;
    totalTax: number;
    netIncome: number;
    effectiveRate: number;
    marginalRate: number;
  };

  // ─── Income ───
  income: {
    sources: {
      type: string;
      label: string;
      gross: number;
      expenses: number;
      net: number;
    }[];
    ordering: {
      nonSavings: number;
      savings: number;
      dividends: number;
    };
  };

  // ─── Tax Calculation ───
  tax: {
    incomeTaxBands: { band: string; income: number; rate: number; tax: number }[];
    dividendBands: { band: string; income: number; rate: number; tax: number }[];
    savingsBands: { band: string; income: number; rate: number; tax: number }[];
    niBands: { class: string; band: string; rate: number; amount: number }[];
    totalIncomeTax: number;
    totalDividendTax: number;
    totalSavingsTax: number;
    totalNI: number;
    employerNI: number;
  };

  // ─── ANI + PA ───
  ani: {
    totalIncome: number;
    pensionContributions: number;
    giftAidGross: number;
    adjustedNetIncome: number;
    personalAllowance: number;
    paStatus: "full" | "tapered" | "lost";
    inTaperZone: boolean;
  };

  // ─── HICBC ───
  hicbc: {
    applies: boolean;
    childBenefitAnnual: number;
    clawbackPercentage: number;
    charge: number;
    netBenefit: number;
  } | null;

  // ─── Allowances ───
  allowances: {
    name: string;
    annualLimit: number;
    used: number;
    remaining: number;
    status: "unused" | "partial" | "full" | "lost";
    carryForward?: { year: string; available: number; used: number; unused: number }[];
    notes?: string;
  }[];

  // ─── Observations ───
  observations: {
    id: string;
    title: string;
    description: string;
    severity: "info" | "warning" | "opportunity" | "critical";
    category: string;
    potentialSaving?: number;
    suggestedAction?: string;
  }[];

  // ─── Scenarios ───
  scenarios: {
    id: string;
    name: string;
    description: string;
    current: { totalTax: number; netIncome: number; pensionContribution: number };
    proposed: { totalTax: number; netIncome: number; pensionContribution: number };
    savings: { incomeTax: number; ni: number; hicbc: number; total: number };
    netPayImpact: { annual: number; monthly: number };
  }[];

  // ─── Metadata ───
  meta: {
    taxYear: string;        // "2025/26"
    region: string;         // "england" | "scotland"
    computedAt: string;     // ISO timestamp
    engineVersion: string;  // "1.0.0"
  };
}
```

---

## Component Architecture

Currently everything lives in a single 1,914-line `page.tsx`. The enhancement should extract components:

```
app/chat/
├── page.tsx                         # Main layout (chat + panel shell)
├── components/
│   ├── intelligence-panel/
│   │   ├── IntelligencePanel.tsx     # Panel container + tab switching
│   │   ├── SummaryTab.tsx            # Tab 1: Key figures + waterfall + top observations
│   │   ├── IncomeTab.tsx             # Tab 2: Source table + donut + ordering
│   │   ├── TaxTab.tsx               # Tab 3: Income tax bands + NI + HICBC + ANI + summary
│   │   ├── AllowancesTab.tsx         # Tab 4: Progress bars + carry forward detail
│   │   ├── ScenariosTab.tsx          # Tab 5: Before/after + savings breakdown
│   │   ├── ObservationsTab.tsx       # Tab 6: Summary table + severity cards
│   │   └── shared/
│   │       ├── DataTable.tsx         # Reusable table component (right-aligned numbers)
│   │       ├── MiniStat.tsx          # Extracted from page.tsx
│   │       ├── WaterfallChart.tsx    # Recharts waterfall
│   │       ├── DonutChart.tsx        # Recharts donut
│   │       └── ProgressBar.tsx       # Extracted allowance progress bar
│   ├── chat/
│   │   ├── ChatMessage.tsx           # Extracted from page.tsx
│   │   ├── ChatInput.tsx             # Extracted textarea + controls
│   │   └── ContextRibbon.tsx         # Extracted context chips
│   └── history/
│       ├── HistoryPanel.tsx          # Extracted history sidebar
│       └── HistoryItem.tsx           # Extracted from page.tsx
```

---

## Reusable `DataTable` Component

Since tables appear in every tab, build one reusable component:

```typescript
interface Column<T> {
  key: keyof T;
  header: string;
  align?: "left" | "right";
  format?: (value: any) => string;    // e.g., (v) => `£${v.toLocaleString()}`
  highlight?: boolean;                 // Bold/accent for totals
  width?: string;                      // Tailwind width class
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  totalRow?: Partial<T>;               // Optional summary row at bottom
  compact?: boolean;                   // Tighter spacing for sidebar
  striped?: boolean;
}

// Usage example:
<DataTable
  columns={[
    { key: "band", header: "Band", align: "left" },
    { key: "income", header: "Taxable Income", align: "right", format: formatCurrency },
    { key: "rate", header: "Rate", align: "right", format: formatPercent },
    { key: "tax", header: "Tax", align: "right", format: formatCurrency },
  ]}
  data={dashboardData.tax.incomeTaxBands}
  totalRow={{ band: "Total Income Tax", tax: dashboardData.tax.totalIncomeTax }}
  compact
/>
```

Style: glass morphism consistent with existing cards (white/50, border-slate-200/40, backdrop-blur-sm). Monospace tabular numbers for financial figures.

---

## Implementation Order

### Phase 1: Foundation (do first)
1. **Extract components** — break `page.tsx` into the component tree above
2. **Type the dashboard data** — replace `any` with `DashboardData` interface
3. **Build `DataTable`** — the reusable table component
4. **Widen panel** — 420px → 520px

### Phase 2: Enhance Existing Tabs
5. **Enhance Overview → Summary tab** — add key figures grid, observation preview table
6. **Enhance Allowances tab** — add summary table, carry forward detail, PSA
7. **Enhance Observations tab** — add summary table, potential saving, "model this" link

### Phase 3: New Tabs
8. **Add Income tab** — source table, install Recharts, add donut chart
9. **Add Tax tab** — income tax bands table, NI table, HICBC table, ANI breakdown, total summary
10. **Add Scenarios tab** — before/after layout, savings table

### Phase 4: Charts & Polish
11. **Waterfall chart** in Summary tab (gross → net flow)
12. **Grouped bar chart** in Scenarios tab (before/after)
13. **Maximise toggle** — full-width panel mode for detailed viewing
14. **Export** — generate PDF or copy-to-clipboard for client reports

---

## What This Looks Like for the Demo

For the demo, the highest impact items are:

| Enhancement | Effort | Impact | Priority |
|-------------|--------|--------|----------|
| Income tax band table | Low | High | **P1** |
| NI breakdown table | Low | High | **P1** |
| ANI + PA taper display | Low | High | **P1** |
| HICBC detail table | Low | Medium | **P1** |
| Total tax summary table | Low | High | **P1** |
| Observations with potential savings | Low | High | **P1** |
| Income source breakdown table | Medium | High | **P1** |
| Scenarios tab (before/after) | Medium | Very High | **P1** |
| Donut chart (income sources) | Medium | Medium | P2 |
| Waterfall chart (gross→net) | Medium | Medium | P2 |
| Extract components from page.tsx | Medium | Low (internal quality) | P2 |
| Full-width toggle | Low | Medium | P2 |
| PDF export | High | Medium | P3 |

**For the demo, focus on P1**: tables, scenarios, and observations with savings. That's 8 enhancements, all driven by the deterministic tax engine data that's already planned.

The tables are what make it look like a serious financial tool vs. a chatbot side-panel. The scenario comparison is what makes advisers go "I need this."
