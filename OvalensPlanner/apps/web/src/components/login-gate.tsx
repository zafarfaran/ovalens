"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { ThemeToggle } from "@/components/theme-provider";
import { OvalensLogo, IconEye, IconEyeOff } from "@/components/icons";
import { HowItWorksDemo } from "@/components/how-it-works-demo";

/** Routes that are visible without signing in */
const PUBLIC_PATHS = ["/", "/security"];

const ease = [0.16, 1, 0.3, 1] as const;

export function LoginGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, isLoading, signInWithGoogle, signInWithEmailPassword } = useAuth();
  // const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // const [authSuccess, setAuthSuccess] = useState<string | null>(null);

  const isPublic = pathname != null && PUBLIC_PATHS.includes(pathname);
  if (isPublic) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-3"
        >
          <div className="w-8 h-8 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin" />
          <p className="text-[13px] font-light text-[var(--muted-foreground)]">Loading…</p>
        </motion.div>
      </div>
    );
  }

  if (!session) {
    const supabaseConfigured =
      typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
      process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0;

    return (
      <div className="min-h-screen flex flex-col bg-[var(--background)]">
        {/* ── Background (match landing hero) ── */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-dots opacity-30" />
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-brand-200/20 dark:bg-brand-800/10 blur-[120px]" />
          <div className="absolute -bottom-40 -left-20 w-[400px] h-[400px] rounded-full bg-violet-200/15 dark:bg-violet-900/10 blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-brand-300/5 dark:bg-brand-900/5 blur-[100px]" />
        </div>

        {/* ── Top bar ── */}
        <header className="relative z-10 flex items-center justify-between px-6 md:px-12 h-16 border-b border-slate-200/50 dark:border-zinc-800/50 backdrop-blur-xl bg-white/80 dark:bg-zinc-950/80">
          <Link href="/" className="text-slate-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] rounded">
            <OvalensLogo className="h-7" />
          </Link>
          <ThemeToggle />
        </header>

        {/* ── Main content: left = how it works, right = sign-in panel ── */}
        <main className="relative z-10 flex-1 flex min-h-0">
          {/* Left: How it works demo — hidden on small screens */}
          <div className="hidden lg:flex flex-1 min-w-0 items-center justify-center p-8 md:p-12 lg:p-16 overflow-auto">
            <div className="w-full max-w-[900px] min-w-0">
              <HowItWorksDemo />
            </div>
          </div>

          {/* Right: sign-in panel (full-height, not a card) */}
          <motion.aside
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease }}
            className="w-full lg:w-[420px] lg:min-w-[380px] lg:flex-shrink-0 flex flex-col border-t lg:border-t-0 lg:border-l border-slate-200/70 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-sm"
          >
            <div className="flex-1 flex flex-col justify-center p-8 md:p-10 max-w-[400px] mx-auto lg:mx-0 lg:max-w-none w-full">
            {/* Title with gradient accent */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease }}
              className="text-2xl md:text-[1.75rem] tracking-tight font-normal text-slate-900 dark:text-white"
            >
              Sign in to{" "}
              <span className="bg-gradient-to-r from-brand-500 via-brand-400 to-violet-500 bg-clip-text text-transparent font-medium">
                Ovalens
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2, ease }}
              className="mt-2 text-[13px] font-light text-slate-500 dark:text-zinc-400 leading-relaxed"
            >
              Access tax intelligence for your clients. One sign-in for chat, clients, and reports.
            </motion.p>

            {/* Accent line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.5, delay: 0.25, ease }}
              className="w-12 h-px bg-gradient-to-r from-brand-500 to-transparent origin-left mt-6 mb-8"
            />

            {!supabaseConfigured && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mb-4 text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30 rounded-lg px-3 py-2"
              >
                Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY to enable sign-in.
              </motion.p>
            )}

            {supabaseConfigured && (
              <motion.form
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35, ease }}
                className="space-y-4"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setAuthError(null);
                  // setAuthSuccess(null);
                  if (!email.trim() || !password) {
                    setAuthError("Please enter email and password.");
                    return;
                  }
                  setAuthLoading(true);
                  const { error } = await signInWithEmailPassword(email.trim(), password);
                  setAuthLoading(false);
                  if (error) {
                    setAuthError(error.message);
                    return;
                  }
                }}
              >
                <div>
                  <label htmlFor="login-email" className="sr-only">
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl border border-slate-300/80 dark:border-zinc-700/80 bg-slate-50 dark:bg-[#0c0c0f] text-slate-900 dark:text-zinc-100 text-[13px] font-light py-3.5 px-4 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] dark:[&:-webkit-autofill]:!bg-[#0c0c0f] dark:[&:-webkit-autofill]:!text-zinc-100"
                  />
                </div>
                <div className="relative">
                  <label htmlFor="login-password" className="sr-only">
                    Password
                  </label>
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-300/80 dark:border-zinc-700/80 bg-slate-50 dark:bg-[#0c0c0f] text-slate-900 dark:text-zinc-100 text-[13px] font-light py-3.5 pl-4 pr-11 placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] dark:[&:-webkit-autofill]:!bg-[#0c0c0f] dark:[&:-webkit-autofill]:!text-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-700 dark:text-zinc-100 hover:text-slate-900 dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                  >
                    {showPassword ? (
                      <IconEyeOff className="w-4 h-4" />
                    ) : (
                      <IconEye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {authError && (
                  <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/30 rounded-lg px-3 py-2">
                    {authError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full rounded-xl border border-transparent bg-slate-900 dark:bg-zinc-700 text-white dark:text-white text-[13px] font-medium py-3.5 px-4 transition-all duration-200 hover:bg-slate-800 dark:hover:bg-zinc-600 hover:shadow-md hover:shadow-slate-300/30 dark:hover:shadow-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {authLoading ? "Signing in..." : "Sign in with email"}
                </button>
              </motion.form>
            )}

            {supabaseConfigured && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.45 }}
                className="relative my-6"
              >
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-300/70 dark:border-zinc-700/70" />
                </div>
                <div className="relative flex justify-center text-[11px]">
                  <span className="bg-white dark:bg-zinc-900 px-3 text-slate-500 dark:text-zinc-400">or continue with</span>
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5, ease }}
            >
              <button
                type="button"
                onClick={() => signInWithGoogle()}
                disabled={!supabaseConfigured}
                className="group relative w-full flex items-center justify-center gap-3 rounded-xl border border-slate-300/80 dark:border-zinc-800 dark:bg-zinc-950 bg-slate-50 hover:bg-white dark:hover:bg-zinc-900 text-slate-700 dark:text-zinc-200 text-[13px] font-medium py-3.5 px-4 transition-all duration-200 hover:shadow-md hover:shadow-slate-300/20 dark:hover:shadow-black/20 hover:border-slate-300 dark:hover:border-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:opacity-50"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>
            </motion.div>

            {/* Create account toggle (hidden for now)
            {supabaseConfigured && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.55 }}
                className="mt-4 text-center"
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setAuthError(null);
                    // setAuthSuccess(null);
                  }}
                  className="text-[12px] font-light text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  {isSignUp ? "Already have an account? Sign in" : "Don’t have an account? Create one"}
                </button>
              </motion.p>
            )}
            */}

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.5 }}
              className="mt-6 text-[11px] font-light text-slate-400 dark:text-zinc-500 text-center"
            >
              By signing in you agree to our terms and privacy policy.
            </motion.p>
            </div>
          </motion.aside>
        </main>
      </div>
    );
  }

  return <>{children}</>;
}
