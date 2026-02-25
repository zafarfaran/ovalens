"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface CarryForwardYear {
  taxYear: string;
  allowance: number;
  used: number;
  unused: number;
}

interface Allowance {
  type?: string;
  label?: string;
  name?: string;
  annual_limit?: number;
  annualLimit?: number;
  used: number;
  remaining: number;
  status?: string;
  carryForward?: CarryForwardYear[];
  totalCarryForward?: number;
  totalAvailable?: number;
}

interface AllowancesRadialProps {
  allowances: Allowance[];
}

const fmt = (n: number) =>
  `£${n.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

const ease = [0.16, 1, 0.3, 1] as const;

function getName(a: Allowance): string {
  return a.label ?? a.name ?? "Allowance";
}

function getLimit(a: Allowance): number {
  return a.annual_limit ?? a.annualLimit ?? 0;
}

/* Carry forward year segment colors — muted tonal palette */
const CF_COLORS = [
  "bg-indigo-400/70 dark:bg-indigo-400/50",
  "bg-sky-400/70 dark:bg-sky-400/50",
  "bg-violet-400/70 dark:bg-violet-400/50",
];

function CarryForwardBreakdown({
  carryForward,
  totalCarryForward,
  currentAA,
  totalAvailable,
  delayBase,
}: {
  carryForward: CarryForwardYear[];
  totalCarryForward: number;
  currentAA: number;
  totalAvailable: number;
  delayBase: number;
}) {
  if (totalAvailable <= 0) return null;

  const segments = [
    { label: "2025/26 AA", value: currentAA },
    ...carryForward.filter((cf) => cf.unused > 0).map((cf) => ({
      label: cf.taxYear,
      value: cf.unused,
    })),
  ];

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.3, ease, delay: delayBase + 0.15 }}
      className="mt-2.5 pt-2.5 border-t border-[var(--border-subtle)]"
    >
      {/* Carry forward header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">
          Carry Forward
        </span>
        <span className="text-[9px] font-mono text-[var(--accent)] tabular-nums">
          +{fmt(totalCarryForward)}
        </span>
      </div>

      {/* Stacked bar — segments show composition of total available */}
      <div className="h-[6px] rounded-full bg-[var(--glass)] overflow-hidden flex">
        {segments.map((seg, j) => {
          const segPct = (seg.value / totalAvailable) * 100;
          return (
            <motion.div
              key={seg.label}
              initial={{ width: 0 }}
              animate={{ width: `${segPct}%` }}
              transition={{ duration: 0.45, ease, delay: delayBase + 0.2 + j * 0.08 }}
              className={`h-full ${j === 0 ? "bg-emerald-500/80" : CF_COLORS[(j - 1) % CF_COLORS.length]} ${j === 0 ? "rounded-l-full" : ""} ${j === segments.length - 1 ? "rounded-r-full" : ""}`}
            />
          );
        })}
      </div>

      {/* Year-by-year breakdown */}
      <div className="mt-2 space-y-[3px]">
        {carryForward.map((cf, j) => (
          <motion.div
            key={cf.taxYear}
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, ease, delay: delayBase + 0.3 + j * 0.06 }}
            className="flex items-center gap-2"
          >
            <div className={`w-[6px] h-[6px] rounded-[2px] ${CF_COLORS[j % CF_COLORS.length]} shrink-0`} />
            <span className="text-[9px] font-mono text-[var(--muted)] tabular-nums w-[42px]">
              {cf.taxYear}
            </span>
            <div className="flex-1 h-px bg-[var(--border-subtle)]" />
            <span className="text-[9px] font-mono tabular-nums text-[var(--foreground)]/70">
              {fmt(cf.unused)}
            </span>
            <span className="text-[8px] text-[var(--muted)]/40">
              of {fmt(cf.allowance)}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Total available summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: delayBase + 0.5 }}
        className="mt-2 pt-1.5 border-t border-dashed border-[var(--border-subtle)] flex items-center justify-between"
      >
        <span className="text-[9px] font-medium text-[var(--foreground)]/60">
          Total available
        </span>
        <span className="text-[10px] font-mono font-semibold text-[var(--foreground)] tabular-nums">
          {fmt(totalAvailable)}
        </span>
      </motion.div>
    </motion.div>
  );
}

export function AllowancesRadialChart({ allowances }: AllowancesRadialProps) {
  const items = allowances.filter((a) => getLimit(a) > 0);
  const [expandedCF, setExpandedCF] = useState<string | null>(null);

  if (items.length === 0) return null;

  return (
    <div className="space-y-5">
      {items.map((a, i) => {
        const limit = getLimit(a);
        const totalAvail = a.totalAvailable ?? limit;
        const pct = totalAvail > 0 ? Math.min((a.used / totalAvail) * 100, 100) : 0;
        const fullyUsed = pct >= 100;
        const nearlyUsed = pct >= 70;
        const hasCF = a.carryForward && a.carryForward.length > 0 && (a.totalCarryForward ?? 0) > 0;
        const name = getName(a);
        const isCFExpanded = expandedCF === name;

        const barClass = fullyUsed
          ? "bg-amber-500"
          : nearlyUsed
            ? "bg-amber-400"
            : "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.15)]";

        return (
          <motion.div
            key={name}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease, delay: i * 0.06 }}
          >
            {/* Label row */}
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-[11px] font-medium text-[var(--foreground)]">
                {name}
              </span>
              <span className="text-[10px] font-mono text-[var(--muted)] tabular-nums">
                {fmt(a.used)}
                <span className="text-[var(--muted)]/25 mx-0.5">/</span>
                {fmt(totalAvail)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-[5px] rounded-full bg-[var(--glass)] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease, delay: i * 0.06 + 0.1 }}
                className={`h-full rounded-full ${barClass}`}
              />
            </div>

            {/* Status row */}
            <div className="flex items-center justify-between mt-1">
              <span
                className={`text-[9px] font-medium ${
                  fullyUsed
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-[var(--muted)]/50"
                }`}
              >
                {fullyUsed ? "Fully utilised" : `${fmt(a.remaining)} remaining`}
              </span>
              <div className="flex items-center gap-2">
                {hasCF && (
                  <button
                    onClick={() => setExpandedCF(isCFExpanded ? null : name)}
                    className="text-[8px] font-semibold uppercase tracking-[0.06em] text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
                  >
                    {isCFExpanded ? "Hide" : "Carry fwd"}
                  </button>
                )}
                <span className="text-[9px] font-mono text-[var(--muted)]/35 tabular-nums">
                  {pct.toFixed(0)}%
                </span>
              </div>
            </div>

            {/* Carry Forward Breakdown (collapsible) */}
            <AnimatePresence>
              {hasCF && isCFExpanded && (
                <CarryForwardBreakdown
                  carryForward={a.carryForward!}
                  totalCarryForward={a.totalCarryForward!}
                  currentAA={limit}
                  totalAvailable={totalAvail}
                  delayBase={0}
                />
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}
