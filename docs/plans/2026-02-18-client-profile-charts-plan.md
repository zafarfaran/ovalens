# Client Profile Interactive Charts Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Refactor the client profile page into a tabbed dashboard with Recharts visualizations, net income takeaway, tax savings summary, and meeting notes timeline.

**Architecture:** Install Recharts and create isolated chart components in `helio/apps/web/src/components/charts/`. Refactor the main `clients/page.tsx` to use a tab system (Overview, Breakdown, Intelligence, Notes) with the new chart components. No backend changes needed — all data already available from existing endpoints.

**Tech Stack:** Next.js 14, React 18, Recharts, Framer Motion, Tailwind CSS, CSS custom properties

---

### Task 1: Install Recharts

**Files:**
- Modify: `helio/apps/web/package.json`

**Step 1: Install recharts**

Run: `cd helio/apps/web && npm install recharts`

**Step 2: Verify installation**

Run: `cd helio/apps/web && node -e "require('recharts'); console.log('OK')"`
Expected: `OK`

**Step 3: Commit**

```bash
git add helio/apps/web/package.json helio/apps/web/package-lock.json
git commit -m "feat(web): add recharts dependency for client profile charts"
```

---

### Task 2: Create Tab Bar Component

**Files:**
- Create: `helio/apps/web/src/components/charts/tab-bar.tsx`

**Step 1: Create the tab-bar component**

```tsx
"use client";

import { motion } from "framer-motion";

export type TabId = "overview" | "breakdown" | "intelligence" | "notes";

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: "overview", label: "Overview" },
  { id: "breakdown", label: "Breakdown" },
  { id: "intelligence", label: "Intelligence" },
  { id: "notes", label: "Notes" },
];

export function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (id: TabId) => void;
}) {
  return (
    <div className="flex items-center gap-1 mb-8 border-b border-[var(--border-subtle)]">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative px-4 py-2.5 text-[12px] font-medium transition-colors ${
            active === tab.id
              ? "text-[var(--foreground)]"
              : "text-[var(--muted)] hover:text-[var(--foreground)]/80"
          }`}
        >
          {tab.label}
          {active === tab.id && (
            <motion.div
              layoutId="tab-underline"
              className="absolute bottom-0 left-2 right-2 h-[2px] rounded-full bg-[var(--accent)]"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
```

**Step 2: Verify the file compiles**

Run: `cd helio/apps/web && npx tsc --noEmit src/components/charts/tab-bar.tsx 2>&1 || echo "Check output"`

Note: May have import path issues with standalone tsc. If so, run `npm run type-check` to verify across the whole project.

**Step 3: Commit**

```bash
git add helio/apps/web/src/components/charts/tab-bar.tsx
git commit -m "feat(web): add TabBar component for client profile tabs"
```

---

### Task 3: Create Tax Donut Chart

**Files:**
- Create: `helio/apps/web/src/components/charts/tax-donut-chart.tsx`

**Step 1: Create the donut chart component**

This chart shows the tax composition — slices for Income Tax, NI, Dividend Tax, and HICBC (if applicable).

```tsx
"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface TaxDonutProps {
  incomeTax: number;
  nationalInsurance: number;
  dividendTax: number;
  hicbcCharge?: number;
}

const COLORS = [
  "var(--accent)",          // Income Tax - accent blue/purple
  "#0ea5e9",               // NI - sky
  "#8b5cf6",               // Dividend Tax - violet
  "#f59e0b",               // HICBC - amber
];

const fmt = (n: number) =>
  `£${n.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

interface PayloadItem {
  name: string;
  value: number;
  payload: { fill: string };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-lg bg-[var(--card)] border border-[var(--card-border)] shadow-lg px-3 py-2">
      <p className="text-[11px] font-medium text-[var(--foreground)]">{d.name}</p>
      <p className="text-[13px] font-mono font-semibold text-[var(--foreground)]">{fmt(d.value)}</p>
    </div>
  );
}

export function TaxDonutChart({ incomeTax, nationalInsurance, dividendTax, hicbcCharge }: TaxDonutProps) {
  const data = [
    { name: "Income Tax", value: incomeTax },
    { name: "National Insurance", value: nationalInsurance },
    ...(dividendTax > 0 ? [{ name: "Dividend Tax", value: dividendTax }] : []),
    ...(hicbcCharge && hicbcCharge > 0 ? [{ name: "HICBC", value: hicbcCharge }] : []),
  ].filter((d) => d.value > 0);

  if (data.length === 0) return null;

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={3}
            dataKey="value"
            animationBegin={100}
            animationDuration={800}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value: string) => (
              <span className="text-[11px] text-[var(--muted)]">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add helio/apps/web/src/components/charts/tax-donut-chart.tsx
git commit -m "feat(web): add TaxDonutChart component"
```

---

### Task 4: Create Waterfall Chart (Gross to Net)

**Files:**
- Create: `helio/apps/web/src/components/charts/waterfall-chart.tsx`

**Step 1: Create the waterfall chart component**

Shows the flow from gross income down to net income. Uses a stacked bar chart with invisible base bars to create the waterfall effect.

```tsx
"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface WaterfallProps {
  grossIncome: number;
  personalAllowance: number;
  taxableIncome: number;
  incomeTax: number;
  nationalInsurance: number;
  dividendTax?: number;
  netIncome: number;
}

const fmt = (n: number) =>
  `£${Math.abs(n).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

interface PayloadItem {
  name: string;
  display: number;
  isDeduction: boolean;
  payload: Record<string, unknown>;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as { name: string; display: number; isDeduction: boolean };
  if (!d) return null;
  return (
    <div className="rounded-lg bg-[var(--card)] border border-[var(--card-border)] shadow-lg px-3 py-2">
      <p className="text-[11px] font-medium text-[var(--foreground)]">{d.name}</p>
      <p className="text-[13px] font-mono font-semibold text-[var(--foreground)]">
        {d.isDeduction ? "−" : ""}{fmt(d.display)}
      </p>
    </div>
  );
}

export function WaterfallChart({
  grossIncome,
  personalAllowance,
  taxableIncome: _taxableIncome,
  incomeTax,
  nationalInsurance,
  dividendTax = 0,
  netIncome,
}: WaterfallProps) {
  // Build waterfall data: each bar has a "base" (invisible) + "value" (visible)
  const totalDeductions = incomeTax + nationalInsurance + dividendTax;
  const paDeduction = personalAllowance;

  const steps = [
    { name: "Gross", base: 0, value: grossIncome, display: grossIncome, isDeduction: false },
    { name: "PA", base: grossIncome - paDeduction, value: paDeduction, display: paDeduction, isDeduction: true },
    { name: "Income Tax", base: grossIncome - paDeduction - incomeTax, value: incomeTax, display: incomeTax, isDeduction: true },
    ...(nationalInsurance > 0
      ? [{ name: "NI", base: grossIncome - paDeduction - incomeTax - nationalInsurance, value: nationalInsurance, display: nationalInsurance, isDeduction: true }]
      : []),
    ...(dividendTax > 0
      ? [{ name: "Div Tax", base: grossIncome - paDeduction - totalDeductions + dividendTax - dividendTax, value: dividendTax, display: dividendTax, isDeduction: true }]
      : []),
    { name: "Net", base: 0, value: netIncome, display: netIncome, isDeduction: false },
  ];

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={steps} margin={{ top: 10, right: 10, bottom: 5, left: 10 }}>
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--muted)" }}
            tickFormatter={(v: number) => `£${(v / 1000).toFixed(0)}k`}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} cursor={false} />
          <Bar dataKey="base" stackId="stack" fill="transparent" />
          <Bar dataKey="value" stackId="stack" radius={[4, 4, 0, 0]} animationDuration={800}>
            {steps.map((s, i) => (
              <Cell
                key={i}
                fill={
                  s.name === "Gross" ? "var(--accent)"
                    : s.name === "Net" ? "#10b981"
                    : "#ef4444"
                }
                fillOpacity={s.name === "Gross" || s.name === "Net" ? 1 : 0.75}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add helio/apps/web/src/components/charts/waterfall-chart.tsx
git commit -m "feat(web): add WaterfallChart component for gross-to-net flow"
```

---

### Task 5: Create Net Income Bar Component

**Files:**
- Create: `helio/apps/web/src/components/charts/net-income-bar.tsx`

**Step 1: Create the net income takeaway component**

A prominent card showing take-home pay with a horizontal stacked bar.

```tsx
"use client";

import { motion } from "framer-motion";

interface NetIncomeBarProps {
  grossIncome: number;
  totalTax: number;
  nationalInsurance: number;
  netIncome: number;
}

const fmt = (n: number) =>
  `£${n.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

const ease = [0.16, 1, 0.3, 1] as const;

export function NetIncomeBar({ grossIncome, totalTax, nationalInsurance, netIncome }: NetIncomeBarProps) {
  const taxPct = grossIncome > 0 ? (totalTax / grossIncome) * 100 : 0;
  const niPct = grossIncome > 0 ? (nationalInsurance / grossIncome) * 100 : 0;
  const netPct = grossIncome > 0 ? (netIncome / grossIncome) * 100 : 0;

  return (
    <div className="rounded-xl bg-[var(--card)] border border-[var(--card-border)] p-5">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <p className="text-[11px] font-medium text-[var(--muted)] uppercase tracking-wide mb-1">Your Take-Home</p>
          <p className="text-[28px] font-semibold font-mono tracking-tight text-emerald-600 dark:text-emerald-400 leading-none">
            {fmt(netIncome)}
          </p>
        </div>
        <p className="text-[12px] font-mono text-[var(--muted)]">
          {netPct.toFixed(1)}% of gross
        </p>
      </div>

      {/* Stacked bar */}
      <div className="h-[10px] rounded-full bg-[var(--surface)] overflow-hidden flex">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${netPct}%` }}
          transition={{ duration: 0.7, ease }}
          className="h-full bg-emerald-500"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${taxPct}%` }}
          transition={{ duration: 0.7, ease, delay: 0.1 }}
          className="h-full bg-red-400"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${niPct}%` }}
          transition={{ duration: 0.7, ease, delay: 0.15 }}
          className="h-full bg-amber-400"
        />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-3">
        {[
          { label: "Take-home", color: "bg-emerald-500", value: fmt(netIncome) },
          { label: "Tax", color: "bg-red-400", value: fmt(totalTax) },
          { label: "NI", color: "bg-amber-400", value: fmt(nationalInsurance) },
        ].map(({ label, color, value }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${color}`} />
            <span className="text-[10px] text-[var(--muted)]">{label}</span>
            <span className="text-[10px] font-mono font-medium text-[var(--foreground)]">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add helio/apps/web/src/components/charts/net-income-bar.tsx
git commit -m "feat(web): add NetIncomeBar component for take-home display"
```

---

### Task 6: Create Income Sources Bar Chart

**Files:**
- Create: `helio/apps/web/src/components/charts/income-bar-chart.tsx`

**Step 1: Create the income sources horizontal bar chart**

```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface IncomeSource {
  label: string;
  gross_amount?: number;
  amount?: number;
}

interface IncomeBarChartProps {
  sources: IncomeSource[];
  totalIncome: number;
}

const fmt = (n: number) =>
  `£${n.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

const COLORS = ["var(--accent)", "#0ea5e9", "#8b5cf6", "#14b8a6", "#f59e0b", "#ec4899"];

interface PayloadItem {
  name: string;
  value: number;
  payload: Record<string, unknown>;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as { name: string; value: number; pct: number };
  if (!d) return null;
  return (
    <div className="rounded-lg bg-[var(--card)] border border-[var(--card-border)] shadow-lg px-3 py-2">
      <p className="text-[11px] font-medium text-[var(--foreground)]">{d.name}</p>
      <p className="text-[13px] font-mono font-semibold text-[var(--foreground)]">{fmt(d.value)}</p>
      <p className="text-[10px] text-[var(--muted)]">{d.pct.toFixed(1)}% of total</p>
    </div>
  );
}

export function IncomeBarChart({ sources, totalIncome }: IncomeBarChartProps) {
  const data = sources.map((s) => {
    const val = s.gross_amount ?? s.amount ?? 0;
    return {
      name: s.label,
      value: val,
      pct: totalIncome > 0 ? (val / totalIncome) * 100 : 0,
    };
  });

  if (data.length === 0) return null;

  return (
    <div className="h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
          <XAxis
            type="number"
            tick={{ fontSize: 10, fill: "var(--muted)" }}
            tickFormatter={(v: number) => `£${(v / 1000).toFixed(0)}k`}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 11, fill: "var(--muted)" }}
            axisLine={false}
            tickLine={false}
            width={100}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--surface)", opacity: 0.5 }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} animationDuration={800}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add helio/apps/web/src/components/charts/income-bar-chart.tsx
git commit -m "feat(web): add IncomeBarChart component for income sources"
```

---

### Task 7: Create Tax Bands Chart

**Files:**
- Create: `helio/apps/web/src/components/charts/tax-bands-chart.tsx`

**Step 1: Create the tax bands grouped bar chart**

Shows income in band vs tax per band side-by-side for each tax band.

```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface TaxBand {
  band: string;
  amount: number;
  rate: number;
  tax: number;
}

interface TaxBandsChartProps {
  bands: TaxBand[];
}

const fmt = (n: number) =>
  `£${n.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

interface PayloadItem {
  name: string;
  value: number;
  dataKey: string;
  payload: { band: string; rate: string };
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: PayloadItem[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-[var(--card)] border border-[var(--card-border)] shadow-lg px-3 py-2">
      <p className="text-[11px] font-medium text-[var(--foreground)] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-[12px] font-mono text-[var(--foreground)]">
          <span className="text-[var(--muted)]">{p.name}: </span>{fmt(p.value)}
        </p>
      ))}
      {payload[0]?.payload?.rate && (
        <p className="text-[10px] text-[var(--muted)] mt-1">Rate: {payload[0].payload.rate}</p>
      )}
    </div>
  );
}

export function TaxBandsChart({ bands }: TaxBandsChartProps) {
  const data = bands.map((b) => ({
    band: b.band,
    income: b.amount,
    tax: b.tax,
    rate: `${(b.rate * 100).toFixed(0)}%`,
  }));

  if (data.length === 0) return null;

  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, bottom: 5, left: 10 }}>
          <XAxis
            dataKey="band"
            tick={{ fontSize: 10, fill: "var(--muted)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "var(--muted)" }}
            tickFormatter={(v: number) => `£${(v / 1000).toFixed(0)}k`}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--surface)", opacity: 0.5 }} />
          <Legend
            verticalAlign="top"
            height={30}
            formatter={(value: string) => (
              <span className="text-[11px] text-[var(--muted)]">{value}</span>
            )}
          />
          <Bar dataKey="income" name="Income in Band" fill="var(--accent)" fillOpacity={0.7} radius={[4, 4, 0, 0]} animationDuration={800} />
          <Bar dataKey="tax" name="Tax" fill="#ef4444" fillOpacity={0.75} radius={[4, 4, 0, 0]} animationDuration={800} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add helio/apps/web/src/components/charts/tax-bands-chart.tsx
git commit -m "feat(web): add TaxBandsChart component for tax band breakdown"
```

---

### Task 8: Create NI Donut Chart

**Files:**
- Create: `helio/apps/web/src/components/charts/ni-donut-chart.tsx`

**Step 1: Create the NI donut chart**

Small donut showing NI class split.

```tsx
"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface NIDonutProps {
  class1: number;
  class2: number;
  class4: number;
  total: number;
}

const COLORS = ["#0ea5e9", "#8b5cf6", "#14b8a6"];

const fmt = (n: number) =>
  `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface PayloadItem {
  name: string;
  value: number;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-lg bg-[var(--card)] border border-[var(--card-border)] shadow-lg px-3 py-2">
      <p className="text-[11px] font-medium text-[var(--foreground)]">{d.name}</p>
      <p className="text-[13px] font-mono font-semibold text-[var(--foreground)]">{fmt(d.value)}</p>
    </div>
  );
}

export function NIDonutChart({ class1, class2, class4, total }: NIDonutProps) {
  const data = [
    ...(class1 > 0 ? [{ name: "Class 1 (Employee)", value: class1 }] : []),
    ...(class2 > 0 ? [{ name: "Class 2 (Self-employed)", value: class2 }] : []),
    ...(class4 > 0 ? [{ name: "Class 4 (Self-employed)", value: class4 }] : []),
  ];

  if (data.length === 0) return null;

  return (
    <div>
      <div className="h-[180px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={65}
              paddingAngle={3}
              dataKey="value"
              animationBegin={100}
              animationDuration={800}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {/* Legend + total */}
      <div className="space-y-1.5 mt-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
              <span className="text-[11px] text-[var(--muted)]">{d.name}</span>
            </div>
            <span className="text-[11px] font-mono text-[var(--foreground)]">{fmt(d.value)}</span>
          </div>
        ))}
        <div className="pt-2 border-t border-[var(--border-subtle)] flex items-center justify-between">
          <span className="text-[12px] font-semibold text-[var(--foreground)]">Total NI</span>
          <span className="text-[13px] font-mono font-bold text-[var(--foreground)]">{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add helio/apps/web/src/components/charts/ni-donut-chart.tsx
git commit -m "feat(web): add NIDonutChart component"
```

---

### Task 9: Create Allowances Radial Bar Chart

**Files:**
- Create: `helio/apps/web/src/components/charts/allowances-radial-chart.tsx`

**Step 1: Create the radial bar chart for allowances**

```tsx
"use client";

import { RadialBarChart, RadialBar, ResponsiveContainer, Tooltip } from "recharts";

interface Allowance {
  type?: string;
  label?: string;
  name?: string;
  annual_limit?: number;
  annualLimit?: number;
  used: number;
  remaining: number;
  status?: string;
}

interface AllowancesRadialProps {
  allowances: Allowance[];
}

const COLORS = ["#10b981", "#0ea5e9", "var(--accent)", "#8b5cf6", "#f59e0b"];

const fmt = (n: number) =>
  `£${n.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

function getName(a: Allowance): string {
  return a.label ?? a.name ?? "Allowance";
}

function getLimit(a: Allowance): number {
  return a.annual_limit ?? a.annualLimit ?? 0;
}

interface PayloadItem {
  name: string;
  value: number;
  payload: { used: number; limit: number; remaining: number };
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: PayloadItem[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as { name: string; used: number; limit: number; remaining: number };
  if (!d) return null;
  return (
    <div className="rounded-lg bg-[var(--card)] border border-[var(--card-border)] shadow-lg px-3 py-2">
      <p className="text-[11px] font-medium text-[var(--foreground)]">{d.name}</p>
      <p className="text-[12px] font-mono text-[var(--foreground)]">Used: {fmt(d.used)} / {fmt(d.limit)}</p>
      <p className="text-[10px] text-[var(--muted)]">{fmt(d.remaining)} remaining</p>
    </div>
  );
}

export function AllowancesRadialChart({ allowances }: AllowancesRadialProps) {
  const data = allowances
    .filter((a) => getLimit(a) > 0)
    .map((a, i) => {
      const limit = getLimit(a);
      return {
        name: getName(a),
        value: limit > 0 ? Math.min((a.used / limit) * 100, 100) : 0,
        used: a.used,
        limit,
        remaining: a.remaining,
        fill: COLORS[i % COLORS.length],
      };
    });

  if (data.length === 0) return null;

  return (
    <div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius={20}
            outerRadius={90}
            barSize={12}
            data={data}
            startAngle={180}
            endAngle={0}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={6}
              animationDuration={800}
            />
            <Tooltip content={<CustomTooltip />} />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      {/* Legend */}
      <div className="space-y-1.5 mt-2">
        {data.map((d) => (
          <div key={d.name} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.fill }} />
              <span className="text-[11px] text-[var(--muted)]">{d.name}</span>
            </div>
            <span className="text-[10px] font-mono text-[var(--muted)]">
              {fmt(d.used)}<span className="opacity-40"> / </span>{fmt(d.limit)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add helio/apps/web/src/components/charts/allowances-radial-chart.tsx
git commit -m "feat(web): add AllowancesRadialChart component"
```

---

### Task 10: Create Savings Banner Component

**Files:**
- Create: `helio/apps/web/src/components/charts/savings-banner.tsx`

**Step 1: Create the savings banner**

```tsx
"use client";

import { motion } from "framer-motion";
import { IconLightbulb, IconArrowRight } from "@/components/icons";

interface SavingsBannerProps {
  totalSavings: number;
  opportunityCount: number;
  warningCount: number;
  onViewIntelligence?: () => void;
}

const fmt = (n: number) =>
  `£${n.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

const ease = [0.16, 1, 0.3, 1] as const;

export function SavingsBanner({ totalSavings, opportunityCount, warningCount, onViewIntelligence }: SavingsBannerProps) {
  if (totalSavings <= 0 && opportunityCount === 0 && warningCount === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
      className="rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-500/[0.08] dark:to-emerald-500/[0.04] border border-emerald-200/50 dark:border-emerald-500/15 p-5"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center">
            <IconLightbulb className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            {totalSavings > 0 && (
              <p className="text-[18px] font-semibold font-mono text-emerald-700 dark:text-emerald-400 leading-none mb-1">
                {fmt(totalSavings)} in potential savings
              </p>
            )}
            <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/60">
              {opportunityCount > 0 && `${opportunityCount} ${opportunityCount === 1 ? "opportunity" : "opportunities"}`}
              {opportunityCount > 0 && warningCount > 0 && " · "}
              {warningCount > 0 && `${warningCount} ${warningCount === 1 ? "warning" : "warnings"}`}
            </p>
          </div>
        </div>
        {onViewIntelligence && (
          <button
            onClick={onViewIntelligence}
            className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
          >
            View details <IconArrowRight className="w-3 h-3" />
          </button>
        )}
      </div>
    </motion.div>
  );
}
```

**Step 2: Commit**

```bash
git add helio/apps/web/src/components/charts/savings-banner.tsx
git commit -m "feat(web): add SavingsBanner component"
```

---

### Task 11: Create Meeting Notes Timeline Component

**Files:**
- Create: `helio/apps/web/src/components/charts/meeting-notes-timeline.tsx`

**Step 1: Create the timeline component**

```tsx
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { IconFileText } from "@/components/icons";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface MeetingNote {
  id: string;
  meeting_date: string | null;
  subject: string;
  attendees: string | null;
  summary: string | null;
  action_items: string | null;
  tags: string | null;
  created_at: string | null;
}

const ease = [0.16, 1, 0.3, 1] as const;

export function MeetingNotesTimeline({ clientId }: { clientId: string }) {
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/clients/${clientId}/meeting-notes`);
        const data = await res.json();
        if (!cancelled) setNotes(data.meeting_notes || []);
      } catch { /* noop */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="w-3 h-3 rounded-full bg-[var(--surface)] mt-1" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-[var(--surface)]" />
              <div className="h-12 rounded bg-[var(--surface)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center">
        <IconFileText className="w-6 h-6 mx-auto text-[var(--muted)] mb-2" />
        <p className="text-[13px] font-medium text-[var(--muted)]">No meeting notes yet</p>
        <p className="text-[11px] text-[var(--muted-foreground)] mt-1">Meeting notes will appear here as they are added.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-[5px] top-2 bottom-2 w-[2px] bg-[var(--border-subtle)]" />

      <div className="space-y-6">
        {notes.map((note, i) => {
          const dateStr = note.meeting_date
            ? new Date(note.meeting_date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "No date";

          return (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease, delay: i * 0.05 }}
              className="relative"
            >
              {/* Dot */}
              <div className="absolute -left-6 top-1.5 w-[10px] h-[10px] rounded-full border-2 border-[var(--accent)] bg-[var(--background)]" />

              <div className="rounded-lg bg-[var(--card)] border border-[var(--card-border)] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono text-[var(--muted)]">{dateStr}</span>
                  {note.tags && (
                    <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-[1px] rounded bg-[var(--surface)] text-[var(--muted)]">
                      {note.tags}
                    </span>
                  )}
                </div>
                <h4 className="text-[13px] font-semibold text-[var(--foreground)] mb-1">{note.subject}</h4>
                {note.summary && (
                  <p className="text-[12px] text-[var(--muted)] leading-relaxed">{note.summary}</p>
                )}
                {note.action_items && (
                  <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)] mb-1">Action Items</p>
                    <p className="text-[11px] text-[var(--foreground)]/80 leading-relaxed">{note.action_items}</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add helio/apps/web/src/components/charts/meeting-notes-timeline.tsx
git commit -m "feat(web): add MeetingNotesTimeline component"
```

---

### Task 12: Refactor Client Profile Page — Tab System & Overview Tab

This is the main refactoring task. Replace the single-scroll layout with tabs.

**Files:**
- Modify: `helio/apps/web/src/app/clients/page.tsx`

**Step 1: Add imports for new components**

At the top of the file, after existing imports, add:

```tsx
import { TabBar, TabId } from "@/components/charts/tab-bar";
import { TaxDonutChart } from "@/components/charts/tax-donut-chart";
import { WaterfallChart } from "@/components/charts/waterfall-chart";
import { NetIncomeBar } from "@/components/charts/net-income-bar";
import { IncomeBarChart } from "@/components/charts/income-bar-chart";
import { TaxBandsChart } from "@/components/charts/tax-bands-chart";
import { NIDonutChart } from "@/components/charts/ni-donut-chart";
import { AllowancesRadialChart } from "@/components/charts/allowances-radial-chart";
import { SavingsBanner } from "@/components/charts/savings-banner";
import { MeetingNotesTimeline } from "@/components/charts/meeting-notes-timeline";
```

**Step 2: Add tab state**

Inside `ClientsPage`, add a new state variable after `showTaxForm`:

```tsx
const [activeTab, setActiveTab] = useState<TabId>("overview");
```

Also reset the tab when switching clients. In the `useEffect` that fetches detail (the one triggered by `selectedId`), add `setActiveTab("overview")` at the start.

**Step 3: Add computed values for charts**

After the existing derived values (`const tp = detail?.tax_profile;` etc.), add:

```tsx
// Chart-derived values
const totalSavings = obs.reduce((sum, o) => sum + (o.potential_saving || 0), 0);
const opportunityCount = obs.filter((o) => o.severity === "opportunity").length;
const warningCount = obs.filter((o) => o.severity === "warning").length;
const netIncome = tp ? tp.total_income - tp.total_tax : 0;
const hicbcChargeAmt = tp?.hicbc ? (tp.hicbc.hicbc_charge ?? tp.hicbc.charge ?? 0) : 0;
```

**Step 4: Replace the sections area with tabs**

Replace the entire block from `{/* ── Metrics ── */}` through the end of `{!showTaxForm && <motion.div ...>...</motion.div>}` (lines ~790-927) with the new tabbed layout. Keep the header, tax data form areas, and empty state unchanged.

The new content should be:

```tsx
{/* ── Tabs ── */}
{tp && !showTaxForm && (
  <>
    <TabBar active={activeTab} onChange={setActiveTab} />

    <AnimatePresence mode="wait">
      {/* ══ OVERVIEW TAB ══ */}
      {activeTab === "overview" && (
        <motion.div
          key="overview"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease }}
        >
          <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-5">
            {/* Metric cards */}
            <div className="grid grid-cols-4 gap-5">
              <Metric label="Total Income" value={fmt(tp.total_income)} sub={sources.length > 1 ? `${sources.length} income sources` : undefined} icon={IconWallet} />
              <Metric label="Total Tax" value={fmtFull(tp.total_tax)} sub={`Income tax ${fmt(tp.income_tax)}`} icon={IconCalculator} />
              <Metric label="Effective Rate" value={fmtPct(tp.effective_rate)} sub="Overall tax burden" icon={IconChart} />
              <Metric label="Marginal Rate" value={fmtPct(tp.marginal_rate)} sub="Next pound earned" icon={IconTrendingUp} />
            </div>

            {/* Net income takeaway */}
            <NetIncomeBar
              grossIncome={tp.total_income}
              totalTax={tp.income_tax + (tp.dividend_tax || 0)}
              nationalInsurance={tp.national_insurance}
              netIncome={netIncome}
            />

            {/* Charts row: Donut + Waterfall */}
            <div className="grid grid-cols-2 gap-5">
              <Card title="Tax Composition" icon={IconChart}>
                <TaxDonutChart
                  incomeTax={tp.income_tax}
                  nationalInsurance={tp.national_insurance}
                  dividendTax={tp.dividend_tax}
                  hicbcCharge={hicbcChargeAmt}
                />
              </Card>
              <Card title="Income to Net Flow" icon={IconTrendingUp}>
                <WaterfallChart
                  grossIncome={tp.total_income}
                  personalAllowance={tp.personal_allowance || 12570}
                  taxableIncome={tp.taxable_income || 0}
                  incomeTax={tp.income_tax}
                  nationalInsurance={tp.national_insurance}
                  dividendTax={tp.dividend_tax}
                  netIncome={netIncome}
                />
              </Card>
            </div>

            {/* Savings banner (links to intelligence tab) */}
            <SavingsBanner
              totalSavings={totalSavings}
              opportunityCount={opportunityCount}
              warningCount={warningCount}
              onViewIntelligence={() => setActiveTab("intelligence")}
            />
          </motion.div>
        </motion.div>
      )}

      {/* ══ BREAKDOWN TAB ══ */}
      {activeTab === "breakdown" && (
        <motion.div
          key="breakdown"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease }}
        >
          <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-5">
            {/* Client details + Income sources */}
            <div className="grid grid-cols-2 gap-5">
              <Card title="Client Details" icon={IconUser}>
                <KV label="Email" value={detail.email} />
                <KV label="NI Number" value={detail.ni_number} mono />
                <KV label="UTR" value={detail.utr} mono />
                <KV label="Date of Birth" value={dobStr} />
                <KV label="Region" value={detail.region} />
                <KV label="Employment" value={detail.employment_status} />
              </Card>

              {sources.length > 0 ? (
                <Card title="Income Sources" icon={IconWallet}>
                  <IncomeBarChart sources={sources} totalIncome={tp.total_income} />
                  <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between">
                    <span className="text-[12px] font-medium text-[var(--foreground)]">Total Gross Income</span>
                    <span className="text-[14px] font-mono font-semibold text-[var(--foreground)]">{fmt(tp.total_income)}</span>
                  </div>
                </Card>
              ) : (
                <Card title="Income Sources" icon={IconWallet}>
                  <p className="text-[12px] text-[var(--muted)] py-4 text-center">No income sources recorded</p>
                </Card>
              )}
            </div>

            {/* Tax bands chart */}
            {bands.length > 0 && (
              <Card title="Income Tax by Band" icon={IconCalculator}>
                <TaxBandsChart bands={bands} />
                <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[var(--foreground)]">Total Income Tax</span>
                  <span className="text-[16px] font-mono font-bold text-[var(--foreground)]">{fmtFull(tp.income_tax)}</span>
                </div>
              </Card>
            )}

            {/* NI + Allowances */}
            {((ni && ni.total > 0) || allowances.length > 0) && (
              <div className="grid grid-cols-2 gap-5">
                {ni && ni.total > 0 && (
                  <Card title="National Insurance" icon={IconShield}>
                    <NIDonutChart class1={ni.class1} class2={ni.class2} class4={ni.class4} total={ni.total} />
                  </Card>
                )}
                {allowances.length > 0 && (
                  <Card title="Allowances" icon={IconShield}>
                    <AllowancesRadialChart allowances={allowances} />
                  </Card>
                )}
              </div>
            )}

            {/* HICBC */}
            {(tp.hicbc_applies || tp.hicbc?.applies) && tp.hicbc && (
              <Card title="High Income Child Benefit Charge" icon={IconAlertCircle}>
                <div className="grid grid-cols-3 gap-5">
                  {[
                    { label: "Child Benefit", value: fmtFull(hicbcBenefit(tp.hicbc)), color: "" },
                    { label: "Clawback", value: `${hicbcClawback(tp.hicbc)}%`, color: "text-amber-600 dark:text-amber-400" },
                    { label: "HICBC Charge", value: fmtFull(hicbcCharge(tp.hicbc)), color: "text-red-600 dark:text-red-400" },
                  ].map(({ label, value, color }) => (
                    <div key={label}>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)] mb-1">{label}</p>
                      <p className={`text-[15px] font-mono font-semibold ${color || "text-[var(--foreground)]"}`}>{value}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </motion.div>
        </motion.div>
      )}

      {/* ══ INTELLIGENCE TAB ══ */}
      {activeTab === "intelligence" && (
        <motion.div
          key="intelligence"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease }}
        >
          <IntelligenceTab
            observations={obs}
            totalSavings={totalSavings}
            onDelete={handleDeleteObservation}
          />
        </motion.div>
      )}

      {/* ══ NOTES TAB ══ */}
      {activeTab === "notes" && (
        <motion.div
          key="notes"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25, ease }}
        >
          <MeetingNotesTimeline clientId={detail.id} />
        </motion.div>
      )}
    </AnimatePresence>
  </>
)}
```

**Step 5: Add IntelligenceTab sub-component**

Add this new sub-component inside `page.tsx`, after the existing sub-components (after `ObsItem`):

```tsx
function IntelligenceTab({
  observations,
  totalSavings,
  onDelete,
}: {
  observations: Observation[];
  totalSavings: number;
  onDelete: (id: string) => void;
}) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all"
    ? observations
    : observations.filter((o) => o.severity === filter);

  const counts = {
    all: observations.length,
    opportunity: observations.filter((o) => o.severity === "opportunity").length,
    warning: observations.filter((o) => o.severity === "warning").length,
    critical: observations.filter((o) => o.severity === "critical" || o.severity === "danger").length,
    info: observations.filter((o) => o.severity === "info").length,
  };

  return (
    <div className="space-y-5">
      {/* Savings banner */}
      {totalSavings > 0 && (
        <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100/50 dark:from-emerald-500/[0.08] dark:to-emerald-500/[0.04] border border-emerald-200/50 dark:border-emerald-500/15 p-5">
          <p className="text-[11px] font-medium text-emerald-600/70 dark:text-emerald-400/60 uppercase tracking-wide mb-1">Total Potential Savings</p>
          <p className="text-[24px] font-semibold font-mono text-emerald-700 dark:text-emerald-400 leading-none">
            £{totalSavings.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
          </p>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex items-center gap-2">
        {(["all", "opportunity", "warning", "critical", "info"] as const).map((key) => {
          const count = counts[key];
          if (key !== "all" && count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`text-[11px] font-medium px-3 py-1.5 rounded-full transition-colors ${
                filter === key
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              {key === "all" ? "All" : key.charAt(0).toUpperCase() + key.slice(1)}
              <span className="ml-1 opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Observation list */}
      {filtered.length > 0 ? (
        <motion.div variants={stagger} initial="initial" animate="animate" className="space-y-3">
          {filtered.map((o) => (
            <ObsItem key={o.id} obs={o} onDelete={onDelete} />
          ))}
        </motion.div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--border)] p-10 text-center">
          <p className="text-[13px] text-[var(--muted)]">No observations match this filter</p>
        </div>
      )}
    </div>
  );
}
```

Note: `IntelligenceTab` uses `useState` which is already imported. It also references `stagger`, `ObsItem`, and `Observation` which are already defined in the same file.

**Step 6: Run type check**

Run: `cd helio/apps/web && npm run type-check`
Expected: No errors (or only pre-existing warnings)

**Step 7: Run dev server to visually verify**

Run: `cd helio/apps/web && npm run dev`
Then open `http://localhost:3000/clients` and verify:
- Tabs render below the header
- Overview tab shows metric cards, net income bar, donut chart, waterfall chart, savings banner
- Breakdown tab shows client details, income bar chart, tax bands chart, NI donut, allowances radial, HICBC
- Intelligence tab shows savings total, filter pills, observation cards
- Notes tab shows meeting notes timeline or empty state
- Tab transitions are smooth
- All charts render with data

**Step 8: Commit**

```bash
git add helio/apps/web/src/app/clients/page.tsx
git commit -m "feat(web): refactor client profile into tabbed dashboard with interactive charts"
```

---

### Task 13: Final Verification & Cleanup

**Step 1: Run full type check**

Run: `cd helio/apps/web && npm run type-check`
Expected: No type errors

**Step 2: Run build**

Run: `cd helio/apps/web && npm run build`
Expected: Build succeeds

**Step 3: Visual QA checklist**

With `npm run dev` running, verify on `http://localhost:3000/clients`:
- [ ] Tab switching is smooth (Framer Motion transitions)
- [ ] Donut chart renders with correct slices and tooltips
- [ ] Waterfall chart shows correct gross → net flow
- [ ] Net income bar shows correct proportions
- [ ] Income bar chart shows all income sources with tooltips
- [ ] Tax bands grouped bar chart renders correctly
- [ ] NI donut shows class breakdown
- [ ] Allowances radial chart renders with correct fill
- [ ] Savings banner shows total and links to Intelligence tab
- [ ] Intelligence tab filter pills work
- [ ] Notes tab loads meeting notes or shows empty state
- [ ] Dark mode works for all charts
- [ ] Client switching resets to Overview tab

**Step 4: Final commit (if any cleanup needed)**

```bash
git add -A
git commit -m "fix(web): cleanup and polish client profile charts"
```
