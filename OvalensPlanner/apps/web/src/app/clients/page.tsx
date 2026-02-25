"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/theme-provider";
import { AddClientPanel } from "@/components/add-client-panel";
import { TaxDataForm } from "@/components/tax-data-form";
import { EditClientForm } from "@/components/edit-client-form";
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
import {
  OvalensLogo,
  IconUser,
  IconSearch,
  IconShield,
  IconTrendingUp,
  IconCalculator,
  IconChart,
  IconWallet,
  IconLightbulb,
  IconAlertCircle,
  IconArrowRight,
  IconZap,
  IconMessage,
  IconFileText,
  IconTrash,
} from "@/components/icons";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/* ─── Types ─── */

interface ClientSummary {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  region?: string;
  employment_status?: string;
  tax_year?: string;
  total_income?: number;
  total_tax?: number;
  effective_rate?: number;
  marginal_rate?: number;
}

interface TaxBand {
  band: string;
  amount: number;
  rate: number;
  tax: number;
}

interface IncomeSource {
  source_type?: string;
  type?: string;
  label: string;
  gross_amount?: number;
  amount?: number;
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
}

interface HicbcData {
  applies?: boolean;
  number_of_children?: number;
  claims_child_benefit?: boolean;
  child_benefit_amount?: number;
  childBenefitAnnual?: number;
  clawback_percentage?: number;
  clawbackPercentage?: number;
  hicbc_charge?: number;
  charge?: number;
  netBenefit?: number;
}

interface Observation {
  id: string;
  tax_year?: string;
  title: string;
  description: string;
  severity: string;
  priority?: string;
  category?: string;
  potential_saving?: number | null;
  deadline?: string | null;
  action_required?: string | null;
  is_dismissed?: boolean;
  source?: string;
  created_at?: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface TaxProfile {
  tax_year: string;
  total_income: number;
  adjusted_net_income?: number;
  taxable_income?: number;
  income_tax: number;
  national_insurance: number;
  dividend_tax: number;
  total_tax: number;
  effective_rate: number;
  marginal_rate: number;
  personal_allowance?: number;
  pa_status?: string;
  in_pa_taper_zone?: boolean;
  hicbc_applies?: boolean;
  pension_taper_applies?: boolean;
  income_sources?: IncomeSource[];
  pension_data?: Record<string, unknown>;
  allowances?: Allowance[];
  hicbc?: HicbcData;
  tax_breakdown?: TaxBand[];
  ni_breakdown?: any;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

interface ClientDetail {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth?: string;
  ni_number?: string;
  utr?: string;
  region?: string;
  employment_status?: string;
  // Contact
  phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  postcode?: string;
  // Personal
  marital_status?: string;
  number_of_children?: number;
  claims_child_benefit?: boolean;
  // Spouse (resolved object from API)
  spouse?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    date_of_birth?: string;
    ni_number?: string;
    employment_status?: string;
    region?: string;
  } | null;
  // Household
  household_members?: { id: string; first_name: string; last_name: string }[];
  // Professional
  employer_name?: string;
  company_name?: string;
  company_number?: string;
  // Notes
  notes?: string;
  created_at?: string;
  tax_profile?: TaxProfile | null;
  observations?: Observation[];
}

interface HouseholdMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  employment_status?: string;
  total_income?: number;
  total_tax?: number;
  effective_rate?: number;
}

interface HouseholdSummary {
  id: string;
  name: string;
  notes?: string | null;
  member_count: number;
  members: HouseholdMember[];
  total_income: number;
  total_tax: number;
  avg_effective_rate?: number | null;
}

/* ─── Helpers ─── */

const fmt = (n: number | undefined | null): string => {
  if (n == null) return "—";
  return `£${n.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;
};

const fmtFull = (n: number | undefined | null): string => {
  if (n == null) return "—";
  return `£${n.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const fmtPct = (n: number | undefined | null): string => {
  if (n == null) return "—";
  return `${n.toFixed(1)}%`;
};

/** Extract a numeric NI value — handles both flat numbers and nested objects
 *  e.g. `4964.16` or `{ total_employee_ni: 4964.16 }` */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractNIValue(v: any): number {
  if (typeof v === "number") return v;
  if (v && typeof v === "object") {
    return v.total_employee_ni ?? v.annual_ni ?? v.total_ni ?? v.total ?? 0;
  }
  return 0;
}

interface NIParsed {
  class1: number;
  class2: number;
  class4: number;
  total: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseNI(raw: any): NIParsed | null {
  if (!raw || typeof raw !== "object") return null;
  const c1 = extractNIValue(raw.class1);
  const c2 = extractNIValue(raw.class2);
  const c4 = extractNIValue(raw.class4);
  return { class1: c1, class2: c2, class4: c4, total: c1 + c2 + c4 };
}

/** Normalise an income source — handles both seed format and dashboard format */
function sourceAmount(s: IncomeSource): number {
  return s.gross_amount ?? s.amount ?? 0;
}

/** Normalise an allowance — DB uses snake_case, dashboard uses camelCase */
function allowanceName(a: Allowance): string {
  return a.label ?? a.name ?? "Allowance";
}
function allowanceLimit(a: Allowance): number {
  return a.annual_limit ?? a.annualLimit ?? 0;
}

/** Normalise HICBC — DB uses snake_case, dashboard uses camelCase */
function hicbcBenefit(h: HicbcData): number {
  return h.child_benefit_amount ?? h.childBenefitAnnual ?? 0;
}
function hicbcClawback(h: HicbcData): number {
  return h.clawback_percentage ?? h.clawbackPercentage ?? 0;
}
function hicbcCharge(h: HicbcData): number {
  return h.hicbc_charge ?? h.charge ?? 0;
}

/* ─── Consistent avatar gradient from name ─── */

const AVATAR_PAIRS: [string, string][] = [
  ["#5c7cfa", "#8b5cf6"], // brand → violet (primary, matches chat)
  ["#748ffc", "#a78bfa"], // brand-400 → violet-400
  ["#4c6ef5", "#7c3aed"], // brand-600 → violet-600
  ["#3b82f6", "#6366f1"], // blue → indigo
  ["#0ea5e9", "#6366f1"], // sky → indigo
  ["#14b8a6", "#0ea5e9"], // teal → sky
  ["#10b981", "#14b8a6"], // emerald → teal
  ["#8b5cf6", "#ec4899"], // violet → pink
];

function avatarGradient(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PAIRS[Math.abs(hash) % AVATAR_PAIRS.length];
}

/* ─── Severity styling ─── */

const SEV: Record<string, { border: string; bg: string; icon: string; badge: string }> = {
  opportunity: { border: "border-l-emerald-500", bg: "bg-emerald-50/60 dark:bg-emerald-500/[0.06]", icon: "text-emerald-500", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
  warning:     { border: "border-l-amber-500",   bg: "bg-amber-50/60 dark:bg-amber-500/[0.06]",   icon: "text-amber-500",   badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
  critical:    { border: "border-l-red-500",     bg: "bg-red-50/60 dark:bg-red-500/[0.06]",       icon: "text-red-500",     badge: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" },
  danger:      { border: "border-l-red-500",     bg: "bg-red-50/60 dark:bg-red-500/[0.06]",       icon: "text-red-500",     badge: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" },
  info:        { border: "border-l-blue-500",    bg: "bg-blue-50/60 dark:bg-blue-500/[0.06]",     icon: "text-blue-500",    badge: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" },
};

/* ════════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ════════════════════════════════════════════════════════════════ */

/* ── Sidebar client row ── */

function ClientRow({ client, active, onSelect }: { client: ClientSummary; active: boolean; onSelect: () => void }) {
  const name = `${client.first_name} ${client.last_name}`;
  const [g1, g2] = avatarGradient(name);

  return (
    <button onClick={onSelect} className={`w-full text-left group relative`}>
      {/* Active indicator bar */}
      {active && (
        <motion.div
          layoutId="active-indicator"
          className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-brand-500"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}

      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ml-1 transition-all duration-200 ${
        active ? "bg-brand-50/80 dark:bg-brand-950/20 ring-1 ring-brand-200/50 dark:ring-brand-800/30" : "hover:bg-slate-50 dark:hover:bg-zinc-900/50"
      }`}>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-semibold text-white"
          style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
        >
          {client.first_name[0]}{client.last_name[0]}
        </div>

        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-medium truncate transition-colors ${active ? "text-[var(--foreground)]" : "text-[var(--foreground)]/80"}`}>
            {name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {client.total_income != null && (
              <span className="text-[10px] font-mono text-[var(--muted)]">{fmt(client.total_income)}</span>
            )}
            {client.effective_rate != null && (
              <>
                <span className="text-[var(--muted)]/30 text-[8px]">&middot;</span>
                <span className="text-[10px] font-mono text-[var(--muted)]">{fmtPct(client.effective_rate)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ── Sidebar household row ── */

function HouseholdRow({ household, active, onSelect }: { household: HouseholdSummary; active: boolean; onSelect: () => void }) {
  return (
    <button onClick={onSelect} className="w-full text-left group relative">
      {active && (
        <motion.div
          layoutId="active-hh-indicator"
          className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-brand-500"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ml-1 transition-all duration-200 ${
        active ? "bg-brand-50/80 dark:bg-brand-950/20 ring-1 ring-brand-200/50 dark:ring-brand-800/30" : "hover:bg-slate-50 dark:hover:bg-zinc-900/50"
      }`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-100 to-violet-100 dark:from-brand-900/40 dark:to-violet-900/40 flex items-center justify-center flex-shrink-0">
          <IconUser className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-medium truncate transition-colors ${active ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-zinc-300"}`}>
            {household.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-light text-slate-400 dark:text-zinc-500">
              {household.member_count} {household.member_count === 1 ? "member" : "members"}
            </span>
            {household.total_income > 0 && (
              <>
                <span className="text-slate-300 dark:text-zinc-700 text-[8px]">&middot;</span>
                <span className="text-[10px] font-mono font-light text-slate-400 dark:text-zinc-500">{fmt(household.total_income)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ── Metric tile ── */

function Metric({ label, value, sub, icon: Icon }: {
  label: string;
  value: string;
  sub?: string;
  icon: React.FC<{ className?: string }>;
}) {
  return (
    <div className="group">
      <div className="refined-card rounded-xl p-5 h-full">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center">
            <Icon className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
          </div>
          <span className="text-[10px] font-medium text-slate-400 dark:text-zinc-500 tracking-[0.08em] uppercase">{label}</span>
        </div>
        <p className="text-[24px] font-semibold font-mono tracking-tight text-[var(--foreground)] leading-none">{value}</p>
        {sub && <p className="text-[11px] text-[var(--muted)] mt-2.5 leading-snug">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Section card ── */

function Card({ title, icon: Icon, children, className }: {
  title: string;
  icon: React.FC<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="refined-card rounded-xl overflow-hidden h-full">
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-slate-100 dark:border-zinc-800/50">
          <div className="w-5 h-5 rounded-md bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center">
            <Icon className="w-3 h-3 text-brand-500 dark:text-brand-400" />
          </div>
          <h3 className="text-[13px] font-semibold text-[var(--foreground)] tracking-[-0.01em]">{title}</h3>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

/* ── Key-value row ── */

function KV({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  if (!value) return null;
  return (
    <div className="py-2.5 border-b border-[var(--border-subtle)] last:border-0 flex items-center justify-between gap-4">
      <span className="text-[12px] text-slate-500 dark:text-zinc-400 font-light flex-shrink-0">{label}</span>
      <span className={`text-[12px] text-slate-900 dark:text-zinc-100 text-right truncate ${mono ? "font-mono" : "font-medium"}`}>{value}</span>
    </div>
  );
}

/* ── Tax band row ── */

function BandRow({ band, maxAmt, delay }: { band: TaxBand; maxAmt: number; delay: number }) {
  const pct = maxAmt > 0 ? (band.amount / maxAmt) * 100 : 0;
  const rateStr = `${(band.rate * 100).toFixed(0)}%`;

  const barColor =
    band.rate === 0 ? "bg-slate-200 dark:bg-zinc-700"
    : band.rate <= 0.2 ? "bg-sky-400 dark:bg-sky-500"
    : band.rate <= 0.4 ? "bg-[var(--accent)]"
    : "bg-indigo-500";

  return (
    <div className="py-2.5">
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-[12px] font-medium text-[var(--foreground)]">{band.band}</span>
        <div className="flex items-baseline gap-5">
          <span className="text-[11px] font-mono text-[var(--muted)] w-8 text-right">{rateStr}</span>
          <span className="text-[12px] font-mono font-medium text-[var(--foreground)] w-[72px] text-right">{fmt(band.tax)}</span>
        </div>
      </div>
      <div className="h-[6px] rounded-full bg-[var(--surface)] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={`h-full rounded-full ${barColor}`}
        />
      </div>
      <p className="text-[10px] font-mono text-[var(--muted)] mt-1">{fmt(band.amount)}</p>
    </div>
  );
}

/* ── Income source bar ── */

function SourceBar({ source, total, delay }: { source: IncomeSource; total: number; delay: number }) {
  const amt = sourceAmount(source);
  const pct = total > 0 ? (amt / total) * 100 : 0;
  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] text-[var(--foreground)]">{source.label}</span>
        <span className="text-[12px] font-mono font-medium text-[var(--foreground)]">{fmt(amt)}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-[5px] rounded-full bg-[var(--surface)] overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="h-full rounded-full bg-[var(--accent)]/60"
          />
        </div>
        <span className="text-[10px] font-mono text-[var(--muted)] w-9 text-right">{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

/* ── Allowance bar ── */

function AllowanceBar({ a }: { a: Allowance }) {
  const limit = allowanceLimit(a);
  const pct = limit > 0 ? Math.min((a.used / limit) * 100, 100) : 0;
  const color = a.status === "fully_used" ? "bg-amber-500" : a.remaining > 0 ? "bg-emerald-500" : "bg-[var(--accent)]";

  return (
    <div className="py-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] text-[var(--foreground)]">{allowanceName(a)}</span>
        <span className="text-[11px] font-mono text-[var(--muted)]">{fmt(a.used)}<span className="text-[var(--muted)]/40"> / </span>{fmt(limit)}</span>
      </div>
      <div className="h-[5px] rounded-full bg-[var(--surface)] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      <p className="text-[10px] text-[var(--muted)] mt-0.5">
        {a.remaining > 0 ? `${fmt(a.remaining)} remaining` : "Fully utilised"}
      </p>
    </div>
  );
}

/* ── Observation item ── */

function ObsItem({ obs, onDelete }: { obs: Observation; onDelete?: (id: string) => void }) {
  const s = SEV[obs.severity] || SEV.info;

  return (
    <div className={`group/obs rounded-xl border-l-[3px] ${s.border} bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm border border-slate-200/40 dark:border-zinc-800/30 px-4 py-3.5`}>
      <div className="flex items-start gap-2.5">
        <div className={`mt-0.5 ${s.icon} flex-shrink-0`}>
          {obs.severity === "opportunity" ? <IconLightbulb className="w-3.5 h-3.5" />
            : obs.severity === "warning" ? <IconAlertCircle className="w-3.5 h-3.5" />
            : obs.severity === "critical" || obs.severity === "danger" ? <IconAlertCircle className="w-3.5 h-3.5" />
            : <IconZap className="w-3.5 h-3.5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h4 className="text-[13px] font-semibold text-[var(--foreground)] leading-tight">{obs.title}</h4>
            <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-[1px] rounded ${s.badge}`}>{obs.severity}</span>
            {obs.source === "ai" && (
              <span className="text-[8px] font-semibold uppercase tracking-wider px-1.5 py-[1px] rounded bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
                AI
              </span>
            )}
            {obs.potential_saving != null && obs.potential_saving > 0 && (
              <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                Save {fmt(obs.potential_saving)}
              </span>
            )}
          </div>
          <p className="text-[12px] text-[var(--muted)] leading-relaxed">{obs.description}</p>
          {obs.action_required && (
            <div className="flex items-center gap-1 mt-2 text-[11px] font-medium text-[var(--foreground)]/60">
              <IconArrowRight className="w-3 h-3" />
              <span>{obs.action_required}</span>
            </div>
          )}
        </div>
        {onDelete && (
          <button
            onClick={() => onDelete(obs.id)}
            className="flex-shrink-0 opacity-0 group-hover/obs:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-300 dark:text-zinc-600 hover:text-red-500 dark:hover:text-red-400"
            title="Delete observation"
          >
            <IconTrash className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Intelligence tab (with filters) ── */

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

  const counts: Record<string, number> = {
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
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 border-l-[3px] border-l-emerald-500">
          <div>
            <p className="text-[10px] font-semibold text-emerald-500/60 dark:text-emerald-400/50 uppercase tracking-[0.08em] mb-1.5">Total Potential Savings</p>
            <p className="text-[28px] font-semibold font-mono text-emerald-600 dark:text-emerald-400 leading-none">
              £{totalSavings.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm border border-slate-200/40 dark:border-zinc-800/30 w-fit">
        {(["all", "opportunity", "warning", "critical", "info"] as const).map((key) => {
          const count = counts[key];
          if (key !== "all" && count === 0) return null;
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`text-[11px] font-medium px-3 py-1.5 rounded-lg transition-all ${
                filter === key
                  ? "bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 border border-brand-200/40 dark:border-brand-800/30"
                  : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-slate-50 dark:hover:bg-zinc-900/50"
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
        <div className="space-y-3">
          {filtered.map((o) => (
            <ObsItem key={o.id} obs={o} onDelete={onDelete} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200/40 dark:border-zinc-800/30 bg-white/30 dark:bg-zinc-900/20 backdrop-blur-sm p-10 text-center">
          <p className="text-[13px] text-[var(--muted)]">No observations match this filter</p>
        </div>
      )}
    </div>
  );
}

/* ── Loading skeleton ── */

function Skeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex items-center gap-5">
        <div className="w-[52px] h-[52px] rounded-2xl bg-[var(--surface)]" />
        <div className="space-y-2.5">
          <div className="h-6 w-52 rounded-lg bg-[var(--surface)]" />
          <div className="h-3 w-36 rounded bg-[var(--surface)]" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {[...Array(4)].map((_, i) => <div key={i} className="h-[120px] rounded-xl bg-[var(--surface)]" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
        {[...Array(2)].map((_, i) => <div key={i} className="h-[200px] rounded-xl bg-[var(--surface)]" />)}
      </div>
      <div className="h-[260px] rounded-xl bg-[var(--surface)]" />
    </div>
  );
}

/* ── Household detail view ── */

function HouseholdDetail({
  household,
  onViewMember,
  onUpdated,
}: {
  household: HouseholdSummary;
  onViewMember: (id: string) => void;
  onUpdated?: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(household.name);
  const [editNotes, setEditNotes] = useState(household.notes || "");
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setEditName(household.name);
    setEditNotes(household.notes || "");
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/households/${household.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editName !== household.name ? { name: editName } : {}),
          ...(editNotes !== (household.notes || "") ? { notes: editNotes } : {}),
        }),
      });
      if (res.ok) {
        setEditing(false);
        onUpdated?.();
      }
    } catch { /* noop */ }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        {editing ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">Household Name</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full max-w-sm px-3 py-2 text-[14px] font-semibold bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]/40 focus:ring-1 focus:ring-[var(--accent)]/15 transition-all"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">Notes</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={3}
                placeholder="Household notes..."
                className="w-full px-3 py-2 text-[12px] bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:border-[var(--accent)]/40 focus:ring-1 focus:ring-[var(--accent)]/15 transition-all resize-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg text-[11px] font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-all disabled:opacity-70"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg text-[11px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <h1 className="text-[24px] font-semibold text-slate-900 dark:text-white tracking-[-0.025em] leading-none">
                {household.name}
              </h1>
              <button
                onClick={startEdit}
                className="text-[11px] font-medium text-brand-500 dark:text-brand-400 hover:text-brand-600 dark:hover:text-brand-300 transition-colors"
              >
                Edit
              </button>
            </div>
            <p className="text-[13px] font-light text-slate-400 dark:text-zinc-500 mt-2">
              {household.member_count} {household.member_count === 1 ? "member" : "members"}
            </p>
            {household.notes && (
              <p className="text-[12px] font-light text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">{household.notes}</p>
            )}
          </>
        )}
      </div>

      {/* Combined stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        {[
          { label: "Total Income", value: `£${household.total_income.toLocaleString("en-GB", { maximumFractionDigits: 0 })}` },
          { label: "Total Tax", value: `£${household.total_tax.toLocaleString("en-GB", { maximumFractionDigits: 0 })}` },
          { label: "Avg Effective Rate", value: household.avg_effective_rate != null ? `${household.avg_effective_rate}%` : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="refined-card rounded-xl p-5">
            <p className="text-[10px] font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-[0.08em] mb-3">{label}</p>
            <p className="text-[22px] font-semibold font-mono tracking-tight text-slate-900 dark:text-white leading-none">{value}</p>
          </div>
        ))}
      </div>

      {/* Members */}
      <div>
        <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white mb-3">Members</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {household.members.map((member) => {
            const [g1, g2] = avatarGradient(`${member.first_name} ${member.last_name}`);
            return (
              <div key={member.id} className="refined-card rounded-xl p-4 group">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[13px] font-semibold shadow-sm shadow-brand-500/20"
                    style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
                  >
                    {member.first_name[0]}{member.last_name[0]}
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-slate-900 dark:text-white">{member.first_name} {member.last_name}</p>
                    {member.employment_status && (
                      <span className="text-[10px] font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/30 px-1.5 py-[1px] rounded">
                        {member.employment_status}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-3">
                  {member.total_income != null && (
                    <div>
                      <p className="text-[9px] font-light text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Income</p>
                      <p className="text-[14px] font-mono font-medium text-slate-900 dark:text-white">
                        £{member.total_income.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  )}
                  {member.effective_rate != null && (
                    <div>
                      <p className="text-[9px] font-light text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Effective</p>
                      <p className="text-[14px] font-mono font-medium text-slate-900 dark:text-white">{member.effective_rate.toFixed(1)}%</p>
                    </div>
                  )}
                  {member.total_tax != null && (
                    <div>
                      <p className="text-[9px] font-light text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Tax</p>
                      <p className="text-[14px] font-mono font-medium text-slate-900 dark:text-white">
                        £{member.total_tax.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onViewMember(member.id)}
                  className="flex items-center gap-1 text-[11px] font-medium text-brand-500 dark:text-brand-400 hover:text-brand-600 dark:hover:text-brand-300 transition-colors"
                >
                  View profile <IconArrowRight className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════ */

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showAddPanel, setShowAddPanel] = useState(false);
  const [showTaxForm, setShowTaxForm] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("profile");
  const [sidebarMode, setSidebarMode] = useState<"clients" | "households">("clients");
  const [households, setHouseholds] = useState<HouseholdSummary[]>([]);
  const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null);
  const [householdsLoading, setHouseholdsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleClientAdded = (newClient: ClientSummary) => {
    setClients((prev) => [newClient, ...prev]);
    setSelectedId(newClient.id);
    setShowAddPanel(false);
  };

  const refetchDetail = useCallback(() => {
    if (!selectedId) return;
    setShowTaxForm(false);
    setShowEditProfile(false);
    setDetailLoading(true);
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/clients/${selectedId}`);
        const data: ClientDetail = await res.json();
        setDetail(data);
      } catch { /* noop */ }
      finally { setDetailLoading(false); }
    })();
  }, [selectedId]);

  /* Fetch lists */
  useEffect(() => {
    (async () => {
      try {
        const [clientsRes, householdsRes] = await Promise.all([
          fetch(`${API_BASE}/api/clients`),
          fetch(`${API_BASE}/api/households`),
        ]);
        if (!clientsRes.ok) throw new Error(`Clients: ${clientsRes.status}`);
        if (!householdsRes.ok) throw new Error(`Households: ${householdsRes.status}`);
        const clientsData = await clientsRes.json();
        const householdsData = await householdsRes.json();

        const list: ClientSummary[] = clientsData.clients || [];
        setClients(list);
        if (list.length > 0) setSelectedId(list[0].id);

        const hhList: HouseholdSummary[] = householdsData.households || [];
        setHouseholds(hhList);
        if (hhList.length > 0) setSelectedHouseholdId(hhList[0].id);
      } catch { /* noop */ }
      finally {
        setLoading(false);
        setHouseholdsLoading(false);
      }
    })();
  }, []);

  /* Fetch detail */
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setShowTaxForm(false);
    setShowEditProfile(false);
    setActiveTab("profile");
    setDetailLoading(true);
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/clients/${selectedId}`);
        const data: ClientDetail = await res.json();
        if (!cancelled) setDetail(data);
      } catch { /* noop */ }
      finally { if (!cancelled) setDetailLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [selectedId]);

  /* Keyboard navigation */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      if (sidebarMode === "households") {
        const hhIdx = households.findIndex((h) => h.id === selectedHouseholdId);
        const nextHh = e.key === "ArrowDown" ? Math.min(hhIdx + 1, households.length - 1) : Math.max(hhIdx - 1, 0);
        if (households[nextHh]) setSelectedHouseholdId(households[nextHh].id);
      } else {
        const idx = clients.findIndex((c) => c.id === selectedId);
        const next = e.key === "ArrowDown" ? Math.min(idx + 1, clients.length - 1) : Math.max(idx - 1, 0);
        if (clients[next]) setSelectedId(clients[next].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clients, selectedId, sidebarMode, households, selectedHouseholdId]);

  /* Search filter */
  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter((c) =>
      `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(q)
    );
  }, [clients, search]);

  const filteredHouseholds = useMemo(() => {
    if (!search.trim()) return households;
    const q = search.toLowerCase();
    return households.filter((h) => h.name.toLowerCase().includes(q));
  }, [households, search]);

  const selectedHousehold = useMemo(
    () => households.find((h) => h.id === selectedHouseholdId) || null,
    [households, selectedHouseholdId]
  );

  const viewMemberProfile = useCallback((memberId: string) => {
    setSidebarMode("clients");
    setSelectedId(memberId);
  }, []);

  const refetchHouseholds = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/households`);
      if (res.ok) {
        const data = await res.json();
        setHouseholds(data.households || []);
      }
    } catch { /* noop */ }
  }, []);

  /* Delete observation handler */
  const handleDeleteObservation = useCallback(async (obsId: string) => {
    if (!selectedId) return;
    try {
      const res = await fetch(`${API_BASE}/api/clients/${selectedId}/observations/${obsId}`, { method: "DELETE" });
      if (res.ok) refetchDetail();
    } catch (err) {
      console.error("Failed to delete observation:", err);
    }
  }, [selectedId, refetchDetail]);

  /* Derived */
  const tp = detail?.tax_profile;
  const obs = detail?.observations?.filter((o) => !o.is_dismissed) || [];
  const bands = tp?.tax_breakdown || [];
  const maxBandAmt = Math.max(...bands.map((b) => b.amount), 1);
  const sources = tp?.income_sources || [];
  const allowances = tp?.allowances || [];
  const ni = parseNI(tp?.ni_breakdown);

  const name = detail ? `${detail.first_name} ${detail.last_name}` : "";

  const dobStr = detail?.date_of_birth
    ? new Date(detail.date_of_birth).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  // Chart-derived values
  const totalSavings = obs.reduce((sum, o) => sum + (o.potential_saving || 0), 0);
  const opportunityCount = obs.filter((o) => o.severity === "opportunity").length;
  const warningCount = obs.filter((o) => o.severity === "warning").length;
  const netIncome = tp ? tp.total_income - tp.total_tax : 0;
  const hicbcChargeAmt = tp?.hicbc ? (tp.hicbc.hicbc_charge ?? tp.hicbc.charge ?? 0) : 0;

  // Pension carry forward rows for the read-only profile card
  const cfRows = useMemo(() => {
    const pd = tp?.pension_data as Record<string, unknown> | undefined;
    const hist = pd?.contributions_history as Record<string, Record<string, number>> | undefined;
    if (!hist) return [] as { yr: string; aa: number; total: number; unused: number }[];
    const AA_BY_YEAR: Record<string, number> = { "2022/23": 40_000, "2023/24": 60_000, "2024/25": 60_000 };
    return Object.entries(hist)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([yr, data]) => {
        const personal = data.personal ?? 0;
        const employer = data.employer ?? 0;
        const total = personal + employer;
        const aa = AA_BY_YEAR[yr] ?? 60_000;
        return { yr, aa, total, unused: Math.max(aa - total, 0) };
      });
  }, [tp?.pension_data]);

  const cfTotalUnused = useMemo(() => cfRows.reduce((s, r) => s + r.unused, 0), [cfRows]);

  const curIdx = clients.findIndex((c) => c.id === selectedId);

  return (
    <div className="h-screen flex bg-[var(--background)]">
      {/* ═══════════ SIDEBAR ═══════════ */}
      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-[280px] transform transition-transform duration-200 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
        md:relative md:translate-x-0 md:w-[264px] md:z-10
        flex-shrink-0 refined-sidebar flex flex-col
      `}>

        {/* Brand bar */}
        <div className="h-14 flex items-center justify-between px-5 border-b border-slate-200/70 dark:border-zinc-800/70">
          <Link href="/" className="text-[var(--foreground)] hover:text-[var(--accent)] transition-colors">
            <OvalensLogo className="h-[18px]" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Search + Add */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-1 flex-1 p-0.5 rounded-lg bg-slate-100/80 dark:bg-zinc-800/50">
              {(["clients", "households"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setSidebarMode(mode)}
                  className={`flex-1 text-[10px] font-medium py-1 rounded-md transition-all duration-150 ${
                    sidebarMode === mode
                      ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300"
                  }`}
                >
                  {mode === "clients" ? "Clients" : "Households"}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowAddPanel(true)}
              className="w-6 h-6 rounded-lg bg-brand-500 hover:bg-brand-600 flex items-center justify-center text-white transition-colors"
              title="Add client"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>
          <div className="relative">
            <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 text-[12px] font-light bg-slate-50/50 dark:bg-zinc-900/50 border border-slate-200/60 dark:border-zinc-800/60 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400/50 dark:placeholder:text-zinc-600/50 focus:outline-none focus:border-brand-400/50 dark:focus:border-brand-600/50 focus:ring-1 focus:ring-brand-200/30 dark:focus:ring-brand-800/20 transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto pb-2">
          {sidebarMode === "clients" ? (
            <>
              {loading ? (
                <div className="space-y-1 px-3 animate-pulse">
                  {[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-[var(--surface)]" />)}
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-center text-[12px] text-slate-400 dark:text-zinc-500 font-light py-8">No clients found</p>
              ) : (
                filtered.map((c) => (
                  <ClientRow key={c.id} client={c} active={c.id === selectedId} onSelect={() => { setSelectedId(c.id); setSidebarOpen(false); }} />
                ))
              )}
            </>
          ) : (
            <>
              {householdsLoading ? (
                <div className="space-y-1 px-3 animate-pulse">
                  {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-[var(--surface)]" />)}
                </div>
              ) : filteredHouseholds.length === 0 ? (
                <p className="text-center text-[12px] text-slate-400 dark:text-zinc-500 font-light py-8">No households found</p>
              ) : (
                filteredHouseholds.map((h) => (
                  <HouseholdRow key={h.id} household={h} active={h.id === selectedHouseholdId} onSelect={() => { setSelectedHouseholdId(h.id); setSidebarOpen(false); }} />
                ))
              )}
            </>
          )}
        </div>

        {/* Sidebar footer */}
        <div className="px-5 py-3 border-t border-slate-200/70 dark:border-zinc-800/70">
          <Link href="/chat" className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-zinc-500 hover:text-brand-500 dark:hover:text-brand-400 transition-colors">
            <IconMessage className="w-3 h-3" /> Back to chat
          </Link>
        </div>
      </aside>

      {/* ═══════════ MAIN ═══════════ */}
      <main className="flex-1 overflow-y-auto relative z-10">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-slate-200/70 dark:border-zinc-800/70 bg-[var(--background)] sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/60 flex items-center justify-center text-slate-500 dark:text-zinc-400"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
          </button>
          <Link href="/" className="text-[var(--foreground)] hover:text-[var(--accent)] transition-colors">
            <OvalensLogo className="h-[16px]" />
          </Link>
          {detail && sidebarMode === "clients" && (
            <span className="text-[13px] font-medium text-[var(--foreground)] truncate ml-auto">
              {detail.first_name} {detail.last_name}
            </span>
          )}
          {selectedHousehold && sidebarMode === "households" && (
            <span className="text-[13px] font-medium text-[var(--foreground)] truncate ml-auto">
              {selectedHousehold.name}
            </span>
          )}
        </div>
        <div className="max-w-[860px] mx-auto px-4 py-6 md:px-10 md:py-10">
          {sidebarMode === "clients" ? (
            <AnimatePresence mode="wait">
              {detailLoading || !detail ? (
                <motion.div key="skel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Skeleton />
                </motion.div>
              ) : (
                <motion.div
                  key={detail.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >

                  {/* ── Header ── */}
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-8 md:mb-10">
                    <div className="flex items-center gap-4 md:gap-5">
                      <div
                        className="w-10 h-10 md:w-[52px] md:h-[52px] rounded-2xl flex items-center justify-center text-white text-base md:text-lg font-semibold shadow-sm shadow-brand-500/20"
                        style={{ background: `linear-gradient(135deg, ${avatarGradient(name)[0]}, ${avatarGradient(name)[1]})` }}
                      >
                        {detail.first_name[0]}{detail.last_name[0]}
                      </div>
                      <div>
                        <h1 className="text-[20px] md:text-[24px] font-semibold text-[var(--foreground)] tracking-[-0.025em] leading-none">{name}</h1>
                        <div className="flex items-center gap-2 mt-2">
                          {detail.employment_status && (
                            <span className="text-[10px] font-semibold uppercase tracking-wider px-2.5 py-[3px] rounded-lg bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 border border-brand-200/40 dark:border-brand-800/30">
                              {detail.employment_status}
                            </span>
                          )}
                          {detail.region && (
                            <span className="text-[10px] font-medium uppercase tracking-wider px-2.5 py-[3px] rounded-lg bg-slate-50 dark:bg-zinc-900/50 text-slate-500 dark:text-zinc-400 border border-slate-200/40 dark:border-zinc-800/30">
                              {detail.region}
                            </span>
                          )}
                          {tp?.tax_year && (
                            <span className="text-[10px] font-mono text-[var(--muted)]">{tp.tax_year}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Prev / Next + Edit */}
                    <div className="flex items-center gap-3 pt-1">
                      {!showTaxForm && !showEditProfile && (
                        <>
                          <button
                            onClick={() => setShowEditProfile(true)}
                            className="text-[11px] font-medium text-brand-500 dark:text-brand-400 hover:text-brand-600 dark:hover:text-brand-300 transition-colors"
                          >
                            Edit profile
                          </button>
                          <button
                            onClick={() => setShowTaxForm(true)}
                            className="text-[11px] font-medium text-brand-500 dark:text-brand-400 hover:text-brand-600 dark:hover:text-brand-300 transition-colors"
                          >
                            {tp ? "Edit tax data" : "Add tax data"}
                          </button>
                        </>
                      )}
                      {(showTaxForm || showEditProfile) && (
                        <button
                          onClick={() => { setShowTaxForm(false); setShowEditProfile(false); }}
                          className="text-[11px] font-medium text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 transition-colors"
                        >
                          Cancel edit
                        </button>
                      )}
                      <span className="text-[11px] font-mono text-[var(--muted)]">
                        {curIdx + 1}<span className="text-[var(--muted)]/40"> / </span>{clients.length}
                      </span>
                      <div className="flex gap-1">
                        {[
                          { dir: -1, d: "M15 18l-6-6 6-6", disabled: curIdx <= 0 },
                          { dir: 1, d: "M9 18l6-6-6-6", disabled: curIdx >= clients.length - 1 },
                        ].map(({ dir, d, disabled }) => (
                          <button
                            key={dir}
                            disabled={disabled}
                            onClick={() => {
                              const next = curIdx + dir;
                              if (clients[next]) setSelectedId(clients[next].id);
                            }}
                            className="w-7 h-7 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/60 flex items-center justify-center text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700 transition-all disabled:opacity-25 disabled:pointer-events-none"
                          >
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={d} /></svg>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ── Tax data form for editing/adding tax profile ── */}
                  {showTaxForm && (
                    <TaxDataForm
                      clientId={detail.id}
                      clientRegion={detail.region || "england"}
                      onComputed={refetchDetail}
                      {...(tp ? {
                        existingData: {
                          income_sources: tp.income_sources,
                          pension_data: tp.pension_data as Record<string, unknown> | undefined,
                          hicbc: tp.hicbc as Record<string, unknown> | undefined,
                          allowances: tp.allowances as Array<{ type?: string; used?: number }> | undefined,
                        },
                      } : {})}
                    />
                  )}

                  {/* ── Edit profile form ── */}
                  {showEditProfile && (
                    <EditClientForm
                      client={detail}
                      allClients={clients}
                      onSaved={() => {
                        setShowEditProfile(false);
                        refetchDetail();
                        // Also refetch client list to update sidebar name
                        (async () => {
                          try {
                            const res = await fetch(`${API_BASE}/api/clients`);
                            if (res.ok) {
                              const data = await res.json();
                              setClients(data.clients || []);
                            }
                          } catch { /* noop */ }
                        })();
                      }}
                      onCancel={() => setShowEditProfile(false)}
                    />
                  )}

                  {/* ── Tabs ── */}
                  {!showTaxForm && !showEditProfile && (
                    <>
                      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                        <TabBar active={activeTab} onChange={setActiveTab} />
                      </div>

                      <AnimatePresence mode="wait">
                        {/* ══ PROFILE TAB ══ */}
                        {activeTab === "profile" && (
                          <motion.div
                            key="profile"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            <div className="space-y-5">
                              {/* Personal Information + Address */}
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
                                <Card title="Personal Information" icon={IconUser}>
                                  <KV label="Full Name" value={name} />
                                  <KV label="Date of Birth" value={dobStr} />
                                  <KV label="Email" value={detail.email} />
                                  <KV label="Phone" value={detail.phone} />
                                  <KV label="NI Number" value={detail.ni_number} mono />
                                  <KV label="UTR" value={detail.utr} mono />
                                  <KV label="Marital Status" value={detail.marital_status ? detail.marital_status.charAt(0).toUpperCase() + detail.marital_status.slice(1) : undefined} />
                                </Card>

                                <Card title="Address" icon={IconFileText}>
                                  <KV label="Address Line 1" value={detail.address_line_1} />
                                  <KV label="Address Line 2" value={detail.address_line_2} />
                                  <KV label="City" value={detail.city} />
                                  <KV label="Postcode" value={detail.postcode} mono />
                                  <KV label="Region" value={detail.region ? detail.region.charAt(0).toUpperCase() + detail.region.slice(1) : undefined} />
                                </Card>
                              </div>

                              {/* Spouse + Family */}
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
                                {detail.spouse && (
                                  <Card title="Spouse / Partner" icon={IconUser}>
                                    <KV label="Name" value={`${detail.spouse.first_name} ${detail.spouse.last_name}`} />
                                    <KV label="Date of Birth" value={detail.spouse.date_of_birth ? new Date(detail.spouse.date_of_birth).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : undefined} />
                                    <KV label="NI Number" value={detail.spouse.ni_number} mono />
                                    <KV label="Employment" value={detail.spouse.employment_status ? detail.spouse.employment_status.charAt(0).toUpperCase() + detail.spouse.employment_status.slice(1) : undefined} />
                                    <KV label="Region" value={detail.spouse.region ? detail.spouse.region.charAt(0).toUpperCase() + detail.spouse.region.slice(1) : undefined} />
                                    <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
                                      <button
                                        onClick={() => setSelectedId(detail.spouse!.id)}
                                        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-brand-500 dark:text-brand-400 hover:text-brand-600 dark:hover:text-brand-300 transition-colors"
                                      >
                                        View full profile <IconArrowRight className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </Card>
                                )}

                                <Card title="Family" icon={IconShield}>
                                  <KV label="Children" value={detail.number_of_children != null ? String(detail.number_of_children) : "0"} />
                                  <KV label="Claims Child Benefit" value={detail.claims_child_benefit ? "Yes" : "No"} />
                                </Card>
                              </div>

                              {/* Professional */}
                              <Card title="Professional" icon={IconTrendingUp}>
                                <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-8">
                                  <div>
                                    <KV label="Employment Status" value={detail.employment_status ? detail.employment_status.charAt(0).toUpperCase() + detail.employment_status.slice(1) : undefined} />
                                    <KV label="Employer" value={detail.employer_name} />
                                  </div>
                                  <div>
                                    <KV label="Company Name" value={detail.company_name} />
                                    <KV label="Company Number" value={detail.company_number} mono />
                                  </div>
                                </div>
                              </Card>

                              {/* Pension Carry Forward */}
                              {cfRows.length > 0 && (
                                <Card title="Pension Carry Forward" icon={IconCalculator}>
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr] gap-x-3 gap-y-1.5 items-center">
                                      <span className="text-[9px] font-semibold text-[var(--muted)] uppercase tracking-wider">Year</span>
                                      <span className="text-[9px] font-semibold text-[var(--muted)] uppercase tracking-wider text-right">AA</span>
                                      <span className="text-[9px] font-semibold text-[var(--muted)] uppercase tracking-wider text-right">Contributed</span>
                                      <span className="text-[9px] font-semibold text-[var(--muted)] uppercase tracking-wider text-right">Unused</span>
                                      <span className="text-[9px] font-semibold text-[var(--muted)] uppercase tracking-wider text-right">% Used</span>
                                      {cfRows.map((r) => {
                                        const pct = r.aa > 0 ? Math.round((r.total / r.aa) * 100) : 0;
                                        return (
                                          <React.Fragment key={r.yr}>
                                            <span className="text-[11px] font-mono text-[var(--foreground)]">{r.yr}</span>
                                            <span className="text-[11px] font-mono text-[var(--muted)] text-right tabular-nums">{fmt(r.aa)}</span>
                                            <span className="text-[11px] font-mono text-[var(--foreground)] text-right tabular-nums">{fmt(r.total)}</span>
                                            <span className={`text-[11px] font-mono text-right tabular-nums ${r.unused > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--muted)]"}`}>
                                              {fmt(r.unused)}
                                            </span>
                                            <span className="text-[11px] font-mono text-[var(--muted)]/60 text-right tabular-nums">{pct}%</span>
                                          </React.Fragment>
                                        );
                                      })}
                                    </div>
                                    <div className="pt-2 mt-1 border-t border-dashed border-[var(--border-subtle)] flex items-center justify-between">
                                      <span className="text-[11px] font-medium text-[var(--foreground)]/70">Total carry forward available</span>
                                      <span className="text-[12px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(cfTotalUnused)}</span>
                                    </div>
                                  </div>
                                </Card>
                              )}

                              {/* Notes */}
                              {detail.notes && (
                                <Card title="Notes" icon={IconMessage}>
                                  <p className="text-[12px] text-[var(--foreground)]/80 leading-relaxed whitespace-pre-wrap">{detail.notes}</p>
                                </Card>
                              )}
                            </div>
                          </motion.div>
                        )}

                        {/* ══ OVERVIEW TAB ══ */}
                        {activeTab === "overview" && tp && (
                          <motion.div
                            key="overview"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            <div className="space-y-5">
                              {/* Metric cards */}
                              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
                                <Metric label="Total Income" value={fmt(tp.total_income)} sub={sources.length > 1 ? `${sources.length} income sources` : undefined} icon={IconWallet} />
                                <Metric label="Total Tax" value={fmtFull(tp.total_tax)} sub={`Income tax ${fmt(tp.income_tax)}`} icon={IconCalculator} />
                                <Metric label="Effective Rate" value={fmtPct(tp.effective_rate)} sub="Overall tax burden" icon={IconChart} />
                                <Metric label="Marginal Rate" value={fmtPct(tp.marginal_rate)} sub="Next pound earned" icon={IconTrendingUp} />
                              </div>

                              {/* Net income takeaway */}
                              <NetIncomeBar
                                grossIncome={tp.total_income}
                                totalTax={tp.total_tax - tp.national_insurance}
                                nationalInsurance={tp.national_insurance}
                                netIncome={netIncome}
                              />

                              {/* Charts row: Donut + Waterfall */}
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
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
                            </div>
                          </motion.div>
                        )}

                        {/* ══ BREAKDOWN TAB ══ */}
                        {activeTab === "breakdown" && tp && (
                          <motion.div
                            key="breakdown"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            <div className="space-y-5">
                              {/* Income sources — full width */}
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
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
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
                                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-5">
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
                            </div>
                          </motion.div>
                        )}

                        {/* ══ INTELLIGENCE TAB ══ */}
                        {activeTab === "intelligence" && (
                          <motion.div
                            key="intelligence"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
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
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.15 }}
                          >
                            <MeetingNotesTimeline clientId={detail.id} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  )}

                </motion.div>
              )}
            </AnimatePresence>
          ) : (
            <AnimatePresence mode="wait">
              {householdsLoading || !selectedHousehold ? (
                <motion.div key="hh-skel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Skeleton />
                </motion.div>
              ) : (
                <motion.div
                  key={selectedHousehold.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <HouseholdDetail
                    household={selectedHousehold}
                    onViewMember={viewMemberProfile}
                    onUpdated={refetchHouseholds}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>

      <AddClientPanel
        isOpen={showAddPanel}
        onClose={() => setShowAddPanel(false)}
        onClientAdded={handleClientAdded}
      />
    </div>
  );
}
