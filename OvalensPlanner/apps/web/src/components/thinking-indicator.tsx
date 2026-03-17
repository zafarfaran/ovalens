"use client";

import { motion, AnimatePresence } from "framer-motion";
import type { StatusPhase } from "@/hooks/useChat";
import {
  IconLightbulb,
  IconChart,
  IconShield,
  IconCalculator,
  IconSparkles,
  IconSearch,
  IconTrendingUp,
  IconOvalensMark,
} from "@/components/icons";

/* ─── Phase → icon + label mapping ─── */

const PHASE_CONFIG: Record<
  string,
  { icon: React.ReactNode; label: string }
> = {
  understanding: {
    icon: <IconLightbulb className="w-3.5 h-3.5" />,
    label: "Understanding your question...",
  },
  analyzing_income: {
    icon: <IconChart className="w-3.5 h-3.5" />,
    label: "Analysing income sources...",
  },
  checking_allowances: {
    icon: <IconShield className="w-3.5 h-3.5" />,
    label: "Checking allowance status...",
  },
  calculating: {
    icon: <IconCalculator className="w-3.5 h-3.5" />,
    label: "Running tax calculations...",
  },
  computing_tax: {
    icon: <IconCalculator className="w-3.5 h-3.5" />,
    label: "Computing tax position...",
  },
  modelling_scenario: {
    icon: <IconTrendingUp className="w-3.5 h-3.5" />,
    label: "Modelling scenario...",
  },
  building_dashboard: {
    icon: <IconChart className="w-3.5 h-3.5" />,
    label: "Generating detailed dashboard...",
  },
  searching_notes: {
    icon: <IconSearch className="w-3.5 h-3.5" />,
    label: "Searching meeting notes...",
  },
  searching_web: {
    icon: <IconSearch className="w-3.5 h-3.5" />,
    label: "Searching the web...",
  },
  saving_observation: {
    icon: <IconLightbulb className="w-3.5 h-3.5" />,
    label: "Generating observations...",
  },
  generating_response: {
    icon: <IconSparkles className="w-3.5 h-3.5" />,
    label: "Generating response...",
  },
};

/* ─── Component ─── */

interface ThinkingIndicatorProps {
  status: StatusPhase;
  statusMessage: string;
}

export function ThinkingIndicator({ status, statusMessage }: ThinkingIndicatorProps) {
  const isVisible = status !== "idle" && status !== "complete";
  const config = PHASE_CONFIG[status];

  return (
    <AnimatePresence mode="wait">
      {isVisible && config && (
        <motion.div
          key={status}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="py-3"
        >
          <div className="flex items-start gap-3">
            {/* Ovalens avatar — matches assistant message style */}
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-brand-100 to-violet-100 dark:from-brand-900/40 dark:to-violet-900/40 flex items-center justify-center mt-0.5">
              <IconOvalensMark className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            </div>

            {/* Thinking content */}
            <div className="flex items-center gap-2.5 pt-1">
              {/* Pulsing dot */}
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-50" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
              </span>

              {/* Phase icon */}
              <motion.span
                key={`icon-${status}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="text-brand-500 dark:text-brand-400"
              >
                {config.icon}
              </motion.span>

              {/* Phase text */}
              <motion.span
                key={`text-${status}`}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                className="text-[12px] font-light text-slate-500 dark:text-zinc-400"
              >
                {statusMessage || config.label}
              </motion.span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
