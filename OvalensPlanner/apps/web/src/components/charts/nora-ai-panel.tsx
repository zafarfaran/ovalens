"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { IconClock, IconMic } from "@/components/icons";
import { NoraSession, useApi } from "@/hooks/use-api";

const STATUS_PROGRESS: Record<string, { percent: number; label: string }> = {
  scheduled: { percent: 0, label: "Scheduled" },
  joining: { percent: 20, label: "Joining meeting" },
  recording: { percent: 50, label: "Recording in progress" },
  processing: { percent: 80, label: "Generating notes" },
  ready: { percent: 100, label: "Notes ready" },
  failed: { percent: 0, label: "Failed" },
};

export function NoraAIPanel({
  clientId,
  onNoteRefresh,
  onActiveChange,
  onProgressChange,
}: {
  clientId: string;
  onNoteRefresh?: () => void;
  onActiveChange?: (active: boolean) => void;
  onProgressChange?: (progress: {
    status: string;
    label: string;
    percent: number;
    agenda: string | null;
  } | null) => void;
}) {
  const {
    startNoraSession,
    listNoraSessions,
    createNoraMeeting,
  } = useApi();

  const noraEnabled = process.env.NEXT_PUBLIC_NORA_ENABLED === "true";

  const [meetingUrl, setMeetingUrl] = useState("");
  const [agenda, setAgenda] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [sessions, setSessions] = useState<NoraSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadSessions = useCallback(async () => {
    if (!noraEnabled || !clientId) return;
    setLoading(true);
    setError(null);
    try {
      const rows = await listNoraSessions(clientId);
      setSessions(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [clientId, listNoraSessions, noraEnabled]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const hasActiveSession = useMemo(
    () =>
      sessions.some((s) =>
        ["joining", "recording", "processing"].includes(s.status)
      ),
    [sessions]
  );

  useEffect(() => {
    onActiveChange?.(hasActiveSession);
    return () => onActiveChange?.(false);
  }, [hasActiveSession, onActiveChange]);

  const activeProgress = useMemo(() => {
    const active = [...sessions]
      .sort((a, b) => {
        const at = new Date(a.created_at || 0).getTime();
        const bt = new Date(b.created_at || 0).getTime();
        return bt - at;
      })
      .find((s) =>
      ["joining", "recording", "processing"].includes(s.status)
    );
    if (!active) return null;
    const p = STATUS_PROGRESS[active.status] ?? { percent: 50, label: "In progress" };
    return { ...p, status: active.status, agenda: active.agenda ?? null };
  }, [sessions]);

  useEffect(() => {
    onProgressChange?.(activeProgress);
    return () => onProgressChange?.(null);
  }, [activeProgress, onProgressChange]);

  const handleManualRefresh = useCallback(async () => {
    await loadSessions();
    onNoteRefresh?.();
  }, [loadSessions, onNoteRefresh]);

  const handleStart = useCallback(async () => {
    if (!meetingUrl.trim()) return;
    setStarting(true);
    setError(null);
    try {
      await startNoraSession(clientId, meetingUrl.trim(), {
        agenda: agenda.trim() || undefined,
      });
      setMeetingUrl("");
      setAgenda("");
      await handleManualRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setStarting(false);
    }
  }, [agenda, clientId, meetingUrl, startNoraSession, handleManualRefresh]);

  const handleCreateMeeting = useCallback(async () => {
    if (!meetingUrl.trim()) return;
    setCreating(true);
    setError(null);
    try {
      await createNoraMeeting(clientId, {
        meetingUrl: meetingUrl.trim(),
        agenda: agenda.trim() || undefined,
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
      });
      await handleManualRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create meeting");
    } finally {
      setCreating(false);
    }
  }, [
    agenda,
    clientId,
    createNoraMeeting,
    handleManualRefresh,
    meetingUrl,
    scheduledFor,
  ]);

  if (!noraEnabled) return null;

  return (
    <div className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass)] backdrop-blur-sm p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--accent)]/15 text-[var(--accent)]">
            <IconMic className="h-4 w-4" />
          </span>
          <div>
            <h3 className="text-[13px] font-semibold tracking-wide text-[var(--foreground)]">
              Meeting Assistant
            </h3>
            <p className="text-[11px] text-[var(--muted)]">
            Start meetings and refresh manually when you want updated status.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void handleManualRefresh()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-medium text-[var(--foreground)] hover:border-[var(--accent)]/40 disabled:opacity-60"
          >
            <IconClock className="h-3.5 w-3.5" />
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]/70 p-3 space-y-2">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <input
            value={meetingUrl}
            onChange={(e) => setMeetingUrl(e.target.value)}
            placeholder="Paste meeting URL (Zoom, Meet, Teams...)"
            className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 py-2 text-[12px] text-[var(--foreground)] placeholder:text-[var(--muted)]"
          />
          <button
            onClick={() => void handleStart()}
            disabled={starting || !meetingUrl.trim()}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[12px] font-medium text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
          >
            {starting ? "Starting..." : "Start now"}
          </button>
        </div>
        <input
          value={agenda}
          onChange={(e) => setAgenda(e.target.value)}
          placeholder="Optional title or agenda"
          className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 py-2 text-[12px] text-[var(--foreground)] placeholder:text-[var(--muted)]"
        />
        <details className="text-[11px] text-[var(--muted)]">
          <summary className="cursor-pointer hover:text-[var(--foreground)]">
            Schedule for later
          </summary>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              className="rounded-md border border-[var(--border-subtle)] bg-[var(--background)] px-2 py-1.5 text-[11px]"
            />
            <button
              onClick={() => void handleCreateMeeting()}
              disabled={creating || !meetingUrl.trim()}
              className="rounded-md border border-[var(--accent)]/40 px-2.5 py-1.5 text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--accent)]/10 disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create schedule"}
            </button>
          </div>
        </details>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-500">
          {error}
        </p>
      )}

    </div>
  );
}
