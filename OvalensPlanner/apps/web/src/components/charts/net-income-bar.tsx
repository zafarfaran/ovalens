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
    <div className="py-1">
      {/* Stacked bar */}
      <div className="h-[4px] rounded-full bg-[var(--glass)] overflow-hidden flex">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${netPct}%` }}
          transition={{ duration: 0.7, ease }}
          className="h-full bg-emerald-500"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${taxPct}%` }}
          transition={{ duration: 0.7, ease, delay: 0.08 }}
          className="h-full bg-red-400/70"
        />
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${niPct}%` }}
          transition={{ duration: 0.7, ease, delay: 0.12 }}
          className="h-full bg-amber-400/70"
        />
      </div>

      {/* Inline legend */}
      <div className="flex items-center gap-4 mt-2.5">
        {[
          { label: "Take-home", color: "bg-emerald-500", value: fmt(netIncome), pct: netPct },
          { label: "Tax", color: "bg-red-400/70", value: fmt(totalTax), pct: taxPct },
          { label: "NI", color: "bg-amber-400/70", value: fmt(nationalInsurance), pct: niPct },
        ].map(({ label, color, value, pct }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-[5px] h-[5px] rounded-full ${color}`} />
            <span className="text-[10px] text-[var(--muted)]">{label}</span>
            <span className="text-[10px] font-mono font-medium text-[var(--foreground)] tabular-nums">{value}</span>
            <span className="text-[9px] font-mono text-[var(--muted)]/35 tabular-nums">{pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
