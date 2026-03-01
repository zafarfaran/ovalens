"use client";

import { useState, useRef, useEffect, memo, useMemo, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/theme-provider";
import { useChat } from "@/hooks/useChat";
import { useContextSnippets } from "@/hooks/useContextSnippets";
import { ContextPills } from "@/components/context-pills";
import { ThinkingIndicator } from "@/components/thinking-indicator";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { TaxComputationBreakdown } from "@/components/tax-computation-breakdown";
import { ScenarioComparisonChart } from "@/components/charts/scenario-comparison-chart";
import { NetBenefitCard } from "@/components/charts/net-benefit-card";
import { TotalBenefitHero } from "@/components/charts/total-benefit-hero";
import { VoiceMode } from "@/components/voice-mode";
import { useApi } from "@/hooks/use-api";
import {
  OvalensLogo,
  IconSend,
  IconChevronDown,
  IconUser,
  IconAlertCircle,
  IconTrendingUp,
  IconCheck,
  IconPieChart,
  IconWallet,
  IconLightbulb,
  IconCalculator,
  IconChart,
  IconShield,
  IconArrowRight,
  IconSparkles,
  IconPanelRight,
  IconPanelLeft,
  IconClock,
  IconBookOpen,
  IconPlus,
  IconOvalensMark,
  IconSearch,
  IconMessage,
  IconTrash,
  IconFileText,
  IconBell,
  IconSettings,
} from "@/components/icons";

/* ─── Types ─── */

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  insights?: Insight[];
  computationData?: import("@/hooks/useChat").TaxComputationData;
}

interface Insight {
  label: string;
  value: string;
  color: string;
}

interface SavingsBreakdownItem {
  label: string;
  value: string;
}

interface TaxImpactItem {
  label: string;
  annual: number;
  monthly: number;
}

interface SavingsBreakdown {
  currentState: SavingsBreakdownItem[];
  recommendedAction: SavingsBreakdownItem[];
  taxImpact: TaxImpactItem[];
  totalAnnual: number;
  totalMonthly: number;
  costNote?: string;
  effectiveRelief?: number;
  modelPrompt?: string;
}

interface Observation {
  id?: string;
  severity: "critical" | "warning" | "opportunity" | "info";
  title: string;
  detail: string;
  category?: string;
  potentialSaving?: number | null;
  action?: string | null;
  savingsBreakdown?: SavingsBreakdown | null;
}

/** Raw observation shape from API (engine or clientDetail). */
interface ObservationRaw {
  id?: string;
  title?: string;
  description?: string;
  detail?: string;
  type?: string;
  severity?: string;
  category?: string;
  potential_saving?: number;
  potentialSaving?: number;
  source?: string;
  is_dismissed?: boolean;
  action?: string;
  savingsBreakdown?: unknown;
}

interface ScenarioData {
  id: string;
  name: string;
  description: string;
  type?: "salary_sacrifice" | "personal_pension";
  current: {
    gross_salary?: number;
    sacrifice?: number;
    pension_contribution?: number;
    income_tax: number;
    national_insurance: number;
    hicbc: number;
    total_tax: number;
    personal_allowance: number;
    adjusted_net_income?: number;
  };
  proposed: {
    gross_salary?: number;
    sacrifice?: number;
    pension_contribution?: number;
    income_tax: number;
    national_insurance: number;
    hicbc: number;
    total_tax: number;
    personal_allowance: number;
    adjusted_net_income?: number;
  };
  savings: {
    income_tax: number;
    national_insurance?: number;
    employer_ni?: number;
    hicbc_avoided: number;
    total: number;
  };
  pa_change: {
    current: number;
    proposed: number;
    restored: number;
  };
  extra_into_pension?: number;
  effective_relief_rate?: number;
  thresholds?: {
    name: string;
    contribution_needed: number;
    additional_over_current: number;
    annual_saving: number;
    effective_relief: number;
    feasible: boolean;
  }[];
  pension_aa_warning?: string | null;
  total_effective_relief_rate?: number;
  net_benefit?: {
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
  total_benefit?: {
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
}

/* eslint-disable @typescript-eslint/no-explicit-any */
interface ClientSummary {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  region: string;
  employment_status: string;
  tax_year: string;
  total_income: number;
  total_tax: number;
  effective_rate: number;
  marginal_rate: number;
}

interface ClientDetail {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  ni_number?: string;
  date_of_birth?: string;
  tax_profile?: {
    total_income?: number;
    total_tax?: number;
    effective_rate?: number;
    marginal_rate?: number;
    income_tax?: number;
    national_insurance?: number;
    dividend_tax?: number;
    tax_breakdown?: { band: string; amount: number; rate: number; tax: number }[];
    ni_breakdown?: { class1?: { total_employee_ni?: number } };
    allowances?: { type: string; label: string; annual_limit: number; used: number; remaining: number; status?: string }[];
    hicbc?: { hicbc_charge?: number };
  };
  observations?: {
    id: string;
    title: string;
    description: string;
    severity: string;
    priority: string;
    category: string;
    potential_saving?: number;
  }[];
}

interface Conversation {
  id: string;
  client_id: string;
  title: string;
  status: string;
  last_message_preview: string;
  last_message_at: string;
  message_count: number;
  unread: boolean;
  created_at: string;
}

interface MeetingNoteData {
  id: string;
  meeting_date: string;
  subject: string;
  attendees?: string | null;
  summary: string;
  action_items?: string[] | null;
  tags?: string[] | null;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const QUICK_PROMPTS = [
  "Model pension sacrifice",
  "Show dividend tax options",
  "Compare ISA vs GIA",
  "Run salary sacrifice calc",
];

/* ─── Chat History ─── */

interface HistoryThread {
  id: string;
  client: { name: string; initials: string; gradient: string };
  title: string;
  preview: string;
  time: string;
  tag?: { label: string; color: string };
  unread?: boolean;
  active?: boolean;
  messageCount: number;
}

/* ─── Severity config ─── */

const severityConfig = {
  critical: {
    dot: "bg-red-500",
    bg: "bg-red-500/5 dark:bg-red-500/10",
    border: "border-red-500/20 dark:border-red-500/20",
    text: "text-red-600 dark:text-red-400",
    badge: "bg-red-500/10 text-red-600 dark:text-red-400",
    accent: "from-red-400 to-rose-500",
    iconBg: "bg-red-500/10 dark:bg-red-500/15",
  },
  warning: {
    dot: "bg-amber-500",
    bg: "bg-amber-500/5 dark:bg-amber-500/10",
    border: "border-amber-500/20 dark:border-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    accent: "from-amber-400 to-orange-400",
    iconBg: "bg-amber-500/10 dark:bg-amber-500/15",
  },
  opportunity: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/5 dark:bg-emerald-500/10",
    border: "border-emerald-500/20 dark:border-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    accent: "from-emerald-400 to-teal-400",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
  },
  info: {
    dot: "bg-blue-500",
    bg: "bg-blue-500/5 dark:bg-blue-500/10",
    border: "border-blue-500/20 dark:border-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    accent: "from-brand-400 to-violet-400",
    iconBg: "bg-brand-500/10 dark:bg-brand-500/15",
  },
};

/* ─── Gradient rotation for conversation avatars ─── */

const GRADIENTS = [
  "from-brand-400 to-violet-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-sky-400 to-blue-500",
  "from-violet-400 to-purple-500",
  "from-cyan-400 to-blue-400",
];

function getGradient(index: number): string {
  return GRADIENTS[index % GRADIENTS.length];
}

/* ─── Relative time grouping ─── */

function getRelativeGroup(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 7) return "This Week";
  return "Earlier";
}

function formatConversationTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays <= 7) {
    return d.toLocaleDateString("en-GB", { weekday: "short" });
  }
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

/* ═══════════════════════════════════════════════════
   CHAT PAGE — Refined Command Center
   ═══════════════════════════════════════════════════ */

export default function ChatPage() {
  return (
    <Suspense>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  const { api, token } = useApi();
  const { theme, toggle: toggleTheme } = useTheme();
  const searchParams = useSearchParams();
  const router = useRouter();

  /* ── Live data state (restored from localStorage where available) ── */
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [clientDetail, setClientDetail] = useState<ClientDetail | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [taxPlanMode, setTaxPlanMode] = useState(false);

  /* ── Callback to refresh client detail (e.g. after AI saves an observation) ── */
  const refreshClientDetail = useCallback(() => {
    if (!selectedClientId) return;
    api(`/api/clients/${selectedClientId}`)
      .then((r) => r.json())
      .then((data) => setClientDetail(data))
      .catch((err) => console.error("Failed to refresh client detail:", err));
  }, [selectedClientId, api]);

  /* ── useChat hook ── */
  const {
    messages,
    status,
    statusMessage,
    isStreaming,
    conversationId,
    dashboardData,
    isDashboardGenerating,
    isScenarioGenerating,
    scenarios: scenariosList,
    sendMessage,
    stopStreaming,
    loadMessages,
    clearMessages,
  } = useChat(selectedClientId, taxPlanMode, refreshClientDetail);

  const { snippets: contextSnippets, dismiss: dismissSnippet, consumeAll: consumeAllSnippets } = useContextSnippets();

  /* ── UI state ── */
  const [input, setInput] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelWidth, setPanelWidth] = useState(520);
  const [panelMode, setPanelMode] = useState<"sidebar" | "fullscreen">("sidebar");
  const panelResizing = useRef(false);
  const panelMinWidth = 420;
  const panelMaxWidth = 900;
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "allowances" | "scenarios" | "observations" | "notes">("overview");
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [clientMenuOpen, setClientMenuOpen] = useState(false);
  const [clientPickerMode, setClientPickerMode] = useState(false);
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [meetingNotes, setMeetingNotes] = useState<MeetingNoteData[]>([]);
  const clientMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [micContainer, setMicContainer] = useState<HTMLElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const micContainerRef = useCallback((node: HTMLDivElement | null) => {
    setMicContainer(node);
  }, []);

  // Track mobile breakpoint for voice mode floating behavior
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 767px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  // Hydrate UI preferences from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    try {
      const savedClient = localStorage.getItem("helio:ui:selectedClient");
      if (savedClient) setSelectedClientId(savedClient);
      const savedTab = localStorage.getItem("helio:ui:activeTab");
      if (savedTab) setActiveTab(savedTab as typeof activeTab);
      const savedPanel = localStorage.getItem("helio:ui:panelOpen");
      if (savedPanel !== null) setPanelOpen(JSON.parse(savedPanel));
    } catch { /* SSR or quota — ignore */ }
  }, []);

  // Auto-select the latest scenario when a new one arrives
  useEffect(() => {
    if (scenariosList.length > 0) {
      setActiveScenarioId(scenariosList[scenariosList.length - 1].id);
    }
  }, [scenariosList]);

  // Auto-switch to Scenarios tab when generation starts
  useEffect(() => {
    if (isScenarioGenerating) {
      setActiveTab("scenarios");
    }
  }, [isScenarioGenerating]);

  /* ── PDF export ── */
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async () => {
    if (isExporting || !dashboardData) return;
    setIsExporting(true);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cd = clientDetail as any;
      const clientInfo = cd
        ? {
            first_name: cd.first_name,
            last_name: cd.last_name,
            email: cd.email,
            ni_number: cd.ni_number,
            utr: cd.utr,
            date_of_birth: cd.date_of_birth,
            region: cd.region,
            employment_status: cd.employment_status,
          }
        : { first_name: "Client", last_name: "" };

      // Prefer computation data from the latest assistant message
      const latestComputation = [...messages].reverse().find((m) => m.computationData);
      const comp = latestComputation?.computationData;

      const taxPosition = comp?.taxPosition || {
        tax_year: "2024/25",
        total_income: dashboardData.incomeSummary?.totalIncome || 0,
        adjusted_net_income: dashboardData.adjustedNetIncome?.amount || 0,
        taxable_income: 0,
        income_tax: dashboardData.taxCalculation?.totalIncomeTax || 0,
        national_insurance:
          (dashboardData.nationalInsurance?.class1 || 0) +
          (dashboardData.nationalInsurance?.class2 || 0) +
          (dashboardData.nationalInsurance?.class4 || 0),
        dividend_tax: 0,
        total_tax: dashboardData.taxCalculation?.totalTax || 0,
        effective_rate: dashboardData.taxCalculation?.effectiveRate || 0,
        marginal_rate: dashboardData.taxCalculation?.marginalRate || 0,
        personal_allowance: 12570,
        pa_status: dashboardData.adjustedNetIncome?.personalAllowanceStatus || "full",
        hicbc_applies: !!dashboardData.hicbc?.applies,
        hicbc_charge: dashboardData.hicbc?.charge || 0,
      };

      // Gather AI observations from clientDetail
      const aiObservations = (cd?.observations || [] as ObservationRaw[])
        .filter((o) => o.source === "ai" && !o.is_dismissed)
        .map((o) => ({
          title: o.title,
          description: o.description,
          severity: o.severity,
          category: o.category,
          potential_saving: o.potential_saving,
          source: "ai",
        }));

      const res = await api("/api/exports/tax-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: clientInfo,
          tax_position: taxPosition,
          dashboard_data: comp?.dashboardData || dashboardData,
          scenarios: scenariosList.length > 0 ? scenariosList : undefined,
          ai_observations: aiObservations.length > 0 ? aiObservations : undefined,
          meeting_notes: meetingNotes.length > 0 ? meetingNotes : undefined,
        }),
      });

      if (!res.ok) throw new Error(`Export failed: ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("content-disposition")?.match(/filename="(.+)"/)?.[1] || "helio-tax-report.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  }, [api, isExporting, dashboardData, clientDetail, scenariosList, messages, meetingNotes]);

  /* ── Load clients when token is ready ── */
  useEffect(() => {
    if (!token) return;
    api("/api/clients")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        const list = Array.isArray(data?.clients) ? data.clients : [];
        setClients(list);
        if (list.length > 0) {
          setSelectedClientId(list[0].id);
        }
      })
      .catch((err) => {
        setClients([]);
        setSelectedClientId("");
        console.error("Failed to load clients:", err);
      });
  }, [token, api]);

  /* ── Load conversations helper ── */
  const loadConversations = useCallback(async () => {
    if (!selectedClientId) return;
    try {
      const res = await api(`/api/chat/conversations?client_id=${selectedClientId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConversations(Array.isArray(data?.conversations) ? data.conversations : []);
    } catch (err) {
      setConversations([]);
      console.error("Failed to load conversations:", err);
    }
  }, [selectedClientId, api]);

  /* ── Load client detail + conversations + meeting notes when selectedClientId changes ── */
  useEffect(() => {
    if (!token || !selectedClientId) return;
    // Fetch client detail (for observations, tax profile)
    api(`/api/clients/${selectedClientId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setClientDetail(data);
      })
      .catch((err) => {
        setClientDetail(null);
        console.error("Failed to load client detail:", err);
      });
    // Fetch meeting notes
    api(`/api/clients/${selectedClientId}/meeting-notes`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = await r.json();
        setMeetingNotes(Array.isArray(data?.meeting_notes) ? data.meeting_notes : []);
      })
      .catch((err) => {
        setMeetingNotes([]);
        console.error("Failed to load meeting notes:", err);
      });
    // Fetch conversations
    loadConversations();
  }, [token, selectedClientId, api, loadConversations]);

  /* ── Refresh conversations after streaming completes ── */
  useEffect(() => {
    if (!isStreaming && conversationId) {
      loadConversations();
    }
  }, [isStreaming, conversationId, loadConversations]);

  /* ── Scroll to bottom when messages change ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Close client menu on outside click ── */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (clientMenuRef.current && !clientMenuRef.current.contains(e.target as Node)) {
        setClientMenuOpen(false);
        setClientPickerMode(false);
        setClientSearchQuery("");
      }
    }
    if (clientMenuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [clientMenuOpen]);

  /* ── Close settings menu on outside click ── */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setSettingsMenuOpen(false);
      }
    }
    if (settingsMenuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [settingsMenuOpen]);

  /* ── Persist UI preferences to localStorage ── */
  useEffect(() => {
    if (isStreaming) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem("helio:ui:selectedClient", selectedClientId);
        localStorage.setItem("helio:ui:activeTab", activeTab);
        localStorage.setItem("helio:ui:panelOpen", JSON.stringify(panelOpen));
      } catch { /* quota or SSR — ignore */ }
    }, 300);
    return () => clearTimeout(timer);
  }, [selectedClientId, activeTab, panelOpen, isStreaming]);

  /* ── New chat handler ── */
  const handleNewChat = useCallback(async () => {
    try {
      const res = await api("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: selectedClientId }),
      });
      const data = await res.json();
      setActiveConversationId(data.id);
      clearMessages();
      loadConversations();
    } catch (err) {
      console.error("Failed to create conversation:", err);
    }
  }, [api, selectedClientId, clearMessages, loadConversations]);

  /* ── Auto-start new chat when arriving from landing page ── */
  useEffect(() => {
    if (searchParams.get("new") === "1" && selectedClientId) {
      handleNewChat();
      router.replace("/chat", { scroll: false });
    }
  }, [searchParams, selectedClientId, handleNewChat, router]);

  /* ── Select conversation handler ── */
  const handleSelectConversation = useCallback((convId: string) => {
    setActiveConversationId(convId);
    loadMessages(convId);
    // Auto-close history on mobile
    if (window.innerWidth < 768) setHistoryOpen(false);
  }, [loadMessages]);

  /* ── Delete conversation handler ── */
  const handleDeleteConversation = useCallback(async (convId: string) => {
    try {
      await api(`/api/chat/conversations/${convId}`, { method: "DELETE" });
      if (activeConversationId === convId) {
        clearMessages();
        setActiveConversationId(null);
      }
      loadConversations();
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  }, [api, activeConversationId, clearMessages, loadConversations]);

  /* ── Build grouped history from live conversations ── */
  const filteredHistory = useMemo(() => {
    // Find the matching client info for each conversation
    const findClient = (clientId: string) => {
      const c = clients.find((cl) => cl.id === clientId);
      if (!c) return { name: "Unknown", initials: "??", gradient: GRADIENTS[0] };
      const initials = `${c.first_name?.[0] ?? ""}${c.last_name?.[0] ?? ""}`.toUpperCase();
      const idx = clients.indexOf(c);
      return { name: `${c.first_name} ${c.last_name}`, initials, gradient: getGradient(idx) };
    };

    // Map conversations to HistoryThread shape
    const threads: HistoryThread[] = conversations.map((conv) => ({
      id: conv.id,
      client: findClient(conv.client_id),
      title: conv.title || "New conversation",
      preview: conv.last_message_preview || "",
      time: conv.last_message_at ? formatConversationTime(conv.last_message_at) : formatConversationTime(conv.created_at),
      unread: conv.unread,
      active: conv.id === activeConversationId,
      messageCount: conv.message_count,
    }));

    // Group by relative time
    const groupMap: Record<string, HistoryThread[]> = {};
    const groupOrder = ["Today", "Yesterday", "This Week", "Earlier"];
    for (const t of threads) {
      const conv = conversations.find((c) => c.id === t.id);
      const dateStr = conv?.last_message_at || conv?.created_at || "";
      const group = dateStr ? getRelativeGroup(dateStr) : "Earlier";
      if (!groupMap[group]) groupMap[group] = [];
      groupMap[group].push(t);
    }

    let groups = groupOrder
      .filter((g) => groupMap[g] && groupMap[g].length > 0)
      .map((g) => ({ group: g, threads: groupMap[g] }));

    // Apply search filter
    if (historySearch) {
      const q = historySearch.toLowerCase();
      groups = groups
        .map((g) => ({
          ...g,
          threads: g.threads.filter(
            (t) =>
              t.title.toLowerCase().includes(q) ||
              t.client.name.toLowerCase().includes(q) ||
              t.preview.toLowerCase().includes(q)
          ),
        }))
        .filter((g) => g.threads.length > 0);
    }

    return groups;
  }, [conversations, clients, activeConversationId, historySearch]);

  /* ── Derived data — prefer dashboardData over clientDetail ── */

  const observations: Observation[] = useMemo(() => {
    // Engine observations from dashboardData
    const engineObs: Observation[] = (dashboardData?.observations || []).map((obs: ObservationRaw) => ({
      id: obs.id || undefined,
      severity: (obs.type || obs.severity || "info") as "critical" | "warning" | "opportunity" | "info",
      title: obs.title,
      detail: obs.description || obs.detail || obs.action || "",
      category: obs.category || undefined,
      potentialSaving: obs.potentialSaving ?? obs.potential_saving ?? null,
      action: obs.action || null,
      savingsBreakdown: obs.savingsBreakdown || null,
    }));
    // AI observations from clientDetail (DB)
    const aiObs: Observation[] = (clientDetail?.observations || [] as ObservationRaw[])
      .filter((o) => o.source === "ai" && !o.is_dismissed)
      .map((obs: ObservationRaw) => ({
        id: obs.id,
        severity: (obs.severity || "info") as "critical" | "warning" | "opportunity" | "info",
        title: obs.title,
        detail: obs.description || "",
        category: obs.category || undefined,
        potentialSaving: obs.potential_saving ?? null,
        action: null,
        savingsBreakdown: null,
      }));
    return [...engineObs, ...aiObs];
  }, [dashboardData, clientDetail]);

  const taxBreakdownItems = useMemo(() => {
    if (!dashboardData?.taxCalculation) return [];

    const BAND_COLORS = ["bg-brand-500", "bg-violet-500", "bg-amber-500", "bg-red-400", "bg-emerald-500"];
    const tc = dashboardData.taxCalculation;
    const total = tc.totalTax || tc.totalIncomeTax || 1;
    const items: { label: string; amount: string; detail: string; pct: number; color: string }[] = [];

    if (tc.incomeTaxByBand && Array.isArray(tc.incomeTaxByBand)) {
      tc.incomeTaxByBand.forEach((band: Record<string, unknown>, i: number) => {
        const amount = band.tax ?? band.amount ?? 0;
        items.push({
          label: band.band || band.label || `Band ${i + 1}`,
          amount: `\u00A3${Number(amount).toLocaleString()}`,
          detail: band.rate ? `${(Number(band.rate) * 100).toFixed(0)}%` : "",
          pct: Math.round((amount / total) * 100),
          color: BAND_COLORS[i % BAND_COLORS.length],
        });
      });
    }

    if (dashboardData?.nationalInsurance) {
      const ni = dashboardData.nationalInsurance;
      const niTotal = (ni.class1 || 0) + (ni.class2 || 0) + (ni.class4 || 0);
      if (niTotal > 0) {
        const classes = [ni.class1 && "Class 1", ni.class2 && "Class 2", ni.class4 && "Class 4"].filter(Boolean).join(" + ");
        items.push({
          label: "National Insurance",
          amount: `\u00A3${niTotal.toLocaleString()}`,
          detail: classes,
          pct: Math.round((niTotal / total) * 100),
          color: BAND_COLORS[items.length % BAND_COLORS.length],
        });
      }
    }

    if (dashboardData?.hicbc?.charge) {
      items.push({
        label: "HICBC",
        amount: `\u00A3${Number(dashboardData.hicbc.charge).toLocaleString()}`,
        detail: "Child benefit clawback",
        pct: Math.round((dashboardData.hicbc.charge / total) * 100),
        color: BAND_COLORS[items.length % BAND_COLORS.length],
      });
    }

    return items;
  }, [dashboardData]);

  const allowancesData = useMemo(() => {
    if (!dashboardData?.allowancesTracker?.allowances) return [];
    return dashboardData.allowancesTracker.allowances.map((a: Record<string, unknown>) => ({
      label: a.name || a.label,
      used: a.used ?? 0,
      total: a.annualLimit ?? a.annual_limit ?? 0,
    }));
  }, [dashboardData]);

  // Client data — used in context ribbon and client dropdown (from DB)
  const clientTotalIncome = clientDetail?.tax_profile?.total_income;
  const clientTotalTax = clientDetail?.tax_profile?.total_tax;
  const clientEffectiveRate = clientDetail?.tax_profile?.effective_rate;
  const clientMarginalRate = clientDetail?.tax_profile?.marginal_rate;

  // Panel data — from AI-generated dashboardData only
  const totalIncome = dashboardData?.incomeSummary?.totalIncome ?? null;
  const totalTax = dashboardData?.taxCalculation?.totalTax ?? dashboardData?.taxCalculation?.totalIncomeTax ?? null;
  const effectiveRate = dashboardData?.taxCalculation?.effectiveRate ?? null;
  const marginalRate = dashboardData?.taxCalculation?.marginalRate ?? null;
  const taxableIncome = dashboardData?.adjustedNetIncome?.amount ?? null;
  const netIncome = totalIncome != null && totalTax != null ? totalIncome - totalTax : null;

  /* ── Client display info ── */
  const clientName = clientDetail ? `${clientDetail.first_name} ${clientDetail.last_name}` : "\u2014";
  const clientInitials = clientDetail
    ? `${clientDetail.first_name?.[0] ?? ""}${clientDetail.last_name?.[0] ?? ""}`.toUpperCase()
    : "--";

  /* Stable callbacks to avoid child re-renders */
  const handleTextareaChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim() && !isStreaming) {
        const snippetIds = consumeAllSnippets();
        sendMessage(input, snippetIds.length > 0 ? snippetIds : undefined);
        setInput("");
        // Reset textarea height
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
        }
      }
    }
  }, [input, isStreaming, sendMessage, consumeAllSnippets]);

  const handleSendClick = useCallback(() => {
    if (input.trim() && !isStreaming) {
      const snippetIds = consumeAllSnippets();
      sendMessage(input, snippetIds.length > 0 ? snippetIds : undefined);
      setInput("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  }, [input, isStreaming, sendMessage, consumeAllSnippets]);

  const handleModelScenario = useCallback((prompt: string) => {
    sendMessage(prompt);
  }, [sendMessage]);

  // Escape key exits fullscreen panel
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && panelMode === "fullscreen") {
        setPanelMode("sidebar");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [panelMode]);

  // Panel resize drag handler
  const handlePanelResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    panelResizing.current = true;
    const startX = e.clientX;
    const startWidth = panelWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      if (!panelResizing.current) return;
      const delta = startX - ev.clientX;
      const newWidth = Math.min(panelMaxWidth, Math.max(panelMinWidth, startWidth + delta));
      setPanelWidth(newWidth);
    };
    const onUp = () => {
      panelResizing.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, [panelWidth]);

  return (
    <div className="h-screen flex flex-col bg-[#fafbfc] dark:bg-[#0a0a0c]">
      {/* ═══ Top Bar ═══ */}
      <header className="h-13 border-b border-slate-200/70 dark:border-zinc-800/70 flex items-center justify-between px-3 md:px-4 flex-shrink-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl z-30">
        <div className="flex items-center gap-2 md:gap-4">
          <Link href="/" className="text-slate-900 dark:text-white">
            <OvalensLogo className="h-5 md:h-7" />
          </Link>

          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-800 hidden md:block" />

          {/* History toggle */}
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-[11px] font-medium ${
              historyOpen
                ? "bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400"
                : "text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-600 dark:hover:text-zinc-300"
            }`}
            title={historyOpen ? "Close history" : "Chat history"}
          >
            <IconClock className="w-3.5 h-3.5" />
            <span className="hidden md:inline">History</span>
            {conversations.filter((c) => c.unread).length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
            )}
          </button>

          {/* Client selector + dropdown */}
          <div className="relative" ref={clientMenuRef}>
            <button
              onClick={() => {
                if (clientMenuOpen) { setClientPickerMode(false); setClientSearchQuery(""); }
                setClientMenuOpen(!clientMenuOpen);
              }}
              className={`flex items-center gap-2.5 px-2.5 py-1.5 -mx-1 rounded-lg transition-colors group ${
                clientMenuOpen
                  ? "bg-slate-50 dark:bg-zinc-900"
                  : "hover:bg-slate-50 dark:hover:bg-zinc-900"
              }`}
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-400 to-violet-500 flex items-center justify-center text-[10px] font-semibold text-white shadow-sm shadow-brand-500/20">
                {clientInitials}
              </div>
              <div className="text-left">
                <div className="text-[12px] font-medium text-slate-900 dark:text-white leading-tight">{clientName}</div>
                <div className="hidden md:block text-[10px] font-light text-slate-400 dark:text-zinc-500 leading-tight">{clientDetail?.tax_profile ? `${clientDetail.tax_profile.effective_rate ?? ''}%` : ''} &middot; Active</div>
              </div>
              <motion.div animate={{ rotate: clientMenuOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <IconChevronDown className="w-3 h-3 text-slate-300 dark:text-zinc-600 group-hover:text-slate-500 dark:group-hover:text-zinc-400 transition-colors" />
              </motion.div>
            </button>

            {/* Dropdown */}
            <AnimatePresence>
              {clientMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute top-full left-0 mt-1.5 w-72 rounded-xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-xl shadow-slate-200/40 dark:shadow-black/40 z-50 overflow-hidden"
                >
                  <AnimatePresence mode="wait" initial={false}>
                  {clientPickerMode ? (
                    /* ── Client Picker View ── */
                    <motion.div
                      key="picker"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    >
                      {/* Picker header */}
                      <div className="px-3 pt-3 pb-2 border-b border-slate-100 dark:border-zinc-800/70">
                        <div className="flex items-center gap-2 mb-2.5">
                          <button
                            onClick={() => { setClientPickerMode(false); setClientSearchQuery(""); }}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-600 dark:hover:text-zinc-300 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg>
                          </button>
                          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">Switch client</span>
                        </div>
                        <div className="relative">
                          <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-300 dark:text-zinc-600" />
                          <input
                            type="text"
                            placeholder="Search clients..."
                            value={clientSearchQuery}
                            onChange={(e) => setClientSearchQuery(e.target.value)}
                            autoFocus
                            className="w-full pl-7 pr-3 py-1.5 text-[11px] bg-slate-50 dark:bg-zinc-800/60 border border-slate-200/60 dark:border-zinc-700/50 rounded-lg text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-zinc-600 focus:outline-none focus:border-brand-300 dark:focus:border-brand-700 focus:ring-1 focus:ring-brand-200/30 dark:focus:ring-brand-800/20 transition-all"
                          />
                        </div>
                      </div>

                      {/* Client list */}
                      <div className="max-h-[280px] overflow-y-auto py-1 px-1.5 scrollbar-thin">
                        {clients
                          .filter((c) => {
                            if (!clientSearchQuery.trim()) return true;
                            const q = clientSearchQuery.toLowerCase();
                            return `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(q);
                          })
                          .map((c, idx) => {
                            const isActive = c.id === selectedClientId;
                            const initials = `${c.first_name?.[0] ?? ""}${c.last_name?.[0] ?? ""}`.toUpperCase();
                            const grad = getGradient(idx);
                            return (
                              <button
                                key={c.id}
                                onClick={() => {
                                  setSelectedClientId(c.id);
                                  setClientMenuOpen(false);
                                  setClientPickerMode(false);
                                  setClientSearchQuery("");
                                }}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-150 group/client ${
                                  isActive
                                    ? "bg-brand-50/80 dark:bg-brand-950/20 ring-1 ring-brand-200/50 dark:ring-brand-800/30"
                                    : "hover:bg-slate-50 dark:hover:bg-zinc-800/60"
                                }`}
                              >
                                <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${grad} flex items-center justify-center text-[9px] font-semibold text-white shadow-sm flex-shrink-0`}>
                                  {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[12px] font-medium truncate ${isActive ? "text-brand-700 dark:text-brand-300" : "text-slate-800 dark:text-zinc-200"}`}>
                                    {c.first_name} {c.last_name}
                                  </p>
                                  <div className="flex items-center gap-1.5">
                                    {c.total_income != null && (
                                      <span className="text-[9px] font-mono text-slate-400 dark:text-zinc-500">
                                        {`\u00A3${c.total_income.toLocaleString()}`}
                                      </span>
                                    )}
                                    {c.effective_rate != null && (
                                      <>
                                        <span className="text-slate-200 dark:text-zinc-700 text-[7px]">&middot;</span>
                                        <span className="text-[9px] font-mono text-slate-400 dark:text-zinc-500">{c.effective_rate}%</span>
                                      </>
                                    )}
                                    {!c.total_income && (
                                      <span className="text-[9px] text-slate-300 dark:text-zinc-600 italic">No tax data</span>
                                    )}
                                  </div>
                                </div>
                                {isActive && (
                                  <div className="w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
                                    <IconCheck className="w-2.5 h-2.5 text-white" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        {clients.filter((c) => {
                          if (!clientSearchQuery.trim()) return true;
                          const q = clientSearchQuery.toLowerCase();
                          return `${c.first_name} ${c.last_name} ${c.email}`.toLowerCase().includes(q);
                        }).length === 0 && (
                          <p className="text-center text-[11px] text-slate-300 dark:text-zinc-600 py-6">No clients found</p>
                        )}
                      </div>
                    </motion.div>
                  ) : (
                    /* ── Client Info View (original) ── */
                    <motion.div
                      key="info"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                    >
                  {/* Client header */}
                  <div className="px-4 pt-4 pb-3 border-b border-slate-100 dark:border-zinc-800/70">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-400 to-violet-500 flex items-center justify-center text-[12px] font-semibold text-white shadow-sm shadow-brand-500/20">
                        {clientInitials}
                      </div>
                      <div>
                        <p className="text-[13px] font-medium text-slate-900 dark:text-white">{clientName}</p>
                        <p className="text-[10px] font-light text-slate-400 dark:text-zinc-500">
                          {clientDetail?.ni_number ? `NI: ${clientDetail.ni_number}` : ''}
                          {clientDetail?.ni_number && clientDetail?.date_of_birth ? ' \u00B7 ' : ''}
                          {clientDetail?.date_of_birth ? `DOB: ${new Date(clientDetail.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex-1 text-center px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800/60">
                        <p className="text-[11px] font-mono font-medium text-slate-900 dark:text-white">{clientTotalIncome != null ? `\u00A3${clientTotalIncome.toLocaleString()}` : '\u2014'}</p>
                        <p className="text-[8px] font-light text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Gross</p>
                      </div>
                      <div className="flex-1 text-center px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800/60">
                        <p className="text-[11px] font-mono font-medium text-red-600 dark:text-red-400">{clientTotalTax != null ? `\u00A3${clientTotalTax.toLocaleString()}` : '\u2014'}</p>
                        <p className="text-[8px] font-light text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Tax</p>
                      </div>
                      <div className="flex-1 text-center px-2 py-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800/60">
                        <p className="text-[11px] font-mono font-medium text-slate-900 dark:text-white">{clientEffectiveRate != null ? `${clientEffectiveRate}%` : '\u2014'}</p>
                        <p className="text-[8px] font-light text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Effective</p>
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="py-1.5 px-1.5">
                    <ClientMenuItem icon={<IconUser className="w-3.5 h-3.5" />} label="View client profile" href="/clients" />
                    <ClientMenuItem icon={<IconFileText className="w-3.5 h-3.5" />} label="Tax documents" badge="12" />
                    <ClientMenuItem icon={<IconChart className="w-3.5 h-3.5" />} label="Scenario history" badge="3" />
                    <ClientMenuItem icon={<IconClock className="w-3.5 h-3.5" />} label="Meeting notes" />
                    <ClientMenuItem icon={<IconBell className="w-3.5 h-3.5" />} label="Observation alerts" badge={observations.length > 0 ? String(observations.length) : undefined} accent />
                  </div>

                  {/* Footer actions */}
                  <div className="px-1.5 pb-1.5 pt-0.5 border-t border-slate-100 dark:border-zinc-800/70">
                    <div className="flex gap-1 mt-1.5">
                      <button
                        onClick={() => setClientPickerMode(true)}
                        className="flex-1 text-[10px] font-medium text-brand-500 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/20 py-2 rounded-lg transition-colors text-center"
                      >
                        Switch client
                      </button>
                      <button
                        onClick={handleExport}
                        disabled={isExporting || !dashboardData}
                        className="flex-1 text-[10px] font-medium text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800 py-2 rounded-lg transition-colors text-center disabled:opacity-40"
                      >
                        {isExporting ? "Exporting..." : "Export summary"}
                      </button>
                    </div>
                  </div>
                    </motion.div>
                  )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Panel toggle */}
          <button
            onClick={() => setPanelOpen(!panelOpen)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              panelOpen
                ? "bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400"
                : "text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
            }`}
            title={panelOpen ? "Close panel" : "Open panel"}
          >
            <IconPanelRight className="w-4 h-4" />
          </button>

          {/* Settings dropdown */}
          <div className="relative" ref={settingsMenuRef}>
            <button
              onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                settingsMenuOpen
                  ? "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200"
                  : "text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800 hover:text-slate-600 dark:hover:text-zinc-300"
              }`}
              title="Settings"
            >
              <motion.div animate={{ rotate: settingsMenuOpen ? 45 : 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}>
                <IconSettings className="w-4 h-4" />
              </motion.div>
            </button>

            <AnimatePresence>
              {settingsMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute top-full right-0 mt-1.5 w-52 rounded-xl border border-slate-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-xl shadow-slate-200/40 dark:shadow-black/40 z-50 overflow-hidden"
                >
                  <div className="py-1.5 px-1.5">
                    {/* Theme toggle row */}
                    <button
                      onClick={toggleTheme}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors group/item"
                    >
                      <span className="text-slate-400 dark:text-zinc-500 group-hover/item:text-brand-500 dark:group-hover/item:text-brand-400 transition-colors">
                        {theme === "light" ? (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                          </svg>
                        )}
                      </span>
                      <span className="flex-1 text-[11px] font-normal text-slate-700 dark:text-zinc-300">
                        {theme === "light" ? "Dark mode" : "Light mode"}
                      </span>
                      <span className="text-[9px] font-mono text-slate-300 dark:text-zinc-600 tracking-tight">
                        {theme === "light" ? "Light" : "Dark"}
                      </span>
                    </button>

                    {/* Divider */}
                    <div className="my-1 mx-2 border-t border-slate-100 dark:border-zinc-800/70" />

                    {/* Client profiles */}
                    <Link
                      href="/clients"
                      onClick={() => setSettingsMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors group/item"
                    >
                      <span className="text-slate-400 dark:text-zinc-500 group-hover/item:text-brand-500 dark:group-hover/item:text-brand-400 transition-colors">
                        <IconFileText className="w-3.5 h-3.5" />
                      </span>
                      <span className="flex-1 text-[11px] font-normal text-slate-700 dark:text-zinc-300">Client profiles</span>
                    </Link>

                    {/* Account / Settings */}
                    <Link
                      href="/settings"
                      onClick={() => setSettingsMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors group/item"
                    >
                      <span className="text-slate-400 dark:text-zinc-500 group-hover/item:text-brand-500 dark:group-hover/item:text-brand-400 transition-colors">
                        <IconUser className="w-3.5 h-3.5" />
                      </span>
                      <span className="flex-1 text-[11px] font-normal text-slate-700 dark:text-zinc-300">Account</span>
                    </Link>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* ═══ Main Split ═══ */}
      <div className="flex-1 flex min-h-0 relative">

        {/* ═══ Chat History Panel ═══ */}
        {/* Mobile backdrop */}
        <AnimatePresence>
          {historyOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 z-30 md:hidden"
              onClick={() => setHistoryOpen(false)}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {historyOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="mobile-fullscreen-panel md:relative md:z-auto flex-shrink-0 overflow-hidden border-r border-slate-200/70 dark:border-zinc-800/70 bg-white dark:bg-zinc-950 md:bg-white/60 md:dark:bg-zinc-950/60 backdrop-blur-sm"
            >
              <div className="w-full md:w-[300px] h-full flex flex-col">
                {/* History header */}
                <div className="flex-shrink-0 px-4 pt-4 pb-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[13px] font-medium text-slate-900 dark:text-white">History</span>
                    {/* Mobile close button */}
                    <button
                      onClick={() => setHistoryOpen(false)}
                      className="md:hidden w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                    </button>
                    <button
                      onClick={handleNewChat}
                      className="flex items-center gap-1.5 text-[11px] font-medium text-brand-500 dark:text-brand-400 hover:text-brand-600 dark:hover:text-brand-300 px-2 py-1 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950/30 transition-all"
                    >
                      <IconPlus className="w-3 h-3" />
                      New chat
                    </button>
                  </div>

                  {/* Search */}
                  <div className="relative">
                    <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300 dark:text-zinc-600 pointer-events-none" />
                    <input
                      type="text"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Search conversations..."
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-slate-200/70 dark:border-zinc-800/70 bg-slate-50/50 dark:bg-zinc-900/50 text-[11px] font-light text-slate-900 dark:text-white placeholder:text-slate-400/50 dark:placeholder:text-zinc-600/50 focus:outline-none focus:border-brand-400/50 dark:focus:border-brand-600/50 transition-colors"
                    />
                  </div>
                </div>

                {/* Thread list */}
                <div className="flex-1 overflow-y-auto px-2 pb-3">
                  {filteredHistory.map((group, gi) => (
                    <div key={group.group} className="mb-1">
                      <p className="text-[9px] uppercase tracking-[0.1em] font-medium text-slate-400/60 dark:text-zinc-600/60 px-2 pt-3 pb-1.5">
                        {group.group}
                      </p>
                      <div className="space-y-0.5">
                        {group.threads.map((thread, ti) => (
                          <HistoryItem
                            key={thread.id}
                            thread={thread}
                            delay={gi * 0.05 + ti * 0.03}
                            onSelect={() => handleSelectConversation(thread.id)}
                            onDelete={() => handleDeleteConversation(thread.id)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  {filteredHistory.length === 0 && (
                    <div className="text-center py-8">
                      <p className="text-[11px] font-light text-slate-400 dark:text-zinc-600">No conversations yet</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ═══ Conversation Area ═══ */}
        <div className="flex-1 flex flex-col min-w-0 relative">

          {/* ── Context ribbon ── */}
          <div className="flex-shrink-0 px-3 md:px-5 py-2.5 border-b border-slate-100 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-sm">
            <div className="flex items-center gap-3 md:gap-6 overflow-x-auto scrollbar-hide">
              <ContextChip label="Gross" value={clientTotalIncome != null ? `\u00A3${clientTotalIncome.toLocaleString()}` : "\u2014"} />
              <ContextChip label="Tax" value={clientTotalTax != null ? `\u00A3${clientTotalTax.toLocaleString()}` : "\u2014"} accent="red" />
              <ContextChip label="Effective" value={clientEffectiveRate != null ? `${clientEffectiveRate}%` : "\u2014"} />
              <ContextChip label="Marginal" value={clientMarginalRate != null ? `${clientMarginalRate}%` : "\u2014"} accent="amber" />

              <div className="ml-auto flex items-center gap-4">
                {/* Tax Plan checkbox */}
                <button
                  onClick={() => {
                    const next = !taxPlanMode;
                    setTaxPlanMode(next);
                    if (next) setPanelOpen(true);
                  }}
                  className="flex items-center gap-2 group/tax"
                >
                  <div className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center transition-all duration-200 ${
                    taxPlanMode
                      ? "bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-500/20"
                      : "border-slate-300 dark:border-zinc-600 group-hover/tax:border-emerald-400 dark:group-hover/tax:border-emerald-600"
                  }`}>
                    <AnimatePresence>
                      {taxPlanMode && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        >
                          <IconCheck className="w-2.5 h-2.5 text-white" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <span className={`text-[11px] font-medium transition-colors duration-200 ${
                    taxPlanMode ? "text-emerald-700 dark:text-emerald-400" : "text-slate-500 dark:text-zinc-400 group-hover/tax:text-slate-700 dark:group-hover/tax:text-zinc-300"
                  }`}>
                    Tax Plan
                  </span>
                </button>

                <div className="flex items-center gap-1.5 text-[10px] font-light text-slate-400 dark:text-zinc-600">
                  <IconClock className="w-3 h-3" />
                  Updated just now
                </div>
              </div>
            </div>
          </div>

          {/* ── Messages ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-3 py-4 md:px-5 md:py-6 space-y-1">
              {messages.map((msg, i) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                >
                  <ChatMessage message={msg} />
                </motion.div>
              ))}
              {status !== "idle" && status !== "complete" && (
                <ThinkingIndicator
                  status={status}
                  statusMessage={statusMessage}
                />
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* ── Input area ── */}
          <div className="flex-shrink-0 bg-gradient-to-t from-[#fafbfc] via-[#fafbfc] to-transparent dark:from-[#0a0a0c] dark:via-[#0a0a0c] dark:to-transparent">
            <div className="max-w-3xl mx-auto px-3 pb-4 pt-2 md:px-5 md:pb-5">
              {/* Quick prompts — only visible when input is empty and not listening */}
              <AnimatePresence>
                {!input.trim() && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-3"
                  >
                    {QUICK_PROMPTS.map((prompt, i) => (
                      <motion.button
                        key={prompt}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.3 }}
                        onClick={() => {
                          setInput(prompt);
                          textareaRef.current?.focus();
                        }}
                        className="flex-shrink-0 text-[11px] font-light px-3.5 py-2 rounded-xl border border-slate-200/70 dark:border-zinc-800/70 text-slate-500 dark:text-zinc-400 hover:border-brand-400 dark:hover:border-brand-600 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-brand-50/40 dark:hover:bg-brand-950/20 transition-all hover:shadow-sm hover:shadow-brand-500/5"
                      >
                        {prompt}
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Context pills from web extension */}
              <ContextPills snippets={contextSnippets} onDismiss={dismissSnippet} />

              {/* Main input container */}
              <div className={`relative rounded-2xl transition-all duration-300 ${
                inputFocused
                  ? "shadow-lg shadow-brand-500/8 dark:shadow-brand-500/5"
                  : "shadow-sm shadow-slate-200/50 dark:shadow-none"
              }`}>
                {/* Gradient border */}
                <div className={`absolute -inset-[1px] rounded-2xl transition-opacity duration-300 ${
                  inputFocused ? "opacity-100" : "opacity-0"
                }`} style={{
                  background: "linear-gradient(135deg, rgba(92,124,250,0.3), rgba(139,92,246,0.2), rgba(92,124,250,0.1))",
                }} />

                {/* Input body */}
                <div className="relative rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800/60 overflow-hidden">

                  {/* Textarea + controls row */}
                  <div className="flex items-end">
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={handleTextareaChange}
                      onFocus={() => setInputFocused(true)}
                      onBlur={() => setInputFocused(false)}
                      placeholder={clientDetail ? `Ask about ${clientDetail.first_name}'s tax position...` : "Ask a question..."}
                      rows={1}
                      className="flex-1 resize-none bg-transparent pl-5 pr-2 py-4 text-[13px] font-light text-slate-900 dark:text-zinc-100 placeholder:text-slate-400/60 dark:placeholder:text-zinc-600/60 focus:outline-none"
                      style={{ minHeight: "52px", maxHeight: "160px" }}
                      onKeyDown={handleKeyDown}
                    />

                    {/* Action buttons */}
                    <div className="flex items-center gap-1 pr-3 pb-3">
                      {/* Mic trigger portal target — VoiceMode renders its button here */}
                      <div ref={micContainerRef} className="flex items-center" />

                      <motion.button
                        whileTap={{ scale: 0.92 }}
                        animate={input.trim() ? { scale: 1 } : { scale: 0.95 }}
                        onClick={handleSendClick}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
                          input.trim()
                            ? "bg-brand-500 text-white shadow-md shadow-brand-500/25 hover:bg-brand-600 hover:shadow-lg hover:shadow-brand-500/30"
                            : "bg-slate-100 dark:bg-zinc-800 text-slate-300 dark:text-zinc-600"
                        }`}
                      >
                        <IconArrowRight className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>


                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-2.5 px-1">
                <p className="text-[10px] font-light text-slate-400/50 dark:text-zinc-600/50">
                  Ovalens may make mistakes. Verify independently.
                </p>
                <div className="hidden md:flex items-center gap-2">
                  <kbd className="text-[9px] font-mono text-slate-400/40 dark:text-zinc-600/40 px-1.5 py-0.5 rounded border border-slate-200/30 dark:border-zinc-800/30">
                    V voice
                  </kbd>
                  <kbd className="text-[9px] font-mono text-slate-400/40 dark:text-zinc-600/40 px-1.5 py-0.5 rounded border border-slate-200/30 dark:border-zinc-800/30">
                    &#9166; send
                  </kbd>
                </div>
              </div>
            </div>
          </div>

          {/* Voice whisper bar — fixed position, one instance for all modes */}
          <VoiceMode
            onSend={(text) => sendMessage(text)}
            status={status}
            statusMessage={statusMessage}
            isStreaming={isStreaming}
            triggerContainer={isMobile && panelOpen ? null : micContainer}
          />
        </div>

        {/* ═══ Intelligence Panel (slide-over / fullscreen) ═══ */}
        {/* Mobile backdrop */}
        <AnimatePresence>
          {panelOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 z-30 md:hidden"
              onClick={() => setPanelOpen(false)}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {panelOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: panelMode === "fullscreen" ? "100%" : panelWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={`mobile-fullscreen-panel md:relative md:z-auto flex-shrink-0 overflow-hidden border-l border-slate-200/70 dark:border-zinc-800/70 bg-white dark:bg-zinc-950 ${
                panelMode === "fullscreen" ? "md:absolute md:inset-0 md:z-20 border-l-0" : ""
              }`}
              style={panelMode === "sidebar" ? { willChange: "width" } : undefined}
            >
              {/* Resize drag handle (sidebar mode only, hidden on mobile) */}
              {panelMode === "sidebar" && (
                <div
                  onMouseDown={handlePanelResizeStart}
                  className="absolute left-0 top-0 bottom-0 w-[5px] z-30 cursor-col-resize group hidden md:block"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-transparent group-hover:bg-brand-400/50 group-active:bg-brand-500 transition-colors duration-150" />
                </div>
              )}
              <div style={{ width: panelMode === "fullscreen" ? "100%" : panelWidth }} className="h-full flex flex-col relative">
                {/* Panel header */}
                <div className={`flex-shrink-0 pt-5 pb-4 relative z-10 ${panelMode === "fullscreen" ? "px-3 md:px-10 max-w-5xl mx-auto w-full" : "px-3 md:px-5"}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-md bg-gradient-to-br from-brand-400 to-violet-500 flex items-center justify-center transition-shadow duration-500 ${isDashboardGenerating ? "shadow-md shadow-brand-500/30 dark:shadow-brand-400/20" : ""}`}>
                        <span className={`inline-flex transition-transform duration-700 ${isDashboardGenerating ? "animate-spin [animation-duration:3s]" : ""}`}>
                          <IconSparkles className="w-3 h-3 text-white" />
                        </span>
                      </div>
                      <span className="text-[13px] font-medium text-slate-900 dark:text-white">Intelligence</span>
                      <AnimatePresence>
                        {isDashboardGenerating && (
                          <motion.span
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -4 }}
                            transition={{ duration: 0.2 }}
                            className="text-[10px] font-medium text-brand-500 dark:text-brand-400 flex items-center gap-1.5"
                          >
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-500" />
                            </span>
                            Generating
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleExport}
                        disabled={isExporting || !dashboardData}
                        className="hidden md:flex text-[11px] font-light text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 items-center gap-1 transition-colors disabled:opacity-40"
                      >
                        {isExporting ? "Exporting..." : "Export"} <IconArrowRight className="w-2.5 h-2.5" />
                      </button>
                      <button
                        onClick={() => setPanelMode(panelMode === "fullscreen" ? "sidebar" : "fullscreen")}
                        className="hidden md:flex w-7 h-7 rounded-lg items-center justify-center text-slate-400 dark:text-zinc-500 hover:text-brand-500 dark:hover:text-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-950/30 transition-all"
                        title={panelMode === "fullscreen" ? "Exit fullscreen" : "Fullscreen"}
                      >
                        {panelMode === "fullscreen" ? (
                          <IconMinimize className="w-3.5 h-3.5" />
                        ) : (
                          <IconMaximize className="w-3.5 h-3.5" />
                        )}
                      </button>
                      {/* Mobile close button */}
                      <button
                        onClick={() => setPanelOpen(false)}
                        className="md:hidden w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 dark:text-zinc-500 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </div>
                  </div>

                  {/* Stat cards */}
                  <div className={`grid gap-2 ${panelMode === "fullscreen" ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-6" : "grid-cols-2 md:grid-cols-3"}`}>
                    <MiniStat icon={<IconCalculator className="w-3.5 h-3.5" />} label="Gross income" value={totalIncome != null ? `\u00A3${totalIncome.toLocaleString()}` : "\u2014"} />
                    <MiniStat icon={<IconPieChart className="w-3.5 h-3.5" />} label="Tax liability" value={totalTax != null ? `\u00A3${totalTax.toLocaleString()}` : "\u2014"} accent />
                    <MiniStat icon={<IconWallet className="w-3.5 h-3.5" />} label="Net income" value={netIncome != null ? `\u00A3${netIncome.toLocaleString()}` : "\u2014"} />
                    <MiniStat icon={<IconTrendingUp className="w-3.5 h-3.5" />} label="Taxable income" value={taxableIncome != null ? `\u00A3${taxableIncome.toLocaleString()}` : "\u2014"} />
                    <MiniStat icon={<IconChart className="w-3.5 h-3.5" />} label="Effective rate" value={effectiveRate != null ? `${effectiveRate}%` : "\u2014"} />
                    <MiniStat icon={<IconLightbulb className="w-3.5 h-3.5" />} label="Marginal rate" value={marginalRate != null ? `${marginalRate}%` : "\u2014"} warn={marginalRate != null && marginalRate >= 60} />
                  </div>
                </div>

                {!taxPlanMode && !dashboardData ? (
                  /* ── Empty state — "Dormant Observatory" ── */
                  <div className="flex-1 flex flex-col relative overflow-hidden">
                    {/* Dot-matrix background texture */}
                    <div
                      className="absolute inset-0 pointer-events-none opacity-[0.035] dark:opacity-[0.06]"
                      style={{
                        backgroundImage: 'radial-gradient(circle, currentColor 0.5px, transparent 0.5px)',
                        backgroundSize: '18px 18px',
                      }}
                    />

                    {/* Content */}
                    <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">

                      {/* Central composition — ghost dashboard preview with floating satellites */}
                      <div className="relative mb-10">
                        {/* Main preview card */}
                        <motion.div
                          initial={{ opacity: 0, scale: 0.94, y: 20 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                          className="w-[260px] rounded-2xl border border-slate-200/60 dark:border-zinc-800/40 bg-white/70 dark:bg-zinc-900/50 backdrop-blur-md shadow-xl shadow-slate-200/30 dark:shadow-black/30 p-5"
                        >
                          {/* Card header skeleton */}
                          <div className="flex items-center gap-2 mb-4">
                            <div className="w-5 h-5 rounded-md bg-brand-100/80 dark:bg-brand-900/30 flex items-center justify-center">
                              <IconPieChart className="w-2.5 h-2.5 text-brand-400/70 dark:text-brand-500/60" />
                            </div>
                            <div className="h-2 w-20 rounded-full bg-slate-100 dark:bg-zinc-800/80" />
                            <div className="ml-auto h-2 w-8 rounded-full bg-slate-100 dark:bg-zinc-800/80" />
                          </div>

                          {/* Ghost bar chart */}
                          <div className="flex items-end gap-[5px] h-[72px]">
                            {[38, 62, 26, 80, 48, 70, 30, 58, 44, 74, 52, 66].map((h, i) => (
                              <motion.div
                                key={i}
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: `${h}%`, opacity: 1 }}
                                transition={{
                                  delay: 0.35 + i * 0.04,
                                  duration: 0.8,
                                  ease: [0.16, 1, 0.3, 1],
                                }}
                                className="flex-1 rounded-[3px] bg-gradient-to-t from-brand-300/30 to-brand-200/10 dark:from-brand-700/25 dark:to-brand-800/10"
                              />
                            ))}
                          </div>

                          {/* Ghost axis labels */}
                          <div className="mt-3 flex items-center gap-[6px]">
                            <div className="h-[1px] flex-1 bg-slate-150 dark:bg-zinc-800/60" />
                            <div className="h-1.5 w-7 rounded-full bg-slate-100 dark:bg-zinc-800/60" />
                            <div className="h-1.5 w-11 rounded-full bg-slate-100 dark:bg-zinc-800/60" />
                            <div className="h-1.5 w-5 rounded-full bg-slate-100 dark:bg-zinc-800/60" />
                          </div>
                        </motion.div>

                        {/* Floating satellite — trend indicator (top right) */}
                        <motion.div
                          initial={{ opacity: 0, x: -10, y: 10 }}
                          animate={{ opacity: 1, x: 0, y: 0 }}
                          transition={{ delay: 0.55, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute -top-3 -right-5 rounded-xl border border-slate-200/50 dark:border-zinc-800/40 bg-white/90 dark:bg-zinc-900/70 backdrop-blur-sm shadow-lg shadow-slate-200/20 dark:shadow-black/20 px-3 py-2.5 flex items-center gap-2.5"
                        >
                          <div className="w-5 h-5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                            <IconTrendingUp className="w-2.5 h-2.5 text-emerald-400/80" />
                          </div>
                          <div>
                            <div className="h-1.5 w-9 rounded-full bg-slate-100 dark:bg-zinc-800/80 mb-1.5" />
                            <div className="h-2.5 w-14 rounded-full bg-emerald-100/50 dark:bg-emerald-900/20" />
                          </div>
                        </motion.div>

                        {/* Floating satellite — allowance badge (bottom left) */}
                        <motion.div
                          initial={{ opacity: 0, x: 10, y: -10 }}
                          animate={{ opacity: 1, x: 0, y: 0 }}
                          transition={{ delay: 0.65, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                          className="absolute -bottom-2 -left-4 rounded-xl border border-slate-200/50 dark:border-zinc-800/40 bg-white/90 dark:bg-zinc-900/70 backdrop-blur-sm shadow-lg shadow-slate-200/20 dark:shadow-black/20 px-3 py-2.5 flex items-center gap-2.5"
                        >
                          <div className="w-5 h-5 rounded-md bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center">
                            <IconShield className="w-2.5 h-2.5 text-brand-400/80" />
                          </div>
                          <div>
                            <div className="h-1.5 w-11 rounded-full bg-slate-100 dark:bg-zinc-800/80 mb-1.5" />
                            <div className="h-2.5 w-16 rounded-full bg-brand-100/50 dark:bg-brand-900/20" />
                          </div>
                        </motion.div>
                      </div>

                      {/* Copy */}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55, duration: 0.5 }}
                        className="text-center mb-8"
                      >
                        <p className="text-[15px] font-medium text-slate-800 dark:text-zinc-200 tracking-[-0.01em]">
                          Intelligence standing by
                        </p>
                        <p className="text-[11px] font-light text-slate-400 dark:text-zinc-500 mt-2 max-w-[250px] mx-auto leading-relaxed">
                          Activate Tax Plan to unlock real-time breakdown, allowance tracking, and planning insights
                        </p>
                      </motion.div>

                      {/* CTA — gradient-bordered pill */}
                      <motion.button
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7, duration: 0.4 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => { setTaxPlanMode(true); setPanelOpen(true); }}
                        className="group relative"
                      >
                        {/* Outer glow border */}
                        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-brand-400 via-violet-400 to-brand-400 opacity-40 group-hover:opacity-100 transition-opacity duration-500 blur-[0.5px]" />
                        <div className="relative flex items-center gap-3 px-7 py-3.5 rounded-2xl bg-white dark:bg-zinc-900 transition-all duration-300">
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-500 to-violet-500 flex items-center justify-center shadow-sm shadow-brand-500/20 group-hover:shadow-md group-hover:shadow-brand-500/30 transition-shadow duration-300">
                            <IconSparkles className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-[12px] font-medium text-slate-600 dark:text-zinc-300 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors duration-300">
                            Activate Tax Plan
                          </span>
                          <IconArrowRight className="w-3 h-3 text-slate-300 dark:text-zinc-600 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all duration-300" />
                        </div>
                      </motion.button>

                      {/* Feature indicators */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.85, duration: 0.5 }}
                        className="flex items-center gap-4 mt-6"
                      >
                        {["Tax breakdown", "Allowances", "Opportunities"].map((feat) => (
                          <div key={feat} className="flex items-center gap-1.5">
                            <div className="w-1 h-1 rounded-full bg-brand-400/40 dark:bg-brand-500/30" />
                            <span className="text-[9px] font-light text-slate-400/60 dark:text-zinc-600/50 tracking-wide">{feat}</span>
                          </div>
                        ))}
                      </motion.div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Tabs — underline style */}
                    <div className={`flex-shrink-0 pb-4 relative z-10 ${panelMode === "fullscreen" ? "px-3 md:px-10 max-w-5xl mx-auto w-full" : "px-3 md:px-5"}`}>
                      <div className="flex gap-1 border-b border-slate-100 dark:border-zinc-800/50 overflow-x-auto scrollbar-hide">
                        {(["overview", "allowances", "scenarios", "observations", "notes"] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`relative flex-shrink-0 px-3 pb-2.5 text-[11px] font-medium transition-colors ${
                              activeTab === tab
                                ? "text-slate-900 dark:text-white"
                                : "text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300"
                            }`}
                          >
                            <span className="relative z-10 capitalize">{tab}</span>
                            {activeTab === tab && (
                              <motion.div
                                layoutId="panel-tab-line"
                                className="absolute bottom-0 left-1 right-1 h-[2px] rounded-full bg-gradient-to-r from-brand-400 to-violet-400"
                                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Tab content — relative container for overlay */}
                    <div className={`flex-1 overflow-y-auto pb-5 relative ${panelMode === "fullscreen" ? "px-3 md:px-10" : "px-3 md:px-5"}`}>
                      {/* Dot-matrix background texture */}
                      <div
                        className="absolute inset-0 pointer-events-none opacity-[0.025] dark:opacity-[0.04]"
                        style={{
                          backgroundImage: 'radial-gradient(circle, currentColor 0.5px, transparent 0.5px)',
                          backgroundSize: '18px 18px',
                        }}
                      />
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={activeTab}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.2 }}
                          className={panelMode === "fullscreen" ? "max-w-5xl mx-auto" : ""}
                        >
                          {activeTab === "overview" && (
                            <div className="space-y-5">
                              <TaxBreakdown items={taxBreakdownItems} totalTax={totalTax} isGenerating={isDashboardGenerating} />
                              {observations.length > 0 && <ObservationPreview observations={observations} onViewAll={() => setActiveTab("observations")} />}
                            </div>
                          )}
                          {activeTab === "allowances" && <AllowancesPanel allowances={allowancesData} isGenerating={isDashboardGenerating} />}
                          {activeTab === "scenarios" && <ScenariosPanel scenarios={scenariosList} activeScenarioId={activeScenarioId} onSelectScenario={setActiveScenarioId} onQuickModel={handleModelScenario} isGenerating={isDashboardGenerating} isScenarioGenerating={isScenarioGenerating} />}
                          {activeTab === "observations" && <ObservationsPanel observations={observations} isGenerating={isDashboardGenerating} onModelScenario={handleModelScenario} />}
                          {activeTab === "notes" && <MeetingNotesPanel meetingNotes={meetingNotes} />}
                        </motion.div>
                      </AnimatePresence>

                      {/* Dashboard generating overlay */}
                      <AnimatePresence>
                        {isDashboardGenerating && <DashboardGeneratingOverlay />}
                      </AnimatePresence>
                    </div>
                  </>
                )}
              </div>

              {/* Voice widget rendered once at chat area level (fixed positioning) */}
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════════════ */

/* ── Panel generating skeleton (replaces empty state text) ── */

function PanelGeneratingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-3 py-2"
    >
      {/* Pulsing status label */}
      <div className="flex items-center justify-center gap-2 pb-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-50" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
        </span>
        <span className="text-[11px] font-medium text-brand-500 dark:text-brand-400 listen-pulse">
          Analysing tax data...
        </span>
      </div>

      {/* Shimmer bar skeleton — glass container matching TaxBreakdown */}
      <div className="rounded-xl border border-slate-200/40 dark:border-zinc-800/30 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm p-3">
        <div className="h-3 rounded-lg overflow-hidden flex gap-0.5">
          {[40, 25, 20, 15].map((w, i) => (
            <div
              key={i}
              className="h-full rounded-md dash-shimmer-bar relative overflow-hidden"
              style={{
                width: `${w}%`,
                animationDelay: `${i * 0.2}s`,
                background: `linear-gradient(90deg, transparent 0%, rgba(92,124,250,${0.08 + i * 0.02}) 50%, transparent 100%)`,
                backgroundSize: '200% 100%',
              }}
            >
              <div className="absolute inset-x-0 top-0 h-1/2 bg-white/20 rounded-t-md" />
            </div>
          ))}
        </div>
      </div>

      {/* Skeleton rows — glass cards with gradient accent bars */}
      {[1, 2, 3, 4].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 + i * 0.08, duration: 0.4 }}
          className="relative rounded-xl border border-slate-200/40 dark:border-zinc-800/30 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm p-3.5 overflow-hidden"
        >
          {/* Shimmer accent bar */}
          <div
            className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full dash-shimmer-bar"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
          <div className="flex items-center justify-between pl-3">
            <div className="space-y-1.5">
              <div
                className="h-2.5 rounded-md dash-shimmer-bar"
                style={{ width: `${70 + ((i * 23) % 40)}px`, animationDelay: `${i * 0.2}s` }}
              />
              <div
                className="h-2 rounded-md dash-shimmer-bar"
                style={{ width: `${40 + ((i * 17) % 25)}px`, animationDelay: `${0.1 + i * 0.2}s` }}
              />
            </div>
            <div
              className="h-3 rounded-md dash-shimmer-bar"
              style={{ width: `${50 + ((i * 13) % 30)}px`, animationDelay: `${0.15 + i * 0.15}s` }}
            />
          </div>
        </motion.div>
      ))}

      {/* Skeleton total — gradient border card */}
      <div className="relative">
        <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-brand-400/15 via-violet-400/10 to-brand-400/15 dark:from-brand-500/10 dark:via-violet-500/8 dark:to-brand-500/10 dash-shimmer-bar" style={{ animationDelay: '0.4s' }} />
        <div className="relative flex justify-between items-center px-4 py-3.5 rounded-xl bg-white/80 dark:bg-zinc-900/60 backdrop-blur-sm">
          <div className="h-3 w-24 rounded-md dash-shimmer-bar" />
          <div className="h-4 w-20 rounded-md dash-shimmer-bar" style={{ animationDelay: '0.3s' }} />
        </div>
      </div>
    </motion.div>
  );
}

/* ── Dashboard generating overlay ── */

const SHIMMER_ROWS = Array.from({ length: 7 }, (_, i) => ({
  i,
  top: `${12 + i * 13}%`,
  width: `${45 + ((i * 17 + 11) % 40)}%`,
  dur: `${2.2 + (i % 3) * 0.4}s`,
  del: `${i * 0.3}s`,
}));

const DATA_DOTS = Array.from({ length: 12 }, (_, i) => ({
  i,
  left: `${10 + ((i * 23 + 7) % 75)}%`,
  top: `${8 + ((i * 19 + 13) % 78)}%`,
  dur: `${1.6 + (i % 4) * 0.35}s`,
  del: `${0.1 + (i * 0.25)}s`,
  size: i % 3 === 0 ? 'w-1 h-1' : 'w-0.5 h-0.5',
}));

function DashboardGeneratingOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 z-20 pointer-events-none overflow-hidden rounded-b-xl"
    >
      {/* Soft background glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-brand-500/[0.02] via-violet-500/[0.03] to-transparent dark:from-brand-400/[0.02] dark:via-violet-400/[0.02] dash-glow-bg" />

      {/* Scan line sweeping down */}
      <div className="dash-overlay-scan-line" />

      {/* Shimmer data rows — horizontal bars appearing/fading */}
      {SHIMMER_ROWS.map((row) => (
        <div
          key={row.i}
          className="absolute left-[10%] h-[3px] rounded-full dash-shimmer-bar dash-row-shimmer"
          style={{
            top: row.top,
            width: row.width,
            ['--row-dur' as string]: row.dur,
            ['--row-del' as string]: row.del,
          }}
        />
      ))}

      {/* Scattered data dots — appearing like data points being plotted */}
      {DATA_DOTS.map((dot) => (
        <div
          key={dot.i}
          className={`absolute rounded-full bg-brand-400/40 dark:bg-brand-400/30 dash-cell-dot ${dot.size}`}
          style={{
            left: dot.left,
            top: dot.top,
            ['--cell-dur' as string]: dot.dur,
            ['--cell-del' as string]: dot.del,
          }}
        />
      ))}

      {/* Edge gradient vignette — softens the overlay edges */}
      <div className="absolute inset-0 bg-gradient-to-t from-white/60 via-transparent to-white/40 dark:from-zinc-950/60 dark:via-transparent dark:to-zinc-950/40" />
    </motion.div>
  );
}

/* ── Context ribbon chip ── */

const ContextChip = memo(function ContextChip({ label, value, accent }: { label: string; value: string; accent?: "red" | "amber" }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-light text-slate-400 dark:text-zinc-500 uppercase tracking-wider">{label}</span>
      <span className={`text-[12px] font-mono font-medium tracking-tight ${
        accent === "red"
          ? "text-red-600 dark:text-red-400"
          : accent === "amber"
            ? "text-amber-600 dark:text-amber-400"
            : "text-slate-900 dark:text-white"
      }`}>{value}</span>
    </div>
  );
});

/* ── Chat message ── */

const ChatMessage = memo(function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end py-3">
        <div className="max-w-[90%] md:max-w-[75%]">
          <div className="bg-brand-500 text-white rounded-2xl rounded-br-md px-4 py-3 shadow-sm shadow-brand-500/10">
            <p className="text-[13px] font-light leading-relaxed whitespace-pre-line">
              {message.content}
            </p>
          </div>
          <p className="text-[10px] font-light text-slate-400 dark:text-zinc-600 text-right mt-1.5 pr-1">
            {message.timestamp}
          </p>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="py-3">
      <div className="flex items-start gap-3">
        {/* Avatar — Ovalens sun mark */}
        <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-brand-100 to-violet-100 dark:from-brand-900/40 dark:to-violet-900/40 flex items-center justify-center mt-0.5">
          <IconOvalensMark className="w-4 h-4 text-brand-600 dark:text-brand-400" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-medium text-slate-900 dark:text-white">Ovalens</span>
            <span className="text-[10px] font-light text-slate-400 dark:text-zinc-600">{message.timestamp}</span>
          </div>

          {/* Tax computation breakdown (collapsible) — above text so it doesn't get pushed down */}
          {message.computationData && (
            <TaxComputationBreakdown data={message.computationData} />
          )}

          {/* Message body — markdown rendered */}
          <MarkdownRenderer content={message.content} />

          {/* Insight chips */}
          {message.insights && (
            <div className="flex flex-wrap gap-2 mt-3">
              {message.insights.map((ins, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.08, duration: 0.3 }}
                  className={`inline-flex items-center gap-1.5 pl-2 pr-2.5 py-1 rounded-lg text-[11px] font-light border ${
                    ins.color === "emerald"
                      ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/50 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-400"
                      : ins.color === "amber"
                        ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200/50 dark:border-amber-800/30 text-amber-700 dark:text-amber-400"
                        : ins.color === "red"
                          ? "bg-red-50 dark:bg-red-950/20 border-red-200/50 dark:border-red-800/30 text-red-700 dark:text-red-400"
                          : "bg-brand-50 dark:bg-brand-950/20 border-brand-200/50 dark:border-brand-800/30 text-brand-700 dark:text-brand-400"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    ins.color === "emerald" ? "bg-emerald-500" :
                    ins.color === "amber" ? "bg-amber-500" :
                    ins.color === "red" ? "bg-red-500" : "bg-brand-500"
                  }`} />
                  <span>{ins.label}</span>
                  <span className="font-mono font-medium">{ins.value}</span>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

/* ── Mini stat (panel) ── */

const MiniStat = memo(function MiniStat({ icon, label, value, accent, warn }: { icon: React.ReactNode; label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <div className="group relative rounded-xl border border-slate-200/40 dark:border-zinc-800/30 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm p-2.5 overflow-hidden hover:border-brand-200/40 dark:hover:border-brand-700/30 transition-all duration-200">
      {/* Gradient left accent */}
      <div className={`absolute left-0 top-2 bottom-2 w-[2px] rounded-full ${
        accent
          ? "bg-gradient-to-b from-red-400 to-rose-500"
          : warn
            ? "bg-gradient-to-b from-amber-400 to-orange-400"
            : "bg-gradient-to-b from-brand-400/60 to-violet-400/60"
      }`} />
      <div className="pl-2">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-slate-400 dark:text-zinc-500">{icon}</span>
          <span className="text-[9px] font-light text-slate-400 dark:text-zinc-500">{label}</span>
        </div>
        <div className={`text-[15px] font-light font-mono tracking-tight tabular-nums ${
          accent ? "text-red-600 dark:text-red-400" : warn ? "text-amber-600 dark:text-amber-400" : "text-slate-900 dark:text-white"
        }`}>
          {value}
        </div>
      </div>
    </div>
  );
});

/* ─── Tax Breakdown ─── */

function TaxBreakdown({ items, totalTax, isGenerating }: { items: { label: string; amount: string; detail: string; pct: number; color: string }[]; totalTax?: number | null; isGenerating?: boolean }) {
  if (items.length === 0) {
    if (isGenerating) {
      return <PanelGeneratingSkeleton />;
    }
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-2xl bg-slate-100/80 dark:bg-zinc-800/50 flex items-center justify-center mx-auto mb-3">
          <IconPieChart className="w-5 h-5 text-slate-300 dark:text-zinc-600" />
        </div>
        <p className="text-[12px] font-medium text-slate-400 dark:text-zinc-500">No tax breakdown yet</p>
        <p className="text-[11px] font-light text-slate-400/60 dark:text-zinc-600/60 mt-1">Ask Ovalens to analyse this client&apos;s tax position</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Visual bar — glass container */}
      <div>
        <div className="relative rounded-xl bg-slate-100/50 dark:bg-zinc-800/30 p-[3px]">
          <div className="flex rounded-lg h-3.5 overflow-hidden gap-[2px]">
            {items.map((item, i) => (
              <motion.div
                key={i}
                initial={{ width: 0 }}
                animate={{ width: `${item.pct}%` }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 + i * 0.12 }}
                className={`${item.color} rounded-md relative overflow-hidden`}
                title={item.label}
              >
                <div className="absolute inset-x-0 top-0 h-1/2 bg-white/20 rounded-t-md" />
              </motion.div>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2.5">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-sm ${item.color}`} />
              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-light">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Breakdown rows — glass cards */}
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.06, duration: 0.4 }}
            className="group relative rounded-xl border border-slate-200/40 dark:border-zinc-800/30 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm p-3.5 hover:border-brand-200/40 dark:hover:border-brand-700/30 transition-all duration-200 overflow-hidden"
          >
            {/* Color accent bar */}
            <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full ${item.color}`} />
            <div className="flex items-center justify-between pl-3">
              <div>
                <span className="text-[12px] font-normal text-slate-700 dark:text-zinc-200 block">{item.label}</span>
                <span className="text-[10px] font-light text-slate-400 dark:text-zinc-500">{item.detail}</span>
              </div>
              <span className="text-[13px] font-mono font-medium text-slate-900 dark:text-white tabular-nums">{item.amount}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Total — gradient border card */}
      <div className="relative">
        <div className="absolute -inset-[1px] rounded-xl bg-gradient-to-r from-brand-400/25 via-violet-400/15 to-brand-400/25 dark:from-brand-500/15 dark:via-violet-500/10 dark:to-brand-500/15" />
        <div className="relative flex justify-between items-center px-4 py-3.5 rounded-xl bg-white/80 dark:bg-zinc-900/60 backdrop-blur-sm">
          <span className="text-[12px] font-medium text-slate-900 dark:text-white">Total tax liability</span>
          <span className="text-base font-mono font-semibold text-slate-900 dark:text-white tabular-nums">{totalTax != null ? `\u00A3${totalTax.toLocaleString()}` : "\u2014"}</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Observation Preview (shown in overview tab) ─── */

function ObservationPreview({ observations, onViewAll }: { observations: Observation[]; onViewAll: () => void }) {
  const topObs = observations.slice(0, 3);
  const totalSavings = observations.reduce((sum, o) => sum + (o.potentialSaving || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-widest font-medium text-slate-400 dark:text-zinc-500">Key Findings</span>
          <span className="text-[9px] font-mono font-medium text-slate-300 dark:text-zinc-600 bg-slate-100/60 dark:bg-zinc-800/40 px-1.5 py-0.5 rounded">{observations.length}</span>
        </div>
        <button
          onClick={onViewAll}
          className="text-[9px] font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 flex items-center gap-1 transition-colors"
        >
          View all <IconArrowRight className="w-2.5 h-2.5" />
        </button>
      </div>

      {/* Compact observation rows */}
      <div className="rounded-xl border border-slate-200/40 dark:border-zinc-800/30 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm overflow-hidden divide-y divide-slate-100/60 dark:divide-zinc-800/30">
        {topObs.map((obs, i) => {
          const config = severityConfig[obs.severity] || severityConfig.info;
          return (
            <div key={obs.id || i} className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors">
              <span className={`flex-shrink-0 w-1.5 h-1.5 rounded-full ${config.dot}`} />
              <p className="flex-1 text-[11px] font-normal text-slate-700 dark:text-zinc-300 truncate">{obs.title}</p>
              {obs.potentialSaving != null && obs.potentialSaving > 0 && (
                <span className="flex-shrink-0 text-[10px] font-mono font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {`\u00A3${obs.potentialSaving.toLocaleString()}`}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Total savings footer */}
      {totalSavings > 0 && (
        <div className="flex items-center justify-end gap-1.5 mt-2 pr-1">
          <span className="text-[9px] font-light text-slate-400 dark:text-zinc-500">Potential savings:</span>
          <span className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {`\u00A3${totalSavings.toLocaleString()}`}/yr
          </span>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Allowances ─── */

function AllowancesPanel({ allowances, isGenerating }: { allowances: { label: string; used: number; total: number }[]; isGenerating?: boolean }) {
  if (allowances.length === 0) {
    if (isGenerating) {
      return <PanelGeneratingSkeleton />;
    }
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-2xl bg-slate-100/80 dark:bg-zinc-800/50 flex items-center justify-center mx-auto mb-3">
          <IconShield className="w-5 h-5 text-slate-300 dark:text-zinc-600" />
        </div>
        <p className="text-[12px] font-medium text-slate-400 dark:text-zinc-500">No allowance data yet</p>
        <p className="text-[11px] font-light text-slate-400/60 dark:text-zinc-600/60 mt-1">Ask Ovalens to analyse this client&apos;s tax position</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {allowances.map((a, i) => {
        const pct = a.total > 0 ? Math.round((a.used / a.total) * 100) : 0;
        const remaining = a.total - a.used;
        const fmt = (n: number) => n >= 1000 ? `\u00A3${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : `\u00A3${n}`;
        const barGradient =
          pct >= 100 ? "from-red-400 to-rose-500" :
          pct >= 75 ? "from-amber-400 to-orange-400" :
          pct > 0 ? "from-brand-400 to-violet-400" :
          "from-slate-200 to-slate-200 dark:from-zinc-700 dark:to-zinc-700";
        const statusColor =
          pct >= 100 ? "text-red-500 dark:text-red-400" :
          pct >= 75 ? "text-amber-500 dark:text-amber-400" :
          "text-emerald-500 dark:text-emerald-400";

        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4 }}
            className="rounded-xl border border-slate-200/40 dark:border-zinc-800/30 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm p-4 hover:border-brand-200/40 dark:hover:border-brand-700/30 transition-all duration-200"
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[12px] font-normal text-slate-700 dark:text-zinc-200">{a.label}</span>
              <span className={`text-[10px] font-mono font-medium ${
                remaining === 0 ? "text-red-500 dark:text-red-400" : "text-slate-500 dark:text-zinc-400"
              }`}>
                {remaining === 0 ? "Fully used" : `${fmt(remaining)} left`}
              </span>
            </div>
            {/* Progress bar — glass treatment */}
            <div className="relative h-2 bg-slate-100/80 dark:bg-zinc-800/50 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.max(pct, pct === 0 ? 0 : 3)}%` }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 + i * 0.08 }}
                className={`h-full rounded-full bg-gradient-to-r ${barGradient} relative overflow-hidden`}
              >
                <div className="absolute inset-x-0 top-0 h-1/2 bg-white/25 rounded-t-full" />
              </motion.div>
            </div>
            {/* Percentage */}
            <div className="flex justify-end mt-1.5">
              <span className={`text-[9px] font-mono font-medium ${statusColor}`}>{pct}% used</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ─── Extra Icons ─── */

function IconCopy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconMaximize({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
    </svg>
  );
}

function IconMinimize({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
    </svg>
  );
}

/* ─── Category config ─── */

const categoryLabels: Record<string, string> = {
  income_tax: "Income Tax",
  child_benefit: "Child Benefit",
  pension: "Pension",
  savings: "Savings & Investments",
};

const categoryIcons: Record<string, (cls: string) => React.ReactNode> = {
  income_tax: (cls) => <IconCalculator className={cls} />,
  child_benefit: (cls) => <IconWallet className={cls} />,
  pension: (cls) => <IconShield className={cls} />,
  savings: (cls) => <IconChart className={cls} />,
};

/* ─── Scenario Comparison ─── */

function ScenarioComparison({ scenario }: { scenario: ScenarioData }) {
  const s = scenario;
  const isPension = s.type === "personal_pension";
  const [showDetail, setShowDetail] = useState(false);
  const fmt = (n: number) => `£${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const fmtSigned = (n: number) => n > 0 ? `+${fmt(n)}` : n < 0 ? `-${fmt(n)}` : "—";

  const rows: { label: string; current: number; proposed: number; invert?: boolean }[] = isPension
    ? [
        { label: "Pension Contribution", current: s.current.pension_contribution || 0, proposed: s.proposed.pension_contribution || 0 },
        { label: "Adjusted Net Income", current: s.current.adjusted_net_income || 0, proposed: s.proposed.adjusted_net_income || 0, invert: true },
        { label: "Income Tax", current: s.current.income_tax, proposed: s.proposed.income_tax, invert: true },
        { label: "HICBC", current: s.current.hicbc, proposed: s.proposed.hicbc, invert: true },
        { label: "Total Tax", current: s.current.total_tax, proposed: s.proposed.total_tax, invert: true },
        { label: "Personal Allowance", current: s.current.personal_allowance, proposed: s.proposed.personal_allowance },
      ]
    : [
        { label: "Gross Salary", current: s.current.gross_salary || 0, proposed: s.proposed.gross_salary || 0 },
        { label: "Pension Sacrifice", current: s.current.sacrifice || 0, proposed: s.proposed.sacrifice || 0 },
        { label: "Income Tax", current: s.current.income_tax, proposed: s.proposed.income_tax, invert: true },
        { label: "National Insurance", current: s.current.national_insurance, proposed: s.proposed.national_insurance, invert: true },
        { label: "HICBC", current: s.current.hicbc, proposed: s.proposed.hicbc, invert: true },
        { label: "Total Tax", current: s.current.total_tax, proposed: s.proposed.total_tax, invert: true },
        { label: "Personal Allowance", current: s.current.personal_allowance, proposed: s.proposed.personal_allowance },
      ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3"
    >
      {/* 0. Total Benefit Hero */}
      {s.total_benefit && (
        <TotalBenefitHero
          totalBenefit={s.total_benefit}
          isPension={isPension}
          paChange={s.pa_change}
        />
      )}

      {/* 1. Before/After chart */}
      <ScenarioComparisonChart
        current={s.current}
        proposed={s.proposed}
        savings={s.savings}
        isPension={isPension}
      />

      {/* 2. Net Benefit Card */}
      <NetBenefitCard
        netBenefit={s.net_benefit}
        isPension={isPension}
        totalEffectiveReliefRate={s.total_effective_relief_rate}
        savings={s.savings}
        paChange={s.pa_change}
        extraIntoPension={s.extra_into_pension}
      />

      {/* 3. Collapsible detail table */}
      <div className="rounded-xl border border-slate-200/40 dark:border-zinc-800/30 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm overflow-hidden">
        <button
          onClick={() => setShowDetail(!showDetail)}
          className="w-full flex items-center justify-between px-3 py-2 hover:bg-slate-50/50 dark:hover:bg-zinc-800/20 transition-colors"
        >
          <span className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-zinc-500">
            Full breakdown
          </span>
          <motion.span animate={{ rotate: showDetail ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <IconChevronDown className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
          </motion.span>
        </button>
        <AnimatePresence>
          {showDetail && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              {/* Header */}
              <div className="grid grid-cols-[1fr,auto,auto,auto] gap-0 border-b border-t border-slate-200/30 dark:border-zinc-800/20 bg-slate-50/50 dark:bg-zinc-800/20 px-3 py-2">
                <span className="text-[8px] uppercase tracking-widest font-semibold text-slate-400 dark:text-zinc-500"></span>
                <span className="text-[8px] uppercase tracking-widest font-semibold text-slate-400 dark:text-zinc-500 text-right w-[60px] md:w-[80px]">Current</span>
                <span className="text-[8px] uppercase tracking-widest font-semibold text-brand-500 dark:text-brand-400 text-right w-[60px] md:w-[80px]">Proposed</span>
                <span className="text-[8px] uppercase tracking-widest font-semibold text-slate-400 dark:text-zinc-500 text-right w-[50px] md:w-[70px]">Delta</span>
              </div>
              {/* Rows */}
              {rows.map((row, i) => {
                const delta = row.proposed - row.current;
                const isSaving = row.invert ? delta < 0 : delta > 0;
                const isCost = row.invert ? delta > 0 : delta < 0;
                const deltaColor = isSaving
                  ? "text-emerald-600 dark:text-emerald-400"
                  : isCost
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-slate-400 dark:text-zinc-500";

                return (
                  <div
                    key={row.label}
                    className={`grid grid-cols-[1fr,auto,auto,auto] gap-0 px-3 py-1.5 ${
                      i % 2 === 0 ? "" : "bg-slate-50/30 dark:bg-zinc-800/10"
                    } ${row.label === "Total Tax" ? "border-t border-slate-200/30 dark:border-zinc-800/20 font-semibold" : ""}`}
                  >
                    <span className="text-[10px] text-slate-600 dark:text-zinc-300">{row.label}</span>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 text-right w-[60px] md:w-[80px] tabular-nums">{fmt(row.current)}</span>
                    <span className="text-[10px] font-mono text-slate-800 dark:text-zinc-100 text-right w-[60px] md:w-[80px] tabular-nums">{fmt(row.proposed)}</span>
                    <span className={`text-[10px] font-mono text-right w-[50px] md:w-[70px] tabular-nums ${deltaColor}`}>
                      {delta === 0 ? "—" : fmtSigned(row.invert ? -delta : delta)}
                    </span>
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Optimal Thresholds (personal pension) — UNCHANGED */}
      {isPension && s.thresholds && s.thresholds.length > 0 && (
        <div className="rounded-xl border border-brand-200/40 dark:border-brand-800/20 bg-brand-50/30 dark:bg-brand-900/10 backdrop-blur-sm p-4">
          <p className="text-[8px] uppercase tracking-widest font-semibold text-brand-600 dark:text-brand-400 mb-3">Optimal Thresholds</p>
          <div className="space-y-2">
            {s.thresholds.map((t, i) => (
              <div key={i} className={`flex justify-between items-start gap-2 ${!t.feasible ? "opacity-50" : ""}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-700 dark:text-zinc-200 font-medium truncate">{t.name}</p>
                  <p className="text-[9px] text-slate-500 dark:text-zinc-400">
                    Contribute {fmt(t.contribution_needed)} → save {fmt(t.annual_saving)}/yr ({t.effective_relief.toFixed(0)}% relief)
                  </p>
                </div>
                {!t.feasible && (
                  <span className="text-[8px] font-medium text-amber-600 dark:text-amber-400 bg-amber-100/60 dark:bg-amber-800/30 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    Exceeds AA
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. AA Warning — UNCHANGED */}
      {isPension && s.pension_aa_warning && (
        <div className="rounded-xl border border-amber-200/40 dark:border-amber-800/20 bg-amber-50/30 dark:bg-amber-900/10 backdrop-blur-sm p-3">
          <p className="text-[10px] text-amber-700 dark:text-amber-300">{s.pension_aa_warning}</p>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Scenarios Panel ─── */

function ScenarioGeneratingSkeleton() {
  const rows = ["Contribution", "Income Tax", "HICBC", "Total Tax", "Personal Allowance", "Net Impact"];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-3"
    >
      {/* Status ribbon */}
      <div className="flex items-center gap-2.5 px-1">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-50" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
        </span>
        <span className="text-[11px] font-light text-brand-500 dark:text-brand-400">
          Computing scenario...
        </span>
      </div>

      {/* Skeleton table */}
      <div className="rounded-xl border border-slate-200/40 dark:border-zinc-800/30 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm overflow-hidden relative">
        {/* Scan line */}
        <div className="dash-overlay-scan-line" />

        {/* Header */}
        <div className="grid grid-cols-[1fr,auto,auto,auto] gap-0 border-b border-slate-200/30 dark:border-zinc-800/20 bg-slate-50/50 dark:bg-zinc-800/20 px-3 py-2">
          <span className="text-[8px] uppercase tracking-widest font-semibold text-slate-400 dark:text-zinc-500"></span>
          <span className="text-[8px] uppercase tracking-widest font-semibold text-slate-400 dark:text-zinc-500 text-right w-[60px] md:w-[80px]">Current</span>
          <span className="text-[8px] uppercase tracking-widest font-semibold text-slate-400/40 dark:text-zinc-600/40 text-right w-[60px] md:w-[80px]">Proposed</span>
          <span className="text-[8px] uppercase tracking-widest font-semibold text-slate-400/40 dark:text-zinc-600/40 text-right w-[50px] md:w-[70px]">Delta</span>
        </div>

        {/* Skeleton rows */}
        {rows.map((label, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.06, duration: 0.3 }}
            className={`grid grid-cols-[1fr,auto,auto,auto] gap-0 px-3 py-1.5 ${
              i % 2 === 0 ? "" : "bg-slate-50/30 dark:bg-zinc-800/10"
            } ${label === "Total Tax" ? "border-t border-slate-200/30 dark:border-zinc-800/20" : ""}`}
          >
            <span className="text-[10px] text-slate-600 dark:text-zinc-300">{label}</span>
            {/* Current — shows as "known" */}
            <span className="text-right w-[60px] md:w-[80px]">
              <span
                className="inline-block h-3 rounded dash-shimmer-bar"
                style={{ width: `${40 + ((i * 17) % 25)}px`, animationDelay: `${i * 0.1}s` }}
              />
            </span>
            {/* Proposed — "resolving" */}
            <span className="text-right w-[60px] md:w-[80px]">
              <span
                className="inline-block h-3 rounded dash-shimmer-bar"
                style={{ width: `${35 + ((i * 13) % 30)}px`, animationDelay: `${0.3 + i * 0.1}s` }}
              />
            </span>
            {/* Delta — blank */}
            <span className="text-right w-[50px] md:w-[70px]">
              <span
                className="inline-block h-3 rounded dash-shimmer-bar"
                style={{ width: `${20 + ((i * 11) % 20)}px`, animationDelay: `${0.6 + i * 0.1}s` }}
              />
            </span>
          </motion.div>
        ))}
      </div>

      {/* Net impact skeleton */}
      <div className="rounded-xl border border-emerald-200/20 dark:border-emerald-800/10 bg-emerald-50/10 dark:bg-emerald-900/5 backdrop-blur-sm p-4 relative overflow-hidden">
        <div className="dash-overlay-scan-line" />
        <div className="space-y-2">
          <span
            className="inline-block h-2 w-20 rounded dash-shimmer-bar"
            style={{ animationDelay: "0.2s" }}
          />
          {[0, 1, 2].map((j) => (
            <div key={j} className="flex justify-between items-center">
              <span
                className="inline-block h-3 rounded dash-shimmer-bar"
                style={{ width: `${60 + j * 20}px`, animationDelay: `${0.4 + j * 0.15}s` }}
              />
              <span
                className="inline-block h-3 rounded dash-shimmer-bar"
                style={{ width: `${50 + j * 10}px`, animationDelay: `${0.5 + j * 0.15}s` }}
              />
            </div>
          ))}
          <div className="pt-2 mt-1 border-t border-emerald-200/20 dark:border-emerald-700/10 flex justify-between">
            <span className="inline-block h-3.5 w-24 rounded dash-shimmer-bar" style={{ animationDelay: "0.9s" }} />
            <span className="inline-block h-3.5 w-20 rounded dash-shimmer-bar" style={{ animationDelay: "1s" }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ScenariosPanel({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onQuickModel,
  isGenerating,
  isScenarioGenerating,
}: {
  scenarios: ScenarioData[];
  activeScenarioId: string | null;
  onSelectScenario: (id: string) => void;
  onQuickModel: (prompt: string) => void;
  isGenerating?: boolean;
  isScenarioGenerating?: boolean;
}) {
  const [sliderValue, setSliderValue] = useState(6000);
  const [showSlider, setShowSlider] = useState(false);
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0] || null;

  if (scenarios.length === 0 && isScenarioGenerating) {
    return <ScenarioGeneratingSkeleton />;
  }

  if (scenarios.length === 0) {
    if (isGenerating) return <PanelGeneratingSkeleton />;
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-100 to-violet-100 dark:from-brand-900/30 dark:to-violet-900/30 flex items-center justify-center mx-auto mb-3">
            <IconTrendingUp className="w-5 h-5 text-brand-500 dark:text-brand-400" />
          </div>
          <p className="text-[12px] font-medium text-slate-600 dark:text-zinc-300">No scenarios modelled yet</p>
          <p className="text-[11px] font-light text-slate-400 dark:text-zinc-500 mt-1 max-w-[280px] mx-auto leading-relaxed">
            Ask Ovalens to model a scenario, or use the quick model slider below.
          </p>
          <div className="mt-4 space-y-2">
            {["What if I increase pension sacrifice to £20k?", "Model salary sacrifice at £18,860", "What's the optimal sacrifice to restore my PA?"].map((prompt, i) => (
              <button
                key={i}
                onClick={() => onQuickModel(prompt)}
                className="w-full text-left text-[10px] font-normal text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-900/20 hover:bg-brand-100/50 dark:hover:bg-brand-900/30 rounded-lg px-3 py-2 transition-colors"
              >
                &ldquo;{prompt}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Quick Model slider */}
        <div className="rounded-xl border border-slate-200/40 dark:border-zinc-800/30 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm p-4">
          <button onClick={() => setShowSlider(!showSlider)} className="w-full flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-zinc-400">Quick Model</span>
            <motion.span animate={{ rotate: showSlider ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <IconChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
            </motion.span>
          </button>
          <AnimatePresence>
            {showSlider && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="text-[10px] font-light text-slate-500 dark:text-zinc-400">Pension Sacrifice Amount</label>
                    <input
                      type="range"
                      min={0}
                      max={60000}
                      step={500}
                      value={sliderValue}
                      onChange={(e) => setSliderValue(Number(e.target.value))}
                      className="w-full mt-1 accent-brand-500"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-slate-400 dark:text-zinc-500 tabular-nums mt-0.5">
                      <span>£0</span>
                      <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">£{sliderValue.toLocaleString()}</span>
                      <span>£60,000</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onQuickModel(`Model salary sacrifice at £${sliderValue.toLocaleString()}`)}
                    className="w-full text-[10px] font-medium text-white bg-gradient-to-r from-brand-500 to-violet-500 hover:from-brand-600 hover:to-violet-600 rounded-lg py-2.5 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Calculate Impact
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // With scenarios
  return (
    <div className="space-y-4">
      {/* Scenario selector */}
      {scenarios.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelectScenario(s.id)}
              className={`flex-shrink-0 rounded-lg px-3 py-2 text-[10px] font-medium transition-all ${
                activeScenarioId === s.id || (!activeScenarioId && s.id === scenarios[0]?.id)
                  ? "bg-brand-500/10 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-300/40 dark:border-brand-600/30"
                  : "bg-slate-100/60 dark:bg-zinc-800/40 text-slate-500 dark:text-zinc-400 border border-slate-200/30 dark:border-zinc-700/20 hover:bg-slate-200/60"
              }`}
            >
              <span className="block">{s.name}</span>
              {s.savings.total > 0 && (
                <span className="block text-[9px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">saves £{s.savings.total.toLocaleString()}/yr</span>
              )}
            </button>
          ))}
        </div>
      )}

      {activeScenario && <ScenarioComparison scenario={activeScenario} />}

      {/* Generating a new scenario */}
      {isScenarioGenerating && (
        <ScenarioGeneratingSkeleton />
      )}

      {/* Quick Model slider */}
      <div className="rounded-xl border border-slate-200/40 dark:border-zinc-800/30 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm p-4">
        <button onClick={() => setShowSlider(!showSlider)} className="w-full flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-zinc-400">Quick Model</span>
          <motion.span animate={{ rotate: showSlider ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <IconChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
          </motion.span>
        </button>
        <AnimatePresence>
          {showSlider && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-[10px] font-light text-slate-500 dark:text-zinc-400">Pension Sacrifice Amount</label>
                  <input type="range" min={0} max={60000} step={500} value={sliderValue} onChange={(e) => setSliderValue(Number(e.target.value))} className="w-full mt-1 accent-brand-500" />
                  <div className="flex justify-between text-[9px] font-mono text-slate-400 dark:text-zinc-500 tabular-nums mt-0.5">
                    <span>£0</span>
                    <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">£{sliderValue.toLocaleString()}</span>
                    <span>£60,000</span>
                  </div>
                </div>
                <button
                  onClick={() => onQuickModel(`Model salary sacrifice at £${sliderValue.toLocaleString()}`)}
                  className="w-full text-[10px] font-medium text-white bg-gradient-to-r from-brand-500 to-violet-500 hover:from-brand-600 hover:to-violet-600 rounded-lg py-2.5 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Calculate Impact
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ─── Observations ─── */

function ObservationsPanel({ observations, isGenerating, onModelScenario }: { observations: Observation[]; isGenerating?: boolean; onModelScenario?: (prompt: string) => void }) {
  if (observations.length === 0) {
    if (isGenerating) {
      return <PanelGeneratingSkeleton />;
    }
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-2xl bg-slate-100/80 dark:bg-zinc-800/50 flex items-center justify-center mx-auto mb-3">
          <IconAlertCircle className="w-5 h-5 text-slate-300 dark:text-zinc-600" />
        </div>
        <p className="text-[12px] font-medium text-slate-400 dark:text-zinc-500">No observations yet</p>
        <p className="text-[11px] font-light text-slate-400/60 dark:text-zinc-600/60 mt-1">Ask Ovalens to analyse this client&apos;s tax position</p>
      </div>
    );
  }

  const totalSavings = observations.reduce((sum, o) => sum + (o.potentialSaving || 0), 0);
  const totalMonthlySavings = Math.round(totalSavings / 12);
  const warnings = observations.filter((o) => o.severity === "critical" || o.severity === "warning");
  const opportunities = observations.filter((o) => o.severity === "opportunity" || o.severity === "info");

  return (
    <div className="space-y-4">
      {/* ── Summary header ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-xl border border-slate-200/40 dark:border-zinc-800/30 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm p-4 overflow-hidden"
      >
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-[20px] font-mono font-medium text-slate-900 dark:text-white tabular-nums">{observations.length}</p>
            <p className="text-[9px] font-light text-slate-400 dark:text-zinc-500 mt-0.5">Findings</p>
          </div>
          <div className="text-center border-x border-slate-200/30 dark:border-zinc-800/20">
            <p className="text-[20px] font-mono font-medium text-amber-600 dark:text-amber-400 tabular-nums">{warnings.length}</p>
            <p className="text-[9px] font-light text-slate-400 dark:text-zinc-500 mt-0.5">Warnings</p>
          </div>
          <div className="text-center">
            <p className="text-[20px] font-mono font-medium text-emerald-600 dark:text-emerald-400 tabular-nums">{opportunities.length}</p>
            <p className="text-[9px] font-light text-slate-400 dark:text-zinc-500 mt-0.5">Opportunities</p>
          </div>
        </div>
        {totalSavings > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200/30 dark:border-zinc-800/20">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400">Total potential savings</span>
              <div className="flex items-baseline gap-2">
                <span className="text-[15px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {`\u00A3${totalSavings.toLocaleString()}`}/yr
                </span>
                <span className="text-[11px] font-mono text-emerald-500/60 dark:text-emerald-400/50 tabular-nums">
                  {`\u00A3${totalMonthlySavings.toLocaleString()}`}/mo
                </span>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Warning findings ── */}
      {warnings.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-widest font-medium text-slate-400 dark:text-zinc-600 mb-2 pl-1">Warnings & Actions</p>
          <div className="space-y-2">
            {warnings.map((obs, i) => (
              <ObservationCard key={obs.id || i} obs={obs} index={i} onModelScenario={onModelScenario} />
            ))}
          </div>
        </div>
      )}

      {/* ── Opportunities ── */}
      {opportunities.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-widest font-medium text-slate-400 dark:text-zinc-600 mb-2 pl-1">Opportunities</p>
          <div className="space-y-2">
            {opportunities.map((obs, i) => (
              <ObservationCard key={obs.id || `opp-${i}`} obs={obs} index={i} onModelScenario={onModelScenario} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Meeting Notes Panel ─── */

function MeetingNotesPanel({ meetingNotes }: { meetingNotes: MeetingNoteData[] }) {
  if (meetingNotes.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 rounded-2xl bg-slate-100/80 dark:bg-zinc-800/50 flex items-center justify-center mx-auto mb-3">
          <IconBookOpen className="w-5 h-5 text-slate-300 dark:text-zinc-600" />
        </div>
        <p className="text-[12px] font-medium text-slate-400 dark:text-zinc-500">No meeting notes</p>
        <p className="text-[11px] font-light text-slate-400/60 dark:text-zinc-600/60 mt-1">Meeting notes for this client will appear here</p>
      </div>
    );
  }

  const totalActions = meetingNotes.reduce((sum, n) => sum + (n.action_items?.length || 0), 0);
  const allTags = Array.from(new Set(meetingNotes.flatMap((n) => n.tags || [])));

  return (
    <div className="space-y-4">
      {/* ── Summary header ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-xl border border-slate-200/40 dark:border-zinc-800/30 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm p-4 overflow-hidden"
      >
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-[20px] font-mono font-medium text-slate-900 dark:text-white tabular-nums">{meetingNotes.length}</p>
            <p className="text-[9px] font-light text-slate-400 dark:text-zinc-500 mt-0.5">Notes</p>
          </div>
          <div className="text-center border-x border-slate-200/30 dark:border-zinc-800/20">
            <p className="text-[20px] font-mono font-medium text-sky-600 dark:text-sky-400 tabular-nums">{totalActions}</p>
            <p className="text-[9px] font-light text-slate-400 dark:text-zinc-500 mt-0.5">Action Items</p>
          </div>
          <div className="text-center">
            <p className="text-[20px] font-mono font-medium text-violet-600 dark:text-violet-400 tabular-nums">{allTags.length}</p>
            <p className="text-[9px] font-light text-slate-400 dark:text-zinc-500 mt-0.5">Topics</p>
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-200/30 dark:border-zinc-800/20 flex flex-wrap gap-1.5">
            {allTags.slice(0, 8).map((tag) => (
              <span key={tag} className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-slate-100/80 dark:bg-zinc-800/50 text-slate-500 dark:text-zinc-400">
                {tag}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* ── Timeline ── */}
      <div>
        <p className="text-[9px] uppercase tracking-widest font-medium text-slate-400 dark:text-zinc-600 mb-2 pl-1">Meeting History</p>
        <div className="space-y-2">
          {meetingNotes.map((note, i) => (
            <MeetingNoteCard key={note.id} note={note} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Single Meeting Note Card ─── */

function MeetingNoteCard({ note, index }: { note: MeetingNoteData; index: number }) {
  const [expanded, setExpanded] = useState(false);

  const dateStr = (() => {
    try {
      const d = new Date(note.meeting_date);
      return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return note.meeting_date;
    }
  })();

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="group relative rounded-xl border border-slate-200/40 dark:border-zinc-800/30 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm overflow-hidden hover:border-sky-200/40 dark:hover:border-sky-700/30 transition-all duration-200"
    >
      {/* Accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-sky-400 to-blue-500" />

      <button onClick={() => setExpanded(!expanded)} className="w-full text-left p-3.5 pl-4">
        {/* Top row */}
        <div className="flex items-start gap-2.5">
          <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-950/30 flex items-center justify-center mt-0.5">
            <IconBookOpen className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="text-[12px] font-semibold text-slate-800 dark:text-zinc-100 truncate">{note.subject}</h4>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">{dateStr}</span>
              {note.attendees && (
                <span className="text-[10px] text-slate-400/60 dark:text-zinc-600/60 truncate">
                  &middot; {note.attendees}
                </span>
              )}
            </div>
            {/* Preview when collapsed */}
            {!expanded && (
              <p className="text-[11px] font-light text-slate-500 dark:text-zinc-400 mt-1.5 line-clamp-2 leading-relaxed">
                {note.summary}
              </p>
            )}
          </div>
          {/* Expand indicator */}
          <div className={`flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}>
            <IconChevronDown className="w-3 h-3 text-slate-300 dark:text-zinc-600" />
          </div>
        </div>

        {/* Tag pills on collapsed */}
        {!expanded && note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2 ml-[38px]">
            {note.tags.map((tag) => (
              <span key={tag} className="text-[8px] font-medium px-1.5 py-[1px] rounded-full bg-slate-100/80 dark:bg-zinc-800/40 text-slate-400 dark:text-zinc-500">
                {tag}
              </span>
            ))}
          </div>
        )}
      </button>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 ml-[38px] space-y-3">
              {/* Full summary */}
              <div>
                <p className="text-[9px] uppercase tracking-widest font-medium text-slate-400 dark:text-zinc-600 mb-1">Summary</p>
                <p className="text-[11px] font-light text-slate-600 dark:text-zinc-300 leading-relaxed whitespace-pre-line">{note.summary}</p>
              </div>

              {/* Action items */}
              {note.action_items && note.action_items.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase tracking-widest font-medium text-slate-400 dark:text-zinc-600 mb-1.5">Action Items</p>
                  <div className="space-y-1">
                    {note.action_items.map((item, j) => (
                      <div key={j} className="flex items-start gap-2">
                        <div className="w-4 h-4 rounded border border-slate-200/60 dark:border-zinc-700/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <IconCheck className="w-2.5 h-2.5 text-slate-300 dark:text-zinc-600" />
                        </div>
                        <span className="text-[11px] font-light text-slate-600 dark:text-zinc-300 leading-relaxed">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {note.tags && note.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {note.tags.map((tag) => (
                    <span key={tag} className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400 border border-sky-200/30 dark:border-sky-800/20">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ─── Single Observation Card ─── */

function ObservationCard({ obs, index, onModelScenario }: { obs: Observation; index: number; onModelScenario?: (prompt: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const config = severityConfig[obs.severity] || severityConfig.info;
  const catLabel = obs.category ? categoryLabels[obs.category] || obs.category : null;
  const CatIcon = obs.category ? categoryIcons[obs.category] : null;
  const hasBreakdown = obs.savingsBreakdown && obs.savingsBreakdown.taxImpact.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="group relative rounded-xl border border-slate-200/40 dark:border-zinc-800/30 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm overflow-hidden hover:border-brand-200/40 dark:hover:border-brand-700/30 transition-all duration-200"
    >
      {/* Severity gradient accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b ${config.accent}`} />

      <div className="p-3.5 pl-4">
        {/* Top row: icon + title + severity badge */}
        <div className="flex items-start gap-2.5">
          <span className={`flex-shrink-0 w-7 h-7 rounded-lg ${config.iconBg} flex items-center justify-center mt-0.5`}>
            {obs.severity === "opportunity" ? (
              <IconTrendingUp className={`w-3.5 h-3.5 ${config.text}`} />
            ) : obs.severity === "info" ? (
              <IconLightbulb className={`w-3.5 h-3.5 ${config.text}`} />
            ) : (
              <IconAlertCircle className={`w-3.5 h-3.5 ${config.text}`} />
            )}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-[12px] font-medium text-slate-800 dark:text-zinc-100 leading-snug">{obs.title}</p>
              <span className={`flex-shrink-0 text-[7px] uppercase tracking-widest font-semibold px-1.5 py-0.5 rounded-md ${config.iconBg} ${config.text}`}>
                {obs.severity}
              </span>
            </div>

            {/* Description */}
            <p className="text-[11px] font-light text-slate-500 dark:text-zinc-400 leading-relaxed mb-2">{obs.detail}</p>

            {/* Bottom row: category + potential saving + expand toggle */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {catLabel && (
                  <span className="flex items-center gap-1 text-[8px] font-medium text-slate-400 dark:text-zinc-500 bg-slate-100/60 dark:bg-zinc-800/40 px-1.5 py-0.5 rounded">
                    {CatIcon && CatIcon("w-2.5 h-2.5")}
                    {catLabel}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {obs.potentialSaving != null && obs.potentialSaving > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    <IconTrendingUp className="w-3 h-3" />
                    {`\u00A3${obs.potentialSaving.toLocaleString()}`}/yr
                  </span>
                )}
                {hasBreakdown && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-[9px] font-medium text-brand-500 dark:text-brand-400 hover:text-brand-600 dark:hover:text-brand-300 transition-colors flex items-center gap-0.5"
                  >
                    {expanded ? "Hide" : "Details"}
                    <motion.span
                      animate={{ rotate: expanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="inline-block"
                    >
                      <IconChevronDown className="w-3 h-3" />
                    </motion.span>
                  </button>
                )}
              </div>
            </div>

            {/* Suggested action — only show when NOT expanded */}
            {obs.action && !expanded && (
              <div className="mt-2 pt-2 border-t border-slate-100/60 dark:border-zinc-800/30">
                <div className="flex items-start gap-1.5">
                  <IconArrowRight className="w-2.5 h-2.5 text-brand-400 dark:text-brand-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] font-normal text-brand-600 dark:text-brand-400 leading-relaxed">{obs.action}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Expanded savings breakdown */}
        <AnimatePresence>
          {expanded && obs.savingsBreakdown && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-slate-200/40 dark:border-zinc-800/30 space-y-3">
                {/* Current state vs Recommended action */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-50/80 dark:bg-zinc-800/40 p-2.5">
                    <p className="text-[8px] uppercase tracking-widest font-semibold text-slate-400 dark:text-zinc-500 mb-2">Current State</p>
                    {obs.savingsBreakdown.currentState.map((item, i) => (
                      <div key={i} className="flex justify-between items-baseline mb-1 last:mb-0">
                        <span className="text-[10px] font-light text-slate-500 dark:text-zinc-400">{item.label}</span>
                        <span className="text-[10px] font-mono font-medium text-slate-700 dark:text-zinc-200 tabular-nums">{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg bg-emerald-50/80 dark:bg-emerald-900/20 p-2.5">
                    <p className="text-[8px] uppercase tracking-widest font-semibold text-emerald-600 dark:text-emerald-400 mb-2">Recommended</p>
                    {obs.savingsBreakdown.recommendedAction.map((item, i) => (
                      <div key={i} className="flex justify-between items-baseline mb-1 last:mb-0">
                        <span className="text-[10px] font-light text-emerald-700 dark:text-emerald-300">{item.label}</span>
                        <span className="text-[10px] font-mono font-medium text-emerald-800 dark:text-emerald-200 tabular-nums">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tax impact table */}
                <div className="rounded-lg bg-white/60 dark:bg-zinc-800/30 border border-slate-200/30 dark:border-zinc-700/20 p-2.5">
                  <p className="text-[8px] uppercase tracking-widest font-semibold text-slate-400 dark:text-zinc-500 mb-2">Tax Impact</p>
                  {obs.savingsBreakdown.taxImpact.map((item, i) => (
                    <div key={i} className="flex justify-between items-baseline mb-1.5 last:mb-0">
                      <span className="text-[10px] font-light text-slate-500 dark:text-zinc-400">{item.label}</span>
                      <div className="flex gap-3">
                        <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{`\u00A3${item.annual.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}/yr</span>
                        <span className="text-[9px] font-mono text-slate-400 dark:text-zinc-500 tabular-nums">{`\u00A3${item.monthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}/mo</span>
                      </div>
                    </div>
                  ))}
                  {/* Total row */}
                  <div className="flex justify-between items-baseline mt-2 pt-2 border-t border-slate-200/30 dark:border-zinc-700/20">
                    <span className="text-[10px] font-semibold text-slate-700 dark:text-zinc-200">Total benefit</span>
                    <div className="flex gap-3">
                      <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{`\u00A3${obs.savingsBreakdown.totalAnnual.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}/yr</span>
                      <span className="text-[10px] font-mono font-medium text-emerald-500 dark:text-emerald-500 tabular-nums">{`\u00A3${obs.savingsBreakdown.totalMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}/mo</span>
                    </div>
                  </div>
                </div>

                {/* Cost note */}
                {obs.savingsBreakdown.costNote && (
                  <p className="text-[10px] font-light text-slate-500 dark:text-zinc-400 italic leading-relaxed px-0.5">
                    {obs.savingsBreakdown.costNote}
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                  {obs.savingsBreakdown.modelPrompt && onModelScenario && (
                    <button
                      onClick={() => onModelScenario(obs.savingsBreakdown!.modelPrompt!)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-medium text-white bg-gradient-to-r from-brand-500 to-violet-500 hover:from-brand-600 hover:to-violet-600 rounded-lg py-2 px-3 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <IconTrendingUp className="w-3 h-3" />
                      Model This Scenario
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const text = [
                        obs.title,
                        obs.detail,
                        obs.savingsBreakdown?.costNote,
                        `Potential saving: \u00A3${obs.potentialSaving?.toLocaleString()}/yr`,
                      ].filter(Boolean).join("\n");
                      navigator.clipboard.writeText(text);
                    }}
                    className="flex items-center justify-center gap-1 text-[10px] font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 bg-slate-100/60 dark:bg-zinc-800/40 hover:bg-slate-200/60 dark:hover:bg-zinc-700/40 rounded-lg py-2 px-3 transition-all duration-200"
                  >
                    <IconCopy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ─── History Item ─── */

const tagColors: Record<string, string> = {
  brand: "bg-brand-50 dark:bg-brand-950/20 text-brand-600 dark:text-brand-400 border-brand-200/40 dark:border-brand-800/30",
  emerald: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border-emerald-200/40 dark:border-emerald-800/30",
  amber: "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border-amber-200/40 dark:border-amber-800/30",
  red: "bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border-red-200/40 dark:border-red-800/30",
};

function HistoryItem({ thread, delay, onSelect, onDelete }: { thread: HistoryThread; delay: number; onSelect: () => void; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      onClick={onSelect}
      className={`group relative w-full text-left px-3 py-2.5 rounded-lg transition-all ${
        confirming
          ? "bg-red-50/60 dark:bg-red-950/10 border border-red-200/40 dark:border-red-800/20"
          : thread.active
            ? "bg-brand-50/60 dark:bg-brand-950/20 border border-brand-200/30 dark:border-brand-800/20"
            : "hover:bg-slate-50 dark:hover:bg-zinc-900/60 border border-transparent"
      }`}
    >
      {/* Active indicator bar */}
      {thread.active && !confirming && (
        <motion.div
          layoutId="history-active"
          className="absolute left-0 inset-y-0 my-auto w-[3px] h-5 rounded-r-full bg-brand-500"
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        />
      )}

      {/* Delete confirmation overlay */}
      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 rounded-lg flex items-center justify-center gap-2 z-10 bg-red-50/90 dark:bg-red-950/40 backdrop-blur-[2px]"
          >
            <span className="text-[10px] font-medium text-red-600 dark:text-red-400">Delete?</span>
            <span
              onClick={(e) => { e.stopPropagation(); onDelete(); setConfirming(false); }}
              className="text-[10px] font-medium text-white bg-red-500 hover:bg-red-600 px-2.5 py-1 rounded-md transition-colors cursor-pointer shadow-sm shadow-red-500/20"
            >
              Yes
            </span>
            <span
              onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
              className="text-[10px] font-medium text-slate-600 dark:text-zinc-300 bg-white dark:bg-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-700 px-2.5 py-1 rounded-md border border-slate-200 dark:border-zinc-700 transition-colors cursor-pointer"
            >
              No
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex gap-2.5">
        {/* Client avatar */}
        <div className={`relative flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br ${thread.client.gradient} flex items-center justify-center text-[9px] font-semibold text-white shadow-sm mt-0.5`}>
          {thread.client.initials}
          {thread.unread && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-brand-500 border-2 border-white dark:border-zinc-950" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[11px] font-medium truncate ${
              thread.active
                ? "text-brand-700 dark:text-brand-300"
                : thread.unread
                  ? "text-slate-900 dark:text-white"
                  : "text-slate-700 dark:text-zinc-200"
            }`}>
              {thread.client.name}
            </span>
            <span className="flex-shrink-0 text-[9px] font-light text-slate-400 dark:text-zinc-600">
              {thread.time}
            </span>
          </div>

          <p className={`text-[11px] truncate mt-0.5 ${
            thread.unread
              ? "font-normal text-slate-700 dark:text-zinc-300"
              : "font-light text-slate-500 dark:text-zinc-400"
          }`}>
            {thread.title}
          </p>

          <div className="flex items-center gap-2 mt-1.5">
            {thread.tag && (
              <span className={`text-[8px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded border ${tagColors[thread.tag.color] || tagColors.brand}`}>
                {thread.tag.label}
              </span>
            )}
            <span className="flex items-center gap-1 text-[9px] font-light text-slate-400/60 dark:text-zinc-600/60">
              <IconMessage className="w-2.5 h-2.5" />
              {thread.messageCount}
            </span>
          </div>
        </div>
      </div>

      {/* Hover delete button */}
      {!confirming && (
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span
            onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
            className="w-5 h-5 rounded flex items-center justify-center text-slate-300 dark:text-zinc-600 hover:text-red-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
          >
            <IconTrash className="w-3 h-3" />
          </span>
        </div>
      )}
    </motion.button>
  );
}

/* ─── Client dropdown menu item ─── */

const ClientMenuItem = memo(function ClientMenuItem({ icon, label, badge, accent, onClick, href }: { icon: React.ReactNode; label: string; badge?: string; accent?: boolean; onClick?: () => void; href?: string }) {
  const content = (
    <>
      <span className="text-slate-400 dark:text-zinc-500 group-hover/item:text-brand-500 dark:group-hover/item:text-brand-400 transition-colors">
        {icon}
      </span>
      <span className="flex-1 text-[11px] font-normal text-slate-700 dark:text-zinc-300">{label}</span>
      {badge && (
        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${
          accent
            ? "bg-red-50 dark:bg-red-950/20 text-red-500 dark:text-red-400"
            : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400"
        }`}>
          {badge}
        </span>
      )}
    </>
  );

  const cls = "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors group/item";

  if (href) {
    return <Link href={href} className={cls}>{content}</Link>;
  }

  return <button onClick={onClick} className={cls}>{content}</button>;
});
