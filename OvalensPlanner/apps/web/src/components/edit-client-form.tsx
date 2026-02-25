"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconUser,
  IconFileText,
  IconShield,
  IconTrendingUp,
  IconMessage,
  IconSearch,
} from "@/components/icons";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/* ─── Types ─── */

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
  phone?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  postcode?: string;
  marital_status?: string;
  number_of_children?: number;
  claims_child_benefit?: boolean;
  spouse?: { id: string; first_name: string; last_name: string } | null;
  household_members?: { id: string; first_name: string; last_name: string }[];
  employer_name?: string;
  company_name?: string;
  company_number?: string;
  notes?: string;
}

interface EditClientFormProps {
  client: ClientDetail;
  allClients: { id: string; first_name: string; last_name: string }[];
  onSaved: () => void;
  onCancel: () => void;
}

/* ─── Animation ─── */

const ease = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
};

/* ─── Constants ─── */

const REGIONS: { value: string; label: string }[] = [
  { value: "england", label: "England" },
  { value: "wales", label: "Wales" },
  { value: "scotland", label: "Scotland" },
  { value: "northern_ireland", label: "Northern Ireland" },
];

const EMPLOYMENT: { value: string; label: string }[] = [
  { value: "employed", label: "Employed" },
  { value: "self-employed", label: "Self-Employed" },
  { value: "director", label: "Director" },
  { value: "retired", label: "Retired" },
  { value: "other", label: "Other" },
];

const MARITAL: { value: string; label: string }[] = [
  { value: "", label: "Not specified" },
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "civil_partnership", label: "Civil Partnership" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
];

/* ─── Shared Input Styles ─── */

const inputClass =
  "w-full px-3 py-2 text-[12px] bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/50 focus:outline-none focus:border-[var(--accent)]/40 focus:ring-1 focus:ring-[var(--accent)]/15 transition-all duration-150";

/* ─── Form fields type ─── */

interface FormFields {
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth: string;
  ni_number: string;
  utr: string;
  region: string;
  employment_status: string;
  phone: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  postcode: string;
  marital_status: string;
  number_of_children: string;
  claims_child_benefit: boolean;
  employer_name: string;
  company_name: string;
  company_number: string;
  notes: string;
}

/* ─── Component ─── */

export function EditClientForm({ client, allClients, onSaved, onCancel }: EditClientFormProps) {
  const [form, setForm] = useState<FormFields>({
    first_name: client.first_name || "",
    last_name: client.last_name || "",
    email: client.email || "",
    date_of_birth: client.date_of_birth || "",
    ni_number: client.ni_number || "",
    utr: client.utr || "",
    region: client.region || "england",
    employment_status: client.employment_status || "employed",
    phone: client.phone || "",
    address_line_1: client.address_line_1 || "",
    address_line_2: client.address_line_2 || "",
    city: client.city || "",
    postcode: client.postcode || "",
    marital_status: client.marital_status || "",
    number_of_children: String(client.number_of_children ?? 0),
    claims_child_benefit: client.claims_child_benefit ?? false,
    employer_name: client.employer_name || "",
    company_name: client.company_name || "",
    company_number: client.company_number || "",
    notes: client.notes || "",
  });

  // Spouse state: tracks the original spouse id and the currently selected one
  const originalSpouseId = client.spouse?.id ?? "";
  const [selectedSpouseId, setSelectedSpouseId] = useState(originalSpouseId);

  // Spouse search combobox state
  const [spouseQuery, setSpouseQuery] = useState("");
  const [spouseDropdownOpen, setSpouseDropdownOpen] = useState(false);
  const spouseRef = useRef<HTMLDivElement>(null);

  // Pension contribution history for carry forward
  const [pensionHistory, setPensionHistory] = useState<Record<string, { personal: number; employer: number }>>({
    "2022/23": { personal: 0, employer: 0 },
    "2023/24": { personal: 0, employer: 0 },
    "2024/25": { personal: 0, employer: 0 },
  });

  // Fetch pension history on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/clients/${client.id}/pension-history`)
      .then((r) => r.json())
      .then((data) => {
        if (data.contributions_history && Object.keys(data.contributions_history).length > 0) {
          setPensionHistory((prev) => ({ ...prev, ...data.contributions_history }));
        }
      })
      .catch(() => {});
  }, [client.id]);

  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Filter candidates by search query (exclude self and current spouse)
  const spouseResults = useMemo(() => {
    if (!spouseQuery.trim()) return [];
    const q = spouseQuery.toLowerCase();
    return allClients
      .filter((c) => c.id !== client.id && c.id !== selectedSpouseId)
      .filter((c) => `${c.first_name} ${c.last_name}`.toLowerCase().includes(q))
      .slice(0, 8);
  }, [allClients, client.id, selectedSpouseId, spouseQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (spouseRef.current && !spouseRef.current.contains(e.target as Node)) {
        setSpouseDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const set = useCallback(
    (field: keyof FormFields, value: string | boolean) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const submit = useCallback(async () => {
    setApiError(null);

    // Build payload with only changed fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const patch: Record<string, any> = {};

    if (form.first_name !== (client.first_name || "")) patch.first_name = form.first_name;
    if (form.last_name !== (client.last_name || "")) patch.last_name = form.last_name;
    if (form.email !== (client.email || "")) patch.email = form.email;
    if (form.date_of_birth !== (client.date_of_birth || "")) patch.date_of_birth = form.date_of_birth;
    if (form.ni_number !== (client.ni_number || "")) patch.ni_number = form.ni_number;
    if (form.utr !== (client.utr || "")) patch.utr = form.utr;
    if (form.region !== (client.region || "england")) patch.region = form.region;
    if (form.employment_status !== (client.employment_status || "employed")) patch.employment_status = form.employment_status;
    if (form.phone !== (client.phone || "")) patch.phone = form.phone;
    if (form.address_line_1 !== (client.address_line_1 || "")) patch.address_line_1 = form.address_line_1;
    if (form.address_line_2 !== (client.address_line_2 || "")) patch.address_line_2 = form.address_line_2;
    if (form.city !== (client.city || "")) patch.city = form.city;
    if (form.postcode !== (client.postcode || "")) patch.postcode = form.postcode;
    if (form.marital_status !== (client.marital_status || "")) patch.marital_status = form.marital_status;
    const numChildren = parseInt(form.number_of_children) || 0;
    if (numChildren !== (client.number_of_children ?? 0)) patch.number_of_children = numChildren;
    if (form.claims_child_benefit !== (client.claims_child_benefit ?? false)) patch.claims_child_benefit = form.claims_child_benefit;
    if (form.employer_name !== (client.employer_name || "")) patch.employer_name = form.employer_name;
    if (form.company_name !== (client.company_name || "")) patch.company_name = form.company_name;
    if (form.company_number !== (client.company_number || "")) patch.company_number = form.company_number;
    if (form.notes !== (client.notes || "")) patch.notes = form.notes;

    // Spouse change
    if (selectedSpouseId !== originalSpouseId) {
      patch.spouse_id = selectedSpouseId; // "" means unlink, otherwise new id
    }

    if (Object.keys(patch).length === 0) {
      onSaved();
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail || `Failed to update client (${res.status})`);
      }

      // Save pension history
      try {
        await fetch(`${API_BASE}/api/clients/${client.id}/pension-history`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contributions_history: pensionHistory }),
        });
      } catch {
        // Non-critical
      }

      onSaved();
    } catch (e) {
      setApiError(e instanceof Error ? e.message : "An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  }, [form, client, selectedSpouseId, originalSpouseId, pensionHistory, onSaved]);

  // Resolve current spouse name for display
  const currentSpouseName = useMemo(() => {
    if (!selectedSpouseId) return null;
    // Check the original client.spouse first
    if (client.spouse && client.spouse.id === selectedSpouseId) {
      return `${client.spouse.first_name} ${client.spouse.last_name}`;
    }
    // Otherwise look in allClients
    const found = allClients.find((c) => c.id === selectedSpouseId);
    return found ? `${found.first_name} ${found.last_name}` : null;
  }, [selectedSpouseId, client.spouse, allClients]);

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="visible"
      className="space-y-5"
    >
      {/* API error */}
      <AnimatePresence>
        {apiError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-lg bg-red-50 dark:bg-red-500/[0.08] border border-red-200 dark:border-red-500/20 px-4 py-3"
          >
            <p className="text-[12px] font-medium text-red-700 dark:text-red-400">{apiError}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Personal Information */}
      <motion.div variants={fadeUp}>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--card-border)] overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[var(--border-subtle)]">
            <IconUser className="w-[14px] h-[14px] text-[var(--accent)]" />
            <h3 className="text-[13px] font-semibold text-[var(--foreground)] tracking-[-0.01em]">Personal Information</h3>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">First Name</label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">Last Name</label>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">Date of Birth</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => set("date_of_birth", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="e.g. 07700 900000"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">NI Number</label>
                <input
                  type="text"
                  value={form.ni_number}
                  onChange={(e) => set("ni_number", e.target.value.toUpperCase().replace(/\s/g, ""))}
                  maxLength={9}
                  className={`${inputClass} font-mono tracking-wider`}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">UTR</label>
                <input
                  type="text"
                  value={form.utr}
                  onChange={(e) => set("utr", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  maxLength={10}
                  className={`${inputClass} font-mono tracking-wider`}
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Address */}
      <motion.div variants={fadeUp}>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--card-border)] overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[var(--border-subtle)]">
            <IconFileText className="w-[14px] h-[14px] text-[var(--accent)]" />
            <h3 className="text-[13px] font-semibold text-[var(--foreground)] tracking-[-0.01em]">Address</h3>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">Address Line 1</label>
              <input
                type="text"
                value={form.address_line_1}
                onChange={(e) => set("address_line_1", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">Address Line 2</label>
              <input
                type="text"
                value={form.address_line_2}
                onChange={(e) => set("address_line_2", e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">Postcode</label>
                <input
                  type="text"
                  value={form.postcode}
                  onChange={(e) => set("postcode", e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">Region</label>
              <select
                value={form.region}
                onChange={(e) => set("region", e.target.value)}
                className={inputClass}
              >
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Family */}
      <motion.div variants={fadeUp}>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--card-border)] overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[var(--border-subtle)]">
            <IconShield className="w-[14px] h-[14px] text-[var(--accent)]" />
            <h3 className="text-[13px] font-semibold text-[var(--foreground)] tracking-[-0.01em]">Family</h3>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">Marital Status</label>
                <select
                  value={form.marital_status}
                  onChange={(e) => set("marital_status", e.target.value)}
                  className={inputClass}
                >
                  {MARITAL.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">Number of Children</label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={form.number_of_children}
                  onChange={(e) => set("number_of_children", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={form.claims_child_benefit}
                  onChange={(e) => set("claims_child_benefit", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 rounded-full bg-[var(--surface)] border border-[var(--border-subtle)] peer-checked:bg-[var(--accent)] peer-checked:border-[var(--accent)] transition-colors" />
                <div className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-4" />
              </div>
              <span className="text-[12px] text-[var(--foreground)]">Claims Child Benefit</span>
            </label>
          </div>
        </div>
      </motion.div>

      {/* Spouse / Partner */}
      <motion.div variants={fadeUp}>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--card-border)]">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[var(--border-subtle)] rounded-t-xl">
            <IconUser className="w-[14px] h-[14px] text-[var(--accent)]" />
            <h3 className="text-[13px] font-semibold text-[var(--foreground)] tracking-[-0.01em]">Spouse / Partner</h3>
          </div>
          <div className="px-5 py-4 space-y-3">
            {selectedSpouseId && currentSpouseName ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center text-[10px] font-semibold text-[var(--accent)]">
                    {currentSpouseName.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <span className="text-[12px] font-medium text-[var(--foreground)]">{currentSpouseName}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSpouseId("")}
                  className="text-[11px] font-medium text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                >
                  Remove
                </button>
              </div>
            ) : (
              <p className="text-[12px] text-[var(--muted)]">No spouse linked</p>
            )}
            <div className="space-y-1" ref={spouseRef}>
              <label className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">
                {selectedSpouseId ? "Change spouse" : "Link a spouse"}
              </label>
              <div className="relative">
                <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--muted)]" />
                <input
                  type="text"
                  value={spouseQuery}
                  onChange={(e) => {
                    setSpouseQuery(e.target.value);
                    setSpouseDropdownOpen(true);
                  }}
                  onFocus={() => { if (spouseQuery.trim()) setSpouseDropdownOpen(true); }}
                  placeholder="Search clients by name..."
                  className={`${inputClass} pl-7`}
                />
                {spouseDropdownOpen && spouseResults.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 rounded-lg bg-[var(--card)] border border-[var(--card-border)] shadow-lg overflow-hidden max-h-[200px] overflow-y-auto">
                    {spouseResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedSpouseId(c.id);
                          setSpouseQuery("");
                          setSpouseDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[var(--surface)] transition-colors"
                      >
                        <div className="w-6 h-6 rounded-md bg-[var(--accent)]/10 flex items-center justify-center text-[9px] font-semibold text-[var(--accent)]">
                          {c.first_name[0]}{c.last_name[0]}
                        </div>
                        <span className="text-[12px] text-[var(--foreground)]">{c.first_name} {c.last_name}</span>
                      </button>
                    ))}
                  </div>
                )}
                {spouseDropdownOpen && spouseQuery.trim() && spouseResults.length === 0 && (
                  <div className="absolute z-50 left-0 right-0 mt-1 rounded-lg bg-[var(--card)] border border-[var(--card-border)] shadow-lg px-3 py-3">
                    <p className="text-[11px] text-[var(--muted)] text-center">No clients found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Household Members */}
      <motion.div variants={fadeUp}>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--card-border)] overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[var(--border-subtle)]">
            <IconShield className="w-[14px] h-[14px] text-[var(--accent)]" />
            <h3 className="text-[13px] font-semibold text-[var(--foreground)] tracking-[-0.01em]">Household Members</h3>
          </div>
          <div className="px-5 py-4">
            {client.household_members && client.household_members.length > 0 ? (
              <div className="space-y-2">
                {client.household_members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 py-1.5">
                    <div className="w-6 h-6 rounded-md bg-[var(--surface)] flex items-center justify-center text-[9px] font-semibold text-[var(--muted)]">
                      {m.first_name[0]}{m.last_name[0]}
                    </div>
                    <span className="text-[12px] text-[var(--foreground)]">{m.first_name} {m.last_name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-[var(--muted)]">No other household members</p>
            )}
            <p className="text-[10px] text-[var(--muted)]/60 mt-3">
              Household membership updates automatically when spouse relationships change.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Professional */}
      <motion.div variants={fadeUp}>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--card-border)] overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[var(--border-subtle)]">
            <IconTrendingUp className="w-[14px] h-[14px] text-[var(--accent)]" />
            <h3 className="text-[13px] font-semibold text-[var(--foreground)] tracking-[-0.01em]">Professional</h3>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">Employment Status</label>
              <select
                value={form.employment_status}
                onChange={(e) => set("employment_status", e.target.value)}
                className={inputClass}
              >
                {EMPLOYMENT.map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">Employer Name</label>
                <input
                  type="text"
                  value={form.employer_name}
                  onChange={(e) => set("employer_name", e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">Company Name</label>
                <input
                  type="text"
                  value={form.company_name}
                  onChange={(e) => set("company_name", e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-[var(--foreground)]/70 tracking-wide">Company Number</label>
              <input
                type="text"
                value={form.company_number}
                onChange={(e) => set("company_number", e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Pension Contribution History */}
      <motion.div variants={fadeUp}>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--card-border)] overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[var(--border-subtle)]">
            <IconTrendingUp className="w-[14px] h-[14px] text-[var(--accent)]" />
            <h3 className="text-[13px] font-semibold text-[var(--foreground)] tracking-[-0.01em]">Pension Contribution History</h3>
            <span className="text-[10px] text-[var(--muted)] ml-auto">For carry forward calculation</span>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-2 items-center">
              <span className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider">Year</span>
              <span className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider">Personal (&pound;)</span>
              <span className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider">Employer (&pound;)</span>
              {(["2022/23", "2023/24", "2024/25"] as const).map((year) => (
                <React.Fragment key={year}>
                  <span className="text-[12px] font-mono text-[var(--foreground)]">{year}</span>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={pensionHistory[year]?.personal || 0}
                    onChange={(e) =>
                      setPensionHistory((prev) => ({
                        ...prev,
                        [year]: { ...prev[year], personal: parseFloat(e.target.value) || 0 },
                      }))
                    }
                    className={inputClass + " font-mono"}
                  />
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={pensionHistory[year]?.employer || 0}
                    onChange={(e) =>
                      setPensionHistory((prev) => ({
                        ...prev,
                        [year]: { ...prev[year], employer: parseFloat(e.target.value) || 0 },
                      }))
                    }
                    className={inputClass + " font-mono"}
                  />
                </React.Fragment>
              ))}
            </div>
            <p className="text-[10px] text-[var(--muted)]/60 mt-1">
              Enter total pension contributions for each tax year. Unused allowance carries forward for up to 3 years.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Notes */}
      <motion.div variants={fadeUp}>
        <div className="rounded-xl bg-[var(--card)] border border-[var(--card-border)] overflow-hidden">
          <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[var(--border-subtle)]">
            <IconMessage className="w-[14px] h-[14px] text-[var(--accent)]" />
            <h3 className="text-[13px] font-semibold text-[var(--foreground)] tracking-[-0.01em]">Notes</h3>
          </div>
          <div className="px-5 py-4">
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={4}
              placeholder="Any notes about this client..."
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.div variants={fadeUp} className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-[12px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
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
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </button>
      </motion.div>
    </motion.div>
  );
}
