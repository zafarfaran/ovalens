"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

/* ── Types ─────────────────────────────────────────────────── */

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
    employer_ni?: number;
    hicbc_avoided: number;
    total: number;
  };
  isPension: boolean;
}

/* ── Helpers ───────────────────────────────────────────────── */

const fmt = (n: number) =>
  `£${Math.abs(n).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

const ease = [0.16, 1, 0.3, 1] as const;

const COLORS = {
  incomeTax: "#748ffc",
  ni: "#a78bfa",
  hicbc: "#fbbf24",
  emerald: "#22c55e",
} as const;

/* ── Tooltip ───────────────────────────────────────────────── */

interface TooltipPayloadItem {
  name: string;
  value: number;
  dataKey: string;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  /* Filter out zero-value segments */
  const visible = payload.filter((p) => p.value > 0);
  if (visible.length === 0) return null;

  /* Sum visible for total */
  const total = visible.reduce((s, p) => s + p.value, 0);

  return (
    <div
      className="rounded-xl px-3.5 py-2.5 shadow-xl border backdrop-blur-xl"
      style={{
        background: "var(--chart-tooltip-bg)",
        borderColor: "var(--chart-tooltip-border)",
      }}
    >
      <p className="text-[11px] font-medium text-[var(--foreground)]/70 mb-1">
        {label}
      </p>
      {visible.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="w-[6px] h-[6px] rounded-full shrink-0"
            style={{ background: p.color }}
          />
          <p className="text-[12px] font-mono text-[var(--foreground)]">
            <span className="text-[var(--muted)]">{p.name}: </span>
            {fmt(p.value)}
          </p>
        </div>
      ))}
      <div className="mt-1.5 pt-1.5 border-t border-[var(--chart-tooltip-border)]">
        <p className="text-[12px] font-mono font-semibold text-[var(--foreground)]">
          <span className="text-[var(--muted)]">Total: </span>
          {fmt(total)}
        </p>
      </div>
    </div>
  );
}

/* ── Component ─────────────────────────────────────────────── */

export function ScenarioComparisonChart({
  current,
  proposed,
  savings,
  isPension,
}: ScenarioComparisonChartProps) {
  const data = useMemo(() => {
    return [
      {
        scenario: "Current",
        incomeTax: current.income_tax,
        ni: isPension ? 0 : current.national_insurance,
        hicbc: current.hicbc,
      },
      {
        scenario: "Proposed",
        incomeTax: proposed.income_tax,
        ni: isPension ? 0 : proposed.national_insurance,
        hicbc: proposed.hicbc,
      },
    ];
  }, [current, proposed, isPension]);

  /* Shared maximum so both bars are scaled identically */
  const maxTax = Math.max(current.total_tax, proposed.total_tax, 1);

  /* Check which segments are present across both scenarios */
  const hasNI = !isPension && (current.national_insurance > 0 || proposed.national_insurance > 0);
  const hasHICBC = current.hicbc > 0 || proposed.hicbc > 0;

  /* Build legend items dynamically */
  const legendItems = useMemo(() => {
    const items: { label: string; color: string }[] = [
      { label: "Income Tax", color: COLORS.incomeTax },
    ];
    if (hasNI) items.push({ label: "NI", color: COLORS.ni });
    if (hasHICBC) items.push({ label: "HICBC", color: COLORS.hicbc });
    return items;
  }, [hasNI, hasHICBC]);

  /* Build savings breakdown items */
  const savingsBreakdown = useMemo(() => {
    const items: { label: string; value: number }[] = [];
    if (savings.income_tax > 0) items.push({ label: "Income Tax", value: savings.income_tax });
    if (!isPension && savings.national_insurance && savings.national_insurance > 0) {
      items.push({ label: "NI", value: savings.national_insurance });
    }
    if (!isPension && savings.employer_ni && savings.employer_ni > 0) {
      items.push({ label: "Employer NI", value: savings.employer_ni });
    }
    if (savings.hicbc_avoided > 0) items.push({ label: "HICBC avoided", value: savings.hicbc_avoided });
    return items;
  }, [savings, isPension]);

  /* Determine which bar is the last visible segment (for right-side rounding) */
  const lastSegment: "hicbc" | "ni" | "incomeTax" = hasHICBC
    ? "hicbc"
    : hasNI
      ? "ni"
      : "incomeTax";
  const isOnlyIncomeTax = !hasNI && !hasHICBC;

  /* Nothing to show */
  if (current.total_tax === 0 && proposed.total_tax === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
    >
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        {legendItems.map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div
              className="w-[6px] h-[6px] rounded-full"
              style={{ background: color }}
            />
            <span className="text-[10px] text-[var(--muted)]">{label}</span>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="h-[120px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 60, bottom: 0, left: 0 }}
            barCategoryGap="28%"
          >
            <XAxis
              type="number"
              domain={[0, maxTax]}
              tick={{ fontSize: 10, fill: "var(--chart-axis)" }}
              tickFormatter={(v: number) =>
                v >= 1000 ? `£${(v / 1000).toFixed(0)}k` : `£${v}`
              }
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="scenario"
              tick={{ fontSize: 11, fill: "var(--chart-axis)", fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
              width={72}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "var(--chart-cursor)", opacity: 0.6 }}
            />

            {/* Income Tax segment — always first (left-side rounding) */}
            <Bar
              dataKey="incomeTax"
              name="Income Tax"
              stackId="tax"
              fill={COLORS.incomeTax}
              fillOpacity={0.8}
              radius={isOnlyIncomeTax ? [4, 4, 4, 4] : [4, 0, 0, 4]}
              animationDuration={700}
              animationEasing="ease-out"
            />

            {/* NI segment — hidden for personal pension */}
            {hasNI && (
              <Bar
                dataKey="ni"
                name="NI"
                stackId="tax"
                fill={COLORS.ni}
                fillOpacity={0.75}
                radius={lastSegment === "ni" ? [0, 4, 4, 0] : [0, 0, 0, 0]}
                animationDuration={700}
                animationEasing="ease-out"
              />
            )}

            {/* HICBC segment — last when present */}
            {hasHICBC && (
              <Bar
                dataKey="hicbc"
                name="HICBC"
                stackId="tax"
                fill={COLORS.hicbc}
                fillOpacity={0.85}
                radius={[0, 4, 4, 0]}
                animationDuration={700}
                animationEasing="ease-out"
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Total labels */}
      <div className="flex items-center justify-between mt-1 px-[72px]">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] text-[var(--muted)]">Current</span>
          <span className="text-[12px] font-mono font-semibold text-[var(--foreground)] tabular-nums">
            {fmt(current.total_tax)}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] text-[var(--muted)]">Proposed</span>
          <span className="text-[12px] font-mono font-semibold text-[var(--foreground)] tabular-nums">
            {fmt(proposed.total_tax)}
          </span>
        </div>
      </div>

      {/* Savings callout */}
      {savings.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease, delay: 0.35 }}
          className="mt-4 rounded-xl bg-emerald-500/[0.035] border border-emerald-500/[0.08] px-4 py-3.5"
        >
          {/* Total savings */}
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <div className="w-[5px] h-[5px] rounded-full bg-emerald-500" />
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
                Tax saved
              </span>
            </div>
            <span className="text-[17px] font-mono font-bold text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
              {fmt(savings.total)}
              <span className="text-[10px] font-normal text-emerald-600/50 dark:text-emerald-400/40 ml-0.5">
                /yr
              </span>
            </span>
          </div>

          {/* Savings breakdown */}
          {savingsBreakdown.length > 1 && (
            <div className="mt-2.5 pt-2.5 border-t border-emerald-500/[0.06] space-y-1">
              {savingsBreakdown.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, ease, delay: 0.45 + i * 0.06 }}
                  className="flex items-center justify-between"
                >
                  <span className="text-[10px] text-emerald-600/60 dark:text-emerald-400/50">
                    {item.label}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-600/80 dark:text-emerald-400/70 tabular-nums">
                    {fmt(item.value)}
                  </span>
                </motion.div>
              ))}
            </div>
          )}

          {/* Monthly equivalent */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.55 }}
            className="mt-2.5 pt-2 border-t border-dashed border-emerald-500/[0.06] flex items-center justify-between"
          >
            <span className="text-[9px] font-medium text-emerald-600/40 dark:text-emerald-400/35 uppercase tracking-wide">
              Monthly
            </span>
            <span className="text-[11px] font-mono font-medium text-emerald-600/60 dark:text-emerald-400/50 tabular-nums">
              {fmt(Math.round(savings.total / 12))}/mo
            </span>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}
