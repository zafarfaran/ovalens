"use client";

import { motion } from "framer-motion";
import { TiltCard } from "@/components/motion";

/* ─── Mini chat + dashboard preview (same as landing hero) ─── */

function PreviewBubbleAI({ text }: { text: string }) {
  return (
    <div className="bg-slate-50 dark:bg-zinc-800 rounded-lg rounded-bl-sm p-2.5 text-slate-600 dark:text-zinc-300 leading-relaxed font-light">
      {text}
    </div>
  );
}

function PreviewBubbleUser({ text }: { text: string }) {
  return (
    <div className="bg-brand-500 text-white rounded-lg rounded-br-sm p-2.5 ml-auto max-w-[85%] leading-relaxed font-light">
      {text}
    </div>
  );
}

function PreviewStatCard({
  label,
  value,
  delta,
  negative,
}: {
  label: string;
  value: string;
  delta: string;
  negative?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-slate-200/60 dark:border-zinc-800 p-3">
      <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-light">{label}</div>
      <div className="mt-1 text-sm md:text-base font-medium text-slate-900 dark:text-white font-mono tracking-tight">
        {value}
      </div>
      <div
        className={`mt-0.5 text-[10px] font-light ${negative ? "text-red-500" : "text-emerald-500"}`}
      >
        {delta}
      </div>
    </div>
  );
}

function PreviewAllowanceBar({
  label,
  pct,
  detail,
}: {
  label: string;
  pct: number;
  detail: string;
}) {
  const color =
    pct >= 100
      ? "bg-red-400"
      : pct >= 60
        ? "bg-amber-400"
        : pct > 0
          ? "bg-brand-400"
          : "bg-slate-200 dark:bg-zinc-700";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-slate-600 dark:text-zinc-300 font-light">{label}</span>
        <span className="text-slate-400 dark:text-zinc-500 font-light">{detail}</span>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

function ProductPreviewInner() {
  return (
    <div className="flex h-[300px] md:h-[360px] text-[11px] md:text-xs">
      <div className="w-[38%] border-r border-slate-100 dark:border-zinc-800 flex flex-col">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="font-medium text-slate-700 dark:text-zinc-200">Sarah Mitchell</span>
        </div>
        <div className="flex-1 p-4 space-y-3 overflow-hidden">
          <PreviewBubbleAI text="I've analysed Sarah's 2025/26 position. Employment income of £145,000 with £32,500 in dividends. I've found 3 planning opportunities." />
          <PreviewBubbleUser text="What's the biggest tax saving available?" />
          <PreviewBubbleAI text="Pension contributions — she has £42,000 unused annual allowance. A full contribution could save up to £16,800 in tax." />
        </div>
        <div className="px-4 py-3 border-t border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-800/50 px-3 py-2 text-slate-400 dark:text-zinc-500">
            Ask about your client...
          </div>
        </div>
      </div>
      <div className="flex-1 bg-slate-50/50 dark:bg-zinc-950/50 p-4 md:p-5 space-y-3 overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-700 dark:text-zinc-200 text-xs md:text-sm">
            Tax Summary — 2025/26
          </span>
          <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-light">
            Last updated just now
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <PreviewStatCard label="Total liability" value="£52,847" delta="+£3,200" negative />
          <PreviewStatCard label="Effective rate" value="27.0%" delta="+1.2%" negative />
          <PreviewStatCard label="Opportunities" value="3" delta="£16,800" />
        </div>
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-slate-200/60 dark:border-zinc-800 p-3 space-y-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-zinc-500">
            Allowances
          </span>
          <PreviewAllowanceBar label="Personal Allowance" pct={100} detail="Tapered to £0" />
          <PreviewAllowanceBar label="Pension AA" pct={30} detail="£42,000 remaining" />
          <PreviewAllowanceBar label="ISA" pct={0} detail="£20,000 remaining" />
          <PreviewAllowanceBar label="Dividend" pct={100} detail="£0 remaining" />
        </div>
      </div>
    </div>
  );
}

/** Product preview demo (chat + dashboard) with tilt and floating card. Use on landing or login. */
export function ProductPreviewDemo() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
    >
      <TiltCard
        tiltDegree={2.5}
        className="rounded-xl border border-slate-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-2xl shadow-slate-300/25 dark:shadow-black/50 overflow-hidden"
      >
        <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900">
          <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-zinc-700" />
          <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-zinc-700" />
          <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-zinc-700" />
          <span className="ml-3 text-[10px] font-light text-slate-400 dark:text-zinc-600">
            helio.tax/dashboard
          </span>
        </div>
        <ProductPreviewInner />
      </TiltCard>
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="absolute -bottom-3 -left-3 md:-left-6 z-10"
      >
        <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200/80 dark:border-zinc-800 shadow-lg shadow-slate-200/40 dark:shadow-black/40 px-4 py-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
            <svg viewBox="0 0 16 16" className="w-4 h-4 text-emerald-500">
              <polyline
                points="2 10 6 6 10 9 14 3"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <div className="text-[11px] font-medium text-slate-900 dark:text-white">
              £16,800 saved
            </div>
            <div className="text-[9px] font-light text-emerald-600 dark:text-emerald-400">
              Pension optimisation
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
