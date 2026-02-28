"use client";

import { useState, useEffect, useCallback } from "react";

import { useApi } from "@/hooks/use-api";

export interface ContextSnippet {
  id: string;
  source_url: string;
  source_title: string;
  capture_type: string;
  markdown_preview: string;
  cleaned_markdown: string;
  created_at: string | null;
}

export function useContextSnippets() {
  const { api, token } = useApi();
  const [snippets, setSnippets] = useState<ContextSnippet[]>([]);

  const fetchPending = useCallback(async () => {
    if (!token) return;
    try {
      const res = await api("/api/context/pending");
      if (!res.ok) return;
      const data = await res.json();
      setSnippets(data.snippets || []);
    } catch {
      // Silently fail — polling
    }
  }, [api, token]);

  const dismiss = useCallback(async (snippetId: string) => {
    if (!token) return;
    try {
      await api(`/api/context/${snippetId}`, { method: "DELETE" });
      setSnippets((prev) => prev.filter((s) => s.id !== snippetId));
    } catch {
      // Silently fail
    }
  }, [api, token]);

  const consumeAll = useCallback(() => {
    // Returns current IDs and clears local state
    // (backend marks them consumed when the message is sent)
    const ids = snippets.map((s) => s.id);
    setSnippets([]);
    return ids;
  }, [snippets]);

  // Fetch when token is ready (avoids 401 on mount after login)
  useEffect(() => {
    if (!token) return;
    fetchPending();
  }, [token, fetchPending]);

  // Refresh when the extension notifies us of new context
  useEffect(() => {
    const handler = () => fetchPending();
    window.addEventListener("helio-context-updated", handler);
    return () => window.removeEventListener("helio-context-updated", handler);
  }, [fetchPending]);

  return { snippets, dismiss, consumeAll };
}
