"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { IconUser, IconShield, IconFileText } from "@/components/icons";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/* ─── Validation ─── */

const clientSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email address"),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  ni_number: z
    .string()
    .regex(/^[A-Za-z]{2}\d{6}[A-Za-z]$/, "Format: AB123456C"),
  utr: z.string().regex(/^\d{10}$/, "Must be exactly 10 digits"),
  region: z.enum(["england", "wales", "scotland", "northern_ireland"]),
  employment_status: z.enum([
    "employed",
    "self-employed",
    "director",
    "retired",
    "other",
  ]),
  notes: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

type FieldErrors = Partial<Record<keyof ClientFormData, string>>;

/* ─── Animation ─── */

const ease = [0.16, 1, 0.3, 1] as const;

const panelVariants = {
  hidden: { x: "100%", opacity: 0.8 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.4, ease },
  },
  exit: {
    x: "100%",
    opacity: 0.6,
    transition: { duration: 0.28, ease: [0.4, 0, 1, 1] as const },
  },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.15 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
};

/* ─── Props ─── */

export interface NewClientSummary {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  region?: string;
  employment_status?: string;
}

interface AddClientPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onClientAdded: (client: NewClientSummary) => void;
}

/* ─── Helpers ─── */

const INITIAL_FORM: ClientFormData = {
  first_name: "",
  last_name: "",
  email: "",
  date_of_birth: "",
  ni_number: "",
  utr: "",
  region: "england",
  employment_status: "employed",
  notes: "",
};

const REGIONS: { value: ClientFormData["region"]; label: string }[] = [
  { value: "england", label: "England" },
  { value: "wales", label: "Wales" },
  { value: "scotland", label: "Scotland" },
  { value: "northern_ireland", label: "Northern Ireland" },
];

const EMPLOYMENT: { value: ClientFormData["employment_status"]; label: string }[] = [
  { value: "employed", label: "Employed" },
  { value: "self-employed", label: "Self-Employed" },
  { value: "director", label: "Director" },
  { value: "retired", label: "Retired" },
  { value: "other", label: "Other" },
];

/* ─── Input Components ─── */

function Field({
  label,
  error,
  children,
  hint,
  id,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  hint?: string;
  id: string;
}) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p id={hintId} className="text-[10px] text-[var(--muted-foreground)]">{hint}</p>
      )}
      {error && (
        <motion.p
          id={errorId}
          role="alert"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[10px] text-red-500 dark:text-red-400 font-medium"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

const inputClass =
  "w-full px-3 py-2 text-[12px] bg-[var(--surface)] border rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:ring-1 transition-all duration-150";

const inputDefault =
  "border-[var(--border-subtle)] focus:border-[var(--accent)]/40 focus:ring-[var(--accent)]/15";

const inputError =
  "border-red-400/60 dark:border-red-500/40 focus:border-red-400 focus:ring-red-400/20";

/* ─── Main Component ─── */

export function AddClientPanel({ isOpen, onClose, onClientAdded }: AddClientPanelProps) {
  const [form, setForm] = useState<ClientFormData>({ ...INITIAL_FORM });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  /* Reset form when panel opens */
  useEffect(() => {
    if (isOpen) {
      setForm({ ...INITIAL_FORM });
      setErrors({});
      setTouched(new Set());
      setApiError(null);
      setSubmitting(false);
    }
  }, [isOpen]);

  /* Focus first input after panel slide animation completes */
  const handleAnimationComplete = useCallback(() => {
    firstInputRef.current?.focus();
  }, []);

  /* Field change handler */
  const set = useCallback(
    (field: keyof ClientFormData, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      /* Clear error for this field on change */
      setErrors((prev) => {
        if (prev[field]) {
          const next = { ...prev };
          delete next[field];
          return next;
        }
        return prev;
      });
    },
    [],
  );

  /* Blur handler — validate single field */
  const blur = useCallback(
    (field: keyof ClientFormData) => {
      setTouched((prev) => new Set(prev).add(field));
      const result = clientSchema.shape[field].safeParse(form[field]);
      if (!result.success) {
        setErrors((prev) => ({
          ...prev,
          [field]: result.error.issues[0]?.message,
        }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[field];
          return next;
        });
      }
    },
    [form],
  );

  /* Error for a field — only if touched */
  const err = (field: keyof ClientFormData) =>
    touched.has(field) ? errors[field] : undefined;

  /* Submit */
  const submit = useCallback(async () => {
    /* Validate all */
    const result = clientSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: FieldErrors = {};
      const allTouched = new Set<string>();
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof ClientFormData;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
        allTouched.add(field as string);
      }
      setErrors(fieldErrors);
      setTouched(allTouched);
      return;
    }

    setSubmitting(true);
    setApiError(null);

    try {
      const res = await fetch(`${API_BASE}/api/clients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.detail || `Failed to create client (${res.status})`,
        );
      }

      const client = await res.json();
      onClientAdded(client);
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }, [form, onClientAdded]);

  /* Keyboard: Escape to close (guarded during submission) */
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose, submitting]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="add-client-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={submitting ? undefined : onClose}
            className="fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-[2px]"
          />

          {/* Panel */}
          <motion.div
            key="add-client-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-client-title"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onAnimationComplete={handleAnimationComplete}
            className="fixed top-0 right-0 bottom-0 z-50 w-[480px] max-w-[90vw] bg-[var(--background)] border-l border-[var(--border)] shadow-2xl shadow-black/10 dark:shadow-black/30 flex flex-col"
          >
            {/* ── Header ── */}
            <div className="flex items-center justify-between px-6 h-14 border-b border-[var(--border-subtle)] flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
                  <IconUser className="w-3.5 h-3.5 text-[var(--accent)]" />
                </div>
                <h2 id="add-client-title" className="text-[15px] font-semibold text-[var(--foreground)] tracking-[-0.01em]">
                  Add New Client
                </h2>
              </div>
              <button
                onClick={submitting ? undefined : onClose}
                aria-label="Close"
                className="w-7 h-7 rounded-lg border border-[var(--border)] flex items-center justify-center text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--accent)]/30 transition-colors"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* ── Form wrapper ── */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              className="flex flex-col flex-1 overflow-hidden"
            >
            {/* ── Scrollable form body ── */}
            <div className="flex-1 overflow-y-auto">
              <motion.div
                variants={stagger}
                initial="hidden"
                animate="visible"
                className="px-6 py-5 space-y-6"
              >
                {/* API error banner */}
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

                {/* ── Section: Personal Details ── */}
                <motion.div variants={fadeUp}>
                  <div className="flex items-center gap-2 mb-3.5">
                    <IconUser className="w-3 h-3 text-[var(--accent)]" />
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Personal Details
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="First Name" error={err("first_name")} id="ac-first-name">
                        <input
                          id="ac-first-name"
                          ref={firstInputRef}
                          type="text"
                          placeholder="e.g. Sarah"
                          value={form.first_name}
                          onChange={(e) => set("first_name", e.target.value)}
                          onBlur={() => blur("first_name")}
                          aria-invalid={!!err("first_name")}
                          aria-describedby={err("first_name") ? "ac-first-name-error" : undefined}
                          className={`${inputClass} ${err("first_name") ? inputError : inputDefault}`}
                        />
                      </Field>
                      <Field label="Last Name" error={err("last_name")} id="ac-last-name">
                        <input
                          id="ac-last-name"
                          type="text"
                          placeholder="e.g. Mitchell"
                          value={form.last_name}
                          onChange={(e) => set("last_name", e.target.value)}
                          onBlur={() => blur("last_name")}
                          aria-invalid={!!err("last_name")}
                          aria-describedby={err("last_name") ? "ac-last-name-error" : undefined}
                          className={`${inputClass} ${err("last_name") ? inputError : inputDefault}`}
                        />
                      </Field>
                    </div>
                    <Field label="Email Address" error={err("email")} id="ac-email">
                      <input
                        id="ac-email"
                        type="email"
                        placeholder="e.g. sarah@example.com"
                        value={form.email}
                        onChange={(e) => set("email", e.target.value)}
                        onBlur={() => blur("email")}
                        aria-invalid={!!err("email")}
                        aria-describedby={err("email") ? "ac-email-error" : undefined}
                        className={`${inputClass} ${err("email") ? inputError : inputDefault}`}
                      />
                    </Field>
                    <Field label="Date of Birth" error={err("date_of_birth")} id="ac-dob">
                      <input
                        id="ac-dob"
                        type="date"
                        value={form.date_of_birth}
                        onChange={(e) => set("date_of_birth", e.target.value)}
                        onBlur={() => blur("date_of_birth")}
                        aria-invalid={!!err("date_of_birth")}
                        aria-describedby={err("date_of_birth") ? "ac-dob-error" : undefined}
                        className={`${inputClass} ${err("date_of_birth") ? inputError : inputDefault}`}
                      />
                    </Field>
                  </div>
                </motion.div>

                {/* ── Section: Tax Identifiers ── */}
                <motion.div variants={fadeUp}>
                  <div className="flex items-center gap-2 mb-3.5">
                    <IconShield className="w-3 h-3 text-[var(--accent)]" />
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Tax Identifiers
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <Field
                      label="National Insurance Number"
                      error={err("ni_number")}
                      hint="Format: AB123456C"
                      id="ac-ni-number"
                    >
                      <input
                        id="ac-ni-number"
                        type="text"
                        placeholder="AB123456C"
                        value={form.ni_number}
                        onChange={(e) =>
                          set("ni_number", e.target.value.toUpperCase().replace(/\s/g, ""))
                        }
                        onBlur={() => blur("ni_number")}
                        maxLength={9}
                        aria-invalid={!!err("ni_number")}
                        aria-describedby={err("ni_number") ? "ac-ni-number-error" : "ac-ni-number-hint"}
                        className={`${inputClass} font-mono tracking-wider ${err("ni_number") ? inputError : inputDefault}`}
                      />
                    </Field>
                    <Field
                      label="Unique Taxpayer Reference (UTR)"
                      error={err("utr")}
                      hint="10-digit HMRC reference"
                      id="ac-utr"
                    >
                      <input
                        id="ac-utr"
                        type="text"
                        placeholder="1234567890"
                        value={form.utr}
                        onChange={(e) =>
                          set("utr", e.target.value.replace(/\D/g, "").slice(0, 10))
                        }
                        onBlur={() => blur("utr")}
                        maxLength={10}
                        aria-invalid={!!err("utr")}
                        aria-describedby={err("utr") ? "ac-utr-error" : "ac-utr-hint"}
                        className={`${inputClass} font-mono tracking-wider ${err("utr") ? inputError : inputDefault}`}
                      />
                    </Field>
                  </div>
                </motion.div>

                {/* ── Section: Profile ── */}
                <motion.div variants={fadeUp}>
                  <div className="flex items-center gap-2 mb-3.5">
                    <IconFileText className="w-3 h-3 text-[var(--accent)]" />
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Profile
                    </h3>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Region" error={err("region")} id="ac-region">
                        <select
                          id="ac-region"
                          value={form.region}
                          onChange={(e) =>
                            set("region", e.target.value)
                          }
                          className={`${inputClass} ${err("region") ? inputError : inputDefault}`}
                        >
                          {REGIONS.map((r) => (
                            <option key={r.value} value={r.value}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Employment Status" error={err("employment_status")} id="ac-employment">
                        <select
                          id="ac-employment"
                          value={form.employment_status}
                          onChange={(e) =>
                            set("employment_status", e.target.value)
                          }
                          className={`${inputClass} ${err("employment_status") ? inputError : inputDefault}`}
                        >
                          {EMPLOYMENT.map((e) => (
                            <option key={e.value} value={e.value}>
                              {e.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </div>
                </motion.div>

                {/* ── Section: Notes ── */}
                <motion.div variants={fadeUp}>
                  <div className="flex items-center gap-2 mb-3.5">
                    <IconFileText className="w-3 h-3 text-[var(--muted)]" />
                    <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Notes
                      <span className="font-normal ml-1.5 text-[var(--muted-foreground)]">Optional</span>
                    </h3>
                  </div>
                  <textarea
                    placeholder="Any initial notes about this client..."
                    value={form.notes || ""}
                    onChange={(e) => set("notes", e.target.value)}
                    rows={3}
                    className={`${inputClass} ${inputDefault} resize-none`}
                  />
                </motion.div>
              </motion.div>
            </div>

            {/* ── Footer ── */}
            <div className="flex items-center justify-end gap-3 px-6 h-16 border-t border-[var(--border-subtle)] flex-shrink-0 bg-[var(--background)]">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-[12px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="relative px-5 py-2 rounded-lg text-[12px] font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] transition-all disabled:opacity-70 shadow-sm shadow-[var(--accent)]/20"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating...
                  </span>
                ) : (
                  "Add Client"
                )}
              </button>
            </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
