"use client";

import { useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { apiFetch, type ApiFetchInit } from "@/lib/api";
import { supabase } from "@/lib/supabase/client";

/**
 * Returns a fetch function that automatically adds the current session's Bearer token.
 * Use for all backend API calls so the API can authenticate and scope by user.
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

  return { api, token: accessToken };
}
