"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import {
  IconWallet,
  IconShield,
  IconCalculator,
  IconUser,
} from "@/components/icons";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/* ─── Validation ─── */

const incomeSourceSchema = z.object({
  type: z.enum([
    "employment",
    "self_employment",
    "rental",
    "pension_income",
    "savings",
    "dividends",
    "other",
  ]),
  gross_amount: z.number().positive("Amount must be greater than 0"),
  label: z.string().optional(),
});

const taxDataSchema = z.object({
  income_sources: z
    .array(incomeSourceSchema)
    .min(1, "At least one income source is required"),
  pension_contributions: z.number().min(0).default(0),
  gift_aid: z.number().min(0).default(0),
  claims_child_benefit: z.boolean().default(false),
  number_of_children: z.number().int().min(0).default(0),
  isa_contributions: z.number().min(0).max(20_000, "ISA limit is £20,000").default(0),
  cgt_gains: z.number().min(0).default(0),
});

/* ─── Types ─── */

interface IncomeRow {
  id: string;
  type: string;
  gross_amount: string;
  label: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface ExistingData {
  income_sources?: Array<{ source_type?: string; type?: string; gross_amount?: number; amount?: number; label?: string }>;
  pension_data?: Record<string, any>;
  hicbc?: Record<string, any>;
  allowances?: Array<{ type?: string; used?: number }>;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/* ─── Constants ─── */

const INCOME_TYPES: { value: string; label: string }[] = [
  { value: "employment", label: "Employment" },
  { value: "self_employment", label: "Self-Employment" },
  { value: "rental", label: "Rental Income" },
  { value: "pension_income", label: "Pension Income" },
  { value: "savings", label: "Savings Interest" },
  { value: "dividends", label: "Dividends" },
  { value: "other", label: "Other Income" },
];

/* ─── Animation ─── */

const ease = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};

const rowAnim = {
  initial: { opacity: 0, height: 0 },
  animate: { opacity: 1, height: "auto", transition: { duration: 0.25, ease } },
  exit: { opacity: 0, height: 0, transition: { duration: 0.2 } },
};

/* ─── Helpers ─── */

let _id = 0;
function nextId(): string {
  return `inc-${++_id}-${Date.now()}`;
}

function makeRow(type = "employment", amount = "", label = ""): IncomeRow {
  return { id: nextId(), type, gross_amount: amount, label };
}

/* ─── Props ─── */

interface TaxDataFormProps {
  clientId: string;
  clientRegion: string;
  onComputed: () => void;
  existingData?: ExistingData;
}

/* ─── Shared Input Styles ─── */

const inputClass =
  "w-full px-3 py-2 text-[12px] bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:border-[var(--accent)]/40 focus:ring-1 focus:ring-[var(--accent)]/15 transition-all duration-150";

const inputMono = `${inputClass} font-mono`;

/* ─── Component ─── */

export function TaxDataForm({ clientId, clientRegion, onComputed, existingData }: TaxDataFormProps) {
  /* Derive initial state from existing data */
  const initialRows: IncomeRow[] = existingData?.income_sources?.length
    ? existingData.income_sources.map((s) =>
        makeRow(
          s.source_type || s.type || "employment",
          String(s.gross_amount ?? s.amount ?? ""),
          s.label || "",
        ),
      )
    : [makeRow()];

  const [rows, setRows] = useState<IncomeRow[]>(initialRows);
  const [pension, setPension] = useState(
    String(existingData?.pension_data?.contributions ?? "0"),
  );
  const [giftAid, setGiftAid] = useState("0");
  const [claimsCB, setClaimsCB] = useState(
    existingData?.hicbc?.claims_child_benefit ?? false,
  );
  const [numChildren, setNumChildren] = useState(
    String(existingData?.hicbc?.number_of_children ?? "0"),
  );
  const [isaContributions, setIsaContributions] = useState(
    String(existingData?.allowances?.find((a) => a.type === "isa")?.used ?? "0"),
  );
  const [cgtGains, setCgtGains] = useState(
    String(existingData?.allowances?.find((a) => a.type === "cgt_aea")?.used ?? "0"),
  );
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /* Row management */
  const addRow = useCallback(() => {
    setRows((prev) => [...prev, makeRow()]);
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
  }, []);

  const updateRow = useCallback(
    (id: string, field: keyof IncomeRow, value: string) => {
      setRows((prev) =>
        prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
      );
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[`row-${id}`];
        return next;
      });
    },
    [],
  );

  /* Submit */
  const submit = useCallback(async () => {
    setFieldErrors({});
    setApiError(null);

    /* Build payload */
    const incomeSources = rows.map((r) => ({
      type: r.type,
      gross_amount: parseFloat(r.gross_amount) || 0,
      label: r.label || undefined,
    }));

    const payload = {
      income_sources: incomeSources,
      pension_contributions: parseFloat(pension) || 0,
      gift_aid: parseFloat(giftAid) || 0,
      claims_child_benefit: claimsCB,
      number_of_children: claimsCB ? parseInt(numChildren) || 0 : 0,
      isa_contributions: parseFloat(isaContributions) || 0,
      cgt_gains: parseFloat(cgtGains) || 0,
    };

    /* Validate */
    const result = taxDataSchema.safeParse(payload);
    if (!result.success) {
      const errs: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join("-");
        if (!errs[key]) errs[key] = issue.message;
      }
      /* Also check individual rows for amount > 0 */
      rows.forEach((r, i) => {
        const amt = parseFloat(r.gross_amount);
        if (!amt || amt <= 0) {
          errs[`row-${r.id}`] = "Enter an amount";
        }
        if (!r.type) {
          errs[`row-${r.id}-type`] = "Select a type";
        }
        /* Suppress generic array error */
        delete errs[`income_sources-${i}-gross_amount`];
      });
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(
        `${API_BASE}/api/clients/${clientId}/tax-profile`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(result.data),
        },
      );

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.detail || `Computation failed (${res.status})`,
        );
      }

      onComputed();
    } catch (e) {
      setApiError(
        e instanceof Error ? e.message : "An unexpected error occurred",
      );
    } finally {
      setSubmitting(false);
    }
  }, [rows, pension, giftAid, claimsCB, numChildren, isaContributions, cgtGains, clientId, onComputed]);

  const regionLabel =
    clientRegion === "northern_ireland"
      ? "Northern Ireland"
      : clientRegion.charAt(0).toUpperCase() + clientRegion.slice(1);

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* ── API error ── */}
      <AnimatePresence>
        {apiError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg bg-red-50 dark:bg-red-500/[0.08] border border-red-200 dark:border-red-500/20 px-4 py-3"
          >
            <p className="text-[12px] font-medium text-red-700 dark:text-red-400">
              {apiError}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Section: Income Sources ── */}
      <motion.div variants={fadeUp}>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--card-border)] overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <IconWallet className="w-[14px] h-[14px] text-[var(--accent)]" />
              <h3 className="text-[13px] font-semibold text-[var(--foreground)] tracking-[-0.01em]">
                Income Sources
              </h3>
            </div>
            <button
              type="button"
              onClick={addRow}
              className="text-[11px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors flex items-center gap-1"
            >
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Add source
            </button>
          </div>

          <div className="px-5 py-4 space-y-3">
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_140px_1fr_28px] gap-2 px-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">Type</span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">Amount</span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">Label</span>
              <span />
            </div>

            {/* Rows */}
            <AnimatePresence initial={false}>
              {rows.map((row) => (
                <motion.div
                  key={row.id}
                  {...rowAnim}
                  layout
                  className="grid grid-cols-[1fr_140px_1fr_28px] gap-2 items-start"
                >
                  <select
                    value={row.type}
                    onChange={(e) => updateRow(row.id, "type", e.target.value)}
                    className={inputClass}
                  >
                    {INCOME_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>

                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-[var(--muted)] font-mono">
                      £
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0"
                      value={row.gross_amount}
                      onChange={(e) => {
                        const v = e.target.value.replace(/[^0-9.]/g, "");
                        updateRow(row.id, "gross_amount", v);
                      }}
                      className={`${inputMono} pl-7 ${
                        fieldErrors[`row-${row.id}`]
                          ? "border-red-400/60 dark:border-red-500/40"
                          : ""
                      }`}
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Optional label"
                    value={row.label}
                    onChange={(e) => updateRow(row.id, "label", e.target.value)}
                    className={inputClass}
                  />

                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length <= 1}
                    className="w-7 h-8 rounded-lg flex items-center justify-center text-[var(--muted)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors disabled:opacity-20 disabled:pointer-events-none"
                    title="Remove"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {fieldErrors["income_sources"] && (
              <p className="text-[10px] text-red-500 font-medium">
                {fieldErrors["income_sources"]}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Section: Tax Reliefs ── */}
      <motion.div variants={fadeUp}>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--card-border)] overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[var(--border-subtle)]">
            <IconShield className="w-[14px] h-[14px] text-[var(--accent)]" />
            <h3 className="text-[13px] font-semibold text-[var(--foreground)] tracking-[-0.01em]">
              Tax Reliefs
            </h3>
          </div>
          <div className="px-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="tdf-pension" className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">
                  Pension Contributions
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-[var(--muted)] font-mono">
                    £
                  </span>
                  <input
                    id="tdf-pension"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={pension}
                    onChange={(e) =>
                      setPension(e.target.value.replace(/[^0-9.]/g, ""))
                    }
                    className={`${inputMono} pl-7`}
                  />
                </div>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  Personal contributions (relief at source)
                </p>
              </div>
              <div className="space-y-1">
                <label htmlFor="tdf-giftaid" className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">
                  Gift Aid Donations
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-[var(--muted)] font-mono">
                    £
                  </span>
                  <input
                    id="tdf-giftaid"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={giftAid}
                    onChange={(e) =>
                      setGiftAid(e.target.value.replace(/[^0-9.]/g, ""))
                    }
                    className={`${inputMono} pl-7`}
                  />
                </div>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  Net amount of charitable donations
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Section: Allowances ── */}
      <motion.div variants={fadeUp}>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--card-border)] overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[var(--border-subtle)]">
            <IconShield className="w-[14px] h-[14px] text-[var(--accent)]" />
            <h3 className="text-[13px] font-semibold text-[var(--foreground)] tracking-[-0.01em]">
              Allowance Usage
            </h3>
          </div>
          <div className="px-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label htmlFor="tdf-isa" className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">
                  ISA Contributions
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-[var(--muted)] font-mono">
                    £
                  </span>
                  <input
                    id="tdf-isa"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={isaContributions}
                    onChange={(e) =>
                      setIsaContributions(e.target.value.replace(/[^0-9.]/g, ""))
                    }
                    className={`${inputMono} pl-7`}
                  />
                </div>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  Amount contributed this tax year (limit £20,000)
                </p>
              </div>
              <div className="space-y-1">
                <label htmlFor="tdf-cgt" className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">
                  Capital Gains
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-[var(--muted)] font-mono">
                    £
                  </span>
                  <input
                    id="tdf-cgt"
                    type="text"
                    inputMode="decimal"
                    placeholder="0"
                    value={cgtGains}
                    onChange={(e) =>
                      setCgtGains(e.target.value.replace(/[^0-9.]/g, ""))
                    }
                    className={`${inputMono} pl-7`}
                  />
                </div>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  Net gains this tax year (AEA £3,000)
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Section: Child Benefit ── */}
      <motion.div variants={fadeUp}>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--card-border)] overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[var(--border-subtle)]">
            <IconUser className="w-[14px] h-[14px] text-[var(--accent)]" />
            <h3 className="text-[13px] font-semibold text-[var(--foreground)] tracking-[-0.01em]">
              Child Benefit
            </h3>
          </div>
          <div className="px-5 py-4 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={claimsCB}
                  onChange={(e) => setClaimsCB(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)] peer-checked:bg-[var(--accent)] peer-checked:border-[var(--accent)] transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
              </div>
              <span className="text-[12px] text-[var(--foreground)] group-hover:text-[var(--foreground)]">
                Claims Child Benefit
              </span>
            </label>

            <AnimatePresence>
              {claimsCB && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-1 pt-1">
                    <label htmlFor="tdf-children" className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">
                      Number of Children
                    </label>
                    <input
                      id="tdf-children"
                      type="number"
                      min="1"
                      max="20"
                      value={numChildren}
                      onChange={(e) => setNumChildren(e.target.value)}
                      className={`${inputClass} w-24`}
                    />
                    <p className="text-[10px] text-[var(--muted-foreground)]">
                      HICBC applies if income exceeds £60,000
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* ── Footer ── */}
      <motion.div variants={fadeUp} className="flex items-center justify-between">
        <p className="text-[11px] text-[var(--muted)]">
          Calculating for <span className="font-medium text-[var(--foreground)]/60">{regionLabel}</span> &middot; 2025/26
        </p>
        <button
          type="button"
          onClick={submit}
          disabled={submitting}
          className="relative px-5 py-2.5 rounded-lg text-[13px] font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-all disabled:opacity-70 shadow-sm shadow-[var(--accent)]/20 flex items-center gap-2"
        >
          {submitting ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Calculating...
            </>
          ) : (
            <>
              <IconCalculator className="w-3.5 h-3.5" />
              Calculate Tax Position
            </>
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}
