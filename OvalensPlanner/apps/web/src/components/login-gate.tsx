"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/auth-context";
import { ThemeToggle } from "@/components/theme-provider";
import { OvalensLogo } from "@/components/icons";
import { HowItWorksDemo } from "@/components/how-it-works-demo";

/** Routes that are visible without signing in */
const PUBLIC_PATHS = ["/"];

const ease = [0.16, 1, 0.3, 1] as const;

export function LoginGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { session, isLoading, signInWithGoogle } = useAuth();

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
            className="w-full lg:w-[420px] lg:min-w-[380px] lg:flex-shrink-0 flex flex-col border-t lg:border-t-0 lg:border-l border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900/95 backdrop-blur-sm"
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

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35, ease }}
            >
              <button
                type="button"
                onClick={() => signInWithGoogle()}
                className="group relative w-full flex items-center justify-center gap-3 rounded-xl border border-slate-200/80 dark:border-zinc-700 bg-white dark:bg-zinc-800/80 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-[13px] font-medium py-3.5 px-4 transition-all duration-200 hover:shadow-lg hover:shadow-slate-200/30 dark:hover:shadow-black/20 hover:border-slate-300 dark:hover:border-zinc-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
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
