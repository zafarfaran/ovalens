"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
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
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return;
    const redirectTo =
      typeof window !== "undefined"
        ? (process.env.NEXT_PUBLIC_APP_URL?.trim() || window.location.origin).replace(/\/$/, "")
        : undefined;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: redirectTo || undefined },
    });
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const value: AuthContextValue = {
    user,
    session,
    isLoading,
    signInWithGoogle,
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
