"use client";

import { motion } from "framer-motion";

/* ─── Types ─── */

interface NetBenefitCardProps {
  netBenefit?: {
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
  isPension: boolean;
  totalEffectiveReliefRate?: number;
  savings: {
    income_tax: number;
    national_insurance?: number;
    hicbc_avoided: number;
    total: number;
  };
  paChange: {
    current: number;
    proposed: number;
    restored: number;
  };
  extraIntoPension?: number;
}

/* ─── Helpers ─── */

const fmt = (n: number) =>
  `£${Math.abs(n).toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

const ease = [0.16, 1, 0.3, 1] as const;

/**
 * Returns a Tailwind color class for the relief-rate progress bar fill.
 *   amber  < 25%
 *   brand  25-35%
 *   emerald > 35%
 */
function reliefBarColor(rate: number): string {
  if (rate < 25) return "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]";
  if (rate <= 35) return "bg-brand-500 shadow-[0_0_10px_rgba(var(--brand-rgb,99,102,241),0.2)]";
  return "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]";
}

/* ─── Component ─── */

export function NetBenefitCard({
  netBenefit,
  isPension,
  totalEffectiveReliefRate,
  savings,
  paChange,
  extraIntoPension,
}: NetBenefitCardProps) {
  /* ─── New net_benefit layout ─── */
  if (netBenefit) {
    if (isPension) {
      return (
        <PensionBenefitCard
          nb={netBenefit}
          totalEffectiveReliefRate={totalEffectiveReliefRate}
          paChange={paChange}
        />
      );
    }

    return (
      <SalarySacrificeBenefitCard
        nb={netBenefit}
        paChange={paChange}
      />
    );
  }

  /* ─── Fallback: legacy Net Impact (no net_benefit data) ─── */
  return (
    <FallbackNetImpact
      isPension={isPension}
      savings={savings}
      paChange={paChange}
      extraIntoPension={extraIntoPension}
      effectiveReliefRate={totalEffectiveReliefRate}
    />
  );
}

/* ═══════════════════════════════════════════════════
   Personal Pension Net Benefit Card
   ═══════════════════════════════════════════════════ */

function PensionBenefitCard({
  nb,
  totalEffectiveReliefRate,
  paChange,
}: {
  nb: NonNullable<NetBenefitCardProps["netBenefit"]>;
  totalEffectiveReliefRate?: number;
  paChange: NetBenefitCardProps["paChange"];
}) {
  const grossContribution = nb.gross_contribution ?? 0;
  const netCost = nb.net_cost_to_client ?? 0;
  const basicRelief = nb.basic_rate_relief ?? 0;
  const higherRelief = nb.higher_rate_relief ?? 0;
  const hicbcAvoided = nb.hicbc_avoided ?? 0;
  const totalRelief = nb.total_tax_relief ?? basicRelief + higherRelief + hicbcAvoided;
  const netCostAfterRelief = nb.net_cost_after_relief ?? netCost - higherRelief - hicbcAvoided;
  const costPerPound = nb.effective_cost_per_pound_in_pension;
  const reliefRate = totalEffectiveReliefRate ?? (grossContribution > 0 ? (totalRelief / grossContribution) * 100 : 0);

  type LineItem = { label: string; value: string; bold?: boolean; separator?: boolean };

  const items: LineItem[] = [
    { label: "You pay (net)", value: fmt(netCost) },
    { label: "Government top-up", value: fmt(basicRelief) },
    { label: "", value: "", separator: true },
    { label: "Into pension pot", value: fmt(grossContribution), bold: true },
  ];

  /* Second block: relief breakdown */
  const reliefItems: LineItem[] = [];
  if (higherRelief > 0) {
    reliefItems.push({ label: "Tax relief (via SA)", value: fmt(higherRelief) });
  }
  reliefItems.push({ label: "HICBC avoided", value: fmt(hicbcAvoided) });
  reliefItems.push({ label: "", value: "", separator: true });
  reliefItems.push({ label: "Total relief", value: fmt(totalRelief), bold: true });
  reliefItems.push({ label: "Net cost after relief", value: fmt(netCostAfterRelief), bold: true });

  let idx = 0;

  return (
    <div className="rounded-xl border border-emerald-200/40 dark:border-emerald-800/20 bg-emerald-50/30 dark:bg-emerald-900/10 backdrop-blur-sm p-4">
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="text-[8px] uppercase tracking-widest font-semibold text-emerald-600 dark:text-emerald-400 mb-3"
      >
        Net Client Benefit
      </motion.p>

      {/* Contribution block */}
      <div className="space-y-1.5">
        {items.map((item) => {
          const i = idx++;
          if (item.separator) {
            return (
              <motion.div
                key={`sep-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, ease, delay: i * 0.04 }}
                className="border-t border-emerald-200/30 dark:border-emerald-700/20"
              />
            );
          }
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease, delay: i * 0.04 }}
              className="flex justify-between items-baseline"
            >
              <span className={`text-[10px] font-light text-emerald-700 dark:text-emerald-300 ${item.bold ? "font-semibold text-emerald-800 dark:text-emerald-200" : ""}`}>
                {item.label}
              </span>
              <span className={item.bold
                ? "text-[12px] font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums"
                : "text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums"
              }>
                {item.value}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Relief breakdown block */}
      <div className="space-y-1.5 mt-3 pt-3 border-t border-emerald-200/30 dark:border-emerald-700/20">
        {reliefItems.map((item) => {
          const i = idx++;
          if (item.separator) {
            return (
              <motion.div
                key={`sep-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, ease, delay: i * 0.04 }}
                className="border-t border-emerald-200/30 dark:border-emerald-700/20"
              />
            );
          }
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease, delay: i * 0.04 }}
              className="flex justify-between items-baseline"
            >
              <span className={`text-[10px] font-light text-emerald-700 dark:text-emerald-300 ${item.bold ? "font-semibold text-emerald-800 dark:text-emerald-200" : ""}`}>
                {item.label}
              </span>
              <span className={item.bold
                ? "text-[12px] font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums"
                : "text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums"
              }>
                {item.value}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Progress bar & cost tagline */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease, delay: idx * 0.04 }}
        className="mt-3 pt-3 border-t border-emerald-200/30 dark:border-emerald-700/20 space-y-1.5"
      >
        <div className="h-[5px] rounded-full bg-emerald-500/[0.06] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(reliefRate, 100)}%` }}
            transition={{ duration: 0.65, ease, delay: idx * 0.04 + 0.1 }}
            className={`h-full rounded-full ${reliefBarColor(reliefRate)}`}
          />
        </div>
        <p className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
          {reliefRate.toFixed(0)}% total relief
        </p>
        {costPerPound != null && (
          <p className="text-[10px] font-light text-emerald-600 dark:text-emerald-300 italic">
            {costPerPound.toFixed(0)}p per £1 in pension
          </p>
        )}
      </motion.div>

      {/* PA restored pill */}
      {paChange.restored > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease, delay: (idx + 1) * 0.04 }}
          className="mt-2 flex items-center gap-1.5"
        >
          <span className="text-[9px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-800/30 px-2 py-0.5 rounded-full">
            PA restored: +{fmt(paChange.restored)}
          </span>
        </motion.div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Salary Sacrifice Net Benefit Card
   ═══════════════════════════════════════════════════ */

function SalarySacrificeBenefitCard({
  nb,
  paChange,
}: {
  nb: NonNullable<NetBenefitCardProps["netBenefit"]>;
  paChange: NetBenefitCardProps["paChange"];
}) {
  const grossIntoPension = nb.gross_into_pension ?? 0;
  const incomeTaxSaved = nb.income_tax_saved ?? 0;
  const niSaved = nb.ni_saved ?? 0;
  const hicbcAvoided = nb.hicbc_avoided ?? 0;
  const totalSaving = nb.total_saving ?? incomeTaxSaved + niSaved + hicbcAvoided;
  const takeHomeReduction = nb.take_home_reduction ?? 0;
  const costPerPound = nb.effective_cost_per_pound_in_pension;

  type LineItem = { label: string; value: string; bold?: boolean; separator?: boolean };

  const items: LineItem[] = [
    { label: "Into pension", value: fmt(grossIntoPension) },
    { label: "Income tax saved", value: fmt(incomeTaxSaved) },
    { label: "NI saved", value: fmt(niSaved) },
  ];
  if (hicbcAvoided > 0) {
    items.push({ label: "HICBC avoided", value: fmt(hicbcAvoided) });
  }
  items.push({ label: "", value: "", separator: true });
  items.push({ label: "Total saving", value: fmt(totalSaving), bold: true });
  items.push({ label: "Take-home drops by", value: fmt(takeHomeReduction), bold: true });

  let idx = 0;

  return (
    <div className="rounded-xl border border-emerald-200/40 dark:border-emerald-800/20 bg-emerald-50/30 dark:bg-emerald-900/10 backdrop-blur-sm p-4">
      <motion.p
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease }}
        className="text-[8px] uppercase tracking-widest font-semibold text-emerald-600 dark:text-emerald-400 mb-3"
      >
        Net Client Benefit
      </motion.p>

      <div className="space-y-1.5">
        {items.map((item) => {
          const i = idx++;
          if (item.separator) {
            return (
              <motion.div
                key={`sep-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, ease, delay: i * 0.04 }}
                className="border-t border-emerald-200/30 dark:border-emerald-700/20"
              />
            );
          }
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease, delay: i * 0.04 }}
              className="flex justify-between items-baseline"
            >
              <span className={`text-[10px] font-light text-emerald-700 dark:text-emerald-300 ${item.bold ? "font-semibold text-emerald-800 dark:text-emerald-200" : ""}`}>
                {item.label}
              </span>
              <span className={item.bold
                ? "text-[12px] font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums"
                : "text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums"
              }>
                {item.value}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Cost-per-pound bar & tagline */}
      {costPerPound != null && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease, delay: idx * 0.04 }}
          className="mt-3 pt-3 border-t border-emerald-200/30 dark:border-emerald-700/20 space-y-1.5"
        >
          {/* Progress bar showing cost per pound (lower = better) */}
          <div className="h-[5px] rounded-full bg-emerald-500/[0.06] overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(costPerPound, 100)}%` }}
              transition={{ duration: 0.65, ease, delay: idx * 0.04 + 0.1 }}
              className="h-full rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
            />
          </div>
          <p className="text-[10px] font-light text-emerald-600 dark:text-emerald-300 italic">
            {costPerPound.toFixed(0)}p per £1 in pension
          </p>
        </motion.div>
      )}

      {/* PA restored pill */}
      {paChange.restored > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease, delay: (idx + 1) * 0.04 }}
          className="mt-2 flex items-center gap-1.5"
        >
          <span className="text-[9px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-800/30 px-2 py-0.5 rounded-full">
            PA restored: +{fmt(paChange.restored)}
          </span>
        </motion.div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   Fallback: Legacy Net Impact (no net_benefit data)
   ═══════════════════════════════════════════════════ */

function FallbackNetImpact({
  isPension,
  savings,
  paChange,
  extraIntoPension,
  effectiveReliefRate,
}: {
  isPension: boolean;
  savings: NetBenefitCardProps["savings"];
  paChange: NetBenefitCardProps["paChange"];
  extraIntoPension?: number;
  effectiveReliefRate?: number;
}) {
  return (
    <div className="rounded-xl border border-emerald-200/40 dark:border-emerald-800/20 bg-emerald-50/30 dark:bg-emerald-900/10 backdrop-blur-sm p-4">
      <p className="text-[8px] uppercase tracking-widest font-semibold text-emerald-600 dark:text-emerald-400 mb-3">Net Impact</p>

      <div className="space-y-1.5">
        {savings.income_tax > 0 && (
          <div className="flex justify-between items-baseline">
            <span className="text-[10px] font-light text-emerald-700 dark:text-emerald-300">Income tax saved</span>
            <div className="flex gap-3">
              <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(savings.income_tax)}/yr</span>
              <span className="text-[9px] font-mono text-emerald-500/60 tabular-nums">{fmt(Math.round(savings.income_tax / 12))}/mo</span>
            </div>
          </div>
        )}
        {(savings.national_insurance || 0) > 0 && (
          <div className="flex justify-between items-baseline">
            <span className="text-[10px] font-light text-emerald-700 dark:text-emerald-300">NI saved</span>
            <div className="flex gap-3">
              <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(savings.national_insurance!)}/yr</span>
              <span className="text-[9px] font-mono text-emerald-500/60 tabular-nums">{fmt(Math.round(savings.national_insurance! / 12))}/mo</span>
            </div>
          </div>
        )}
        {savings.hicbc_avoided > 0 && (
          <div className="flex justify-between items-baseline">
            <span className="text-[10px] font-light text-emerald-700 dark:text-emerald-300">HICBC avoided</span>
            <div className="flex gap-3">
              <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(savings.hicbc_avoided)}/yr</span>
              <span className="text-[9px] font-mono text-emerald-500/60 tabular-nums">{fmt(Math.round(savings.hicbc_avoided / 12))}/mo</span>
            </div>
          </div>
        )}

        {/* Total */}
        <div className="flex justify-between items-baseline pt-2 mt-2 border-t border-emerald-200/30 dark:border-emerald-700/20">
          <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-200">Total tax benefit</span>
          <div className="flex gap-3">
            <span className="text-[12px] font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(savings.total)}/yr</span>
            <span className="text-[10px] font-mono font-medium text-emerald-500 tabular-nums">{fmt(Math.round(savings.total / 12))}/mo</span>
          </div>
        </div>
      </div>

      {/* Effective relief rate (personal pension) */}
      {isPension && effectiveReliefRate != null && effectiveReliefRate > 0 && (
        <div className="mt-3 pt-3 border-t border-emerald-200/30 dark:border-emerald-700/20">
          <div className="flex justify-between items-baseline">
            <span className="text-[10px] font-light text-emerald-700 dark:text-emerald-300">Effective tax relief</span>
            <span className="text-[10px] font-mono font-semibold text-brand-600 dark:text-brand-400 tabular-nums">{effectiveReliefRate.toFixed(1)}%</span>
          </div>
        </div>
      )}

      {/* Pension impact (salary sacrifice) */}
      {(extraIntoPension || 0) > 0 && (
        <div className="mt-3 pt-3 border-t border-emerald-200/30 dark:border-emerald-700/20 space-y-1">
          <div className="flex justify-between items-baseline">
            <span className="text-[10px] font-light text-emerald-700 dark:text-emerald-300">Extra into pension</span>
            <span className="text-[10px] font-mono font-semibold text-brand-600 dark:text-brand-400 tabular-nums">+{fmt(extraIntoPension!)}/yr</span>
          </div>
          {savings.total > 0 && extraIntoPension! > 0 && (
            <p className="text-[10px] font-light text-emerald-600 dark:text-emerald-300 italic mt-1">
              For every £1 of take-home sacrificed, £{((extraIntoPension! + savings.total) / extraIntoPension!).toFixed(2)} goes into the pension pot.
            </p>
          )}
        </div>
      )}

      {/* PA change */}
      {paChange.restored > 0 && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="text-[9px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-800/30 px-2 py-0.5 rounded-full">
            PA restored: +{fmt(paChange.restored)}
          </span>
        </div>
      )}
    </div>
  );
}
