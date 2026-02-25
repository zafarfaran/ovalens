"use client";

import { motion } from "framer-motion";

export type TabId = "profile" | "overview" | "breakdown" | "intelligence" | "notes";

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: "profile", label: "Profile" },
  { id: "overview", label: "Overview" },
  { id: "breakdown", label: "Breakdown" },
  { id: "intelligence", label: "Intelligence" },
  { id: "notes", label: "Notes" },
];

export function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (id: TabId) => void;
}) {
  return (
    <div className="flex items-center gap-6 mb-8 border-b border-slate-100 dark:border-zinc-800/50">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative pb-3 text-[13px] font-medium transition-colors duration-150 ${
            active === tab.id
              ? "text-slate-900 dark:text-white"
              : "text-slate-400 dark:text-zinc-500 hover:text-slate-700 dark:hover:text-zinc-300"
          }`}
        >
          {tab.label}
          {active === tab.id && (
            <motion.div
              layoutId="tab-underline"
              className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-gradient-to-r from-brand-400 to-violet-400"
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
            />
          )}
        </button>
      ))}
    </div>
  );
}
