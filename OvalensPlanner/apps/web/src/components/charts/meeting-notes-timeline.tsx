"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { IconFileText } from "@/components/icons";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface MeetingNote {
  id: string;
  meeting_date: string | null;
  subject: string;
  attendees: string | null;
  summary: string | null;
  action_items: string | null;
  tags: string | null;
  created_at: string | null;
}

const ease = [0.16, 1, 0.3, 1] as const;

export function MeetingNotesTimeline({ clientId }: { clientId: string }) {
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/clients/${clientId}/meeting-notes`);
        const data = await res.json();
        if (!cancelled) setNotes(data.meeting_notes || []);
      } catch { /* noop */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [clientId]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="w-3 h-3 rounded-full bg-[var(--surface)] mt-1" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 rounded bg-[var(--surface)]" />
              <div className="h-12 rounded bg-[var(--surface)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--glass-border)] bg-[var(--glass)] backdrop-blur-sm p-10 text-center">
        <IconFileText className="w-6 h-6 mx-auto text-[var(--muted)] mb-2" />
        <p className="text-[13px] font-medium text-[var(--muted)]">No meeting notes yet</p>
        <p className="text-[11px] text-[var(--muted-foreground)] mt-1">Meeting notes will appear here as they are added.</p>
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-[5px] top-2 bottom-2 w-[2px] bg-[var(--border-subtle)]" />

      <div className="space-y-6">
        {notes.map((note, i) => {
          const dateStr = note.meeting_date
            ? new Date(note.meeting_date).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })
            : "No date";

          return (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease, delay: i * 0.05 }}
              className="relative"
            >
              {/* Dot */}
              <div className="absolute -left-6 top-1.5 w-[10px] h-[10px] rounded-full border-2 border-[var(--accent)] bg-[var(--background)]" />

              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono text-[var(--muted)]">{dateStr}</span>
                  {note.tags && (
                    <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-[1px] rounded bg-[var(--surface)] text-[var(--muted)]">
                      {note.tags}
                    </span>
                  )}
                </div>
                <h4 className="text-[13px] font-semibold text-[var(--foreground)] mb-1">{note.subject}</h4>
                {note.summary && (
                  <p className="text-[12px] text-[var(--muted)] leading-relaxed">{note.summary}</p>
                )}
                {note.action_items && (
                  <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)] mb-1">Action Items</p>
                    <p className="text-[11px] text-[var(--foreground)]/80 leading-relaxed">{note.action_items}</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
