"use client";

import { useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch, type ApiFetchInit } from "@/lib/api";
import { supabase } from "@/lib/supabase/client";

export interface NoraSession {
  id: string;
  client_id: string;
  provider: string;
  provider_bot_id: string | null;
  status: string;
  agenda: string | null;
  meeting_url?: string | null;
  error_message?: string | null;
  scheduled_for?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  created_at: string | null;
}

/**
 * Returns a fetch function that automatically adds the current session's Bearer token.
 * Use for all backend API calls so the API can authenticate and scope by user.
 *
 * If you get 401 on local dev: ensure the API .env has SUPABASE_JWT_SECRET set to the
 * JWT Secret of the same Supabase project as the web app (Supabase → Settings → API).
 */
export function useApi() {
  const { accessToken } = useAuth();

  const api = useCallback(
    async (path: string, init?: Omit<ApiFetchInit, "token">) => {
      // After OAuth redirect, context can be briefly stale.
      // Read session directly as a fallback to avoid token-less 401 requests.
      let token = accessToken;
      if (!token && supabase) {
        const { data } = await supabase.auth.getSession();
        token = data.session?.access_token ?? null;
      }
      return apiFetch(path, { ...init, token });
    },
    [accessToken]
  );

  const startNoraSession = useCallback(
    async (
      clientId: string,
      meetingUrl: string,
      options?: { agenda?: string; metadata?: Record<string, unknown> }
    ): Promise<NoraSession> => {
      const res = await api(`/api/clients/${clientId}/nora/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meeting_url: meetingUrl,
          ...(options?.agenda ? { agenda: options.agenda } : {}),
          ...(options?.metadata ? { metadata: options.metadata } : {}),
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg = errBody?.detail ?? `Failed to start Nora session (${res.status})`;
        throw new Error(typeof msg === "string" ? msg : "Failed to start Nora session");
      }
      return res.json();
    },
    [api]
  );

  const listNoraSessions = useCallback(
    async (clientId: string): Promise<NoraSession[]> => {
      const res = await api(`/api/clients/${clientId}/nora/sessions`);
      if (!res.ok) {
        throw new Error(`Failed to list Nora sessions (${res.status})`);
      }
      const data = await res.json();
      return Array.isArray(data?.sessions) ? data.sessions : [];
    },
    [api]
  );

  const createNoraMeeting = useCallback(
    async (
      clientId: string,
      body: {
        meetingUrl: string;
        agenda?: string;
        scheduledFor?: string;
        metadata?: Record<string, unknown>;
      }
    ): Promise<NoraSession> => {
      const res = await api(`/api/clients/${clientId}/nora/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meeting_url: body.meetingUrl,
          ...(body.agenda ? { agenda: body.agenda } : {}),
          ...(body.scheduledFor ? { scheduled_for: body.scheduledFor } : {}),
          ...(body.metadata ? { metadata: body.metadata } : {}),
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg = errBody?.detail ?? `Failed to create Nora meeting (${res.status})`;
        throw new Error(typeof msg === "string" ? msg : "Failed to create Nora meeting");
      }
      return res.json();
    },
    [api]
  );

  const startNoraMeeting = useCallback(
    async (clientId: string, meetingId: string): Promise<NoraSession> => {
      const res = await api(`/api/clients/${clientId}/nora/meetings/${meetingId}/start`, {
        method: "POST",
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg = errBody?.detail ?? `Failed to start Nora meeting (${res.status})`;
        throw new Error(typeof msg === "string" ? msg : "Failed to start Nora meeting");
      }
      return res.json();
    },
    [api]
  );

  const reprocessNoraSession = useCallback(
    async (clientId: string, sessionId: string): Promise<{ success: boolean; note_id?: string }> => {
      const res = await api(`/api/clients/${clientId}/nora/sessions/${sessionId}/process`, {
        method: "POST",
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg = errBody?.detail ?? `Failed to process Nora session (${res.status})`;
        throw new Error(typeof msg === "string" ? msg : "Failed to process session");
      }
      return res.json();
    },
    [api]
  );

  const fetchNoraTranscript = useCallback(
    async (
      clientId: string,
      sessionId: string
    ): Promise<{ success: boolean; note_id?: string; queued?: boolean; chunks_saved?: number; message?: string }> => {
      const res = await api(
        `/api/clients/${clientId}/nora/sessions/${sessionId}/fetch-transcript`,
        { method: "POST" }
      );
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const msg = errBody?.detail ?? `Failed to fetch transcript (${res.status})`;
        throw new Error(typeof msg === "string" ? msg : "Failed to fetch transcript");
      }
      return res.json();
    },
    [api]
  );

  return {
    api,
    token: accessToken,
    startNoraSession,
    listNoraSessions,
    reprocessNoraSession,
    fetchNoraTranscript,
    createNoraMeeting,
    startNoraMeeting,
  };
}
