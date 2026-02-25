"use client";

import { useState, useEffect, useCallback } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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
  const [snippets, setSnippets] = useState<ContextSnippet[]>([]);

  const fetchPending = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/context/pending`);
      if (!res.ok) return;
      const data = await res.json();
      setSnippets(data.snippets || []);
    } catch {
      // Silently fail — polling
    }
  }, []);

  const dismiss = useCallback(async (snippetId: string) => {
    try {
      await fetch(`${API_BASE}/api/context/${snippetId}`, { method: "DELETE" });
      setSnippets((prev) => prev.filter((s) => s.id !== snippetId));
    } catch {
      // Silently fail
    }
  }, []);

  const consumeAll = useCallback(() => {
    // Returns current IDs and clears local state
    // (backend marks them consumed when the message is sent)
    const ids = snippets.map((s) => s.id);
    setSnippets([]);
    return ids;
  }, [snippets]);

  // Fetch once on mount
  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  // Refresh when the extension notifies us of new context
  useEffect(() => {
    const handler = () => fetchPending();
    window.addEventListener("helio-context-updated", handler);
    return () => window.removeEventListener("helio-context-updated", handler);
  }, [fetchPending]);

  return { snippets, dismiss, consumeAll };
}
