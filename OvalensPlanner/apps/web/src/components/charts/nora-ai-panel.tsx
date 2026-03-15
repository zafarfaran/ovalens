"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconFileText, IconMic, IconZap } from "@/components/icons";
import { NoraSession, useApi } from "@/hooks/use-api";

const STATUS_STYLES: Record<string, string> = {
  scheduled: "bg-slate-100 text-slate-700",
  joining: "bg-blue-100 text-blue-700",
  recording: "bg-violet-100 text-violet-700",
  processing: "bg-amber-100 text-amber-700",
  ready: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
};

const POLL_INTERVAL_MS = 12_000;
const POLL_WHEN_ACTIVE_MS = 8_000;

export function NoraAIPanel({
  clientId,
  onNoteRefresh,
}: {
  clientId: string;
  onNoteRefresh?: () => void;
}) {
  const {
    startNoraSession,
    listNoraSessions,
    reprocessNoraSession,
    fetchNoraTranscript,
    createNoraMeeting,
    startNoraMeeting,
  } = useApi();
  const noraEnabled = process.env.NEXT_PUBLIC_NORA_ENABLED === "true";
  const [meetingUrl, setMeetingUrl] = useState("");
  const [agenda, setAgenda] = useState("");
  const [sessions, setSessions] = useState<NoraSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [fetchingSessionId, setFetchingSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scheduledFor, setScheduledFor] = useState("");
  const [creating, setCreating] = useState(false);
  const [startingMeetingId, setStartingMeetingId] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadSessions = useCallback(async () => {
    if (!noraEnabled) return;
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
    if (!noraEnabled || !clientId) return;
    const interval = hasActiveSession ? POLL_WHEN_ACTIVE_MS : POLL_INTERVAL_MS;
    pollRef.current = setInterval(() => {
      void loadSessions();
      onNoteRefresh?.();
    }, interval);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [noraEnabled, clientId, hasActiveSession, loadSessions, onNoteRefresh]);

  const latestSession = useMemo(() => sessions[0] ?? null, [sessions]);

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
      await loadSessions();
      onNoteRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start");
    } finally {
      setStarting(false);
    }
  }, [agenda, clientId, meetingUrl, loadSessions, onNoteRefresh, startNoraSession]);

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
      await loadSessions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create meeting");
    } finally {
      setCreating(false);
    }
  }, [agenda, clientId, createNoraMeeting, loadSessions, meetingUrl, scheduledFor]);

  const handleStartScheduledMeeting = useCallback(
    async (meetingId: string) => {
      setStartingMeetingId(meetingId);
      setError(null);
      try {
        await startNoraMeeting(clientId, meetingId);
        await loadSessions();
        onNoteRefresh?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start");
      } finally {
        setStartingMeetingId(null);
      }
    },
    [clientId, loadSessions, onNoteRefresh, startNoraMeeting]
  );

  const handleFetchTranscript = useCallback(
    async (sessionId: string) => {
      setError(null);
      setFetchingSessionId(sessionId);
      try {
        await fetchNoraTranscript(clientId, sessionId);
        await loadSessions();
        onNoteRefresh?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch transcript");
      } finally {
        setFetchingSessionId(null);
      }
    },
    [clientId, fetchNoraTranscript, loadSessions, onNoteRefresh]
  );

  const handleReprocess = useCallback(
    async (sessionId: string) => {
      setError(null);
      try {
        await reprocessNoraSession(clientId, sessionId);
        await loadSessions();
        onNoteRefresh?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to reprocess");
      }
    },
    [clientId, loadSessions, onNoteRefresh, reprocessNoraSession]
  );

  if (!noraEnabled) return null;

  return (
    <div className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass)] backdrop-blur-sm p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <IconMic className="w-4 h-4 text-[var(--accent)]" />
          <h3 className="text-[13px] font-semibold text-[var(--foreground)]">Nora AI</h3>
        </div>
        {latestSession && (
          <span
            className={`text-[10px] font-medium px-2 py-[2px] rounded ${
              STATUS_STYLES[latestSession.status] || "bg-slate-100 text-slate-700"
            }`}
          >
            {latestSession.status}
          </span>
        )}
      </div>

      <p className="text-[11px] text-[var(--muted)]">
        Paste a meeting link and start. When the meeting ends, notes will appear below automatically.
      </p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
        <input
          value={meetingUrl}
          onChange={(e) => setMeetingUrl(e.target.value)}
          placeholder="Paste meeting URL (Zoom, Meet, Teams…)"
          className="w-full px-3 py-2 rounded-lg text-[12px] bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--foreground)] placeholder:text-[var(--muted)]"
        />
        <button
          onClick={() => void handleStart()}
          disabled={starting || !meetingUrl.trim()}
          className="px-4 py-2 rounded-lg text-[12px] font-medium bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-60 shrink-0"
        >
          {starting ? "Starting…" : "Start"}
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          value={agenda}
          onChange={(e) => setAgenda(e.target.value)}
          placeholder="Optional: meeting title or agenda"
          className="flex-1 min-w-0 px-3 py-2 rounded-lg text-[12px] bg-[var(--surface)] border border-[var(--border-subtle)] text-[var(--foreground)] placeholder:text-[var(--muted)]"
        />
      </div>

      <details className="text-[11px] text-[var(--muted)]">
        <summary className="cursor-pointer hover:text-[var(--foreground)]">Schedule for later</summary>
        <div className="mt-2 space-y-2">
          <input
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
            className="w-full px-2 py-1.5 rounded text-[11px] bg-[var(--surface)] border border-[var(--border-subtle)]"
          />
          <button
            onClick={() => void handleCreateMeeting()}
            disabled={creating || !meetingUrl.trim()}
            className="text-[11px] font-medium text-[var(--accent)] hover:underline disabled:opacity-60"
          >
            {creating ? "Creating…" : "Create scheduled meeting"}
          </button>
        </div>
      </details>

      {error && <p className="text-[11px] text-red-500">{error}</p>}

      {sessions.length > 0 && (
        <div className="space-y-2 pt-1 border-t border-[var(--border-subtle)]">
          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
            Recent sessions
          </p>
          {sessions.slice(0, 5).map((s) => (
            <div
              key={s.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-[var(--foreground)] truncate">
                  {s.agenda || "Meeting"}
                </p>
                <p className="text-[10px] text-[var(--muted)]">
                  {s.created_at ? new Date(s.created_at).toLocaleString("en-GB") : "—"}
                  {s.scheduled_for && ` · Scheduled ${new Date(s.scheduled_for).toLocaleString("en-GB")}`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`text-[10px] font-medium px-2 py-[2px] rounded ${
                    STATUS_STYLES[s.status] || "bg-slate-100 text-slate-700"
                  }`}
                >
                  {s.status}
                </span>
                {s.status === "scheduled" && !s.provider_bot_id && (
                  <button
                    onClick={() => void handleStartScheduledMeeting(s.id)}
                    disabled={startingMeetingId === s.id}
                    className="text-[10px] font-medium px-2 py-[2px] rounded bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] disabled:opacity-60"
                  >
                    {startingMeetingId === s.id ? "…" : "Start"}
                  </button>
                )}
                {(s.status === "failed" || s.status === "processing") && (
                  <button
                    onClick={() => void handleReprocess(s.id)}
                    className="text-[10px] font-medium px-2 py-[2px] rounded bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20"
                    title="Retry processing"
                  >
                    <IconZap className="w-3 h-3" />
                  </button>
                )}
                {s.provider_bot_id && !["ready", "failed"].includes(s.status) && (
                  <button
                    onClick={() => void handleFetchTranscript(s.id)}
                    disabled={fetchingSessionId === s.id}
                    className="text-[10px] font-medium px-2 py-[2px] rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 flex items-center gap-1"
                    title="Fetch transcript and create note now (e.g. if webhooks are not set up)"
                  >
                    <IconFileText className="w-3 h-3" />
                    {fetchingSessionId === s.id ? "…" : "Fetch"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
