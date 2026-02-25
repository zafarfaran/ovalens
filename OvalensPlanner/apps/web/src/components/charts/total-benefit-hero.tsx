"use client";

import { motion } from "framer-motion";

/* ─── Types ─── */

interface TotalBenefitHeroProps {
  totalBenefit: {
    // Personal pension fields
    basic_rate_relief?: number;
    higher_rate_relief?: number;
    // Salary sacrifice fields
    income_tax_saved?: number;
    employee_ni_saved?: number;
    employer_ni_saved?: number;
    take_home_reduction?: number;
    monthly_take_home_drop?: number;
    // Shared fields
    hicbc_avoided?: number;
    pa_restoration_value?: number;
    total_annual_benefit?: number;
    into_pension?: number;
    client_out_of_pocket?: number;
    monthly_benefit?: number;
    monthly_cost?: number;
  };
  isPension: boolean;
  paChange: {
    current: number;
    proposed: number;
    restored: number;
  };
}

/* ─── Helpers ─── */

const fmt = (n: number) =>
  `\u00a3${Math.abs(n).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

const ease = [0.16, 1, 0.3, 1] as const;

/* ─── Component ─── */

export function TotalBenefitHero({
  totalBenefit,
  isPension,
  paChange,
}: TotalBenefitHeroProps) {
  if (!totalBenefit || (totalBenefit.total_annual_benefit ?? 0) <= 0) return null;

  const totalAnnual = totalBenefit.total_annual_benefit!;
  const monthly = totalBenefit.monthly_benefit ?? Math.round(totalAnnual / 12);
  const intoPension = totalBenefit.into_pension ?? 0;

  /* ─── Breakdown items (only show items > 0) ─── */

  const breakdownItems = isPension
    ? [
        { label: "Gov top-up (20%)", value: totalBenefit.basic_rate_relief },
        { label: "Tax relief (via SA)", value: totalBenefit.higher_rate_relief },
        { label: "HICBC avoided", value: totalBenefit.hicbc_avoided },
      ]
    : [
        { label: "Income tax saved", value: totalBenefit.income_tax_saved },
        { label: "Employee NI saved", value: totalBenefit.employee_ni_saved },
        { label: "Employer NI saved", value: totalBenefit.employer_ni_saved },
        { label: "HICBC avoided", value: totalBenefit.hicbc_avoided },
      ];

  const visibleItems = breakdownItems.filter(
    (item) => item.value != null && item.value > 0,
  );

  /* ─── KPI boxes ─── */

  const kpiBoxes = isPension
    ? [
        { label: "Tax relief", value: fmt(totalAnnual) },
        { label: "Into pension", value: fmt(intoPension) },
        {
          label: "You pay",
          value: fmt(totalBenefit.client_out_of_pocket ?? 0),
          variant: "default" as const,
        },
      ]
    : [
        { label: "Total saving", value: fmt(totalAnnual) },
        { label: "Into pension", value: fmt(intoPension) },
        {
          label: "Take-home",
          value: `-${fmt(totalBenefit.take_home_reduction ?? 0)}/yr`,
          variant: "amber" as const,
        },
      ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
    >
      <div className="rounded-xl border border-slate-200/40 dark:border-zinc-800/30 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm p-4">
        {/* ─── Header ─── */}
        <p className="text-[9px] font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-3">
          Total Annual Benefit
        </p>

        {/* ─── Hero number row ─── */}
        <div className="flex items-baseline justify-between mb-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
              {fmt(totalAnnual)}
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-400 dark:text-zinc-500">
              /yr
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xs font-mono tabular-nums text-slate-400 dark:text-zinc-500">
              {fmt(monthly)}
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-400 dark:text-zinc-500">
              /month
            </span>
          </div>
        </div>

        {/* ─── Three KPI metric boxes ─── */}
        <div className="flex gap-3 mb-4">
          {kpiBoxes.map((box, i) => (
            <motion.div
              key={box.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease, delay: 0.08 + i * 0.06 }}
              className="flex-1 rounded-lg bg-slate-50/60 dark:bg-zinc-800/30 p-3 text-center"
            >
              <p className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-zinc-500 mb-1">
                {box.label}
              </p>
              <p
                className={`text-sm font-mono tabular-nums font-semibold ${
                  box.variant === "amber"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-slate-700 dark:text-zinc-200"
                }`}
              >
                {box.value}
              </p>
            </motion.div>
          ))}
        </div>

        {/* ─── Breakdown lines ─── */}
        {visibleItems.length > 0 && (
          <div className="space-y-0.5">
            {visibleItems.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease, delay: 0.25 + i * 0.04 }}
                className="flex justify-between items-center py-1"
              >
                <span className="text-[10px] text-slate-600 dark:text-zinc-300">
                  {item.label}
                </span>
                <span className="text-[10px] font-mono tabular-nums text-slate-700 dark:text-zinc-200">
                  {fmt(item.value!)}
                </span>
              </motion.div>
            ))}
          </div>
        )}

        {/* ─── PA restored pill ─── */}
        {paChange.restored > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              ease,
              delay: 0.25 + visibleItems.length * 0.04 + 0.04,
            }}
            className="mt-2 flex items-center py-1"
          >
            <span className="inline-flex items-center gap-1 text-[9px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-800/30 px-2 py-0.5 rounded-full">
              PA restored: +{fmt(paChange.restored)}
              {totalBenefit.pa_restoration_value != null &&
                totalBenefit.pa_restoration_value > 0 && (
                  <span className="text-emerald-600/70 dark:text-emerald-400/60">
                    (worth {fmt(totalBenefit.pa_restoration_value)} in tax)
                  </span>
                )}
            </span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
