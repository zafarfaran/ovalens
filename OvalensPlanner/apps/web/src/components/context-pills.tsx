"use client";

import { useState, useRef, useEffect, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import type { ContextSnippet } from "@/hooks/useContextSnippets";

const ease = [0.16, 1, 0.3, 1] as const;

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function wordCount(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  if (words < 1000) return `${words} words`;
  return `${(words / 1000).toFixed(1)}k words`;
}

/* ─── Single context card ─── */
const ContextCard = memo(function ContextCard({
  snippet,
  isExpanded,
  onToggle,
  onDismiss,
}: {
  snippet: ContextSnippet;
  isExpanded: boolean;
  onToggle: () => void;
  onDismiss: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    if (!isExpanded || !scrollRef.current) { setCanScroll(false); return; }
    const el = scrollRef.current;
    const check = () => setCanScroll(el.scrollHeight > el.clientHeight + 4);
    // Small delay so framer-motion finishes height animation
    const t = setTimeout(check, 280);
    return () => clearTimeout(t);
  }, [isExpanded]);

  const content = snippet.cleaned_markdown || snippet.markdown_preview;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, y: -6 }}
      transition={{ duration: 0.3, ease }}
      className={`
        rounded-xl border overflow-hidden transition-colors duration-300
        ${isExpanded
          ? "border-brand-300/40 dark:border-brand-700/30 bg-white/70 dark:bg-zinc-900/50 shadow-lg shadow-brand-500/[0.04] dark:shadow-brand-500/[0.02]"
          : "border-brand-200/30 dark:border-brand-800/20 bg-brand-50/40 dark:bg-brand-950/20"
        }
        backdrop-blur-sm
      `}
    >
      {/* ── Header row ── */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 px-3 py-2 text-left group"
      >
        {/* Icon */}
        <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-brand-500/10 dark:bg-brand-500/15 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </span>

        {/* Title + meta */}
        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-medium text-slate-700 dark:text-zinc-300 truncate block leading-tight">
            {snippet.source_title}
          </span>
          <span className="text-[9px] font-light text-slate-400 dark:text-zinc-600">
            {snippet.capture_type === "full_page" ? "Full page" : "Selection"}
            {" \u00B7 "}
            {relativeTime(snippet.created_at)}
            {content && <> {" \u00B7 "} {wordCount(content)}</>}
          </span>
        </div>

        {/* Chevron — rotates when expanded */}
        <motion.span
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.25, ease }}
          className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-slate-400 dark:text-zinc-600"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </motion.span>

        {/* Dismiss */}
        <span
          role="button"
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center text-slate-400 hover:text-slate-600 dark:text-zinc-600 dark:hover:text-zinc-400 hover:bg-slate-200/50 dark:hover:bg-zinc-800/30 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </span>
      </button>

      {/* ── Collapsible content viewer ── */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease }}
            className="overflow-hidden"
          >
            <div className="border-t border-brand-200/20 dark:border-brand-800/10">
              {/* Source URL bar */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50/60 dark:bg-zinc-900/40">
                <svg className="w-2.5 h-2.5 text-slate-400 dark:text-zinc-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                </svg>
                <a
                  href={snippet.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[9px] font-light text-brand-500/70 dark:text-brand-400/60 hover:text-brand-600 dark:hover:text-brand-300 truncate transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  {snippet.source_url}
                </a>
              </div>

              {/* Markdown content area */}
              <div className="relative">
                <div
                  ref={scrollRef}
                  className="px-3.5 py-2.5 max-h-[220px] overflow-y-auto custom-scrollbar"
                  onScroll={() => {
                    if (!scrollRef.current) return;
                    const el = scrollRef.current;
                    setCanScroll(el.scrollHeight - el.scrollTop - el.clientHeight > 4);
                  }}
                >
                  <div className="text-[11px] leading-relaxed text-slate-600 dark:text-zinc-400 [&_h1]:text-[12px] [&_h1]:font-semibold [&_h1]:text-slate-700 [&_h1]:dark:text-zinc-300 [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:text-[11px] [&_h2]:font-semibold [&_h2]:text-slate-700 [&_h2]:dark:text-zinc-300 [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-[11px] [&_h3]:font-medium [&_h3]:text-slate-600 [&_h3]:dark:text-zinc-400 [&_h3]:mt-1.5 [&_h3]:mb-0.5 [&_p]:mb-1.5 [&_ul]:pl-3 [&_ul]:mb-1.5 [&_ol]:pl-3 [&_ol]:mb-1.5 [&_li]:mb-0.5 [&_strong]:font-medium [&_strong]:text-slate-700 [&_strong]:dark:text-zinc-300 [&_code]:text-[10px] [&_code]:bg-slate-100 [&_code]:dark:bg-zinc-800 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_table]:text-[10px] [&_table]:w-full [&_th]:text-left [&_th]:font-medium [&_th]:pb-1 [&_td]:py-0.5 [&_hr]:my-2 [&_hr]:border-slate-200/50 [&_hr]:dark:border-zinc-800/50">
                    <MarkdownRenderer content={content} />
                  </div>
                </div>

                {/* Scroll fade — gradient mask at bottom when more content below */}
                <AnimatePresence>
                  {canScroll && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute bottom-0 left-0 right-0 h-8 pointer-events-none bg-gradient-to-t from-white/90 dark:from-zinc-900/90 to-transparent"
                    />
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

/* ─── Main container ─── */
export const ContextPills = memo(function ContextPills({
  snippets,
  onDismiss,
}: {
  snippets: ContextSnippet[];
  onDismiss: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (snippets.length === 0) return null;

  return (
    <div className="space-y-1.5 mb-2">
      <AnimatePresence mode="popLayout">
        {snippets.map((s) => (
          <ContextCard
            key={s.id}
            snippet={s}
            isExpanded={expandedId === s.id}
            onToggle={() => setExpandedId(expandedId === s.id ? null : s.id)}
            onDismiss={() => onDismiss(s.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
});
