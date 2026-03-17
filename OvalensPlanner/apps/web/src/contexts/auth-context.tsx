"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { clearAllChatStorage } from "@/lib/chat-storage";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmailPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  accessToken: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setIsLoading(false);
      return;
    }
    client.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      const s = data.session;
      setSession(s);
      setUser(s?.user ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event: AuthChangeEvent, s: Session | null) => {
      setSession(s);
      setUser(s?.user ?? null);
      // Clear chat storage whenever session is null so next login gets a fresh chat.
      // Also ensures other tabs clear when user signs out in one tab.
      if (s === null) clearAllChatStorage();
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    let redirectTo: string | undefined;
    if (typeof window !== "undefined") {
      const isLocalhost =
        window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      const base = (isLocalhost ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL?.trim() || window.location.origin).replace(/\/$/, "");
      // After OAuth, always redirect to chat (not landing).
      redirectTo = `${base}/chat`;
    }
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo || undefined },
    });
  }, []);

  const signInWithEmailPassword = useCallback(
    async (email: string, password: string): Promise<{ error: Error | null }> => {
      if (!supabase) return { error: new Error("Auth is not configured") };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error: error ?? null };
    },
    []
  );

  const signUpWithEmailPassword = useCallback(
    async (email: string, password: string): Promise<{ error: Error | null }> => {
      if (!supabase) return { error: new Error("Auth is not configured") };
      const { error } = await supabase.auth.signUp({ email, password });
      return { error: error ?? null };
    },
    []
  );

  const signOut = useCallback(async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } finally {
      // Always clear local chat so next login is fresh, even if signOut fails (e.g. offline).
      clearAllChatStorage();
    }
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    isLoading,
    signInWithGoogle,
    signInWithEmailPassword,
    signUpWithEmailPassword,
    signOut,
    accessToken: session?.access_token ?? null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
