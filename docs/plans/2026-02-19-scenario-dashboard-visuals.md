# Scenario Dashboard Visual Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use the `frontend-design` skill for Task 2 and Task 3 to ensure polished visual treatment.

**Goal:** Replace the text-only scenario comparison table with before/after stacked bar charts and a net benefit card, making the pension scenario results visually informative at a glance.

**Architecture:** Create a new `ScenarioComparisonChart` component using Recharts horizontal stacked bars showing current vs proposed tax breakdown. Create a `NetBenefitCard` component showing the full relief picture from the new `net_benefit` engine data. Rewrite `ScenarioComparison` in `chat/page.tsx` to use both new components plus a collapsible detail table for exact numbers.

**Tech Stack:** React 19, Next.js 15, Recharts 3.7.0, Framer Motion 12.x, Tailwind CSS, TypeScript

---

### Task 1: Update ScenarioData Interface

**Files:**
- Modify: `helio/apps/web/src/app/chat/page.tsx:97-146` (ScenarioData interface)

**Step 1: Add net_benefit and total_effective_relief_rate to the interface**

In `chat/page.tsx`, find the `ScenarioData` interface (line 97) and add after `pension_aa_warning` (line 145):

```typescript
  total_effective_relief_rate?: number;
  net_benefit?: {
    // Personal pension fields
    gross_contribution?: number;
    net_cost_to_client?: number;
    basic_rate_relief?: number;
    higher_rate_relief?: number;
    // Salary sacrifice fields
    gross_into_pension?: number;
    income_tax_saved?: number;
    ni_saved?: number;
    take_home_reduction?: number;
    // Shared fields
    hicbc_avoided?: number;
    total_tax_relief?: number;
    total_saving?: number;
    net_cost_after_relief?: number;
    net_benefit?: number;
    effective_cost_per_pound_in_pension?: number;
  };
```

**Step 2: Verify build**

Run: `cd helio/apps/web && npx next build`
Expected: Build succeeds (type is additive, no breaking changes)

**Step 3: Commit**

```bash
git add helio/apps/web/src/app/chat/page.tsx
git commit -m "feat: add net_benefit fields to ScenarioData interface"
```

---

### Task 2: Create ScenarioComparisonChart Component

**IMPORTANT:** Use the `frontend-design` skill for this task to ensure polished visual treatment.

**Files:**
- Create: `helio/apps/web/src/components/charts/scenario-comparison-chart.tsx`

**Context for the implementer:**

This component renders two horizontal stacked bars (Current vs Proposed) showing the tax composition. The design should match the existing chart aesthetic in the codebase:
- Use CSS custom properties: `var(--foreground)`, `var(--muted)`, `var(--chart-tooltip-bg)`, etc.
- Font sizes: 10-12px, font-mono for numbers, tabular-nums
- Animation: framer-motion entrance with `ease: [0.16, 1, 0.3, 1]`
- Glassmorphism card: `rounded-xl border border-slate-200/40 dark:border-zinc-800/30 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm`

**Requirements:**

The component accepts:
```typescript
interface ScenarioComparisonChartProps {
  current: {
    income_tax: number;
    national_insurance: number;
    hicbc: number;
    total_tax: number;
  };
  proposed: {
    income_tax: number;
    national_insurance: number;
    hicbc: number;
    total_tax: number;
  };
  savings: {
    income_tax: number;
    national_insurance?: number;
    hicbc_avoided: number;
    total: number;
  };
  isPension: boolean;
}
```

**Visual design:**

Two horizontal bars, vertically stacked:

```
CURRENT    ████████████████████████████████████  £32,430
           [Income Tax][  NI  ][HICBC]

PROPOSED   █████████████████████████            £25,630
           [Income Tax][  NI  ]
                                      saved £6,800/yr
```

- Use Recharts `BarChart` with `layout="vertical"` for horizontal bars
- Segments: Income Tax (#748ffc / brand), NI (#a78bfa / violet), HICBC (#fbbf24 / amber)
- For personal pension: omit NI segment (personal pensions don't save NI)
- Both bars scaled to the same max (current total_tax)
- Custom tooltip matching existing pattern (glassmorphic dark card)
- Savings callout in emerald below the bars

**Step 1: Create the component file**

Create `helio/apps/web/src/components/charts/scenario-comparison-chart.tsx` with the implementation. Use `frontend-design` skill for the actual code.

**Step 2: Verify build**

Run: `cd helio/apps/web && npx next build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add helio/apps/web/src/components/charts/scenario-comparison-chart.tsx
git commit -m "feat: add before/after stacked bar chart for scenario comparison"
```

---

### Task 3: Create NetBenefitCard Component

**IMPORTANT:** Use the `frontend-design` skill for this task.

**Files:**
- Create: `helio/apps/web/src/components/charts/net-benefit-card.tsx`

**Requirements:**

The component accepts the scenario's `net_benefit` data and renders a styled summary card.

```typescript
interface NetBenefitCardProps {
  netBenefit: ScenarioData["net_benefit"];
  isPension: boolean;
  totalEffectiveReliefRate?: number;
  savings: ScenarioData["savings"];
  paChange: ScenarioData["pa_change"];
  extraIntoPension?: number;
}
```

**Personal pension layout:**

```
┌─────────────────────────────────────────────┐
│  NET CLIENT BENEFIT                         │
│                                             │
│  You pay (net)            £8,000            │
│  Government top-up        £2,000            │
│  ───────────────────────────────            │
│  Into pension pot         £10,000           │
│                                             │
│  Tax relief (via SA)      £2,000            │
│  HICBC avoided                £0            │
│  ───────────────────────────────            │
│  Total relief             £4,000            │
│  Net cost after relief    £6,000            │
│                                             │
│  ▓▓▓▓▓▓▓▓▓▓░░░░  40% total relief          │
│  60p per £1 in pension                      │
│                                             │
│  PA restored: +£12,570  (if applicable)     │
└─────────────────────────────────────────────┘
```

**Salary sacrifice layout:**

```
┌─────────────────────────────────────────────┐
│  NET CLIENT BENEFIT                         │
│                                             │
│  Into pension             £20,000           │
│  Income tax saved          £4,000           │
│  NI saved                  £2,000           │
│  HICBC avoided               £800           │
│  ───────────────────────────────            │
│  Total saving              £6,800           │
│  Take-home drops by       £13,200           │
│                                             │
│  ▓▓▓▓▓▓▓▓░░░░░░  66p per £1 in pension     │
│                                             │
│  PA restored: +£12,570  (if applicable)     │
└─────────────────────────────────────────────┘
```

**Design details:**
- Emerald-themed card matching existing Net Impact box style
- Progress bar for effective relief rate / cost per pound
- Color coding: amber <25% relief, emerald >35% relief, brand for middle
- Currency values in font-mono tabular-nums
- "Xp per £1 in pension" tagline at the bottom
- PA restoration badge (existing emerald pill style)
- If `net_benefit` data is not present (old scenarios without it), gracefully fall back to showing the existing `savings` data in the old format

**Step 1: Create the component**

Use `frontend-design` skill for the actual implementation.

**Step 2: Verify build**

Run: `cd helio/apps/web && npx next build`

**Step 3: Commit**

```bash
git add helio/apps/web/src/components/charts/net-benefit-card.tsx
git commit -m "feat: add net benefit card component for scenario results"
```

---

### Task 4: Rewrite ScenarioComparison to Use New Components

**Files:**
- Modify: `helio/apps/web/src/app/chat/page.tsx:2405-2585` (ScenarioComparison function)

**Context:**

The current `ScenarioComparison` function renders:
1. A 4-column numerical comparison table (lines 2437-2473)
2. A "Net Impact" emerald summary box (lines 2475-2551)
3. Optimal Thresholds section (lines 2553-2575)
4. AA Warning section (lines 2577-2582)

Replace (1) and (2) with the new chart + net benefit card. Move (1) into a collapsible detail section.

**Step 1: Add imports**

At the top of `chat/page.tsx`, add:

```typescript
import { ScenarioComparisonChart } from "@/components/charts/scenario-comparison-chart";
import { NetBenefitCard } from "@/components/charts/net-benefit-card";
```

**Step 2: Rewrite the ScenarioComparison function**

Replace the function body with this structure:

```tsx
function ScenarioComparison({ scenario }: { scenario: ScenarioData }) {
  const s = scenario;
  const isPension = s.type === "personal_pension";
  const [showDetail, setShowDetail] = useState(false);
  const fmt = (n: number) => `£${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const fmtSigned = (n: number) => n > 0 ? `+${fmt(n)}` : n < 0 ? `-${fmt(n)}` : "—";

  // Build rows for collapsible detail table (same as current implementation)
  const rows = isPension
    ? [
        { label: "Pension Contribution", current: s.current.pension_contribution || 0, proposed: s.proposed.pension_contribution || 0 },
        { label: "Adjusted Net Income", current: s.current.adjusted_net_income || 0, proposed: s.proposed.adjusted_net_income || 0, invert: true },
        { label: "Income Tax", current: s.current.income_tax, proposed: s.proposed.income_tax, invert: true },
        { label: "HICBC", current: s.current.hicbc, proposed: s.proposed.hicbc, invert: true },
        { label: "Total Tax", current: s.current.total_tax, proposed: s.proposed.total_tax, invert: true },
        { label: "Personal Allowance", current: s.current.personal_allowance, proposed: s.proposed.personal_allowance },
      ]
    : [
        { label: "Gross Salary", current: s.current.gross_salary || 0, proposed: s.proposed.gross_salary || 0 },
        { label: "Pension Sacrifice", current: s.current.sacrifice || 0, proposed: s.proposed.sacrifice || 0 },
        { label: "Income Tax", current: s.current.income_tax, proposed: s.proposed.income_tax, invert: true },
        { label: "National Insurance", current: s.current.national_insurance, proposed: s.proposed.national_insurance, invert: true },
        { label: "HICBC", current: s.current.hicbc, proposed: s.proposed.hicbc, invert: true },
        { label: "Total Tax", current: s.current.total_tax, proposed: s.proposed.total_tax, invert: true },
        { label: "Personal Allowance", current: s.current.personal_allowance, proposed: s.proposed.personal_allowance },
      ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3"
    >
      {/* 1. Before/After stacked bar chart */}
      <ScenarioComparisonChart
        current={s.current}
        proposed={s.proposed}
        savings={s.savings}
        isPension={isPension}
      />

      {/* 2. Net Benefit Card */}
      <NetBenefitCard
        netBenefit={s.net_benefit}
        isPension={isPension}
        totalEffectiveReliefRate={s.total_effective_relief_rate}
        savings={s.savings}
        paChange={s.pa_change}
        extraIntoPension={s.extra_into_pension}
      />

      {/* 3. Collapsible detail table */}
      <div className="rounded-xl border border-slate-200/40 dark:border-zinc-800/30 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm overflow-hidden">
        <button
          onClick={() => setShowDetail(!showDetail)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors"
        >
          <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
            Full breakdown
          </span>
          <motion.span animate={{ rotate: showDetail ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <IconChevronDown className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
          </motion.span>
        </button>
        <AnimatePresence>
          {showDetail && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              {/* Exact same table rendering as current, with header + rows */}
              {/* ... (paste the existing table code here) ... */}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Optimal Thresholds (personal pension) — UNCHANGED */}
      {isPension && s.thresholds && s.thresholds.length > 0 && (
        /* ... existing thresholds code ... */
      )}

      {/* 5. AA Warning — UNCHANGED */}
      {isPension && s.pension_aa_warning && (
        /* ... existing AA warning code ... */
      )}
    </motion.div>
  );
}
```

Make sure to add `useState` to the React imports if not already there, and ensure `IconChevronDown` and `AnimatePresence` are imported.

**Step 3: Verify build**

Run: `cd helio/apps/web && npx next build`
Expected: Build succeeds

**Step 4: Verify visually**

Run: `cd helio/apps/web && npm run dev`
Navigate to a client, run a pension scenario, and verify:
- Stacked bars render with correct proportions
- Net benefit card shows all fields
- Collapsible detail table expands/collapses
- Thresholds and AA warning still display
- Dark mode works

**Step 5: Commit**

```bash
git add helio/apps/web/src/app/chat/page.tsx
git commit -m "feat: replace scenario comparison table with visual charts and net benefit card"
```

---

### Task 5: Handle Backwards Compatibility

**Files:**
- Modify: `helio/apps/web/src/components/charts/net-benefit-card.tsx` (if not already handled)

**Context:**

Old scenarios stored in state (from before the net_benefit backend changes) won't have `net_benefit` data. The NetBenefitCard must gracefully handle this.

**Step 1: Verify fallback behavior**

In `NetBenefitCard`, if `netBenefit` is `undefined` or `null`, fall back to showing the existing `savings` data in the old format (income tax saved, NI saved, HICBC avoided, total). This should already be handled by the component design, but verify it works.

**Step 2: Test by temporarily removing net_benefit from a scenario**

In the browser dev tools or by editing the useChat hook temporarily, confirm that a scenario without `net_benefit` still renders correctly.

**Step 3: Commit (if changes needed)**

```bash
git add helio/apps/web/src/components/charts/net-benefit-card.tsx
git commit -m "fix: handle missing net_benefit data in scenario display"
```

---

### Task 6: Final Build + Visual Verification

**Step 1: Run production build**

Run: `cd helio/apps/web && npx next build`
Expected: Build succeeds with no TypeScript errors

**Step 2: Visual smoke test**

Run: `cd helio/apps/web && npm run dev`

Test all these scenarios:
1. Personal pension scenario → bars show IT + HICBC, net benefit card shows government top-up
2. Salary sacrifice scenario → bars show IT + NI + HICBC, net benefit card shows take-home reduction
3. Multiple scenarios → scenario selector tabs still work, switching between scenarios updates charts
4. Empty state → "No scenarios modelled yet" still renders correctly
5. Generating state → skeleton shimmer still works
6. Dark mode → all charts and cards render correctly
7. Collapsible detail → expands/collapses smoothly, shows exact numbers

**Step 3: Commit any final fixes**

```bash
git add -A
git commit -m "fix: scenario dashboard visual polish"
```
