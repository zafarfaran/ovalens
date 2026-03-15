"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { IconFileText } from "@/components/icons";

import { useApi } from "@/hooks/use-api";

interface MeetingNote {
  id: string;
  meeting_date: string | null;
  subject: string;
  attendees: string | null;
  summary: string | null;
  action_items: string[] | null;
  tags: string[] | null;
  source?: string | null;
  session_id?: string | null;
  is_draft?: boolean | null;
  processing_confidence?: number | null;
  processing_duration_ms?: number | null;
  created_at: string | null;
}

const ease = [0.16, 1, 0.3, 1] as const;
const POLL_INTERVAL_MS = 15_000;

export function MeetingNotesTimeline({
  clientId,
  refreshKey = 0,
}: {
  clientId: string;
  refreshKey?: number;
}) {
  const { api } = useApi();
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await api(`/api/clients/${clientId}/meeting-notes`);
      const data = await res.json();
      setNotes(Array.isArray(data?.meeting_notes) ? data.meeting_notes : []);
    } catch {
      /* noop */
    } finally {
      setLoading(false);
    }
  }, [clientId, api]);

  useEffect(() => {
    setLoading(true);
    void fetchNotes();
  }, [fetchNotes, refreshKey]);

  useEffect(() => {
    if (!clientId) return;
    pollRef.current = setInterval(() => void fetchNotes(), POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [clientId, fetchNotes]);

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
                  {note.source === "nora" && (
                    <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-[1px] rounded bg-violet-100 text-violet-700">
                      Nora AI
                    </span>
                  )}
                  {note.is_draft && (
                    <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-[1px] rounded bg-amber-100 text-amber-700">
                      Draft
                    </span>
                  )}
                  {typeof note.processing_confidence === "number" && (
                    <span className="text-[9px] font-medium px-1.5 py-[1px] rounded bg-[var(--surface)] text-[var(--muted)]">
                      {(note.processing_confidence * 100).toFixed(0)}% confidence
                    </span>
                  )}
                </div>
                <h4 className="text-[13px] font-semibold text-[var(--foreground)] mb-1">{note.subject}</h4>
                {note.summary && (
                  <p className="text-[12px] text-[var(--muted)] leading-relaxed">{note.summary}</p>
                )}
                {note.tags && note.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {note.tags.map((tag) => (
                      <span
                        key={`${note.id}-${tag}`}
                        className="text-[10px] px-1.5 py-[1px] rounded bg-[var(--surface)] text-[var(--muted)]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                {note.action_items && note.action_items.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)] mb-1">Action Items</p>
                    <ul className="space-y-1">
                      {note.action_items.map((item, idx) => (
                        <li key={`${note.id}-action-${idx}`} className="text-[11px] text-[var(--foreground)]/80 leading-relaxed">
                          - {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {typeof note.processing_duration_ms === "number" && (
                  <p className="text-[10px] text-[var(--muted)] mt-2">
                    Processed in {(note.processing_duration_ms / 1000).toFixed(1)}s
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
