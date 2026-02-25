"use client";

import { motion } from "framer-motion";
import { IconArrowRight } from "@/components/icons";

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
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease }}
      className="flex items-center justify-between py-3 px-4 rounded-xl border border-emerald-500/[0.08] bg-emerald-500/[0.025]"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-[5px] h-[5px] rounded-full bg-emerald-500" />
        {totalSavings > 0 && (
          <span className="text-[12px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {fmt(totalSavings)}
          </span>
        )}
        <span className="text-[11px] text-[var(--muted)]">
          {totalSavings > 0 && "potential savings"}
          {totalSavings > 0 && (opportunityCount > 0 || warningCount > 0) && " · "}
          {opportunityCount > 0 && `${opportunityCount} ${opportunityCount === 1 ? "opportunity" : "opportunities"}`}
          {opportunityCount > 0 && warningCount > 0 && " · "}
          {warningCount > 0 && `${warningCount} ${warningCount === 1 ? "warning" : "warnings"}`}
        </span>
      </div>
      {onViewIntelligence && (
        <button
          onClick={onViewIntelligence}
          className="flex items-center gap-1 text-[10px] font-medium text-emerald-600/70 dark:text-emerald-400/60 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        >
          View <IconArrowRight className="w-2.5 h-2.5" />
        </button>
      )}
    </motion.div>
  );
}
