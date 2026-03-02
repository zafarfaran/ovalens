"use client";

import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconArrowRight } from "@/components/icons";

const WORKFLOW_STEPS = [
  {
    id: "gather",
    num: "01",
    label: "Gather",
    heading: "Pull in everything, instantly",
    sub: "Use the Ovalens browser extension to grab SA302s, P60s, and documents — or import straight from your practice system.",
  },
  {
    id: "discover",
    num: "02",
    label: "Discover",
    heading: "AI surfaces what matters",
    sub: "Ask questions in plain English. Ovalens analyses the full tax picture and flags savings opportunities you might have missed.",
  },
  {
    id: "model",
    num: "03",
    label: "Model & Act",
    heading: "Test scenarios, recommend with confidence",
    sub: "Run what-if models side by side, compare outcomes, and present ranked recommendations with projected savings.",
  },
];

const STEP_DURATIONS = [6000, 16000, 6000];

function WorkflowGather() {
  const documents = [
    { name: "SA302 Tax Calculation", source: "HMRC Gateway", delay: 0.6 },
    { name: "P60 End of Year Certificate", source: "Employer portal", delay: 1.2 },
    { name: "Dividend vouchers (3)", source: "Companies House", delay: 1.8 },
    { name: "Pension annual statement", source: "Aviva", delay: 2.4 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 flex"
    >
      <div className="flex-1 border-r border-slate-100 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-900/30 p-5 md:p-6 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-5 px-2.5 py-1.5 rounded-md bg-slate-100/80 dark:bg-zinc-800/50 border border-slate-200/40 dark:border-zinc-700/30">
            <div className="w-2 h-2 rounded-full bg-emerald-400/60" />
            <span className="text-[9px] font-mono text-slate-400 dark:text-zinc-500 truncate">
              hmrc.gov.uk/self-assessment/sarah-mitchell
            </span>
          </div>
          <div className="space-y-3 opacity-40 dark:opacity-25">
            <div className="w-28 h-2 rounded-full bg-slate-300 dark:bg-zinc-600" />
            <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-zinc-700" />
            <div className="w-4/5 h-1.5 rounded-full bg-slate-200 dark:bg-zinc-700" />
            <div className="w-3/5 h-1.5 rounded-full bg-slate-200 dark:bg-zinc-700" />
            <div className="mt-4 rounded-lg border border-slate-200/60 dark:border-zinc-700/40 p-3 space-y-2">
              <div className="w-20 h-1.5 rounded-full bg-slate-200 dark:bg-zinc-700" />
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-zinc-700" />
              <div className="w-3/4 h-1.5 rounded-full bg-slate-200 dark:bg-zinc-700" />
            </div>
            <div className="mt-3 rounded-lg border border-slate-200/60 dark:border-zinc-700/40 p-3 space-y-2">
              <div className="w-16 h-1.5 rounded-full bg-slate-200 dark:bg-zinc-700" />
              <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-zinc-700" />
              <div className="w-2/3 h-1.5 rounded-full bg-slate-200 dark:bg-zinc-700" />
            </div>
          </div>
        </motion.div>
      </div>
      <div className="w-[220px] md:w-[260px] p-4 md:p-5 flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="flex items-center gap-2 mb-1"
        >
          <div className="w-5 h-5 rounded-md bg-brand-500 flex items-center justify-center">
            <span className="text-white text-[8px] font-bold">H</span>
          </div>
          <span className="text-[11px] font-medium text-slate-800 dark:text-zinc-200">Ovalens</span>
          <span className="text-[9px] text-slate-400 dark:text-zinc-500 ml-auto">Extension</span>
        </motion.div>
        <div className="h-px bg-slate-100 dark:bg-zinc-800 my-3" />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.3 }}
          className="flex items-center gap-2 mb-4"
        >
          <div className="w-6 h-6 rounded-full bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center text-[8px] font-medium text-brand-600 dark:text-brand-400">
            SM
          </div>
          <div>
            <div className="text-[10px] font-medium text-slate-700 dark:text-zinc-300">Sarah Mitchell</div>
            <div className="text-[8px] text-slate-400 dark:text-zinc-500">Detecting documents...</div>
          </div>
        </motion.div>
        <div className="space-y-0.5 flex-1">
          {documents.map((doc) => (
            <motion.div
              key={doc.name}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: doc.delay, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-start gap-2.5 py-2 border-b border-slate-50 dark:border-zinc-800/50 last:border-0"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: doc.delay + 0.3, duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="w-4 h-4 rounded-full bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center flex-shrink-0 mt-0.5"
              >
                <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-emerald-500">
                  <polyline points="2.5 5 4.5 7 7.5 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
              <div className="min-w-0">
                <div className="text-[10px] font-medium text-slate-700 dark:text-zinc-300 leading-tight">{doc.name}</div>
                <div className="text-[8px] text-slate-400 dark:text-zinc-500 mt-0.5">{doc.source}</div>
              </div>
            </motion.div>
          ))}
        </div>
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3.2, duration: 0.4 }}
          className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800"
        >
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
            </span>
            <span className="text-[10px] font-light text-emerald-600 dark:text-emerald-400">4 documents loaded into Ovalens</span>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}

function WorkflowDiscover() {
  const QUESTION = "What are Sarah\u2019s best tax saving opportunities this year?";
  const AI_RESPONSE =
    "I\u2019ve identified 3 planning opportunities for Sarah. The highest-impact is using her unused pension annual allowance \u2014 a \u00a342,000 contribution could save up to \u00a316,800 in tax.";
  const FOLLOW_UP = "How would salary sacrifice affect her HICBC?";
  const FOLLOW_UP_RESPONSE =
    "Great question. If Sarah redirects \u00a34,730 via salary sacrifice, her adjusted net income drops below \u00a360,000 \u2014 eliminating the HICBC charge entirely. That\u2019s an extra \u00a3860 saved per year.";

  const [charCount, setCharCount] = useState(0);
  const [sent, setSent] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [aiWordCount, setAiWordCount] = useState(0);
  const [chipsVisible, setChipsVisible] = useState(false);
  const [followUpCharCount, setFollowUpCharCount] = useState(0);
  const [followUpSent, setFollowUpSent] = useState(false);
  const [followUpThinking, setFollowUpThinking] = useState(false);
  const [followUpWordCount, setFollowUpWordCount] = useState(0);

  const aiWords = AI_RESPONSE.split(" ");
  const followUpWords = FOLLOW_UP_RESPONSE.split(" ");

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const intervals: ReturnType<typeof setInterval>[] = [];
    let i = 0;
    const typeInterval = setInterval(() => {
      if (cancelled) return;
      i++;
      setCharCount(i);
      if (i >= QUESTION.length) {
        clearInterval(typeInterval);
        timers.push(
          setTimeout(() => {
            if (cancelled) return;
            setSent(true);
            setThinking(true);
            timers.push(
              setTimeout(() => {
                if (cancelled) return;
                setThinking(false);
                let w = 0;
                const wordInterval = setInterval(() => {
                  if (cancelled) return;
                  w++;
                  setAiWordCount(w);
                  if (w >= aiWords.length) {
                    clearInterval(wordInterval);
                    timers.push(
                      setTimeout(() => {
                        if (cancelled) return;
                        setChipsVisible(true);
                        timers.push(
                          setTimeout(() => {
                            if (cancelled) return;
                            let f = 0;
                            const followTypeInterval = setInterval(() => {
                              if (cancelled) return;
                              f++;
                              setFollowUpCharCount(f);
                              if (f >= FOLLOW_UP.length) {
                                clearInterval(followTypeInterval);
                                timers.push(
                                  setTimeout(() => {
                                    if (cancelled) return;
                                    setFollowUpSent(true);
                                    setFollowUpThinking(true);
                                    timers.push(
                                      setTimeout(() => {
                                        if (cancelled) return;
                                        setFollowUpThinking(false);
                                        let fw = 0;
                                        const followWordInterval = setInterval(() => {
                                          if (cancelled) return;
                                          fw++;
                                          setFollowUpWordCount(fw);
                                          if (fw >= followUpWords.length) clearInterval(followWordInterval);
                                        }, 55);
                                        intervals.push(followWordInterval);
                                      }, 800)
                                    );
                                  }, 350)
                                );
                              }
                            }, 40);
                            intervals.push(followTypeInterval);
                          }, 800)
                        );
                      }, 400)
                    );
                  }
                }, 60);
                intervals.push(wordInterval);
              }, 1000)
            );
          }, 400)
        );
      }
    }, 45);
    intervals.push(typeInterval);
    return () => {
      cancelled = true;
      intervals.forEach(clearInterval);
      timers.forEach(clearTimeout);
    };
  }, [aiWords.length, followUpWords.length]);

  const renderAiText = (words: string[], wordCount: number, highlights: { text: string; cls: string }[]) => {
    const visible = words.slice(0, wordCount).join(" ");
    const done = wordCount >= words.length;
    const parts: React.ReactNode[] = [];
    let remaining = visible;
    let key = 0;
    for (const hl of highlights) {
      const idx = remaining.indexOf(hl.text);
      if (idx >= 0) {
        if (idx > 0) parts.push(<span key={key++}>{remaining.slice(0, idx)}</span>);
        parts.push(<span key={key++} className={hl.cls}>{hl.text}</span>);
        remaining = remaining.slice(idx + hl.text.length);
      }
    }
    if (remaining) parts.push(<span key={key++}>{remaining}</span>);
    return (
      <>
        {parts}
        {!done && (
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.4, repeat: Infinity }}
            className="inline-block w-[2px] h-[13px] bg-slate-400 dark:bg-zinc-500 ml-0.5 align-middle"
          />
        )}
      </>
    );
  };

  const firstHighlights = [
    { text: "3 planning opportunities", cls: "font-medium text-slate-900 dark:text-white" },
    { text: "\u00a316,800", cls: "font-medium text-emerald-600 dark:text-emerald-400" },
  ];
  const followUpHighlights = [
    { text: "\u00a360,000", cls: "font-medium text-slate-900 dark:text-white" },
    { text: "\u00a3860 saved", cls: "font-medium text-emerald-600 dark:text-emerald-400" },
  ];
  const showFollowUpInput = chipsVisible && !followUpSent && followUpCharCount >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 p-6 md:p-8 flex flex-col overflow-y-auto"
    >
      {!sent ? (
        <div className="mt-auto">
          <div className="flex items-end gap-2">
            <div className="flex-1 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 px-4 py-3 min-h-[44px]">
              <span className="text-[13px] font-light text-slate-800 dark:text-zinc-200">{QUESTION.slice(0, charCount)}</span>
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="inline-block w-[2px] h-[14px] bg-brand-500 ml-0.5 align-middle"
              />
            </div>
            <button
              className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                charCount >= QUESTION.length ? "bg-brand-500 text-white scale-100" : "bg-slate-100 dark:bg-zinc-800 text-slate-300 dark:text-zinc-600 scale-95"
              }`}
            >
              <IconArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 space-y-3 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="ml-auto max-w-[75%]"
            >
              <div className="bg-brand-500 text-white rounded-2xl rounded-br-sm px-4 py-2.5">
                <span className="text-[12px] font-light leading-relaxed">{QUESTION}</span>
              </div>
            </motion.div>
            <div className="max-w-[88%]">
              {thinking && !followUpThinking ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-slate-50 dark:bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3 inline-flex items-center gap-1"
                >
                  {[0, 1, 2].map((d) => (
                    <motion.span
                      key={d}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }}
                      className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-500"
                    />
                  ))}
                </motion.div>
              ) : aiWordCount > 0 ? (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  <div className="bg-slate-50 dark:bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3">
                    <p className="text-[12px] font-light text-slate-700 dark:text-zinc-300 leading-relaxed">
                      {renderAiText(aiWords, aiWordCount, firstHighlights)}
                    </p>
                    {chipsVisible && (
                      <div className="flex flex-wrap gap-1.5 mt-3">
                        {[
                          { label: "Pension", saving: "\u00a316,800", color: "emerald" },
                          { label: "ISA", saving: "\u00a31,520", color: "sky" },
                          { label: "HICBC", saving: "\u00a3860", color: "amber" },
                        ].map((chip, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.08, duration: 0.25 }}
                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-light border ${
                              chip.color === "emerald"
                                ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-400"
                                : chip.color === "amber"
                                  ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/30 text-amber-700 dark:text-amber-400"
                                  : "bg-sky-50 dark:bg-sky-950/20 border-sky-200/60 dark:border-sky-800/30 text-sky-700 dark:text-sky-400"
                            }`}
                          >
                            <span>{chip.label}</span>
                            <span className="font-mono font-medium">{chip.saving}</span>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              ) : null}
            </div>
            {followUpSent && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="ml-auto max-w-[75%]"
              >
                <div className="bg-brand-500 text-white rounded-2xl rounded-br-sm px-4 py-2.5">
                  <span className="text-[12px] font-light leading-relaxed">{FOLLOW_UP}</span>
                </div>
              </motion.div>
            )}
            {followUpSent && (
              <div className="max-w-[88%]">
                {followUpThinking ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-slate-50 dark:bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3 inline-flex items-center gap-1"
                  >
                    {[0, 1, 2].map((d) => (
                      <motion.span
                        key={d}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: d * 0.2 }}
                        className="w-1.5 h-1.5 rounded-full bg-slate-400 dark:bg-zinc-500"
                      />
                    ))}
                  </motion.div>
                ) : followUpWordCount > 0 ? (
                  <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                    <div className="bg-slate-50 dark:bg-zinc-800 rounded-2xl rounded-bl-sm px-4 py-3">
                      <p className="text-[12px] font-light text-slate-700 dark:text-zinc-300 leading-relaxed">
                        {renderAiText(followUpWords, followUpWordCount, followUpHighlights)}
                      </p>
                    </div>
                  </motion.div>
                ) : null}
              </div>
            )}
          </div>
          {showFollowUpInput && !followUpSent && followUpCharCount > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-3 pt-3 border-t border-slate-100 dark:border-zinc-800"
            >
              <div className="flex items-end gap-2">
                <div className="flex-1 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800/50 px-4 py-2.5 min-h-[40px]">
                  <span className="text-[12px] font-light text-slate-800 dark:text-zinc-200">{FOLLOW_UP.slice(0, followUpCharCount)}</span>
                  <motion.span
                    animate={{ opacity: [1, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="inline-block w-[2px] h-[13px] bg-brand-500 ml-0.5 align-middle"
                  />
                </div>
                <button
                  className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                    followUpCharCount >= FOLLOW_UP.length ? "bg-brand-500 text-white scale-100" : "bg-slate-100 dark:bg-zinc-800 text-slate-300 dark:text-zinc-600 scale-95"
                  }`}
                >
                  <IconArrowRight className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function WorkflowModel() {
  const scenarios = [
    {
      label: "Current position",
      active: false,
      rows: [
        { key: "Gross income", value: "\u00a3195,500" },
        { key: "Total tax", value: "\u00a383,115" },
        { key: "National Insurance", value: "\u00a37,932" },
        { key: "Take-home", value: "\u00a3104,453" },
      ],
    },
    {
      label: "With pension sacrifice",
      active: true,
      rows: [
        { key: "Gross income", value: "\u00a3195,500" },
        { key: "Total tax", value: "\u00a366,315", delta: "\u221217,800" },
        { key: "National Insurance", value: "\u00a36,472", delta: "\u22121,460" },
        { key: "Take-home", value: "\u00a3122,713", delta: "+18,260" },
      ],
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 p-4 sm:p-5 md:p-7 flex flex-col min-h-0 overflow-hidden"
    >
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-3 sm:mb-4"
      >
        <div className="text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400 dark:text-zinc-500">Scenario comparison</div>
        <div className="flex items-center gap-1 text-[9px] text-slate-400 dark:text-zinc-500">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500/50" />
          Sarah Mitchell &middot; 2025/26
        </div>
      </motion.div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 flex-1 min-h-0 overflow-y-auto pr-1">
        {scenarios.map((scenario, si) => (
          <motion.div
            key={scenario.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + si * 0.12, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className={`rounded-lg border p-3 sm:p-3.5 md:p-4 flex flex-col ${
              scenario.active
                ? "border-brand-200/50 dark:border-brand-800/30 bg-brand-50/30 dark:bg-brand-950/10"
                : "border-slate-100 dark:border-zinc-800 bg-slate-50/30 dark:bg-zinc-800/20"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-3">
              {scenario.active && <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />}
              <span className={`text-[10px] font-medium ${scenario.active ? "text-brand-600 dark:text-brand-400" : "text-slate-500 dark:text-zinc-400"}`}>
                {scenario.label}
              </span>
            </div>
            <div className="space-y-2.5 flex-1">
              {scenario.rows.map((row, ri) => (
                <motion.div key={row.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 + si * 0.12 + ri * 0.06, duration: 0.35 }}>
                  <div className="text-[8px] uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-0.5">{row.key}</div>
                  <div className="flex items-baseline gap-1.5">
                    <span
                      className={`text-[14px] md:text-[15px] font-mono font-light tracking-tight ${
                        row.key === "Take-home" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-800 dark:text-zinc-200"
                      }`}
                    >
                      {row.value}
                    </span>
                    {row.delta && (
                      <motion.span
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + ri * 0.08, duration: 0.3 }}
                        className={`text-[9px] font-mono font-medium ${row.delta.startsWith("+") ? "text-emerald-500" : "text-red-400 dark:text-red-400/70"}`}
                      >
                        {row.delta}
                      </motion.span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 1.0, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="mt-4 shrink-0 rounded-lg bg-emerald-500/[0.06] dark:bg-emerald-500/[0.04] border border-emerald-500/[0.12] dark:border-emerald-500/[0.08] px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
      >
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-[5px] h-[5px] rounded-full bg-emerald-500" />
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-slate-800 dark:text-zinc-200 break-words">Recommended: Pension sacrifice</div>
            <div className="text-[9px] font-light text-slate-500 dark:text-zinc-500 mt-0.5 break-words">Saves &pound;19,260/yr &middot; eliminates HICBC</div>
          </div>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.3, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-[16px] sm:text-[18px] font-mono font-medium text-emerald-600 dark:text-emerald-400 tracking-tight self-start sm:self-auto"
        >
          &pound;19,260
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

/** Interactive "How it works" workflow demo (Gather / Discover / Model). Use on landing and login left column. */
export function HowItWorksDemo() {
  const [activeStep, setActiveStep] = useState(0);
  const [cycleKey, setCycleKey] = useState(0);
  const [currentDuration, setCurrentDuration] = useState(STEP_DURATIONS[0]);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setActiveStep(0);
    setCurrentDuration(STEP_DURATIONS[0]);
    setCycleKey((k) => k + 1);
    let step = 0;
    const advance = () => {
      const next = (step + 1) % 3;
      if (next === 0) setCycleKey((k) => k + 1);
      step = next;
      setActiveStep(next);
      setCurrentDuration(STEP_DURATIONS[next]);
      timerRef.current = setTimeout(advance, STEP_DURATIONS[next]);
    };
    timerRef.current = setTimeout(advance, STEP_DURATIONS[0]);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const step = WORKFLOW_STEPS[activeStep];

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="flex justify-center mb-6">
        <div className="inline-flex items-center gap-0.5 p-[3px] rounded-lg bg-slate-100/80 dark:bg-zinc-800/50 border border-slate-200/40 dark:border-zinc-700/30">
          {WORKFLOW_STEPS.map((s, i) => {
            const isActive = activeStep === i;
            const isPast = activeStep > i;
            return (
              <button
                key={s.id}
                onClick={() => {
                  setActiveStep(i);
                  setCurrentDuration(STEP_DURATIONS[i]);
                  setCycleKey((k) => k + 1);
                }}
                className="relative px-4 md:px-5 py-2 rounded-md transition-colors duration-300"
              >
                {isActive && (
                  <motion.div
                    layoutId="workflow-pill"
                    className="absolute inset-0 rounded-md bg-white dark:bg-zinc-700/80 shadow-sm shadow-slate-200/60 dark:shadow-black/30"
                    transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
                <span
                  className={`relative z-10 flex items-center gap-1.5 text-[11px] md:text-[12px] tracking-wide transition-colors duration-300 ${
                    isActive ? "text-slate-900 dark:text-white" : isPast ? "text-slate-500 dark:text-zinc-400" : "text-slate-400 dark:text-zinc-500 hover:text-slate-500 dark:hover:text-zinc-400"
                  }`}
                >
                  <span className="font-mono text-[9px] md:text-[10px] text-brand-500/70">{s.num}</span>
                  <span className="font-medium">{s.label}</span>
                  {isPast && (
                    <svg viewBox="0 0 12 12" className="w-3 h-3 text-brand-500/60">
                      <polyline points="3 6 5.5 8.5 9 3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="max-w-xs mx-auto mb-5">
        <div className="h-[2px] rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
          <motion.div
            key={`prog-${cycleKey}-${activeStep}`}
            initial={{ width: "0%" }}
            animate={{ width: "100%" }}
            transition={{ duration: currentDuration / 1000, ease: "linear" }}
            className="h-full rounded-full bg-brand-500/40"
          />
        </div>
      </div>
      <div className="text-center min-h-[56px] mb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-md mx-auto"
          >
            <h3 className="text-[15px] font-medium text-slate-900 dark:text-white tracking-tight">{step.heading}</h3>
            <p className="text-[13px] font-light text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">{step.sub}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl shadow-slate-200/30 dark:shadow-black/30 overflow-hidden">
        <div className="flex items-center gap-3 px-5 md:px-6 py-2.5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/80">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-zinc-700" />
            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-zinc-700" />
            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-zinc-700" />
          </div>
          <span className="text-[10px] font-light text-slate-400 dark:text-zinc-600">helio.tax</span>
        </div>
        <div className="h-[420px] sm:h-[380px] md:h-[400px] relative overflow-hidden">
          <AnimatePresence mode="wait">
            {activeStep === 0 && <WorkflowGather key="gather" />}
            {activeStep === 1 && <WorkflowDiscover key="discover" />}
            {activeStep === 2 && <WorkflowModel key="model" />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
