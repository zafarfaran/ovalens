import { useState, useEffect } from "react";

type CaptureState = "idle" | "capturing" | "sending" | "success" | "error";

/* ────────────────────────────────────────────────
   Ovalens Sun Mark — the animated hero icon
   ──────────────────────────────────────────────── */
const S = { strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

function OvalensMark({ spinning = false }: { spinning?: boolean }) {
  return (
    <div className="relative flex items-center justify-center">
      {/* Ambient glow — pulses gently behind the sun */}
      <div
        className="absolute w-20 h-20 rounded-full anim-glow"
        style={{ background: "radial-gradient(circle, rgba(92,124,250,0.18), transparent 70%)" }}
      />
      <svg viewBox="0 0 32 32" className="relative w-11 h-11 text-brand-400" fill="none">
        {/* Rays — spin during loading */}
        <g className={spinning ? "anim-rays" : ""} style={{ opacity: spinning ? 0.7 : 1, transition: "opacity 0.4s" }}>
          <line x1="16" y1="2.5" x2="16" y2="6.5" stroke="currentColor" {...S} />
          <line x1="16" y1="25.5" x2="16" y2="29.5" stroke="currentColor" {...S} />
          <line x1="2.5" y1="16" x2="6.5" y2="16" stroke="currentColor" {...S} />
          <line x1="25.5" y1="16" x2="29.5" y2="16" stroke="currentColor" {...S} />
          <line x1="6.5" y1="6.5" x2="9.3" y2="9.3" stroke="currentColor" {...S} />
          <line x1="22.7" y1="22.7" x2="25.5" y2="25.5" stroke="currentColor" {...S} />
          <line x1="6.5" y1="25.5" x2="9.3" y2="22.7" stroke="currentColor" {...S} />
          <line x1="22.7" y1="9.3" x2="25.5" y2="6.5" stroke="currentColor" {...S} />
        </g>
        {/* Core */}
        <circle cx="16" cy="16" r="5.5" fill="currentColor" opacity="0.12" />
        <circle cx="16" cy="16" r="7" stroke="currentColor" {...S} />
      </svg>
    </div>
  );
}

/* ────────────────────────────────────────────────
   Icons — stroke-based, matching Ovalens design language
   ──────────────────────────────────────────────── */
function IconPage({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-[17px] h-[17px] ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...S}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

function IconSelection({ className = "" }: { className?: string }) {
  return (
    <svg className={`w-[17px] h-[17px] ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" {...S}>
      <path d="M5 3v4M3 5h4M5 21v-4M3 19h4M19 3v4M21 5h-4M19 21v-4M21 19h-4" />
      <rect x="8" y="8" width="8" height="8" rx="1" opacity="0.12" fill="currentColor" />
      <rect x="8" y="8" width="8" height="8" rx="1" />
    </svg>
  );
}

function IconChevron() {
  return (
    <svg
      className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-50 group-hover:translate-x-0 transition-all duration-300"
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconExternal() {
  return (
    <svg className="w-3 h-3 ml-1 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

/* ────────────────────────────────────────────────
   Main App
   ──────────────────────────────────────────────── */
export default function App() {
  const [state, setState] = useState<CaptureState>("idle");
  const [hasSelection, setHasSelection] = useState(false);
  const [error, setError] = useState("");
  const [ovalensTabOpen, setOvalensTabOpen] = useState(false);

  useEffect(() => {
    chrome.tabs.query({ url: "http://localhost:3000/*" }, (tabs) => {
      setOvalensTabOpen(tabs.length > 0);
    });
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: "CHECK_SELECTION" }, (response) => {
          if (chrome.runtime.lastError) return;
          setHasSelection(!!response?.hasSelection);
        });
      }
    });
  }, []);

  const capture = async (captureType: "CAPTURE_PAGE" | "CAPTURE_SELECTION") => {
    setState("capturing");
    setError("");
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error("No active tab");

      // Restricted pages where content scripts can't run
      const url = tab.url || "";
      if (url.startsWith("chrome://") || url.startsWith("chrome-extension://") || url.startsWith("about:") || url === "") {
        throw new Error("Can't capture this page — try a regular website");
      }

      let response: { success?: boolean; error?: string; content?: string; url?: string; title?: string; captureType?: string };
      try {
        response = await chrome.tabs.sendMessage(tab.id, { type: captureType });
      } catch {
        throw new Error("Content script not loaded — try refreshing the page");
      }
      if (!response?.success) throw new Error(response?.error || "Capture failed");
      setState("sending");
      const apiResponse = await chrome.runtime.sendMessage({
        type: "SEND_TO_API",
        payload: { content: response.content, url: response.url, title: response.title, captureType: response.captureType },
      });
      if (!apiResponse?.success) throw new Error(apiResponse?.error || "API request failed");
      setState("success");
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const openOvalens = () => chrome.tabs.create({ url: "http://localhost:3000/chat" });
  const isLoading = state === "capturing" || state === "sending";

  return (
    <div className="relative overflow-hidden" style={{ background: "var(--bg)" }}>
      {/* Background gradient mesh */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 40% 10%, rgba(92,124,250,0.07) 0%, transparent 55%), " +
            "radial-gradient(ellipse at 65% 90%, rgba(92,124,250,0.04) 0%, transparent 45%)",
        }}
      />

      <div className="relative px-5 pt-7 pb-5">
        {/* ── Header: Logo + Brand + Status ── */}
        <div className="flex flex-col items-center mb-5 anim-fade-up">
          <OvalensMark spinning={isLoading} />
          <div className="mt-3.5 flex items-baseline gap-1.5">
            <span
              className="text-[16px] font-medium tracking-[-0.02em]"
              style={{ color: "var(--text-1)" }}
            >
              ovalens
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            <div
              className={`w-[5px] h-[5px] rounded-full ${ovalensTabOpen ? "bg-emerald-400 anim-ping" : ""}`}
              style={!ovalensTabOpen ? { background: "var(--text-3)" } : undefined}
            />
            <span className="text-[9px] font-light tracking-[0.04em]" style={{ color: "var(--text-3)" }}>
              {ovalensTabOpen ? "Connected" : "Not connected"}
            </span>
          </div>
        </div>

        {/* Separator */}
        <div className="h-px mb-4 anim-fade-up d1" style={{ background: "var(--brand-border)" }} />

        {/* ── Idle: Action cards ── */}
        {state === "idle" && (
          <div className="space-y-2.5">
            <button
              onClick={() => capture("CAPTURE_PAGE")}
              className="group w-full flex items-center gap-3 p-3 rounded-xl glass-card anim-fade-up d2"
            >
              <span
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-brand-400"
                style={{ background: "rgba(92,124,250,0.08)" }}
              >
                <IconPage />
              </span>
              <div className="flex-1 text-left">
                <span className="text-[12px] font-medium block" style={{ color: "var(--text-1)" }}>
                  Capture Page
                </span>
                <span className="text-[10px] font-light" style={{ color: "var(--text-3)" }}>
                  Extract &amp; clean full content
                </span>
              </div>
              <IconChevron />
            </button>

            <button
              onClick={() => capture("CAPTURE_SELECTION")}
              disabled={!hasSelection}
              className={`group w-full flex items-center gap-3 p-3 rounded-xl glass-card anim-fade-up d3 ${
                !hasSelection ? "opacity-[0.28] cursor-not-allowed" : ""
              }`}
            >
              <span
                className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-brand-400"
                style={{ background: "rgba(92,124,250,0.08)" }}
              >
                <IconSelection />
              </span>
              <div className="flex-1 text-left">
                <span className="text-[12px] font-medium block" style={{ color: "var(--text-1)" }}>
                  Capture Selection
                </span>
                <span className="text-[10px] font-light" style={{ color: "var(--text-3)" }}>
                  {hasSelection ? "Send highlighted text" : "Highlight text first"}
                </span>
              </div>
              <IconChevron />
            </button>
          </div>
        )}

        {/* ── Loading ── */}
        {isLoading && (
          <div className="flex flex-col items-center py-8 anim-fade-up">
            <div
              className="w-5 h-5 rounded-full anim-spin"
              style={{ border: "1.5px solid rgba(92,124,250,0.2)", borderTopColor: "var(--brand)" }}
            />
            <span className="mt-3.5 text-[11px] font-light tracking-wide" style={{ color: "var(--text-2)" }}>
              {state === "capturing" ? "Extracting content\u2026" : "Sending to Ovalens\u2026"}
            </span>
          </div>
        )}

        {/* ── Success ── */}
        {state === "success" && (
          <div className="flex flex-col items-center py-4 anim-fade-up">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center anim-pop"
              style={{ background: "var(--success-soft)", border: "1px solid var(--success-border)" }}
            >
              <svg
                className="w-5 h-5 text-emerald-400"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" className="anim-check" />
              </svg>
            </div>
            <span className="mt-3 text-[12px] font-medium" style={{ color: "var(--success)" }}>
              Sent to Ovalens
            </span>

            <div className="mt-5 w-full space-y-2">
              <button
                onClick={openOvalens}
                className="w-full flex items-center justify-center py-2.5 rounded-xl glass-card text-[11px] font-medium anim-fade-up d1"
                style={{ color: "var(--brand)" }}
              >
                Open Ovalens
                <IconExternal />
              </button>
              <button
                onClick={() => setState("idle")}
                className="w-full py-2 text-[10px] font-light transition-colors duration-200 anim-fade-up d2"
                style={{ color: "var(--text-3)" }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.color = "var(--text-2)"; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.color = "var(--text-3)"; }}
              >
                Capture another
              </button>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {state === "error" && (
          <div className="flex flex-col items-center py-4 anim-fade-up">
            <div
              className="w-full p-3.5 rounded-xl text-[11px] font-light text-center leading-relaxed"
              style={{
                color: "var(--error)",
                background: "var(--error-soft)",
                border: "1px solid var(--error-border)",
              }}
            >
              {error || "Something went wrong"}
            </div>
            <button
              onClick={() => setState("idle")}
              className="mt-3 w-full py-2.5 rounded-xl glass-card text-[11px] font-medium anim-fade-up d1"
              style={{ color: "var(--text-2)" }}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
