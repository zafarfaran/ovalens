"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

export function MeetingNotesTimeline({
  clientId,
  refreshKey = 0,
  expectingNotes = false,
  progress = null,
}: {
  clientId: string;
  refreshKey?: number;
  /** When true and there are no notes, show a progress bar and "Generating notes…" */
  expectingNotes?: boolean;
  progress?: {
    status: string;
    label: string;
    percent: number;
    agenda: string | null;
  } | null;
}) {
  const { api } = useApi();
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(true);

  const sortedNotes = useMemo(
    () =>
      [...notes].sort((a, b) => {
        const aTs = new Date(a.meeting_date || a.created_at || 0).getTime();
        const bTs = new Date(b.meeting_date || b.created_at || 0).getTime();
        return bTs - aTs;
      }),
    [notes]
  );

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
        {!expectingNotes && (
          <>
            <IconFileText className="w-6 h-6 mx-auto text-[var(--muted)] mb-2" />
            <p className="text-[13px] font-medium text-[var(--muted)]">No meeting notes yet</p>
            <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
              Meeting notes will appear here as they are added.
            </p>
          </>
        )}
        {expectingNotes && (
          <div className="mx-auto max-w-[520px] text-left">
            <p className="text-[13px] font-medium text-[var(--foreground)] mb-1">
              {progress?.label || "Generating your meeting note..."}
            </p>
            <p className="text-[11px] text-[var(--muted)] mb-4">
              {progress?.agenda
                ? `${progress.agenda} is in progress. This section updates after you refresh.`
                : "Transcript is processing. This section updates after you refresh."}
            </p>
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
              <div className="animate-pulse space-y-3">
                <div className="h-3 w-28 rounded bg-[var(--border-subtle)]" />
                <div className="h-4 w-3/5 rounded bg-[var(--border-subtle)]" />
                <div className="h-3 w-full rounded bg-[var(--border-subtle)]" />
                <div className="h-3 w-11/12 rounded bg-[var(--border-subtle)]" />
                <div className="h-3 w-4/5 rounded bg-[var(--border-subtle)]" />
                <div className="pt-2 border-t border-[var(--border-subtle)]">
                  <div className="h-3 w-24 rounded bg-[var(--border-subtle)] mb-2" />
                  <div className="h-3 w-10/12 rounded bg-[var(--border-subtle)]" />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-[5px] top-2 bottom-2 w-[2px] bg-[var(--border-subtle)]" />

      <div className="space-y-6">
        {expectingNotes && (
          <motion.div
            key="note-processing-placeholder"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, ease }}
            className="relative"
          >
            <div className="absolute -left-6 top-1.5 w-[10px] h-[10px] rounded-full border-2 border-[var(--accent)] bg-[var(--background)]" />
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[10px] font-mono text-[var(--muted)]">
                  In progress
                </span>
                <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-[1px] rounded bg-amber-100 text-amber-700">
                  {(progress?.status || "generating").replaceAll("_", " ")}
                </span>
              </div>
              <p className="text-[12px] text-[var(--muted)] mb-3">
                {progress?.label || "Meeting ended. Nora is generating the note."}
              </p>
              {typeof progress?.percent === "number" && (
                <div className="mb-3 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--border-subtle)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-500 ease-out"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-[var(--muted)]">
                    {progress.percent}%
                  </span>
                </div>
              )}
              <div className="animate-pulse space-y-2">
                <div className="h-3 w-3/5 rounded bg-[var(--border-subtle)]" />
                <div className="h-3 w-full rounded bg-[var(--border-subtle)]" />
                <div className="h-3 w-11/12 rounded bg-[var(--border-subtle)]" />
                <div className="h-3 w-4/5 rounded bg-[var(--border-subtle)]" />
              </div>
            </div>
          </motion.div>
        )}

        {sortedNotes.map((note, i) => {
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
