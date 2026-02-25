"use client";

import { useState, useCallback, useRef, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/* eslint-disable @typescript-eslint/no-explicit-any */
export interface TaxComputationData {
  taxPosition: {
    tax_year: string;
    total_income: number;
    adjusted_net_income: number;
    taxable_income: number;
    income_tax: number;
    national_insurance: number;
    dividend_tax: number;
    total_tax: number;
    effective_rate: number;
    marginal_rate: number;
    personal_allowance: number;
    pa_status: string;
    hicbc_applies: boolean;
    hicbc_charge: number;
  };
  dashboardData: {
    incomeSummary: { totalIncome: number; sources: { type: string; label: string; amount: number }[] };
    taxCalculation: {
      totalIncomeTax: number;
      totalTax: number;
      effectiveRate: number;
      marginalRate: number;
      incomeTaxByBand: { band: string; amount: number; rate: number; tax: number }[];
    };
    nationalInsurance: { class1: number; class2: number; class4: number };
    adjustedNetIncome: { amount: number; personalAllowanceStatus: string };
    allowancesTracker: { allowances: { name: string; annualLimit: number; used: number; remaining: number; status: string }[] };
    observations: { type: string; title: string; description: string; potentialSaving: number; action: string }[];
    hicbc?: { applies: boolean; childBenefitAnnual: number; clawbackPercentage: number; charge: number; netBenefit: number };
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  insights?: { label: string; value: string; color: string }[];
  computationData?: TaxComputationData;
}

export type StatusPhase =
  | "idle"
  | "understanding"
  | "analyzing_income"
  | "checking_allowances"
  | "calculating"
  | "computing_tax"
  | "modelling_scenario"
  | "building_dashboard"
  | "searching_notes"
  | "saving_observation"
  | "generating_response"
  | "complete";

const STATUS_MESSAGES: Record<StatusPhase, string> = {
  idle: "",
  understanding: "Understanding your question...",
  analyzing_income: "Analysing income sources...",
  checking_allowances: "Checking allowance status...",
  calculating: "Running tax calculations...",
  computing_tax: "Computing tax position...",
  modelling_scenario: "Modelling scenario...",
  building_dashboard: "Building dashboard...",
  searching_notes: "Searching meeting notes...",
  saving_observation: "Generating observations...",
  generating_response: "Generating response...",
  complete: "",
};

/* ── localStorage helpers for auto-persist ── */
const STORAGE_PREFIX = "helio:chat:";

function persistKey(clientId: string, key: string): string {
  return `${STORAGE_PREFIX}${clientId}:${key}`;
}

function saveToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* quota exceeded or SSR — ignore */ }
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function useChat(clientId: string, taxPlanMode: boolean = false, onObservationSaved?: () => void) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<StatusPhase>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isDashboardGenerating, setIsDashboardGenerating] = useState(false);
  const [scenarios, setScenarios] = useState<any[]>([]);
  const [isScenarioGenerating, setIsScenarioGenerating] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const dashboardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredRef = useRef(false);

  /* ── Restore persisted state on mount / client change ── */
  useEffect(() => {
    restoredRef.current = false;
    const savedMessages = loadFromStorage<ChatMessage[]>(persistKey(clientId, "messages"), []);
    const savedConvId = loadFromStorage<string | null>(persistKey(clientId, "conversationId"), null);
    const savedDashboard = loadFromStorage<any>(persistKey(clientId, "dashboard"), null);
    const savedScenarios = loadFromStorage<any[]>(persistKey(clientId, "scenarios"), []);

    if (savedMessages.length > 0) setMessages(savedMessages);
    if (savedConvId) setConversationId(savedConvId);
    if (savedDashboard) setDashboardData(savedDashboard);
    if (savedScenarios.length > 0) setScenarios(savedScenarios);

    // Mark restored so the persist effect below doesn't immediately overwrite with empty state
    requestAnimationFrame(() => { restoredRef.current = true; });
  }, [clientId]);

  /* ── Auto-persist when state changes (debounced) ── */
  useEffect(() => {
    if (!restoredRef.current || isStreaming) return;
    const timer = setTimeout(() => {
      saveToStorage(persistKey(clientId, "messages"), messages);
      saveToStorage(persistKey(clientId, "conversationId"), conversationId);
      saveToStorage(persistKey(clientId, "dashboard"), dashboardData);
      saveToStorage(persistKey(clientId, "scenarios"), scenarios);
    }, 300);
    return () => clearTimeout(timer);
  }, [clientId, messages, conversationId, dashboardData, scenarios, isStreaming]);

  const sendMessage = useCallback(
    async (content: string, contextSnippetIds?: string[]) => {
      if (!content.trim() || isStreaming) return;

      // Add user message
      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content,
        timestamp: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsStreaming(true);
      setStatus("understanding");
      setStatusMessage(STATUS_MESSAGES.understanding);

      // Prepare assistant placeholder
      const assistantId = crypto.randomUUID();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantMsg]);

      // Start SSE stream
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(`${API_BASE}/api/chat/stream`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: conversationId,
            client_id: clientId,
            message: content,
            tax_plan_mode: taxPlanMode,
            context_snippet_ids: contextSnippetIds || undefined,
          }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`HTTP ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          let eventType = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7).trim();
            } else if (line.startsWith("data: ")) {
              const data = JSON.parse(line.slice(6));

              if (eventType === "token") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: m.content + data.content } : m
                  )
                );
              } else if (eventType === "status") {
                const phase = data.phase as StatusPhase;
                setStatus(phase);
                setStatusMessage(data.message || STATUS_MESSAGES[phase] || "");
                // The building_dashboard status arrives early (content_block_start),
                // in its own chunk before tool_call/tool_result/dashboard_update.
                // Set isDashboardGenerating here so the panel overlay renders immediately.
                if (phase === "building_dashboard") {
                  if (dashboardTimerRef.current) {
                    clearTimeout(dashboardTimerRef.current);
                    dashboardTimerRef.current = null;
                  }
                  setIsDashboardGenerating(true);
                }
                if (phase === "modelling_scenario") {
                  setIsScenarioGenerating(true);
                }
              } else if (eventType === "tool_call") {
                if (data.tool === "compute_tax_position") {
                  setIsDashboardGenerating(true);
                  setStatus("computing_tax");
                  setStatusMessage("Computing tax position...");
                } else if (data.tool === "model_salary_sacrifice") {
                  setStatus("modelling_scenario");
                  setStatusMessage("Modelling salary sacrifice scenario...");
                  setIsScenarioGenerating(true);
                } else if (data.tool === "model_personal_pension") {
                  setStatus("modelling_scenario");
                  setStatusMessage("Modelling pension contribution scenario...");
                  setIsScenarioGenerating(true);
                } else if (data.tool === "generate_dashboard") {
                  setIsDashboardGenerating(true);
                  setStatus("building_dashboard");
                  setStatusMessage("Generating detailed dashboard...");
                } else if (data.tool === "save_observation") {
                  setStatus("saving_observation");
                  setStatusMessage("Generating observations...");
                }
              } else if (eventType === "tool_result") {
                // Capture tax engine computation data and attach to assistant message
                if (
                  data.tool === "compute_tax_position" &&
                  data.result?.success
                ) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantId
                        ? { ...m, computationData: { taxPosition: data.result.taxPosition, dashboardData: data.result.dashboardData } }
                        : m
                    )
                  );
                }
                // Capture salary sacrifice result as a scenario
                if (data.tool === "model_salary_sacrifice" && data.result?.success) {
                  const result = data.result;
                  const newScenario = {
                    id: crypto.randomUUID(),
                    name: `Sacrifice £${Number(result.proposed?.sacrifice || 0).toLocaleString()}`,
                    description: `Model salary sacrifice at £${Number(result.proposed?.sacrifice || 0).toLocaleString()}`,
                    type: "salary_sacrifice" as const,
                    current: result.current,
                    proposed: result.proposed,
                    savings: result.savings,
                    pa_change: result.pa_change,
                    extra_into_pension: result.extra_into_pension,
                    net_benefit: result.net_benefit,
                    total_benefit: result.total_benefit,
                  };
                  setScenarios((prev) => [...prev, newScenario]);
                  setIsScenarioGenerating(false);
                }
                // Capture personal pension contribution result as a scenario
                if (data.tool === "model_personal_pension" && data.result?.success) {
                  const result = data.result;
                  const newScenario = {
                    id: crypto.randomUUID(),
                    name: `Pension £${Number(result.proposed?.pension_contribution || 0).toLocaleString()}`,
                    description: `Model personal pension contribution of £${Number(result.proposed?.pension_contribution || 0).toLocaleString()}`,
                    type: "personal_pension" as const,
                    current: result.current,
                    proposed: result.proposed,
                    savings: result.savings,
                    pa_change: result.pa_change,
                    effective_relief_rate: result.effective_relief_rate,
                    thresholds: result.thresholds,
                    pension_aa_warning: result.pension_aa_warning,
                    total_effective_relief_rate: result.total_effective_relief_rate,
                    net_benefit: result.net_benefit,
                    total_benefit: result.total_benefit,
                  };
                  setScenarios((prev) => [...prev, newScenario]);
                  setIsScenarioGenerating(false);
                }
                // Extract dashboard data from tool_result (fallback)
                if (data.tool === "generate_dashboard" && data.result?.dashboardData) {
                  setDashboardData(data.result.dashboardData);
                }
                // Notify when an AI observation is saved
                if (data.tool === "save_observation" && data.result?.success) {
                  onObservationSaved?.();
                }
                // NOTE: Do NOT clear isDashboardGenerating here — tool_call,
                // tool_result, and dashboard_update arrive in the same chunk.
                // React batches them, so clearing here cancels the true we just set.
              } else if (eventType === "dashboard_update") {
                setDashboardData(data.data);
                // Delay clearing isDashboardGenerating so the animation plays
                // for a visible duration even though data arrived instantly.
                if (dashboardTimerRef.current) clearTimeout(dashboardTimerRef.current);
                dashboardTimerRef.current = setTimeout(() => {
                  setIsDashboardGenerating(false);
                  dashboardTimerRef.current = null;
                }, 2000);
              } else if (eventType === "done") {
                if (data.conversation_id) {
                  setConversationId(data.conversation_id);
                }
              } else if (eventType === "error") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: `Error: ${data.error}` }
                      : m
                  )
                );
              }
            }
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Stream error:", err);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId
                ? { ...m, content: "Sorry, something went wrong. Please try again." }
                : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
        setIsScenarioGenerating(false);
        // Only force-clear isDashboardGenerating if no timer is pending
        // (timer means data arrived and we're showing the animation)
        if (!dashboardTimerRef.current) {
          setIsDashboardGenerating(false);
        }
        setStatus("idle");
        setStatusMessage("");
        abortRef.current = null;
      }
    },
    [clientId, conversationId, isStreaming, taxPlanMode, onObservationSaved]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const loadMessages = useCallback(
    async (convId: string) => {
      setConversationId(convId);
      try {
        const res = await fetch(`${API_BASE}/api/chat/conversations/${convId}/messages`);
        const data = await res.json();
        setMessages(
          data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: m.created_at
              ? new Date(m.created_at).toLocaleTimeString("en-GB", {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "",
            insights: m.insights,
          }))
        );
        // Restore dashboard_data from the last assistant message that has it
        const lastDashboard = [...data.messages]
          .reverse()
          .find((m: any) => m.role === "assistant" && m.dashboard_data);
        if (lastDashboard) {
          setDashboardData(lastDashboard.dashboard_data);
        } else {
          setDashboardData(null);
        }
      } catch (err) {
        console.error("Failed to load messages:", err);
      }
    },
    []
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setDashboardData(null);
    setScenarios([]);
    // Clear persisted state for this client
    try {
      localStorage.removeItem(persistKey(clientId, "messages"));
      localStorage.removeItem(persistKey(clientId, "conversationId"));
      localStorage.removeItem(persistKey(clientId, "dashboard"));
      localStorage.removeItem(persistKey(clientId, "scenarios"));
    } catch { /* SSR guard */ }
  }, [clientId]);

  return {
    messages,
    status,
    statusMessage,
    isStreaming,
    conversationId,
    dashboardData,
    isDashboardGenerating,
    isScenarioGenerating,
    scenarios,
    sendMessage,
    stopStreaming,
    loadMessages,
    clearMessages,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
