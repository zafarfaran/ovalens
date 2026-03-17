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
  completed_action_indices?: number[];
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
  const { api, updateMeetingNote } = useApi();
  const PAGE_SIZE = 10;
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [checkedActions, setCheckedActions] = useState<Record<string, Set<number>>>({});

  const toggleAction = useCallback(
    (noteId: string, index: number) => {
      setCheckedActions((prev) => {
        const set = new Set(prev[noteId] ?? []);
        if (set.has(index)) set.delete(index);
        else set.add(index);
        const next = { ...prev, [noteId]: set };
        const indices = [...set].sort((a, b) => a - b);
        updateMeetingNote(clientId, noteId, { completed_action_indices: indices }).catch(() => {});
        return next;
      });
    },
    [clientId, updateMeetingNote]
  );

  // Sync checked state from server when notes are loaded or refetched
  useEffect(() => {
    setCheckedActions((prev) => {
      let next = prev;
      for (const note of notes) {
        const fromServer = new Set(note.completed_action_indices ?? []);
        const current = prev[note.id];
        const same =
          current &&
          current.size === fromServer.size &&
          [...current].every((i) => fromServer.has(i));
        if (!same) {
          next = next === prev ? { ...prev } : next;
          next[note.id] = fromServer;
        }
      }
      return next;
    });
  }, [notes]);

  const sortedNotes = useMemo(
    () =>
      [...notes].sort((a, b) => {
        const aTs = new Date(a.meeting_date || a.created_at || 0).getTime();
        const bTs = new Date(b.meeting_date || b.created_at || 0).getTime();
        return bTs - aTs;
      }),
    [notes]
  );

  const fetchNotes = useCallback(async (offset = 0, append = false) => {
    if (append) setLoadingMore(true);
    try {
      const res = await api(`/api/clients/${clientId}/meeting-notes?limit=${PAGE_SIZE}&offset=${offset}`);
      const data = await res.json();
      const list = Array.isArray(data?.meeting_notes) ? data.meeting_notes : [];
      if (append) {
        setNotes((prev) => [...prev, ...list]);
      } else {
        setNotes(list);
      }
      setHasMore(Boolean(data?.has_more));
    } catch {
      /* noop */
    } finally {
      if (!append) setLoading(false);
      setLoadingMore(false);
    }
  }, [clientId, api]);

  const loadMoreNotes = useCallback(() => {
    if (loadingMore || !hasMore) return;
    void fetchNotes(notes.length, true);
  }, [loadingMore, hasMore, notes.length, fetchNotes]);

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

  const draftCount = notes.filter((n) => n.is_draft).length;

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
        {expectingNotes && progress && (
          <div className="mx-auto max-w-[520px] text-left">
            <p className="text-[13px] font-medium text-[var(--foreground)] mb-1">
              {progress.label || "Generating your meeting note..."}
            </p>
            <p className="text-[11px] text-[var(--muted)] mb-4">
              {progress.agenda
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
      {/* Unverified notice */}
      {draftCount > 0 && (
        <div className="mb-4 rounded-xl border border-amber-200/60 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-950/30 px-3 py-2.5 flex items-center gap-2">
          <span className="text-[11px] font-medium text-amber-800 dark:text-amber-200">
            {draftCount} meeting note{draftCount !== 1 ? "s" : ""} need{draftCount === 1 ? "s" : ""} review
          </span>
          <span className="text-[10px] text-amber-600/90 dark:text-amber-300/80">
            — Open in Chat to review and publish.
          </span>
        </div>
      )}

      {/* Vertical line */}
      <div className="absolute left-[5px] top-2 bottom-2 w-[2px] bg-[var(--border-subtle)]" />

      <div className="space-y-6">
        {expectingNotes && progress && (
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
                  {(progress.status || "generating").replaceAll("_", " ")}
                </span>
              </div>
              <p className="text-[12px] text-[var(--muted)] mb-3">
                {progress.label || "Meeting ended. Nora is generating the note."}
              </p>
              {typeof progress.percent === "number" && (
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
          const isUnverified = Boolean(note.is_draft);

          return (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, ease, delay: i * 0.05 }}
              className="relative"
            >
              {/* Dot: amber for unverified */}
              <div
                className={`absolute -left-6 top-1.5 w-[10px] h-[10px] rounded-full border-2 bg-[var(--background)] ${
                  isUnverified ? "border-amber-500 dark:border-amber-400" : "border-[var(--accent)]"
                }`}
              />

              <div
                className={`rounded-xl p-4 ${
                  isUnverified
                    ? "border border-amber-200/60 dark:border-amber-800/50 bg-amber-50/40 dark:bg-amber-950/20"
                    : "glass-card"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono text-[var(--muted)]">{dateStr}</span>
                  {note.source === "nora" && (
                    <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-[1px] rounded bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                      Nora AI
                    </span>
                  )}
                  {note.is_draft && (
                    <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-[1px] rounded bg-amber-200/80 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 border border-amber-300/50 dark:border-amber-700/50">
                      Unverified
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
                    <div className="space-y-1.5">
                      {note.action_items.map((item, idx) => {
                        const checked = checkedActions[note.id]?.has(idx) ?? false;
                        return (
                          <label
                            key={`${note.id}-action-${idx}`}
                            className="flex items-start gap-2 cursor-pointer group"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleAction(note.id, idx)}
                              className="mt-0.5 w-4 h-4 rounded border border-[var(--border-subtle)] bg-[var(--background)] text-[var(--accent)] focus:ring-[var(--accent)]/40 cursor-pointer flex-shrink-0"
                            />
                            <span
                              className={`text-[11px] leading-relaxed select-none ${
                                checked
                                  ? "text-[var(--muted)] line-through"
                                  : "text-[var(--foreground)]/80"
                              }`}
                            >
                              {item}
                            </span>
                          </label>
                        );
                      })}
                    </div>
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

        {hasMore && (
          <div className="pt-2">
            <button
              type="button"
              onClick={loadMoreNotes}
              disabled={loadingMore}
              className="text-[11px] font-medium text-slate-500 dark:text-zinc-400 hover:text-brand-500 dark:hover:text-brand-400 disabled:opacity-50 transition-colors"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
