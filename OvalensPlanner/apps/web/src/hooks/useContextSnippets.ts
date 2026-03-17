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

const CONTEXT_PAGE_SIZE = 20;

export function useContextSnippets() {
  const { api, token } = useApi();
  const [snippets, setSnippets] = useState<ContextSnippet[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPending = useCallback(async (offset = 0, append = false) => {
    if (!token) return;
    if (append) setLoadingMore(true);
    try {
      const res = await api(`/api/context/pending?limit=${CONTEXT_PAGE_SIZE}&offset=${offset}`);
      if (!res.ok) return;
      const data = await res.json();
      const list = data.snippets || [];
      if (append) {
        setSnippets((prev) => [...prev, ...list]);
      } else {
        setSnippets(list);
      }
      setHasMore(Boolean(data.has_more));
    } catch {
      // Silently fail — polling
    } finally {
      setLoadingMore(false);
    }
  }, [api, token]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    void fetchPending(snippets.length, true);
  }, [loadingMore, hasMore, snippets.length, fetchPending]);

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

  return { snippets, dismiss, consumeAll, hasMore, loadingMore, loadMore };
}
