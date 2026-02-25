"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

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

const ease = [0.16, 1, 0.3, 1] as const;

export function WaterfallChart({
  grossIncome,
  personalAllowance,
  taxableIncome: _taxableIncome,
  incomeTax,
  nationalInsurance,
  dividendTax = 0,
  netIncome,
}: WaterfallProps) {
  void _taxableIncome;

  const deductions = useMemo(() => {
    const items: { label: string; amount: number }[] = [];
    if (personalAllowance > 0) items.push({ label: "Personal Allowance", amount: personalAllowance });
    if (incomeTax > 0) items.push({ label: "Income Tax", amount: incomeTax });
    if (nationalInsurance > 0) items.push({ label: "National Insurance", amount: nationalInsurance });
    if (dividendTax > 0) items.push({ label: "Dividend Tax", amount: dividendTax });
    return items;
  }, [personalAllowance, incomeTax, nationalInsurance, dividendTax]);

  const totalDeductions = deductions.reduce((s, d) => s + d.amount, 0);
  const takeHomePct = grossIncome > 0 ? (netIncome / grossIncome) * 100 : 0;

  return (
    <div>
      {/* Gross Income */}
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[11px] font-medium text-[var(--foreground)]/60 tracking-wide uppercase">
          Gross Income
        </span>
        <span className="text-[15px] font-mono font-semibold text-[var(--foreground)] tracking-tight">
          {fmt(grossIncome)}
        </span>
      </div>
      <div className="h-[5px] rounded-full bg-[var(--glass)] overflow-hidden mb-5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: "100%" }}
          transition={{ duration: 0.55, ease }}
          className="h-full rounded-full bg-[#748ffc]/50"
        />
      </div>

      {/* Deductions */}
      <div className="space-y-2 mb-5 pl-1">
        {deductions.map((d, i) => {
          const pct = grossIncome > 0 ? (d.amount / grossIncome) * 100 : 0;
          return (
            <motion.div
              key={d.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, ease, delay: 0.12 + i * 0.06 }}
              className="flex items-center justify-between py-0.5"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-[3px] h-[3px] rounded-full bg-[var(--muted)]/25" />
                <span className="text-[11px] text-[var(--muted)]">{d.label}</span>
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-[9px] font-mono text-[var(--muted)]/40 tabular-nums">
                  {pct.toFixed(1)}%
                </span>
                <span className="text-[12px] font-mono font-medium text-[var(--foreground)]/60 tabular-nums">
                  &minus;{fmt(d.amount)}
                </span>
              </div>
            </motion.div>
          );
        })}

        {/* Total deductions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.35 }}
          className="pt-2.5 mt-1 border-t border-[var(--border-subtle)] flex items-center justify-between"
        >
          <span className="text-[10px] font-medium text-[var(--muted)]/50 uppercase tracking-wide">
            Total deducted
          </span>
          <span className="text-[11px] font-mono font-medium text-[var(--foreground)]/40 tabular-nums">
            &minus;{fmt(totalDeductions)}
          </span>
        </motion.div>
      </div>

      {/* Take-Home */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease, delay: 0.4 }}
        className="rounded-xl bg-emerald-500/[0.035] border border-emerald-500/[0.08] px-4 py-3.5"
      >
        <div className="flex items-baseline justify-between mb-2.5">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
            Take-Home
          </span>
          <div className="flex items-baseline gap-2.5">
            <span className="text-[10px] font-mono text-emerald-600/40 dark:text-emerald-400/35 tabular-nums">
              {takeHomePct.toFixed(1)}%
            </span>
            <span className="text-[17px] font-mono font-bold text-emerald-600 dark:text-emerald-400 tracking-tight tabular-nums">
              {fmt(netIncome)}
            </span>
          </div>
        </div>
        <div className="h-[5px] rounded-full bg-emerald-500/[0.06] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${takeHomePct}%` }}
            transition={{ duration: 0.65, ease, delay: 0.5 }}
            className="h-full rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
          />
        </div>
      </motion.div>
    </div>
  );
}
