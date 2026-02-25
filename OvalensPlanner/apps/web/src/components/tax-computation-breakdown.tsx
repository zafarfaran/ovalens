"use client";

import { useState, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { TaxComputationData } from "@/hooks/useChat";
import {
  IconCalculator,
  IconChevronRight,
  IconChart,
  IconShield,
  IconWallet,
  IconAlertCircle,
} from "@/components/icons";

/* ─── Helpers ─── */

const fmt = (n: number) =>
  `\u00A3${n.toLocaleString("en-GB", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const fmtDetailed = (n: number) =>
  `\u00A3${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtPct = (n: number) => `${n.toFixed(1)}%`;

const ease = [0.16, 1, 0.3, 1] as const;

/* ─── Section wrapper ─── */

function Section({
  icon,
  title,
  accent,
  children,
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  accent?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease }}
      className="relative rounded-xl border border-slate-200/40 dark:border-zinc-800/30 bg-white/40 dark:bg-zinc-900/20 backdrop-blur-sm overflow-hidden"
    >
      {/* Left accent */}
      <div
        className={`absolute left-0 top-3 bottom-3 w-[2px] rounded-full bg-gradient-to-b ${accent || "from-brand-400/60 to-violet-400/60"}`}
      />
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="text-slate-400 dark:text-zinc-500">{icon}</span>
          <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400 dark:text-zinc-500">
            {title}
          </span>
        </div>
        {children}
      </div>
    </motion.div>
  );
}

/* ─── Row helpers ─── */

function KeyValue({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "brand" | "red" | "amber" | "emerald";
}) {
  const valueColor =
    accent === "red"
      ? "text-red-600 dark:text-red-400"
      : accent === "amber"
        ? "text-amber-600 dark:text-amber-400"
        : accent === "emerald"
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-slate-900 dark:text-white";

  return (
    <div className="flex items-baseline justify-between py-1">
      <div className="flex items-baseline gap-2 min-w-0">
        <span className="text-[12px] font-light text-slate-600 dark:text-zinc-400 truncate">{label}</span>
        {sub && (
          <span className="text-[10px] font-light text-slate-400 dark:text-zinc-600">{sub}</span>
        )}
      </div>
      <span className={`text-[12px] font-mono font-medium tabular-nums flex-shrink-0 ml-3 ${valueColor}`}>
        {value}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="border-t border-dashed border-slate-200/60 dark:border-zinc-800/40 my-1.5" />;
}

/* ═══════════════════════════════════════════════════
   TAX COMPUTATION BREAKDOWN — Collapsible audit view
   ═══════════════════════════════════════════════════ */

export const TaxComputationBreakdown = memo(function TaxComputationBreakdown({
  data,
}: {
  data: TaxComputationData;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const { taxPosition: pos, dashboardData: dash } = data;

  // Guard: salary sacrifice results don't include dashboardData
  if (!dash?.taxCalculation) return null;

  // Filter out zero-income bands for cleaner display
  const activeBands = dash.taxCalculation.incomeTaxByBand.filter((b) => b.amount > 0);

  // Total NI
  const totalNI = dash.nationalInsurance.class1 + dash.nationalInsurance.class2 + dash.nationalInsurance.class4;

  return (
    <div className="mt-3 mb-1">
      {/* ── Collapsed trigger ── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-200/50 dark:border-zinc-800/40 bg-gradient-to-r from-slate-50/80 to-white/50 dark:from-zinc-900/40 dark:to-zinc-900/20 backdrop-blur-sm hover:border-brand-300/40 dark:hover:border-brand-700/30 transition-all duration-200 text-left"
      >
        {/* Calculator icon */}
        <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-brand-500/10 dark:bg-brand-500/15 flex items-center justify-center">
          <IconCalculator className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
        </span>

        {/* Summary text */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-700 dark:text-zinc-300">
            Tax computation
          </span>
          <span className="text-[10px] text-slate-400 dark:text-zinc-600">&middot;</span>
          <span className="text-[11px] font-mono font-medium text-slate-900 dark:text-white tabular-nums">
            {fmt(pos.total_tax)}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-zinc-600">&middot;</span>
          <span className="text-[10px] font-light text-slate-400 dark:text-zinc-500">
            {fmtPct(pos.effective_rate)} effective
          </span>
        </div>

        {/* Chevron */}
        <motion.span
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={{ duration: 0.2, ease }}
          className="flex-shrink-0 text-slate-400 dark:text-zinc-600"
        >
          <IconChevronRight className="w-3.5 h-3.5" />
        </motion.span>
      </button>

      {/* ── Expanded content ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease }}
            className="overflow-hidden"
          >
            <div className="pt-2.5 pb-1 space-y-2">
              {/* ── 1. Income Sources ── */}
              <Section
                icon={<IconWallet className="w-3.5 h-3.5" />}
                title="Income Sources"
                accent="from-brand-400/60 to-violet-400/60"
                delay={0.02}
              >
                {dash.incomeSummary.sources.map((src, i) => (
                  <KeyValue key={i} label={src.label || src.type} value={fmt(src.amount)} />
                ))}
                <Divider />
                <KeyValue label="Total gross income" value={fmt(pos.total_income)} accent="brand" />
              </Section>

              {/* ── 2. Adjusted Net Income ── */}
              <Section
                icon={<IconChart className="w-3.5 h-3.5" />}
                title="Adjusted Net Income"
                accent="from-violet-400/60 to-purple-400/60"
                delay={0.06}
              >
                <KeyValue label="Total income" value={fmt(pos.total_income)} />
                {pos.total_income !== pos.adjusted_net_income && (
                  <KeyValue
                    label="Less deductions (pension, Gift Aid)"
                    value={`\u2212${fmt(pos.total_income - pos.adjusted_net_income)}`}
                    accent="emerald"
                  />
                )}
                <Divider />
                <KeyValue label="Adjusted net income" value={fmt(pos.adjusted_net_income)} accent="brand" />
                <div className="flex items-center gap-1.5 mt-1">
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full ${
                      pos.pa_status === "lost"
                        ? "bg-red-500"
                        : pos.pa_status === "tapered"
                          ? "bg-amber-500"
                          : "bg-emerald-500"
                    }`}
                  />
                  <span className="text-[10px] font-light text-slate-400 dark:text-zinc-500">
                    Personal allowance: {fmt(pos.personal_allowance)}{" "}
                    <span className="capitalize">({pos.pa_status})</span>
                  </span>
                </div>
              </Section>

              {/* ── 3. Income Tax by Band ── */}
              <Section
                icon={<IconCalculator className="w-3.5 h-3.5" />}
                title="Income Tax Breakdown"
                accent="from-brand-400/60 to-blue-400/60"
                delay={0.1}
              >
                {/* Header row */}
                <div className="flex items-center text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-zinc-600 pb-1 mb-0.5 border-b border-slate-200/40 dark:border-zinc-800/30">
                  <span className="flex-1">Band</span>
                  <span className="w-20 text-right">Income</span>
                  <span className="w-12 text-right">Rate</span>
                  <span className="w-20 text-right">Tax</span>
                </div>
                {activeBands.map((band, i) => (
                  <div
                    key={i}
                    className={`flex items-center py-1.5 ${
                      i % 2 === 0
                        ? "bg-transparent"
                        : "bg-slate-50/50 dark:bg-zinc-800/10 -mx-4 px-4 rounded"
                    }`}
                  >
                    <span className="flex-1 text-[11px] font-light text-slate-600 dark:text-zinc-400 truncate pr-2">
                      {band.band}
                    </span>
                    <span className="w-20 text-right text-[11px] font-mono font-light text-slate-500 dark:text-zinc-500 tabular-nums">
                      {fmt(band.amount)}
                    </span>
                    <span className="w-12 text-right text-[11px] font-mono font-light text-slate-400 dark:text-zinc-600 tabular-nums">
                      {(band.rate * 100).toFixed(0)}%
                    </span>
                    <span className="w-20 text-right text-[11px] font-mono font-medium text-slate-900 dark:text-white tabular-nums">
                      {fmt(band.tax)}
                    </span>
                  </div>
                ))}
                <Divider />
                <KeyValue label="Total income tax" value={fmtDetailed(pos.income_tax)} accent="brand" />
                {pos.dividend_tax > 0 && (
                  <KeyValue label="Of which dividend tax" value={fmtDetailed(pos.dividend_tax)} />
                )}
              </Section>

              {/* ── 4. National Insurance ── */}
              {totalNI > 0 && (
                <Section
                  icon={<IconShield className="w-3.5 h-3.5" />}
                  title="National Insurance"
                  accent="from-emerald-400/60 to-teal-400/60"
                  delay={0.14}
                >
                  {dash.nationalInsurance.class1 > 0 && (
                    <KeyValue label="Class 1 (Employee)" value={fmtDetailed(dash.nationalInsurance.class1)} />
                  )}
                  {dash.nationalInsurance.class2 > 0 && (
                    <KeyValue label="Class 2 (Self-employed)" value={fmtDetailed(dash.nationalInsurance.class2)} />
                  )}
                  {dash.nationalInsurance.class4 > 0 && (
                    <KeyValue label="Class 4 (Self-employed)" value={fmtDetailed(dash.nationalInsurance.class4)} />
                  )}
                  <Divider />
                  <KeyValue label="Total NI" value={fmtDetailed(totalNI)} accent="brand" />
                </Section>
              )}

              {/* ── 5. HICBC ── */}
              {dash.hicbc?.applies && (
                <Section
                  icon={<IconAlertCircle className="w-3.5 h-3.5" />}
                  title="High Income Child Benefit Charge"
                  accent="from-amber-400/60 to-orange-400/60"
                  delay={0.18}
                >
                  <KeyValue label="Annual child benefit" value={fmtDetailed(dash.hicbc.childBenefitAnnual)} />
                  <KeyValue label="Clawback percentage" value={`${dash.hicbc.clawbackPercentage.toFixed(0)}%`} accent="amber" />
                  <KeyValue label="HICBC charge" value={fmtDetailed(dash.hicbc.charge)} accent="red" />
                  <Divider />
                  <KeyValue label="Net benefit retained" value={fmtDetailed(dash.hicbc.netBenefit)} accent="emerald" />
                </Section>
              )}

              {/* ── 6. Summary ── */}
              <Section
                icon={<IconChart className="w-3.5 h-3.5" />}
                title="Summary"
                accent="from-brand-500/80 to-violet-500/80"
                delay={0.22}
              >
                <KeyValue label="Income tax" value={fmtDetailed(pos.income_tax)} />
                {totalNI > 0 && <KeyValue label="National Insurance" value={fmtDetailed(totalNI)} />}
                {dash.hicbc?.applies && (
                  <KeyValue label="HICBC charge" value={fmtDetailed(dash.hicbc.charge)} />
                )}
                <Divider />
                <div className="flex items-baseline justify-between py-1.5">
                  <span className="text-[12px] font-medium text-slate-900 dark:text-white">Total tax</span>
                  <span className="text-[14px] font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                    {fmtDetailed(pos.total_tax)}
                  </span>
                </div>
                <div className="flex gap-4 mt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                    <span className="text-[10px] font-light text-slate-400 dark:text-zinc-500">
                      Effective: <span className="font-mono font-medium text-slate-600 dark:text-zinc-300">{fmtPct(pos.effective_rate)}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="text-[10px] font-light text-slate-400 dark:text-zinc-500">
                      Marginal: <span className="font-mono font-medium text-slate-600 dark:text-zinc-300">{fmtPct(pos.marginal_rate)}</span>
                    </span>
                  </div>
                </div>
              </Section>

              {/* Tax year badge */}
              <div className="flex justify-center pt-0.5 pb-1">
                <span className="text-[9px] font-mono font-light tracking-wider text-slate-400/60 dark:text-zinc-600/40 uppercase">
                  {pos.tax_year} &middot; Deterministic Engine
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
