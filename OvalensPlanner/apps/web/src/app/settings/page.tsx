"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/theme-provider";
import { useAuth } from "@/contexts/auth-context";
import { useApi } from "@/hooks/use-api";
import {
  OvalensLogo,
  IconUser,
  IconSettings,
  IconBell,
  IconKey,
  IconGlobe,
  IconDatabase,
  IconFileText,
  IconUsers,
  IconCreditCard,
  IconLock,
  IconMail,
  IconChevronRight,
  IconExternalLink,
  IconCheck,
  IconShield,
  IconArrowRight,
} from "@/components/icons";

/* ─── Types ─── */

type Section =
  | "account"
  | "integrations"
  | "meetings"
  | "notifications"
  | "security"
  | "billing";

interface NavItem {
  id: Section;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

/* ─── Navigation ─── */

const NAV_ITEMS: NavItem[] = [
  { id: "account", label: "Account", icon: <IconUser className="w-4 h-4" /> },
  {
    id: "integrations",
    label: "Integrations",
    icon: <IconDatabase className="w-4 h-4" />,
  },
  {
    id: "meetings",
    label: "Meeting Notes",
    icon: <IconFileText className="w-4 h-4" />,
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: <IconBell className="w-4 h-4" />,
  },
  {
    id: "security",
    label: "Security & API",
    icon: <IconKey className="w-4 h-4" />,
  },
  {
    id: "billing",
    label: "Billing",
    icon: <IconCreditCard className="w-4 h-4" />,
  },
];

function isSection(value: string): value is Section {
  return NAV_ITEMS.some((item) => item.id === value);
}

/* ═══════════════════════════════════════════════════
   SETTINGS PAGE
   ═══════════════════════════════════════════════════ */

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<Section>("account");

  useEffect(() => {
    const applyHashSection = () => {
      const sectionFromHash = window.location.hash.replace("#", "");
      if (isSection(sectionFromHash)) {
        setActiveSection(sectionFromHash);
      }
    };

    applyHashSection();
    window.addEventListener("hashchange", applyHashSection);
    return () => window.removeEventListener("hashchange", applyHashSection);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-[#fafbfc] dark:bg-[#0a0a0c]">
      {/* ═══ Top Bar ═══ */}
      <header className="h-13 border-b border-slate-200/70 dark:border-zinc-800/70 flex items-center justify-between px-4 flex-shrink-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl z-30">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-slate-900 dark:text-white">
            <OvalensLogo className="h-7" />
          </Link>
          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800" />
          <div className="flex items-center gap-2">
            <IconSettings className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
            <span className="text-[12px] font-medium text-slate-600 dark:text-zinc-300">
              Settings
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/chat"
            className="text-[11px] font-light text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 flex items-center gap-1 transition-colors mr-2"
          >
            Back to Chat <IconArrowRight className="w-2.5 h-2.5" />
          </Link>
          <ThemeToggle />
          <button className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500 dark:text-zinc-400 hover:bg-slate-200 dark:hover:bg-zinc-700 transition-colors">
            <IconUser className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ═══ Main Layout ═══ */}
      <div className="flex-1 flex min-h-0">
        {/* ─── Sidebar ─── */}
        <aside className="w-60 flex-shrink-0 border-r border-slate-200/70 dark:border-zinc-800/70 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-sm">
          <nav className="px-3 py-5">
            <p className="text-[9px] uppercase tracking-[0.12em] font-medium text-slate-400/70 dark:text-zinc-600/70 px-3 mb-3">
              Configuration
            </p>
            <div className="space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSection(item.id);
                    window.history.replaceState(null, "", `#${item.id}`);
                  }}
                  className={`relative w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12px] font-normal transition-all ${
                    activeSection === item.id
                      ? "text-slate-900 dark:text-white bg-white dark:bg-zinc-800/80 shadow-sm shadow-slate-200/50 dark:shadow-none"
                      : "text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-900/50"
                  }`}
                >
                  {activeSection === item.id && (
                    <motion.div
                      layoutId="settings-nav"
                      className="absolute left-0 inset-y-0 my-auto w-[3px] h-4 rounded-r-full bg-brand-500"
                      transition={{
                        duration: 0.25,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    />
                  )}
                  <span
                    className={`transition-colors ${
                      activeSection === item.id
                        ? "text-brand-500 dark:text-brand-400"
                        : ""
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] font-medium bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>


            {/* Sidebar footer */}
            <div className="mt-4 mx-3 p-3 rounded-lg bg-gradient-to-br from-brand-50 to-violet-50 dark:from-brand-950/20 dark:to-violet-950/20 border border-brand-100/50 dark:border-brand-900/20">
              <p className="text-[11px] font-medium text-slate-700 dark:text-zinc-200 mb-1">
                Pro Plan
              </p>
              <p className="text-[10px] font-light text-slate-500 dark:text-zinc-400 leading-relaxed">
                5 adviser seats &middot; Unlimited clients
              </p>
              <div className="mt-2 h-1 bg-brand-100 dark:bg-brand-900/30 rounded-full overflow-hidden">
                <div className="h-full w-3/5 bg-brand-400 rounded-full" />
              </div>
              <p className="text-[9px] font-light text-slate-400 dark:text-zinc-500 mt-1">
                3 of 5 seats used
              </p>
            </div>
          </nav>
        </aside>

        {/* ─── Content ─── */}
        <main className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="max-w-3xl mx-auto px-8 py-8"
            >
              {activeSection === "account" && <AccountSection />}
              {activeSection === "integrations" && <IntegrationsSection />}
              {activeSection === "meetings" && <MeetingsSection />}
              {activeSection === "notifications" && <NotificationsSection />}
              {activeSection === "security" && <SecuritySection />}
              {activeSection === "billing" && <BillingSection />}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SECTION COMPONENTS
   ═══════════════════════════════════════════════════ */

/* ─── Account ─── */

function AccountSection() {
  return (
    <div>
      <SectionHeader
        title="Account"
        description="Manage your profile and firm details"
      />

      <Card delay={0}>
        <CardTitle>Profile</CardTitle>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <InputField label="First Name" value="James" />
          <InputField label="Last Name" value="Thornton" />
          <InputField
            label="Email"
            value="james@thorntonwealth.co.uk"
            full
          />
          <InputField label="Job Title" value="Senior Financial Adviser" full />
        </div>
      </Card>

      <Card delay={0.06}>
        <CardTitle>Firm Details</CardTitle>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <InputField label="Firm Name" value="Thornton Wealth Management" full />
          <InputField label="FCA Number" value="123456" />
          <InputField label="Firm Address" value="14 Bishopsgate, London EC2N 4BQ" full />
        </div>
      </Card>

      <Card delay={0.12}>
        <CardTitle>Preferences</CardTitle>
        <div className="mt-4 space-y-4">
          <ToggleRow
            label="Dark mode follows system"
            description="Automatically switch theme based on OS preference"
            defaultOn
          />
          <ToggleRow
            label="Compact number formatting"
            description="Display £42.5k instead of £42,500"
          />
          <ToggleRow
            label="Scottish tax rates"
            description="Default to Scottish income tax bands for new clients"
          />
        </div>
        <div className="flex justify-end mt-5 pt-4 border-t border-slate-100 dark:border-zinc-800/50">
          <SaveButton />
        </div>
      </Card>

      <SignOutCard />
    </div>
  );
}

function SignOutCard() {
  const { signOut, user } = useAuth();
  return (
    <Card delay={0.18}>
      <CardTitle>Sign out</CardTitle>
      <p className="text-[11px] font-light text-slate-500 dark:text-zinc-400 mt-1 mb-4">
        {user?.email
          ? `Signed in as ${user.email}`
          : "End your session on this device"}
      </p>
      <button
        type="button"
        onClick={() => signOut()}
        className="text-[11px] font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 px-3 py-2 rounded-lg border border-red-200 dark:border-red-800/30 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
      >
        Sign out
      </button>
    </Card>
  );
}

/* ─── Integrations ─── */

/* ── Brand logos ── */

function LogoSalesforce() {
  return (
    <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
      <rect width="40" height="40" rx="10" fill="#00A1E0" />
      <path d="M16.5 12.5c1.2-1.3 2.9-2 4.7-2 2.3 0 4.3 1.2 5.4 3 1-.5 2.1-.7 3.2-.7 4 0 7.2 3.2 7.2 7.1s-3.2 7.1-7.2 7.1c-.5 0-1-.1-1.5-.2-.9 1.7-2.7 2.9-4.8 2.9-1 0-1.9-.3-2.7-.7-1 2-3.1 3.4-5.5 3.4-2.7 0-5-1.8-5.8-4.2-.4.1-.9.1-1.3.1-3.5 0-6.2-2.8-6.2-6.3 0-2.5 1.5-4.7 3.6-5.7-.2-.7-.3-1.4-.3-2.2 0-4 3.3-7.1 7.3-7.1 2.5-.1 4.7 1.1 5.9 3" fill="white" transform="scale(0.68) translate(5, 5)" />
    </svg>
  );
}

function LogoIntelliflo() {
  return (
    <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
      <rect width="40" height="40" rx="10" fill="#1B2A4A" />
      <g transform="translate(8, 8)">
        {/* Stylized "i" + flow wave */}
        <circle cx="12" cy="5" r="2.5" fill="#4FD1C5" />
        <rect x="10" y="10" width="4" height="11" rx="2" fill="#4FD1C5" />
        <path d="M18 12c2 0 3.5 1.5 3.5 3.5S20 19 18 19" stroke="#4FD1C5" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M6 12c-2 0-3.5 1.5-3.5 3.5S4 19 6 19" stroke="#4FD1C5" strokeWidth="2" strokeLinecap="round" fill="none" />
      </g>
    </svg>
  );
}

function LogoXero() {
  return (
    <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
      <rect width="40" height="40" rx="10" fill="#13B5EA" />
      <g transform="translate(11, 11)">
        {/* Xero X mark */}
        <path d="M1 1l16 16M17 1L1 17" stroke="white" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function LogoHMRC() {
  return (
    <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
      <rect width="40" height="40" rx="10" fill="#1D1D1B" />
      <g transform="translate(8, 7)">
        {/* Crown */}
        <path d="M12 4L8 10h8L12 4z" fill="#C8B568" />
        <path d="M4 10l2-5 3 3-1.5 2H4z" fill="#C8B568" />
        <path d="M20 10l-2-5-3 3 1.5 2H20z" fill="#C8B568" />
        <circle cx="12" cy="3" r="1.5" fill="#C8B568" />
        <circle cx="5" cy="5" r="1.2" fill="#C8B568" />
        <circle cx="19" cy="5" r="1.2" fill="#C8B568" />
        <rect x="3" y="10" width="18" height="2.5" rx="0.5" fill="#C8B568" />
        {/* HMRC text */}
        <text x="12" y="22" textAnchor="middle" fill="white" fontSize="6.5" fontFamily="inherit" fontWeight="700" letterSpacing="0.08em">HMRC</text>
      </g>
    </svg>
  );
}

function LogoMicrosoft() {
  return (
    <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
      <rect width="40" height="40" rx="10" fill="white" />
      <rect width="40" height="40" rx="10" stroke="#E5E7EB" strokeWidth="0.5" />
      <g transform="translate(10, 10)">
        {/* Microsoft 4-square grid */}
        <rect x="0" y="0" width="9" height="9" fill="#F25022" rx="1" />
        <rect x="11" y="0" width="9" height="9" fill="#7FBA00" rx="1" />
        <rect x="0" y="11" width="9" height="9" fill="#00A4EF" rx="1" />
        <rect x="11" y="11" width="9" height="9" fill="#FFB900" rx="1" />
      </g>
    </svg>
  );
}

function LogoGoogle() {
  return (
    <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none">
      <rect width="40" height="40" rx="10" fill="white" />
      <rect width="40" height="40" rx="10" stroke="#E5E7EB" strokeWidth="0.5" />
      <g transform="translate(10, 10)">
        {/* Google G */}
        <path d="M19.6 10.2c0-.7-.1-1.4-.2-2H10v3.8h5.4c-.2 1.2-1 2.2-2 2.9v2.4h3.3c1.9-1.8 3-4.3 3-7.1z" fill="#4285F4" />
        <path d="M10 20c2.7 0 5-0.9 6.6-2.4l-3.3-2.4c-.9.6-2 1-3.3 1-2.5 0-4.7-1.7-5.5-4h-3.4v2.5C2.7 17.9 6.1 20 10 20z" fill="#34A853" />
        <path d="M4.5 12.2c-.2-.6-.3-1.3-.3-2s.1-1.4.3-2V5.7H1.1C.4 7.1 0 8.5 0 10s.4 2.9 1.1 4.3l3.4-2.1z" fill="#FBBC05" />
        <path d="M10 3.9c1.4 0 2.7.5 3.7 1.4l2.8-2.7C14.9 1 12.7 0 10 0 6.1 0 2.7 2.1 1.1 5.2l3.4 2.5c.8-2.3 3-3.8 5.5-3.8z" fill="#EA4335" />
      </g>
    </svg>
  );
}

type IntegrationItem = {
  id: string;
  name: string;
  description: string;
  logo: React.ReactNode;
  connected: boolean;
  status?: string;
  loading?: boolean;
};

const INITIAL_INTEGRATIONS: IntegrationItem[] = [
  { id: "salesforce", name: "Salesforce", description: "Sync client records and financial data from your CRM", logo: <LogoSalesforce />, connected: false },
  { id: "intelliflo", name: "Intelliflo", description: "Import back-office portfolio data and valuations", logo: <LogoIntelliflo />, connected: false },
  { id: "xero", name: "Xero", description: "Pull tax return data and accounting records", logo: <LogoXero />, connected: false },
  { id: "hmrc_apis", name: "HMRC APIs", description: "Direct access to HMRC tax data and submissions", logo: <LogoHMRC />, connected: false },
  { id: "microsoft_365", name: "Microsoft 365", description: "Calendar sync and Outlook meeting integration", logo: <LogoMicrosoft />, connected: false },
  { id: "google_workspace", name: "Google Workspace", description: "Calendar events and Google Meet transcription", logo: <LogoGoogle />, connected: false },
];

const LOADING_MESSAGES = [
  "Connecting…",
  "Authenticating with service…",
  "Loading client list…",
  "Syncing records…",
  "Importing tax data…",
  "Almost there…",
];

/** Minimum time to show the sync animation (ms), so it’s visible even when the API is fast. */
const SYNC_MIN_DURATION_MS = 8000;

const INTEGRATIONS_STORAGE_KEY = "ovalens-integrations-state";

type PersistedIntegrationState = Record<string, { connected: boolean; status?: string }>;

function getPersistedIntegrations(): PersistedIntegrationState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(INTEGRATIONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedIntegrationState;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function persistIntegrations(integrations: IntegrationItem[]): void {
  if (typeof window === "undefined") return;
  try {
    const state: PersistedIntegrationState = {};
    for (const i of integrations) {
      state[i.id] = { connected: i.connected, status: i.status };
    }
    window.localStorage.setItem(INTEGRATIONS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function IntegrationsSection() {
  const { api } = useApi();
  const [integrations, setIntegrations] = useState<IntegrationItem[]>(() => {
    const saved = getPersistedIntegrations();
    return INITIAL_INTEGRATIONS.map((i) => ({
      ...i,
      ...(saved[i.id] || {}),
      loading: false,
    }));
  });
  const loadingMessageIndexRef = useRef(0);

  const handleConnect = useCallback(
    async (item: IntegrationItem) => {
      if (item.connected || item.loading) return;
      loadingMessageIndexRef.current = 0;
      const startedAt = Date.now();
      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, loading: true, status: LOADING_MESSAGES[0] } : i
        )
      );
      const messageInterval = setInterval(() => {
        loadingMessageIndexRef.current += 1;
        const idx = loadingMessageIndexRef.current % LOADING_MESSAGES.length;
        setIntegrations((p) =>
          p.map((i) =>
            i.loading ? { ...i, status: LOADING_MESSAGES[idx] } : i
          )
        );
      }, 2200);
      const finishLoading = (updates: (prev: IntegrationItem[]) => IntegrationItem[]) => {
        clearInterval(messageInterval);
        setIntegrations((prev) => {
          const next = updates(prev);
          persistIntegrations(next);
          return next;
        });
      };
      try {
        const res = await api(`/api/integrations/${item.id}/sync`, { method: "POST" });
        const elapsed = Date.now() - startedAt;
        const waitMs = Math.max(0, SYNC_MIN_DURATION_MS - elapsed);

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          const errMessage = (err as { detail?: string }).detail ?? "Sync failed";
          if (waitMs > 0) {
            setTimeout(
              () =>
                finishLoading((prev) =>
                  prev.map((i) =>
                    i.id === item.id
                      ? { ...i, loading: false, status: errMessage }
                      : i
                  )
                ),
              waitMs
            );
          } else {
            finishLoading((prev) =>
              prev.map((i) =>
                i.id === item.id ? { ...i, loading: false, status: errMessage } : i
              )
            );
          }
          return;
        }

        const data = (await res.json()) as {
          clients_created: number;
          clients_skipped: number;
          tax_profiles_updated?: number;
          message: string;
        };
        const status =
          data.message ||
          (data.clients_created > 0
            ? `${data.clients_created} client${data.clients_created !== 1 ? "s" : ""} synced`
            : data.clients_skipped > 0
              ? "Already synced"
              : "Connected");

        if (waitMs > 0) {
          setTimeout(
            () =>
              finishLoading((prev) =>
                prev.map((i) =>
                  i.id === item.id
                    ? { ...i, connected: true, status, loading: false }
                    : i
                )
              ),
            waitMs
          );
        } else {
          finishLoading((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, connected: true, status, loading: false }
                : i
            )
          );
        }
      } catch (e) {
        const elapsed = Date.now() - startedAt;
        const waitMs = Math.max(0, SYNC_MIN_DURATION_MS - elapsed);
        const errMessage = e instanceof Error ? e.message : "Connection failed";
        if (waitMs > 0) {
          setTimeout(
            () =>
              finishLoading((prev) =>
                prev.map((i) =>
                  i.id === item.id
                    ? { ...i, loading: false, status: errMessage }
                    : i
                )
              ),
            waitMs
          );
        } else {
          finishLoading((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, loading: false, status: errMessage }
                : i
            )
          );
        }
      }
    },
    [api]
  );

  const handleDisconnect = useCallback((item: IntegrationItem) => {
    if (!item.connected) return;
    setIntegrations((prev) => {
      const next = prev.map((i) =>
        i.id === item.id ? { ...i, connected: false, status: undefined } : i
      );
      persistIntegrations(next);
      return next;
    });
  }, []);

  return (
    <div>
      <SectionHeader
        title="Integrations"
        description="Connect your tools and data sources to Ovalens. Synced clients are added to your local database."
      />

      {/* Connected */}
      <div className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.1em] font-medium text-slate-400 dark:text-zinc-500 mb-3">
          Connected
        </p>
        <div className="space-y-2">
          {integrations.filter((i) => i.connected).map((integration, i) => (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: i * 0.06,
                duration: 0.4,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="group flex items-center gap-4 p-4 rounded-xl border border-slate-200/70 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/50 hover:border-slate-300 dark:hover:border-zinc-700 transition-all"
            >
              <div className="flex-shrink-0 rounded-xl overflow-hidden shadow-sm">
                {integration.logo}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-medium text-slate-900 dark:text-white">
                    {integration.name}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-light text-emerald-600 dark:text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Connected
                  </span>
                </div>
                <p className="text-[11px] font-light text-slate-500 dark:text-zinc-400 mt-0.5">
                  {integration.status}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDisconnect(integration);
                }}
                className="text-[11px] font-light text-slate-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
              >
                Disconnect
              </button>
              <IconChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-zinc-600" />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Available */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.1em] font-medium text-slate-400 dark:text-zinc-500 mb-3">
          Available
        </p>
        <div className="grid grid-cols-1 gap-2">
          {integrations.filter((i) => !i.connected).map((integration, i) => (
            <motion.div
              key={integration.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: 0.2 + i * 0.06,
                duration: 0.4,
                ease: [0.16, 1, 0.3, 1],
              }}
              role="button"
              tabIndex={0}
              onClick={() => handleConnect(integration)}
              onKeyDown={(e) => e.key === "Enter" && handleConnect(integration)}
              className="group flex items-center gap-4 p-4 rounded-xl border border-dashed border-slate-200/70 dark:border-zinc-800/70 bg-white/50 dark:bg-zinc-900/30 hover:border-brand-400 dark:hover:border-brand-700 hover:bg-brand-50/30 dark:hover:bg-brand-950/10 transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <div className="flex-shrink-0 rounded-xl overflow-hidden shadow-sm">
                {integration.logo}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[13px] font-medium text-slate-900 dark:text-white">
                  {integration.name}
                </span>
                <p className="text-[11px] font-light text-slate-500 dark:text-zinc-400 mt-0.5">
                  {integration.loading ? integration.status : integration.description}
                </p>
              </div>
              {integration.loading ? (
                <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 border-2 border-brand-500 border-t-transparent rounded-full animate-[spin_1.8s_linear_infinite]" />
                  Syncing…
                </span>
              ) : (
                <span className="text-[11px] font-medium text-brand-500 dark:text-brand-400 px-3 py-1.5 rounded-lg border border-brand-200 dark:border-brand-800/40 group-hover:bg-brand-500 group-hover:text-white group-hover:border-brand-500 transition-all">
                  Connect
                </span>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Meetings ─── */

function MeetingsSection() {
  return (
    <div>
      <SectionHeader
        title="Meeting Notes"
        description="Configure AI-powered transcription and note templates"
      />

      <Card delay={0}>
        <CardTitle>Transcription</CardTitle>
        <div className="mt-4 space-y-4">
          <ToggleRow
            label="Auto-transcribe meetings"
            description="Automatically join and transcribe scheduled client meetings"
            defaultOn
          />
          <ToggleRow
            label="Speaker identification"
            description="Identify and label different speakers in transcripts"
            defaultOn
          />
          <ToggleRow
            label="Auto-extract action items"
            description="Parse meeting transcripts for follow-up tasks and deadlines"
            defaultOn
          />
          <ToggleRow
            label="HMRC reference detection"
            description="Automatically flag and tag HMRC references mentioned in meetings"
          />
        </div>
      </Card>

      <Card delay={0.06}>
        <CardTitle>Note Templates</CardTitle>
        <p className="text-[11px] font-light text-slate-500 dark:text-zinc-400 mt-1 mb-4">
          Templates are applied after transcription to structure your meeting
          notes
        </p>

        <div className="space-y-2">
          {[
            {
              name: "Annual Review",
              desc: "Comprehensive review with goals, risk, and tax summary",
              active: true,
            },
            {
              name: "Tax Planning Session",
              desc: "Focused on allowances, reliefs, and planning opportunities",
              active: true,
            },
            {
              name: "Pension Review",
              desc: "Drawdown strategy, lifetime allowance, and contributions",
              active: false,
            },
            {
              name: "IHT Planning",
              desc: "Estate planning, trusts, and gifting strategy notes",
              active: false,
            },
          ].map((template, i) => (
            <motion.div
              key={template.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.35 }}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200/70 dark:border-zinc-800/70 bg-white/60 dark:bg-zinc-900/40"
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  template.active
                    ? "bg-brand-50 dark:bg-brand-950/30 text-brand-500 dark:text-brand-400"
                    : "bg-slate-100 dark:bg-zinc-800 text-slate-400 dark:text-zinc-500"
                }`}
              >
                <IconFileText className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[12px] font-medium text-slate-900 dark:text-white">
                  {template.name}
                </span>
                <p className="text-[10px] font-light text-slate-500 dark:text-zinc-400">
                  {template.desc}
                </p>
              </div>
              {template.active ? (
                <span className="text-[10px] font-light text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <IconCheck className="w-3 h-3" /> Active
                </span>
              ) : (
                <button className="text-[10px] font-light text-slate-400 dark:text-zinc-500 hover:text-brand-500 dark:hover:text-brand-400 transition-colors">
                  Enable
                </button>
              )}
            </motion.div>
          ))}
        </div>
      </Card>

      <Card delay={0.12}>
        <CardTitle>Storage</CardTitle>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[12px] font-normal text-slate-700 dark:text-zinc-200">
              Meeting recordings
            </span>
            <span className="text-[11px] font-mono font-light text-slate-500 dark:text-zinc-400">
              4.2 GB / 10 GB
            </span>
          </div>
          <div className="h-2 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "42%" }}
              transition={{
                duration: 0.8,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.2,
              }}
              className="h-full bg-brand-400 rounded-full"
            />
          </div>
          <div className="flex items-center justify-between mt-3">
            <span className="text-[10px] font-light text-slate-400 dark:text-zinc-500">
              Retention: 90 days
            </span>
            <button className="text-[10px] font-light text-brand-500 dark:text-brand-400 hover:underline">
              Manage storage
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ─── Notifications ─── */

function NotificationsSection() {
  return (
    <div>
      <SectionHeader
        title="Notifications"
        description="Control how and when Ovalens alerts you"
      />

      <Card delay={0}>
        <CardTitle>Email Notifications</CardTitle>
        <div className="mt-4 space-y-4">
          <ToggleRow
            label="Daily tax digest"
            description="Summary of observations and opportunities across all clients"
            defaultOn
          />
          <ToggleRow
            label="Critical alerts"
            description="Immediate email for high-severity issues like deadline risks"
            defaultOn
          />
          <ToggleRow
            label="Weekly planning report"
            description="Aggregated tax planning recommendations sent every Monday"
          />
          <ToggleRow
            label="Integration sync failures"
            description="Alert when data sync from connected services fails"
            defaultOn
          />
        </div>
      </Card>

      <Card delay={0.06}>
        <CardTitle>In-App Notifications</CardTitle>
        <div className="mt-4 space-y-4">
          <ToggleRow
            label="Real-time observations"
            description="Show observation badges as Ovalens analyses client data"
            defaultOn
          />
          <ToggleRow
            label="Meeting reminders"
            description="Prompt to prepare tax brief 30 minutes before meetings"
            defaultOn
          />
          <ToggleRow
            label="Allowance warnings"
            description="Alert when a client approaches allowance thresholds"
            defaultOn
          />
        </div>
      </Card>

      <Card delay={0.12}>
        <CardTitle>Quiet Hours</CardTitle>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <InputField label="From" value="18:00" />
          <InputField label="To" value="08:00" />
        </div>
        <p className="text-[10px] font-light text-slate-400 dark:text-zinc-500 mt-2">
          Non-critical notifications are held during quiet hours
        </p>
      </Card>
    </div>
  );
}

/* ─── Security & API ─── */

function SecuritySection() {
  return (
    <div>
      <SectionHeader
        title="Security & API"
        description="Manage access credentials and authentication"
      />

      <Card delay={0}>
        <CardTitle>Authentication</CardTitle>
        <div className="mt-4 space-y-4">
          <ToggleRow
            label="Two-factor authentication"
            description="Require TOTP code on login for enhanced security"
            defaultOn
          />
          <ToggleRow
            label="SSO via firm provider"
            description="Allow single sign-on through your firm's identity provider"
          />
        </div>

        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-zinc-800/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[12px] font-normal text-slate-700 dark:text-zinc-200">
                Active sessions
              </p>
              <p className="text-[10px] font-light text-slate-400 dark:text-zinc-500 mt-0.5">
                2 devices currently logged in
              </p>
            </div>
            <button className="text-[10px] font-medium text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800/30 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all">
              Revoke all
            </button>
          </div>
        </div>
      </Card>

      <Card delay={0.06}>
        <CardTitle>API Keys</CardTitle>
        <p className="text-[11px] font-light text-slate-500 dark:text-zinc-400 mt-1 mb-4">
          Use API keys to integrate Ovalens with your own tools
        </p>

        <div className="space-y-2.5">
          {[
            {
              name: "Production",
              key: "hel_live_••••••••4f9a",
              created: "Created 14 Jan 2026",
              active: true,
            },
            {
              name: "Development",
              key: "hel_test_••••••••b2c1",
              created: "Created 3 Feb 2026",
              active: true,
            },
          ].map((apiKey, i) => (
            <motion.div
              key={apiKey.name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, duration: 0.35 }}
              className="flex items-center gap-3 p-3 rounded-lg border border-slate-200/70 dark:border-zinc-800/70 bg-white/60 dark:bg-zinc-900/40"
            >
              <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center">
                <IconKey className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-medium text-slate-900 dark:text-white">
                    {apiKey.name}
                  </span>
                  {apiKey.active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  )}
                </div>
                <p className="text-[10px] font-mono text-slate-400 dark:text-zinc-500 mt-0.5">
                  {apiKey.key}
                </p>
              </div>
              <span className="text-[10px] font-light text-slate-400 dark:text-zinc-500 mr-2">
                {apiKey.created}
              </span>
              <button className="text-[10px] font-light text-red-400 hover:text-red-500 transition-colors">
                Revoke
              </button>
            </motion.div>
          ))}
        </div>

        <button className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-brand-500 dark:text-brand-400 hover:text-brand-600 dark:hover:text-brand-300 transition-colors">
          <span className="w-5 h-5 rounded-md bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center text-[12px]">
            +
          </span>
          Generate new key
        </button>
      </Card>

      <Card delay={0.12}>
        <CardTitle>Compliance</CardTitle>
        <div className="mt-4 space-y-3">
          {[
            {
              icon: <IconShield className="w-4 h-4" />,
              label: "GDPR Compliant",
              detail: "Data processing agreement active",
            },
            {
              icon: <IconLock className="w-4 h-4" />,
              label: "AES-256 Encryption",
              detail: "All data encrypted at rest and in transit",
            },
            {
              icon: <IconGlobe className="w-4 h-4" />,
              label: "UK Data Residency",
              detail: "All data stored in UK data centres",
            },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.06, duration: 0.35 }}
              className="flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                {item.icon}
              </div>
              <div>
                <p className="text-[12px] font-medium text-slate-800 dark:text-zinc-100">
                  {item.label}
                </p>
                <p className="text-[10px] font-light text-slate-400 dark:text-zinc-500">
                  {item.detail}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─── Billing ─── */

function BillingSection() {
  return (
    <div>
      <SectionHeader
        title="Billing"
        description="Manage your subscription and payment method"
      />

      {/* Current plan */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative overflow-hidden rounded-xl border border-brand-200/50 dark:border-brand-800/30 bg-gradient-to-br from-brand-50 via-white to-violet-50 dark:from-brand-950/20 dark:via-zinc-900 dark:to-violet-950/20 p-6 mb-6"
      >
        {/* Decorative accent */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-brand-400/5 dark:bg-brand-400/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />

        <div className="relative flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[14px] font-semibold text-slate-900 dark:text-white">
                Pro Plan
              </span>
              <span className="text-[9px] font-medium uppercase tracking-wider bg-brand-100 dark:bg-brand-900/40 text-brand-600 dark:text-brand-400 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <p className="text-[11px] font-light text-slate-500 dark:text-zinc-400">
              Billed annually &middot; Renews 15 March 2027
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-light font-mono text-slate-900 dark:text-white">
              £299
            </span>
            <span className="text-[11px] font-light text-slate-400 dark:text-zinc-500">
              /month
            </span>
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-4 mt-5">
          {[
            { label: "Adviser seats", value: "5" },
            { label: "Client records", value: "Unlimited" },
            { label: "API calls", value: "50k/mo" },
          ].map((item) => (
            <div
              key={item.label}
              className="text-center p-3 rounded-lg bg-white/60 dark:bg-zinc-800/40"
            >
              <p className="text-[14px] font-medium font-mono text-slate-900 dark:text-white">
                {item.value}
              </p>
              <p className="text-[10px] font-light text-slate-400 dark:text-zinc-500 mt-0.5">
                {item.label}
              </p>
            </div>
          ))}
        </div>
      </motion.div>

      <Card delay={0.08}>
        <CardTitle>Payment Method</CardTitle>
        <div className="mt-4 flex items-center gap-4 p-3 rounded-lg border border-slate-200/70 dark:border-zinc-800/70 bg-white/60 dark:bg-zinc-900/40">
          <div className="w-12 h-8 rounded-md bg-gradient-to-r from-slate-800 to-slate-900 dark:from-zinc-300 dark:to-zinc-200 flex items-center justify-center">
            <span className="text-[9px] font-bold text-white dark:text-zinc-900 tracking-wider">
              VISA
            </span>
          </div>
          <div className="flex-1">
            <p className="text-[12px] font-medium text-slate-900 dark:text-white">
              &bull;&bull;&bull;&bull; &bull;&bull;&bull;&bull;
              &bull;&bull;&bull;&bull; 4242
            </p>
            <p className="text-[10px] font-light text-slate-400 dark:text-zinc-500">
              Expires 08/27
            </p>
          </div>
          <button className="text-[10px] font-light text-brand-500 dark:text-brand-400 hover:underline">
            Update
          </button>
        </div>
      </Card>

      <Card delay={0.14}>
        <CardTitle>Usage This Period</CardTitle>
        <div className="mt-4 space-y-3">
          {[
            { label: "API calls", used: 12480, total: 50000 },
            { label: "AI analyses", used: 342, total: 1000 },
            { label: "Document scans", used: 89, total: 500 },
          ].map((item, i) => {
            const pct = Math.round((item.used / item.total) * 100);
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 + i * 0.06 }}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-normal text-slate-700 dark:text-zinc-200">
                    {item.label}
                  </span>
                  <span className="text-[10px] font-mono font-light text-slate-500 dark:text-zinc-400">
                    {item.used.toLocaleString()} / {item.total.toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{
                      duration: 0.7,
                      ease: [0.16, 1, 0.3, 1],
                      delay: 0.25 + i * 0.08,
                    }}
                    className={`h-full rounded-full ${
                      pct > 80
                        ? "bg-amber-400"
                        : pct > 95
                          ? "bg-red-400"
                          : "bg-brand-400"
                    }`}
                  />
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>

      <Card delay={0.2}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Invoice History</CardTitle>
            <p className="text-[11px] font-light text-slate-500 dark:text-zinc-400 mt-1">
              Download past invoices for your records
            </p>
          </div>
          <button className="text-[11px] font-light text-brand-500 dark:text-brand-400 flex items-center gap-1 hover:underline">
            View all <IconExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="mt-4 space-y-1">
          {[
            { date: "1 Feb 2026", amount: "£299.00", status: "Paid" },
            { date: "1 Jan 2026", amount: "£299.00", status: "Paid" },
            { date: "1 Dec 2025", amount: "£299.00", status: "Paid" },
          ].map((invoice, i) => (
            <motion.div
              key={invoice.date}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 + i * 0.04 }}
              className="flex items-center justify-between py-2.5 border-b border-slate-100/80 dark:border-zinc-800/50 last:border-0"
            >
              <span className="text-[12px] font-light text-slate-600 dark:text-zinc-300">
                {invoice.date}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-[12px] font-mono font-medium text-slate-900 dark:text-white">
                  {invoice.amount}
                </span>
                <span className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded">
                  {invoice.status}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SHARED UI COMPONENTS
   ═══════════════════════════════════════════════════ */

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="mb-6"
    >
      <h1 className="text-xl font-medium text-slate-900 dark:text-white tracking-tight">
        {title}
      </h1>
      <p className="text-[12px] font-light text-slate-500 dark:text-zinc-400 mt-1">
        {description}
      </p>
    </motion.div>
  );
}

function Card({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay,
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="rounded-xl border border-slate-200/70 dark:border-zinc-800/70 bg-white dark:bg-zinc-900/50 p-5 mb-4"
    >
      {children}
    </motion.div>
  );
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[13px] font-medium text-slate-900 dark:text-white">
      {children}
    </h3>
  );
}

function InputField({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <label className="text-[10px] font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-wider block mb-1.5">
        {label}
      </label>
      <input
        type="text"
        defaultValue={value}
        className="w-full px-3 py-2 rounded-lg border border-slate-200/70 dark:border-zinc-800/70 bg-slate-50/50 dark:bg-zinc-800/30 text-[12px] font-normal text-slate-900 dark:text-white focus:outline-none focus:border-brand-400 dark:focus:border-brand-600 focus:ring-1 focus:ring-brand-400/20 dark:focus:ring-brand-600/20 transition-all"
      />
    </div>
  );
}

function ToggleRow({
  label,
  description,
  defaultOn,
}: {
  label: string;
  description: string;
  defaultOn?: boolean;
}) {
  const [on, setOn] = useState(defaultOn ?? false);

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-normal text-slate-700 dark:text-zinc-200">
          {label}
        </p>
        <p className="text-[10px] font-light text-slate-400 dark:text-zinc-500 mt-0.5">
          {description}
        </p>
      </div>
      <button
        onClick={() => setOn(!on)}
        className={`relative flex-shrink-0 w-9 h-5 rounded-full transition-colors duration-200 ${
          on ? "bg-brand-500" : "bg-slate-200 dark:bg-zinc-700"
        }`}
      >
        <motion.div
          animate={{ x: on ? 17 : 2 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute top-[3px] w-3.5 h-3.5 rounded-full bg-white shadow-sm"
        />
      </button>
    </div>
  );
}

function SaveButton() {
  return (
    <button className="flex items-center gap-2 px-5 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-[12px] font-medium shadow-sm shadow-brand-500/20 hover:shadow-md hover:shadow-brand-500/30 transition-all">
      <IconCheck className="w-3.5 h-3.5" />
      Save changes
    </button>
  );
}
