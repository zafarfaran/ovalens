"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
  useInView,
  useMotionValue,
  useSpring,
} from "framer-motion";
import { useRef, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  FadeUp,
  FadeIn,
  StaggerChildren,
  staggerItem,
  AnimatedCounter,
  TiltCard,
  RevealMask,
} from "@/components/motion";
import { ThemeToggle } from "@/components/theme-provider";
import { HowItWorksDemo } from "@/components/how-it-works-demo";
import {
  OvalensLogo,
  IconCalculator,
  IconShield,
  IconChart,
  IconLightbulb,
  IconArrowRight,
  IconZap,
  IconGlobe,
  IconDatabase,
  IconCheck,
} from "@/components/icons";

const CALENDLY_URL = "https://calendly.com/admin-ovalens";

/* ═══════════════════════════════════════════════════
   NAVBAR
   ═══════════════════════════════════════════════════ */

function Navbar() {
  return (
    <motion.nav
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/50 dark:border-zinc-800/50 backdrop-blur-xl"
      style={{ backgroundColor: "var(--nav-bg)" }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
        <Link href="/" className="text-slate-900 dark:text-white">
          <OvalensLogo />
        </Link>

        <div className="hidden md:flex items-center gap-8 text-[13px] font-light tracking-wide text-slate-500 dark:text-zinc-400">
          <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Features
          </a>
          <a href="#integrations" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Integrations
          </a>
          <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            How it works
          </a>
          <a href="#pricing" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Pricing
          </a>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/chat"
            className="hidden sm:block text-[13px] font-light text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors px-3 py-2"
          >
            Sign in
          </Link>
          <a
            href={CALENDLY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-normal bg-slate-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-lg hover:bg-slate-800 dark:hover:bg-zinc-100 transition-colors"
          >
            Book a call
          </a>
        </div>
      </div>
    </motion.nav>
  );
}

/* ═══════════════════════════════════════════════════
   HERO — asymmetric editorial layout
   ═══════════════════════════════════════════════════ */

function Hero() {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const previewY = useTransform(scrollYProgress, [0, 1], [0, 40]);
  const bgOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  /* Mouse-following ambient glow */
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.3);
  const smoothX = useSpring(mouseX, { stiffness: 40, damping: 30 });
  const smoothY = useSpring(mouseY, { stiffness: 40, damping: 30 });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      mouseX.set((e.clientX - rect.left) / rect.width);
      mouseY.set((e.clientY - rect.top) / rect.height);
    },
    [mouseX, mouseY]
  );

  /* Headline characters for stagger animation */
  const line1 = "Tax planning,";
  const line2 = "reimagined.";

  return (
    <section
      ref={sectionRef}
      onMouseMove={handleMouseMove}
      className="relative min-h-[100vh] flex items-center overflow-hidden"
    >
      {/* ── Ambient glow that follows cursor ── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ opacity: bgOpacity }}
      >
        <motion.div
          className="absolute w-[700px] h-[700px] rounded-full pointer-events-none"
          style={{
            left: useTransform(smoothX, (v) => `${v * 100 - 35}%`),
            top: useTransform(smoothY, (v) => `${v * 100 - 35}%`),
            background:
              "radial-gradient(circle, rgba(92,124,250,0.08) 0%, rgba(92,124,250,0.02) 40%, transparent 70%)",
          }}
        />
        {/* Subtle dot pattern */}
        <div className="absolute inset-0 bg-dots opacity-30" />
        {/* Fixed accent orb (top-right) */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-brand-200/20 dark:bg-brand-800/10 blur-[120px]" />
        {/* Fixed accent orb (bottom-left) */}
        <div className="absolute -bottom-40 -left-20 w-[400px] h-[400px] rounded-full bg-violet-200/15 dark:bg-violet-900/10 blur-[100px]" />
      </motion.div>

      {/* ── Main content grid ── */}
      <div className="relative w-full max-w-7xl mx-auto px-6 md:px-12 pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="grid md:grid-cols-12 gap-8 md:gap-6 items-center">
          {/* ── Left: Text content ── */}
          <motion.div
            style={{ y: contentY }}
            className="md:col-span-6 lg:col-span-5"
          >
            {/* Status badge */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="mb-8"
            >
              <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full border border-slate-200/80 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-light tracking-wide text-slate-500 dark:text-zinc-400">
                  Built for UK financial advisers
                </span>
              </div>
            </motion.div>

            {/* Headline — character-by-character reveal + sweep */}
            <h1 className="mb-7">
              {/* Line 1: "Tax planning," — CSS-driven character stagger */}
              <span className="block text-[2.75rem] sm:text-[3.5rem] md:text-[3.75rem] lg:text-[4.25rem] tracking-tight leading-[1.05] font-extralight text-slate-900 dark:text-white">
                {line1.split("").map((char, i) => (
                  <span
                    key={i}
                    className="inline-block animate-char-rise will-change-transform"
                    style={{ animationDelay: `${200 + i * 35}ms` }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </span>
                ))}
              </span>

              {/* Line 2: "reimagined." — CSS clip-path sweep reveal with shimmer */}
              <span className="block relative text-[2.75rem] sm:text-[3.5rem] md:text-[3.75rem] lg:text-[4.25rem] tracking-tight leading-[1.05]">
                <span className="invisible font-normal">{line2}</span>
                <span
                  className="absolute inset-0 font-normal bg-gradient-to-r from-brand-500 via-brand-400 to-violet-500 bg-clip-text text-transparent animate-text-reveal will-change-[clip-path]"
                >
                  {line2}
                </span>
                <span className="absolute top-0 bottom-0 w-[3px] rounded-full bg-brand-400 shadow-[0_0_16px_4px_rgba(92,124,250,0.4)] animate-sweep-bar will-change-[left,opacity]" />
              </span>
            </h1>

            {/* Animated accent line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{
                duration: 0.8,
                delay: 0.5,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="w-16 h-px bg-gradient-to-r from-brand-500 to-transparent origin-left mb-7"
            />

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="text-[15px] md:text-base font-light text-slate-500 dark:text-zinc-400 leading-relaxed max-w-md"
            >
              Model tax scenarios in seconds, surface AI-driven savings
              opportunities, and pull research context straight from your
              browser — Ovalens is the tax intelligence platform built for
              UK financial advisers.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="mt-10 flex items-center gap-4"
            >
              <a
                href={CALENDLY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative inline-flex items-center gap-2.5 bg-slate-900 dark:bg-white text-white dark:text-zinc-900 text-[13px] font-normal px-6 py-3 rounded-lg transition-all duration-300 hover:bg-slate-800 dark:hover:bg-zinc-100 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-slate-300/30 dark:hover:shadow-black/30 overflow-hidden"
              >
                {/* Subtle shimmer on hover */}
                <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/10 dark:via-black/10 to-transparent" />
                <span className="relative">Book a call</span>
                <IconArrowRight className="relative w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </a>
              <a
                href="#how-it-works"
                className="text-[13px] font-light text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition-colors px-3 py-3"
              >
                See how it works
              </a>
            </motion.div>

            {/* Micro social proof — commented out
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.85 }}
              className="mt-12 flex items-center gap-3"
            >
              <div className="flex -space-x-2">
                {["JR", "SM", "AT", "KL"].map((initials, i) => (
                  <div
                    key={i}
                    className="w-7 h-7 rounded-full border-2 border-white dark:border-zinc-950 bg-slate-200 dark:bg-zinc-700 flex items-center justify-center text-[8px] font-medium text-slate-500 dark:text-zinc-400"
                  >
                    {initials}
                  </div>
                ))}
              </div>
              <span className="text-[11px] font-light text-slate-400 dark:text-zinc-500">
                Trusted by 120+ advisers
              </span>
            </motion.div>
            */}
          </motion.div>

          {/* ── Right: Product preview — floating with perspective ── */}
          <motion.div
            style={{ y: previewY }}
            className="md:col-span-6 lg:col-span-7 md:pl-4"
          >
            <motion.div
              initial={{ opacity: 0, x: 40, rotateY: -4 }}
              animate={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{
                duration: 1,
                delay: 0.3,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{ transformPerspective: 1200 }}
            >
              <TiltCard tiltDegree={2.5} className="rounded-xl border border-slate-200/60 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 shadow-2xl shadow-slate-300/25 dark:shadow-black/50 overflow-hidden">
                {/* Window chrome */}
                <div className="flex items-center gap-1.5 px-4 py-2.5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900">
                  <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-zinc-700" />
                  <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-zinc-700" />
                  <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-zinc-700" />
                  <span className="ml-3 text-[10px] font-light text-slate-400 dark:text-zinc-600">
                    helio.tax/dashboard
                  </span>
                </div>
                <ProductPreview />
              </TiltCard>

              {/* Floating accent card — overlapping bottom-left */}
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
                className="hidden md:block absolute -bottom-4 -left-4 md:-left-8 z-10"
              >
                <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-lg border border-slate-200/80 dark:border-zinc-800 shadow-lg shadow-slate-200/40 dark:shadow-black/40 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center">
                    <svg viewBox="0 0 16 16" className="w-4 h-4 text-emerald-500">
                      <polyline
                        points="2 10 6 6 10 9 14 3"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <div className="text-[11px] font-medium text-slate-900 dark:text-white">£16,800 saved</div>
                    <div className="text-[9px] font-light text-emerald-600 dark:text-emerald-400">Pension optimisation</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* ── Scroll indicator ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
          className="hidden md:flex flex-col items-center gap-2 absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg viewBox="0 0 16 24" className="w-4 h-6 text-slate-300 dark:text-zinc-700">
              <rect x="1" y="1" width="14" height="22" rx="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <motion.circle
                cx="8"
                cy="8"
                r="2"
                fill="currentColor"
                animate={{ cy: [7, 14, 7] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
              />
            </svg>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   PRODUCT PREVIEW (embedded mini dashboard)
   ═══════════════════════════════════════════════════ */

function ProductPreview() {
  return (
    <div className="flex flex-col md:flex-row min-h-[420px] md:h-[420px] text-[10px] sm:text-[11px] md:text-xs">
      {/* Chat side */}
      <div className="w-full md:w-[38%] border-b md:border-b-0 md:border-r border-slate-100 dark:border-zinc-800 flex flex-col">
        <div className="px-3 sm:px-4 py-3 border-b border-slate-100 dark:border-zinc-800 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="font-medium text-slate-700 dark:text-zinc-200">Sarah Mitchell</span>
        </div>
        <div className="flex-1 p-3 sm:p-4 space-y-2.5 sm:space-y-3 overflow-hidden">
          <PreviewBubbleAI text="I've analysed Sarah's 2025/26 position. Employment income of £145,000 with £32,500 in dividends. I've found 3 planning opportunities." />
          <PreviewBubbleUser text="What's the biggest tax saving available?" />
          <PreviewBubbleAI text="Pension contributions — she has £42,000 unused annual allowance. A full contribution could save up to £16,800 in tax." />
        </div>
        <div className="px-3 sm:px-4 py-3 border-t border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-800/50 px-3 py-2 text-[10px] sm:text-[11px] text-slate-400 dark:text-zinc-500">
            Ask about your client...
          </div>
        </div>
      </div>

      {/* Dashboard side */}
      <div className="flex-1 bg-slate-50/50 dark:bg-zinc-950/50 p-3 sm:p-4 md:p-6 space-y-3 md:space-y-4 overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-700 dark:text-zinc-200 text-[11px] sm:text-xs md:text-sm">Tax Summary — 2025/26</span>
          <span className="text-[9px] sm:text-[10px] text-slate-400 dark:text-zinc-500 font-light">Last updated just now</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <PreviewStatCard label="Total liability" value="£52,847" delta="+£3,200" negative />
          <PreviewStatCard label="Effective rate" value="27.0%" delta="+1.2%" negative />
          <PreviewStatCard label="Opportunities" value="3" delta="£16,800" />
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-slate-200/60 dark:border-zinc-800 p-3 md:p-4 space-y-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-zinc-500">Allowances</span>
          <PreviewAllowanceBar label="Personal Allowance" pct={100} detail="Tapered to £0" />
          <PreviewAllowanceBar label="Pension AA" pct={30} detail="£42,000 remaining" />
          <PreviewAllowanceBar label="ISA" pct={0} detail="£20,000 remaining" />
          <PreviewAllowanceBar label="Dividend" pct={100} detail="£0 remaining" />
        </div>
      </div>
    </div>
  );
}

function PreviewBubbleAI({ text }: { text: string }) {
  return (
    <div className="bg-slate-50 dark:bg-zinc-800 rounded-lg rounded-bl-sm p-2.5 text-slate-600 dark:text-zinc-300 leading-relaxed font-light">
      {text}
    </div>
  );
}

function PreviewBubbleUser({ text }: { text: string }) {
  return (
    <div className="bg-brand-500 text-white rounded-lg rounded-br-sm p-2.5 ml-auto max-w-[85%] leading-relaxed font-light">
      {text}
    </div>
  );
}

function PreviewStatCard({ label, value, delta, negative }: { label: string; value: string; delta: string; negative?: boolean }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-slate-200/60 dark:border-zinc-800 p-3">
      <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-light">{label}</div>
      <div className="mt-1 text-sm md:text-base font-medium text-slate-900 dark:text-white font-mono tracking-tight">{value}</div>
      <div className={`mt-0.5 text-[10px] font-light ${negative ? "text-red-500" : "text-emerald-500"}`}>{delta}</div>
    </div>
  );
}

function PreviewAllowanceBar({ label, pct, detail }: { label: string; pct: number; detail: string }) {
  const color = pct >= 100 ? "bg-red-400" : pct >= 60 ? "bg-amber-400" : pct > 0 ? "bg-brand-400" : "bg-slate-200 dark:bg-zinc-700";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-slate-600 dark:text-zinc-300 font-light">{label}</span>
        <span className="text-slate-400 dark:text-zinc-500 font-light">{detail}</span>
      </div>
      <div className="h-1.5 bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(pct, 2)}%` }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   LOGOS / SOCIAL PROOF — SVG firm logos + marquee
   ═══════════════════════════════════════════════════ */

/* Each firm gets a proper logo: unique mark + wordmark */

function LogoMeridian() {
  return (
    <svg viewBox="0 0 160 28" className="h-6 md:h-7" fill="currentColor">
      {/* Compass mark */}
      <circle cx="14" cy="14" r="11" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <line x1="14" y1="4" x2="14" y2="24" stroke="currentColor" strokeWidth="1.3" />
      <line x1="4" y1="14" x2="24" y2="14" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="14" cy="14" r="2.5" fill="currentColor" />
      {/* Wordmark */}
      <text x="34" y="18.5" fontSize="14" fontWeight="300" fontFamily="inherit" letterSpacing="0.06em">MERIDIAN</text>
    </svg>
  );
}

function LogoAshworth() {
  return (
    <svg viewBox="0 0 170 28" className="h-6 md:h-7" fill="currentColor">
      {/* Stylised A lettermark */}
      <polygon points="14,3 24,25 20.5,25 18,19 10,19 7.5,25 4,25" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <line x1="11" y1="16" x2="17" y2="16" stroke="currentColor" strokeWidth="1.3" />
      {/* Wordmark */}
      <text x="33" y="18" fontSize="14" fontWeight="400" fontFamily="inherit" letterSpacing="-0.02em">Ashworth</text>
      <text x="107" y="18" fontSize="10" fontWeight="300" fontFamily="inherit" opacity="0.5" letterSpacing="0.01em">&amp; Partners</text>
    </svg>
  );
}

function LogoKingsford() {
  return (
    <svg viewBox="0 0 150 28" className="h-6 md:h-7" fill="currentColor">
      {/* Crown / chevron mark */}
      <polyline points="4,20 9,8 14,15 19,8 24,20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="4" y1="22" x2="24" y2="22" stroke="currentColor" strokeWidth="1.3" />
      {/* Wordmark */}
      <text x="34" y="18" fontSize="13.5" fontWeight="500" fontFamily="inherit" letterSpacing="0.04em">KINGSFORD</text>
    </svg>
  );
}

function LogoThornbury() {
  return (
    <svg viewBox="0 0 160 28" className="h-6 md:h-7" fill="currentColor">
      {/* Abstract leaf / thorn */}
      <path d="M14,4 C14,4 24,10 24,18 C24,22 20,24 14,24 C8,24 4,22 4,18 C4,10 14,4 14,4Z" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <path d="M14,8 L14,20" stroke="currentColor" strokeWidth="1" />
      <path d="M10,14 L14,11 L18,14" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
      {/* Wordmark */}
      <text x="34" y="18" fontSize="14" fontWeight="300" fontFamily="inherit" letterSpacing="0.01em">Thornbury</text>
    </svg>
  );
}

function LogoWavecrest() {
  return (
    <svg viewBox="0 0 156 28" className="h-6 md:h-7" fill="currentColor">
      {/* Wave mark */}
      <path d="M3,16 C6,10 10,10 13,16 C16,22 20,22 23,16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M3,20 C6,14 10,14 13,20 C16,26 20,26 23,20" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
      {/* Wordmark */}
      <text x="33" y="18.5" fontSize="13" fontWeight="400" fontFamily="inherit" letterSpacing="0.03em">Wavecrest</text>
    </svg>
  );
}

function LogoPembridge() {
  return (
    <svg viewBox="0 0 160 28" className="h-6 md:h-7" fill="currentColor">
      {/* Bridge arch mark */}
      <path d="M3,22 L3,12 C3,6 10,3 14,3 C18,3 25,6 25,12 L25,22" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <line x1="10" y1="22" x2="10" y2="14" stroke="currentColor" strokeWidth="1.2" />
      <line x1="18" y1="22" x2="18" y2="14" stroke="currentColor" strokeWidth="1.2" />
      <line x1="1" y1="22" x2="27" y2="22" stroke="currentColor" strokeWidth="1.3" />
      {/* Wordmark */}
      <text x="36" y="18" fontSize="13.5" fontWeight="300" fontFamily="inherit" letterSpacing="0.02em">Pembridge</text>
    </svg>
  );
}

function LogoCaldwell() {
  return (
    <svg viewBox="0 0 140 28" className="h-6 md:h-7" fill="currentColor">
      {/* Interlocking C mark */}
      <path d="M18,6 A10,10 0 0,0 8,16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M10,22 A10,10 0 0,0 20,12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      {/* Wordmark */}
      <text x="30" y="18" fontSize="14" fontWeight="400" fontFamily="inherit" letterSpacing="-0.01em">Caldwell</text>
      <text x="97" y="18" fontSize="10" fontWeight="300" fontFamily="inherit" opacity="0.5">&amp; Co</text>
    </svg>
  );
}

const FIRM_LOGOS = [LogoMeridian, LogoAshworth, LogoKingsford, LogoThornbury, LogoWavecrest, LogoPembridge, LogoCaldwell];

function LogoCloud() {
  return (
    <FadeIn className="py-14 md:py-16 border-b border-slate-100 dark:border-zinc-800/50 overflow-hidden">
      <p className="text-[11px] font-light uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-600 mb-8 text-center">
        Trusted by leading advisory firms
      </p>

      <div className="relative">
        {/* Edge fade masks */}
        <div className="absolute left-0 top-0 bottom-0 w-20 md:w-32 z-10 bg-gradient-to-r from-white dark:from-[#09090b] to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-20 md:w-32 z-10 bg-gradient-to-l from-white dark:from-[#09090b] to-transparent pointer-events-none" />

        {/* Scrolling track */}
        <div className="marquee-track">
          {/* Two copies for seamless loop */}
          {[...FIRM_LOGOS, ...FIRM_LOGOS].map((Logo, i) => (
            <div
              key={i}
              className="flex-shrink-0 px-7 md:px-10 text-slate-900 dark:text-white opacity-70 dark:opacity-50 hover:opacity-100 transition-opacity duration-300"
            >
              <Logo />
            </div>
          ))}
        </div>
      </div>
    </FadeIn>
  );
}

/* ═══════════════════════════════════════════════════
   FEATURES — interactive split layout
   ═══════════════════════════════════════════════════ */

const FEATURES = [
  {
    id: "scenarios",
    icon: <IconChart className="w-[18px] h-[18px]" />,
    title: "Scenario modelling",
    description: "Run what-if scenarios instantly. Model pension contributions, salary sacrifice, dividend restructuring, and income deferral — see the tax impact in real-time before committing.",
  },
  {
    id: "observations",
    icon: <IconLightbulb className="w-[18px] h-[18px]" />,
    title: "AI observations that save money",
    description: "Ovalens's AI continuously analyses your client's position to surface money-saving opportunities — from unused pension headroom to HICBC elimination, ranked by potential impact.",
  },
  {
    id: "extension",
    icon: <IconGlobe className="w-[18px] h-[18px]" />,
    title: "Research extension",
    description: "Our browser extension pulls context from HMRC, Companies House, and any webpage you're viewing — so Ovalens has the full picture before you even ask a question.",
  },
  {
    id: "analysis",
    icon: <IconCalculator className="w-[18px] h-[18px]" />,
    title: "Real-time tax engine",
    description: "Instant calculations across income tax, NICs, dividend tax, and HICBC. Always current with 2025/26 rates, including Scottish and Welsh variations.",
  },
];

function Features() {
  const [active, setActive] = useState(0);

  return (
    <section id="features" className="py-24 md:py-32 bg-white dark:bg-zinc-950">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <FadeUp>
          <div className="max-w-xl mb-14">
            <p className="text-[11px] font-medium uppercase tracking-[0.15em] text-brand-500 mb-4">
              Capabilities
            </p>
            <h2 className="text-3xl md:text-[2.5rem] font-extralight tracking-tight text-slate-900 dark:text-white leading-tight">
              Everything you need,{" "}
              <span className="font-normal">nothing you don&apos;t</span>
            </h2>
          </div>
        </FadeUp>

        <div className="grid md:grid-cols-12 gap-8 md:gap-12 items-start">
          {/* ── Feature list (left) ── */}
          <FadeUp className="md:col-span-5">
            <div className="space-y-1">
              {FEATURES.map((f, i) => {
                const isActive = active === i;
                return (
                  <button
                    key={f.id}
                    onClick={() => setActive(i)}
                    onMouseEnter={() => setActive(i)}
                    className={`w-full text-left px-5 py-4 rounded-xl transition-all duration-300 group relative ${
                      isActive
                        ? "bg-slate-50 dark:bg-zinc-900"
                        : "hover:bg-slate-50/50 dark:hover:bg-zinc-900/30"
                    }`}
                  >
                    {/* Active indicator bar */}
                    <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-full transition-all duration-300 ${
                      isActive ? "bg-brand-500 opacity-100" : "bg-transparent opacity-0"
                    }`} />

                    <div className="flex items-start gap-3.5">
                      <span className={`mt-0.5 transition-colors duration-300 ${
                        isActive ? "text-brand-500 dark:text-brand-400" : "text-slate-400 dark:text-zinc-600"
                      }`}>
                        {f.icon}
                      </span>
                      <div>
                        <h3 className={`text-[14px] font-medium tracking-tight transition-colors duration-300 ${
                          isActive ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-zinc-400"
                        }`}>
                          {f.title}
                        </h3>
                        <motion.div
                          initial={false}
                          animate={{
                            height: isActive ? "auto" : 0,
                            opacity: isActive ? 1 : 0,
                          }}
                          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <p className="text-[13px] font-light text-slate-500 dark:text-zinc-500 leading-relaxed mt-1.5 pr-2">
                            {f.description}
                          </p>
                        </motion.div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </FadeUp>

          {/* ── Live visual (right) ── */}
          <FadeUp delay={0.15} className="md:col-span-7">
            <div className="rounded-xl border border-slate-200/60 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-900/50 overflow-hidden h-[360px] md:h-[400px] relative">
              <FeatureVisual activeId={FEATURES[active].id} />
            </div>
          </FadeUp>
        </div>
      </div>
    </section>
  );
}

/* ── Feature visual panel — switches content based on active feature ── */

function FeatureVisual({ activeId }: { activeId: string }) {
  return (
    <div className="relative h-full">
      {/* Scenarios visual */}
      {activeId === "scenarios" && (
        <motion.div
          key="scenarios"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="absolute inset-0 p-6"
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-zinc-600 mb-5">Scenario: £40k Pension Contribution</div>
          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="rounded-lg border border-slate-200/60 dark:border-zinc-800 p-4 bg-white dark:bg-zinc-900">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-zinc-600 mb-3">Current</div>
              <div className="text-xl font-mono font-light text-slate-900 dark:text-white mb-1">£52,847</div>
              <div className="text-[10px] font-light text-slate-400 dark:text-zinc-600">Total tax liability</div>
              <div className="mt-3 text-[10px] font-light text-slate-500 dark:text-zinc-500">Effective rate 27.0%</div>
            </div>
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 p-4 bg-emerald-50/50 dark:bg-emerald-950/20">
              <div className="text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-3">After</div>
              <div className="text-xl font-mono font-light text-slate-900 dark:text-white mb-1">£36,047</div>
              <div className="text-[10px] font-light text-slate-400 dark:text-zinc-600">Total tax liability</div>
              <div className="mt-3 text-[10px] font-light text-emerald-600 dark:text-emerald-400">Effective rate 21.2%</div>
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="rounded-lg bg-brand-50 dark:bg-brand-950/20 border border-brand-200/60 dark:border-brand-800/30 p-4 flex items-center justify-between"
          >
            <div>
              <div className="text-[12px] font-medium text-brand-700 dark:text-brand-300">Annual tax saving</div>
              <div className="text-[10px] font-light text-brand-600/70 dark:text-brand-400/70 mt-0.5">Pension contribution via salary sacrifice</div>
            </div>
            <div className="text-xl font-mono font-medium text-brand-600 dark:text-brand-400">£16,800</div>
          </motion.div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: "PA restored", val: "£2,570" },
              { label: "HICBC removed", val: "£860" },
              { label: "NIC saved", val: "£520" },
            ].map((x, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.06 }}
                className="text-center"
              >
                <div className="text-[13px] font-mono font-light text-slate-900 dark:text-white">{x.val}</div>
                <div className="text-[10px] font-light text-slate-400 dark:text-zinc-600">{x.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Observations visual */}
      {activeId === "observations" && (
        <motion.div
          key="observations"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="absolute inset-0 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-zinc-600">AI Observations — Sarah Mitchell</div>
            <div className="text-[10px] font-mono font-medium text-emerald-600 dark:text-emerald-400">£19,180 total savings</div>
          </div>
          <div className="space-y-2.5">
            {[
              { title: "£42,000 pension headroom", sub: "Potential £16,800 saving at marginal rate", saving: "£16,800", border: "border-l-emerald-500", bg: "bg-emerald-50/60 dark:bg-emerald-950/20" },
              { title: "ISA allowance unused", sub: "Shelter dividend-generating assets to reduce higher-rate tax", saving: "£1,520", border: "border-l-emerald-500", bg: "bg-emerald-50/60 dark:bg-emerald-950/20" },
              { title: "HICBC charge applies", sub: "Salary sacrifice could eliminate £860 annual charge", saving: "£860", border: "border-l-amber-500", bg: "bg-amber-50/60 dark:bg-amber-950/20" },
              { title: "Personal allowance fully tapered", sub: "Income >£125,140 — pension contribution can restore PA", saving: null, border: "border-l-red-500", bg: "bg-red-50/60 dark:bg-red-950/20" },
            ].map((obs, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className={`rounded-lg border-l-[3px] ${obs.border} ${obs.bg} px-4 py-3 flex items-center justify-between`}
              >
                <div>
                  <div className="text-[12px] font-normal text-slate-800 dark:text-zinc-200">{obs.title}</div>
                  <div className="text-[10px] font-light text-slate-500 dark:text-zinc-500 mt-0.5">{obs.sub}</div>
                </div>
                {obs.saving && (
                  <span className="text-[12px] font-mono font-medium text-emerald-600 dark:text-emerald-400 flex-shrink-0 ml-4">{obs.saving}</span>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Extension visual */}
      {activeId === "extension" && (
        <motion.div
          key="extension"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="absolute inset-0 flex"
        >
          {/* Mock browser page (left) */}
          <div className="flex-1 border-r border-slate-100 dark:border-zinc-800 p-5 bg-white dark:bg-zinc-900">
            <div className="flex items-center gap-2 mb-4">
              <div className="h-[5px] w-[5px] rounded-full bg-slate-300 dark:bg-zinc-700" />
              <div className="flex-1 h-5 rounded bg-slate-100 dark:bg-zinc-800 px-2 flex items-center">
                <span className="text-[8px] font-light text-slate-400 dark:text-zinc-600">gov.uk/self-assessment/sa302</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="h-3 w-3/4 rounded bg-slate-100 dark:bg-zinc-800" />
              <div className="h-3 w-1/2 rounded bg-slate-100 dark:bg-zinc-800" />
              <div className="rounded-lg border border-slate-100 dark:border-zinc-800 p-3 space-y-2">
                {[
                  { label: "Tax year", val: "2025-26" },
                  { label: "Total income", val: "£195,500" },
                  { label: "Tax due", val: "£52,847" },
                ].map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 + i * 0.1 }}
                    className="flex items-center justify-between"
                  >
                    <span className="text-[10px] font-light text-slate-400 dark:text-zinc-600">{r.label}</span>
                    <span className="text-[10px] font-mono text-slate-700 dark:text-zinc-300">{r.val}</span>
                  </motion.div>
                ))}
              </div>
              <div className="h-3 w-full rounded bg-slate-50 dark:bg-zinc-800/50" />
              <div className="h-3 w-2/3 rounded bg-slate-50 dark:bg-zinc-800/50" />
            </div>
          </div>

          {/* Extension side panel (right) */}
          <div className="w-[42%] p-4 bg-slate-50/80 dark:bg-zinc-950/80">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-5 h-5 rounded bg-brand-500 flex items-center justify-center">
                <svg viewBox="0 0 12 12" className="w-3 h-3 text-white">
                  <circle cx="6" cy="6" r="2" fill="currentColor" />
                  <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1" />
                </svg>
              </div>
              <span className="text-[10px] font-medium text-slate-700 dark:text-zinc-300">Ovalens</span>
            </div>

            <div className="text-[9px] font-medium uppercase tracking-wider text-slate-400 dark:text-zinc-600 mb-2.5">Context loaded</div>
            <div className="space-y-1.5">
              {[
                { label: "SA302 2025/26", status: "done" },
                { label: "P60 — employment", status: "done" },
                { label: "Dividend vouchers", status: "done" },
                { label: "Pension statement", status: "done" },
                { label: "Companies House", status: "loading" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: 6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.12, duration: 0.35 }}
                  className="flex items-center gap-2 rounded-md bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 px-2.5 py-1.5"
                >
                  {item.status === "done" ? (
                    <svg viewBox="0 0 12 12" className="w-3 h-3 text-emerald-500 flex-shrink-0">
                      <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" />
                      <polyline points="3.5 6 5.5 8 8.5 4" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <motion.svg
                      viewBox="0 0 12 12"
                      className="w-3 h-3 text-brand-400 flex-shrink-0"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    >
                      <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeDasharray="20" strokeDashoffset="6" strokeLinecap="round" />
                    </motion.svg>
                  )}
                  <span className="text-[10px] font-light text-slate-600 dark:text-zinc-400">{item.label}</span>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="mt-3 rounded-md bg-brand-50 dark:bg-brand-950/20 border border-brand-200/50 dark:border-brand-800/30 p-2.5"
            >
              <div className="text-[9px] font-medium text-brand-700 dark:text-brand-300">Ready to analyse</div>
              <div className="text-[8px] font-light text-brand-600/60 dark:text-brand-400/50 mt-0.5">4 sources loaded into Ovalens</div>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Analysis visual */}
      {activeId === "analysis" && (
        <motion.div
          key="analysis"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35 }}
          className="absolute inset-0 p-6"
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-zinc-600 mb-4">Tax Calculation — Sarah Mitchell</div>
          <div className="space-y-3">
            {[
              { label: "Gross income", val: "£195,500", sub: "Employment + dividends + rental" },
              { label: "Income Tax", val: "£42,432", sub: "Personal allowance tapered to £0" },
              { label: "National Insurance", val: "£5,486", sub: "Class 1 — primary threshold" },
              { label: "Dividend Tax", val: "£4,069", sub: "Higher rate on £32,000" },
              { label: "HICBC charge", val: "£860", sub: "Full clawback — income >£60k" },
            ].map((row, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
                className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-zinc-800 last:border-0"
              >
                <div>
                  <span className="text-[13px] font-light text-slate-700 dark:text-zinc-300">{row.label}</span>
                  <span className="block text-[10px] font-light text-slate-400 dark:text-zinc-600">{row.sub}</span>
                </div>
                <span className="text-[13px] font-mono font-light text-slate-900 dark:text-white">{row.val}</span>
              </motion.div>
            ))}
            <div className="flex items-center justify-between pt-2">
              <span className="text-[13px] font-medium text-slate-900 dark:text-white">Total liability</span>
              <span className="text-[15px] font-mono font-medium text-slate-900 dark:text-white">£52,847</span>
            </div>
            <div className="text-[10px] font-light text-slate-400 dark:text-zinc-600 mt-1">Effective rate 27.0% &middot; Marginal rate 40%</div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   INTEGRATIONS — one-click activation section
   ═══════════════════════════════════════════════════ */

function LogoSalesforce() {
  return (
    <svg viewBox="0 0 142 32" className="h-7 md:h-8 w-auto" fill="none" aria-label="Salesforce logo">
      <path d="M26.5 7.5a7.8 7.8 0 0 1 12.1 3.2 8.7 8.7 0 0 1 4.9-1.4c4.8 0 8.7 3.8 8.7 8.5s-3.9 8.5-8.7 8.5c-.6 0-1.2-.1-1.8-.2a7.9 7.9 0 0 1-6.6 3.5 7.7 7.7 0 0 1-4.7-1.5 8 8 0 0 1-7.5 4.8c-4 0-7.4-2.8-8.4-6.5-.6.2-1.2.2-1.8.2-5 0-9.1-4-9.1-8.9 0-3.6 2.3-6.8 5.5-8.2-.2-.9-.3-1.8-.3-2.8 0-5.3 4.3-9.6 9.7-9.6 3.5 0 6.5 1.8 8 4.4Z" fill="#00A1E0"/>
      <path d="M66 9.6h5v2.4h-5v-2.4Zm0 4.2h5v12H66v-12Zm8.4 0h4.8v1.7c1-.9 2.3-1.9 4.4-1.9 3.8 0 6.1 2.4 6.1 6.4v5.8h-4.9v-4.3c0-2.3-1-3.5-2.8-3.5-1.7 0-2.8 1.2-2.8 3.5v4.3h-4.8v-12Zm22.7 12.4c-4.5 0-7.8-3-7.8-6.3 0-3.6 2.8-6.3 6.8-6.3 4.6 0 6.8 3.2 6.8 6.6 0 .3 0 .6-.1.9h-8.7c.4 1.4 1.5 2.1 3 2.1 1.2 0 2.2-.5 3.2-1.4l2.7 2.2c-1.3 1.6-3.2 2.2-5.9 2.2Zm1.2-7.5c-.2-1.4-1-2.3-2.2-2.3-1.3 0-2.1.9-2.4 2.3h4.6Zm10.7 3.2c1.4 0 2.8-.5 4.2-1.5l2.2 3.3c-1.5 1.3-3.7 2.4-6.6 2.4-4.4 0-7.8-2.5-7.8-6.3 0-3.8 3.4-6.3 7.8-6.3 2.7 0 4.8.9 6.4 2.3l-2.1 3.4c-1.3-1-2.6-1.5-4-1.5-1.8 0-3.1 1.1-3.1 2.1 0 1.1 1.2 2.1 3 2.1Zm9.3-12.3h4.8v16.2h-4.8V9.6Zm12.2 16.5c-3.7 0-6.7-2.7-6.7-6.3s3-6.3 6.7-6.3c3.8 0 6.8 2.7 6.8 6.3s-3 6.3-6.8 6.3Zm0-4.1c1.3 0 2.2-1 2.2-2.2s-.9-2.2-2.2-2.2c-1.2 0-2.2 1-2.2 2.2s1 2.2 2.2 2.2Z" fill="currentColor"/>
    </svg>
  );
}

function LogoIntelliflo() {
  return (
    <svg viewBox="0 0 138 32" className="h-7 md:h-8 w-auto" fill="none" aria-label="Intelliflo logo">
      <circle cx="10" cy="8" r="3" fill="#4FD1C5" />
      <rect x="7.5" y="13" width="5" height="13" rx="2.5" fill="#4FD1C5" />
      <path d="M20 14.5c2.8 0 4.6 2 4.6 4.6 0 2.6-1.8 4.6-4.6 4.6" stroke="#4FD1C5" strokeWidth="2" strokeLinecap="round" />
      <path d="M1.8 14.5C-1 14.5-2.8 16.5-2.8 19.1-2.8 21.7-1 23.7 1.8 23.7" stroke="#4FD1C5" strokeWidth="2" strokeLinecap="round" transform="translate(7 0)" />
      <text x="34" y="21.5" fill="currentColor" fontSize="14" fontWeight="500" fontFamily="inherit" letterSpacing="0.01em">intelliflo</text>
    </svg>
  );
}

function LogoXero() {
  return (
    <svg viewBox="0 0 112 32" className="h-7 md:h-8 w-auto" fill="none" aria-label="Xero logo">
      <circle cx="13" cy="16" r="12" fill="#13B5EA" />
      <path d="M8.6 11.5 17.4 20.5M17.4 11.5 8.6 20.5" stroke="white" strokeWidth="2.4" strokeLinecap="round" />
      <text x="31" y="21.5" fill="currentColor" fontSize="15" fontWeight="500" fontFamily="inherit">xero</text>
    </svg>
  );
}

function LogoHMRC() {
  return (
    <svg viewBox="0 0 120 32" className="h-7 md:h-8 w-auto" fill="none" aria-label="HMRC logo">
      <rect x="1" y="3" width="28" height="26" rx="4" fill="#1D1D1B" />
      <path d="m15 8-3 4h6l-3-4Zm-6 4 1.5-3 2.3 2.2L11.7 12H9Zm12 0-1.5-3-2.3 2.2 1.1.8H21Z" fill="#C8B568" />
      <circle cx="15" cy="7" r="1.1" fill="#C8B568" />
      <rect x="8.5" y="12" width="13" height="1.7" rx=".4" fill="#C8B568" />
      <text x="15" y="22" textAnchor="middle" fill="white" fontSize="5.6" fontWeight="700" fontFamily="inherit" letterSpacing="0.06em">HMRC</text>
      <text x="39" y="21.5" fill="currentColor" fontSize="14" fontWeight="600" fontFamily="inherit">HMRC APIs</text>
    </svg>
  );
}

function LogoMicrosoft() {
  return (
    <svg viewBox="0 0 158 32" className="h-7 md:h-8 w-auto" fill="none" aria-label="Microsoft logo">
      <rect x="2" y="6" width="9" height="9" fill="#F25022" rx="1" />
      <rect x="13" y="6" width="9" height="9" fill="#7FBA00" rx="1" />
      <rect x="2" y="17" width="9" height="9" fill="#00A4EF" rx="1" />
      <rect x="13" y="17" width="9" height="9" fill="#FFB900" rx="1" />
      <text x="33" y="21.5" fill="currentColor" fontSize="14" fontWeight="500" fontFamily="inherit">Microsoft 365</text>
    </svg>
  );
}

function LogoGoogle() {
  return (
    <svg viewBox="0 0 170 32" className="h-7 md:h-8 w-auto" fill="none" aria-label="Google logo">
      <path d="M20.4 16.3c0-.8-.1-1.5-.2-2.2H10v4h5.8c-.3 1.5-1.2 2.7-2.5 3.4v2.9h4.1c2.4-2.2 3.8-5.4 3.8-9.1Z" fill="#4285F4" />
      <path d="M10 27c3 0 5.5-1 7.4-2.6l-4.1-2.9c-1.1.8-2.1 1.2-3.3 1.2-2.8 0-5.1-1.9-5.9-4.5H0v2.9A11.2 11.2 0 0 0 10 27Z" fill="#34A853" />
      <path d="M4.1 18.2A6.8 6.8 0 0 1 3.8 16c0-.8.1-1.5.3-2.2v-2.9H0A11 11 0 0 0-1 16c0 1.8.4 3.5 1 5.1l4.1-2.9Z" fill="#FBBC05" transform="translate(1 0)" />
      <path d="M10 9.3c1.6 0 3 .5 4.1 1.5l3.1-3.1A11.2 11.2 0 0 0 10 5c-4.4 0-8.4 2.5-10 6.1l4.1 2.9c.8-2.6 3.1-4.7 5.9-4.7Z" fill="#EA4335" />
      <text x="33" y="21.5" fill="currentColor" fontSize="14" fontWeight="500" fontFamily="inherit">Google Workspace</text>
    </svg>
  );
}

function LogoMeetingNotes() {
  return (
    <svg viewBox="0 0 184 32" className="h-7 md:h-8 w-auto" fill="none" aria-label="Nora Notes integration logo">
      <defs>
        <linearGradient id="nora-note-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4F46E5" />
          <stop offset="100%" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <rect x="2" y="4" width="24" height="24" rx="6" fill="url(#nora-note-grad)" />
      <path d="M8 20V11l3.5 4.5L15 11v9" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19.3 8.8 20 10.3l1.5.7-1.5.7-.7 1.5-.7-1.5-1.5-.7 1.5-.7.7-1.5Z" fill="#C4B5FD" />
      <text x="36" y="21.5" fill="currentColor" fontSize="14" fontWeight="600" fontFamily="inherit">Nora Notes</text>
    </svg>
  );
}

const LANDING_INTEGRATIONS = [
  { name: "Salesforce", description: "CRM data and adviser timelines", logo: <LogoSalesforce /> },
  { name: "Intelliflo", description: "Portfolio and valuation sync", logo: <LogoIntelliflo /> },
  { name: "Xero", description: "Accounts and tax-return context", logo: <LogoXero /> },
  { name: "HMRC APIs", description: "Tax records and submission workflows", logo: <LogoHMRC /> },
  { name: "Microsoft 365", description: "Outlook calendar integration", logo: <LogoMicrosoft /> },
  { name: "Google Workspace", description: "Calendar and Meet context", logo: <LogoGoogle /> },
  {
    name: "Nora Notes",
    description: "Auto-capture adviser meetings into compliant, client-ready notes",
    logo: <LogoMeetingNotes />,
  },
];

function IntegrationsShowcase() {
  const featuredIntegration = LANDING_INTEGRATIONS.find(
    (integration) => integration.name === "Nora Notes"
  );
  const coreIntegrations = LANDING_INTEGRATIONS.filter(
    (integration) => integration.name !== "Nora Notes"
  );
  const looped = [...coreIntegrations, ...coreIntegrations];

  return (
    <section id="integrations" className="relative py-24 md:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_22%,rgba(92,124,250,0.18),transparent_42%),radial-gradient(circle_at_88%_15%,rgba(139,92,246,0.14),transparent_36%),linear-gradient(160deg,#f7f9ff_0%,#ffffff_52%,#f7f5ff_100%)] dark:bg-[radial-gradient(circle_at_12%_22%,rgba(116,143,252,0.2),transparent_42%),radial-gradient(circle_at_88%_15%,rgba(167,139,250,0.17),transparent_36%),linear-gradient(160deg,#0a0a0f_0%,#09090b_52%,#0d0d13_100%)]" />
      <div className="absolute inset-0 bg-grid opacity-60 pointer-events-none" />
      <div className="absolute top-8 left-[-8rem] w-[22rem] h-[22rem] rounded-full bg-brand-300/25 dark:bg-brand-700/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10rem] right-[-6rem] w-[21rem] h-[21rem] rounded-full bg-violet-300/25 dark:bg-violet-700/20 blur-[120px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 md:px-12">
        <FadeUp className="max-w-3xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-500 mb-4">
            Integrations
          </p>
          <h2 className="text-3xl md:text-[2.7rem] font-extralight tracking-tight leading-tight text-slate-900 dark:text-white">
            Your planning stack, connected.
            <span className="block font-normal mt-1">Built for presentation and real workflow value.</span>
          </h2>
          <p className="mt-5 text-[15px] font-light leading-relaxed text-slate-600 dark:text-zinc-400 max-w-2xl">
            Ovalens unifies CRM, back-office, accounting, compliance, calendar, and Nora meeting-note signals
            so advisers can move from fragmented data to action quickly.
          </p>
        </FadeUp>

        <div className="relative mt-14 md:mt-16">
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 md:w-64 md:h-64 rounded-full border border-brand-200/70 dark:border-brand-700/40"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 26, ease: "linear" }}
            aria-hidden
          />
          <motion.div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-44 h-44 md:w-52 md:h-52 rounded-full border border-violet-200/70 dark:border-violet-700/40"
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
            aria-hidden
          />

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 text-center"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-200/80 dark:border-emerald-800/40 bg-emerald-50/80 dark:bg-emerald-950/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                7 live-ready integrations
              </span>
            </div>
            <p className="mt-4 text-[12px] font-light text-slate-500 dark:text-zinc-500">
              Activated from your account settings in one click.
            </p>
          </motion.div>

          {featuredIntegration && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}
              className="relative mt-8 md:mt-10"
            >
              <div className="absolute -left-2 top-0 bottom-0 w-[3px] rounded-full bg-gradient-to-b from-brand-500 via-violet-500 to-brand-500/40" />
              <div className="pl-5 md:pl-7">
                <div className="grid md:grid-cols-12 gap-5 md:gap-6 items-start">
                  <div className="md:col-span-7">
                    <div className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.14em] text-brand-600 dark:text-brand-400 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                      Featured Integration
                    </div>
                    <div className="text-slate-900 dark:text-zinc-100">
                      {featuredIntegration.logo}
                    </div>
                    <p className="mt-2.5 text-[14px] md:text-[15px] font-normal text-slate-800 dark:text-zinc-200 leading-relaxed max-w-xl">
                      Nora turns adviser meetings into clean, compliant client notes, with
                      auto-captured action points and planning-ready summaries.
                    </p>
                    <div className="mt-4 h-px bg-gradient-to-r from-brand-300/70 via-violet-300/60 to-transparent dark:from-brand-600/70 dark:via-violet-500/60" />
                    <div className="mt-3 text-[10px] font-light text-slate-500 dark:text-zinc-500">
                      Built specifically for UK financial adviser review meetings.
                    </div>
                  </div>

                  <div className="md:col-span-5">
                    <div className="pt-0.5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-zinc-400">
                          Live Capture
                        </span>
                        <motion.span
                          className="text-[9px] font-medium text-emerald-600 dark:text-emerald-400"
                          animate={{ opacity: [0.35, 1, 0.35] }}
                          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                        >
                          Recording
                        </motion.span>
                      </div>

                      <div className="rounded-xl border border-slate-200/70 dark:border-zinc-800/70 bg-white/55 dark:bg-zinc-900/45 px-4 py-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <motion.span
                                className="absolute inset-0 rounded-full bg-rose-400/25 dark:bg-rose-500/20"
                                animate={{ scale: [1, 1.45], opacity: [0.35, 0] }}
                                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                              />
                              <span className="relative block w-2 h-2 rounded-full bg-rose-500/90" />
                            </div>
                            <span className="text-[10px] font-light text-slate-500 dark:text-zinc-400">
                              Nora listening
                            </span>
                          </div>

                          <div className="flex items-end gap-1 h-5">
                            {[0, 1, 2, 3, 4, 5].map((bar) => (
                              <motion.span
                                key={bar}
                                className="w-[2px] rounded-full bg-slate-400/65 dark:bg-zinc-400/55"
                                animate={{ height: ["5px", "13px", "7px"] }}
                                transition={{
                                  duration: 1.2,
                                  repeat: Infinity,
                                  delay: bar * 0.1,
                                  ease: "easeInOut",
                                }}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {[
                            "Client wants to reduce tax before year-end...",
                            "Discussed pension carry-forward and ISA use...",
                            "Need suitability summary and action list...",
                          ].map((line) => (
                            <div
                              key={line}
                              className="h-7 rounded-md border border-slate-200/70 dark:border-zinc-700/70 bg-slate-50/80 dark:bg-zinc-900/70 px-2.5 flex items-center"
                            >
                              <span className="text-[10px] font-light text-slate-500 dark:text-zinc-400 truncate">
                                {line}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-200/70 dark:border-zinc-800/70">
                          <p className="text-[10px] font-light text-brand-700 dark:text-brand-300">
                            Nora outputs structured actions, suitability notes, and follow-up tasks instantly.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div className="mt-10 md:mt-12 space-y-4">
            <div className="relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-20 md:w-28 bg-gradient-to-r from-white dark:from-[#0a0a0f] to-transparent z-10 pointer-events-none" />
              <div className="absolute inset-y-0 right-0 w-20 md:w-28 bg-gradient-to-l from-white dark:from-[#0a0a0f] to-transparent z-10 pointer-events-none" />
              <motion.div
                className="flex w-max gap-4"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                animate={{ x: ["0%", "-50%"] }}
                transition={{ x: { duration: 24, ease: "linear", repeat: Infinity }, opacity: { duration: 0.45 }, y: { duration: 0.45 } }}
              >
                {looped.map((integration, i) => (
                  <div
                    key={`moving-top-${integration.name}-${i}`}
                    className="relative flex-shrink-0 min-w-[300px] md:min-w-[360px] px-5 py-4 rounded-2xl border border-slate-200/75 dark:border-zinc-800/75 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-sm shadow-[0_10px_34px_-24px_rgba(15,23,42,0.7)] dark:shadow-[0_14px_38px_-26px_rgba(0,0,0,0.85)]"
                  >
                    <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-brand-300/65 dark:via-brand-600/50 to-transparent" />
                    <div className="relative text-slate-900 dark:text-zinc-100">{integration.logo}</div>
                    <p className="relative mt-2 text-[12px] font-light text-slate-500 dark:text-zinc-400 leading-relaxed">
                      {integration.description}
                    </p>
                  </div>
                ))}
              </motion.div>
            </div>

            <div className="relative overflow-hidden">
              <div className="absolute inset-y-0 left-0 w-20 md:w-28 bg-gradient-to-r from-white dark:from-[#0a0a0f] to-transparent z-10 pointer-events-none" />
              <div className="absolute inset-y-0 right-0 w-20 md:w-28 bg-gradient-to-l from-white dark:from-[#0a0a0f] to-transparent z-10 pointer-events-none" />
              <motion.div
                className="flex w-max gap-4"
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                animate={{ x: ["-50%", "0%"] }}
                transition={{ x: { duration: 20, ease: "linear", repeat: Infinity }, opacity: { duration: 0.45 }, y: { duration: 0.45 } }}
              >
                {looped.map((integration, i) => (
                  <div
                    key={`moving-bottom-${integration.name}-${i}`}
                    className="relative flex-shrink-0 min-w-[300px] md:min-w-[360px] px-5 py-4 rounded-2xl border border-slate-200/75 dark:border-zinc-800/75 bg-white/80 dark:bg-zinc-900/60 backdrop-blur-sm shadow-[0_10px_34px_-24px_rgba(15,23,42,0.7)] dark:shadow-[0_14px_38px_-26px_rgba(0,0,0,0.85)]"
                  >
                    <div className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/65 dark:via-violet-500/50 to-transparent" />
                    <div className="relative text-slate-900 dark:text-zinc-100">{integration.logo}</div>
                    <p className="relative mt-2 text-[12px] font-light text-slate-500 dark:text-zinc-400 leading-relaxed">
                      {integration.description}
                    </p>
                  </div>
                ))}
              </motion.div>
            </div>
          </div>
        </div>

        <FadeIn className="mt-10">
          <p className="text-[11px] font-light text-slate-500 dark:text-zinc-500">
            All integrations are available from the account settings integrations page.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   HOW IT WORKS — interactive product walkthrough
   ═══════════════════════════════════════════════════ */

function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative py-24 md:py-36 overflow-hidden bg-slate-50/60 dark:bg-zinc-950/50"
    >
      <div className="absolute inset-0 bg-grid pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6 md:px-12">
        <FadeUp className="max-w-2xl mb-14 md:mb-16">
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-500 mb-4">
            How it works
          </p>
          <h2 className="text-3xl md:text-4xl font-extralight tracking-tight text-slate-900 dark:text-white">
            From raw data to{" "}
            <span className="font-normal">actionable savings</span>
          </h2>
        </FadeUp>
        <FadeUp delay={0.1}>
          <HowItWorksDemo />
        </FadeUp>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   STATS — animated counters
   ═══════════════════════════════════════════════════ */

function Stats() {
  return (
    <section className="py-20 md:py-28 bg-white dark:bg-zinc-950 border-y border-slate-100 dark:border-zinc-900">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <StaggerChildren stagger={0.1} className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
          {[
            { value: "2025", suffix: "/26", label: "Tax year coverage" },
            { value: "22", suffix: "+", label: "Allowances tracked" },
            { prefix: "<", value: "2", suffix: "s", label: "Calculation speed" },
            { value: "100", suffix: "%", label: "UK-specific" },
          ].map((stat, i) => (
            <motion.div key={i} variants={staggerItem}>
              <div className="text-2xl md:text-3xl font-light text-slate-900 dark:text-white font-mono tracking-tight">
                {stat.prefix ?? ""}
                <AnimatedCounter value={Number(stat.value)} />
                {stat.suffix ?? ""}
              </div>
              <div className="mt-1 text-xs font-light text-slate-400 dark:text-zinc-500 tracking-wide">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </StaggerChildren>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   TESTIMONIAL — mission statement (integrated section)
   ═══════════════════════════════════════════════════ */

function Testimonial() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 92,
    damping: 26,
    mass: 0.75,
  });
  const contentY = useTransform(smoothProgress, [0, 0.45, 1], [24, 0, -10]);
  const contentOpacity = useTransform(smoothProgress, [0, 0.16, 0.84, 1], [0.62, 1, 1, 0.9]);
  const bgOpacity = useTransform(smoothProgress, [0.06, 0.35, 1], [0, 1, 0.92]);
  const textFillProgress = useTransform(smoothProgress, [0.14, 0.72], [0, 1]);
  const fillClipPath = useTransform(
    textFillProgress,
    (v) => `inset(0 ${Math.max(0, 100 - v * 100)}% 0 0)`
  );
  const accentScaleY = useTransform(smoothProgress, [0.1, 0.36], [0, 1]);

  return (
    <section
      ref={sectionRef}
      className="relative py-24 md:py-32 overflow-hidden border-t border-slate-200/50 dark:border-zinc-800/50"
    >
      {/* Section background — integrated with page */}
      <div className="absolute inset-0 bg-slate-50/50 dark:bg-zinc-950/30" />
      <motion.div
        style={{ opacity: bgOpacity }}
        className="absolute inset-0 pointer-events-none"
        aria-hidden
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(100%,720px)] aspect-square rounded-full bg-brand-200/12 dark:bg-brand-900/8 blur-[80px]" />
        <div className="absolute top-1/3 right-0 w-96 h-96 rounded-full bg-violet-200/8 dark:bg-violet-900/4 blur-[60px]" />
      </motion.div>

      <div className="relative max-w-7xl mx-auto px-6 md:px-12">
        <motion.div
          style={{ y: contentY, opacity: contentOpacity }}
          className="max-w-3xl mx-auto"
        >
          <div className="relative pl-8 md:pl-10 border-l border-slate-200 dark:border-zinc-800">
            <motion.div
              style={{ scaleY: accentScaleY, transformOrigin: "top" }}
              aria-hidden
              className="absolute left-0 top-0 bottom-0 w-0.5 -ml-px bg-gradient-to-b from-brand-400 to-brand-400/20 dark:from-brand-500 dark:to-brand-500/20"
            />

            <div className="py-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-brand-500 dark:text-brand-400 mb-6">
                Why we&apos;re building
              </p>

              <div className="relative">
                <blockquote className="text-xl md:text-2xl lg:text-[1.6rem] font-extralight text-slate-800 dark:text-zinc-200 leading-[1.55] space-y-4">
                  <span className="block">We&apos;re building Ovalens because tax planning reviews shouldn&apos;t take hours.</span>
                  <span className="block">
                    We want every adviser to have AI that&apos;s{" "}
                    <span className="font-light text-slate-700 dark:text-zinc-300">fast, accurate, and built for the UK</span>.
                  </span>
                </blockquote>
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{ clipPath: fillClipPath, WebkitClipPath: fillClipPath }}
                  aria-hidden
                >
                  <blockquote className="text-xl md:text-2xl lg:text-[1.6rem] font-extralight leading-[1.55] space-y-4 bg-gradient-to-r from-brand-600 via-violet-600 to-brand-500 dark:from-brand-400 dark:via-violet-400 dark:to-brand-400 bg-clip-text text-transparent">
                    <span className="block">We&apos;re building Ovalens because tax planning reviews shouldn&apos;t take hours.</span>
                    <span className="block">
                      We want every adviser to have AI that&apos;s{" "}
                      <span className="font-light">fast, accurate, and built for the UK</span>.
                    </span>
                  </blockquote>
                </motion.div>
              </div>

              <div className="mt-8 flex items-center gap-3">
                <div className="w-px h-5 bg-slate-300 dark:bg-zinc-600" />
                <p className="text-[13px] font-light text-slate-500 dark:text-zinc-500 tracking-wide">
                  The Ovalens team
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   CTA
   ═══════════════════════════════════════════════════ */

function CTA() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const gridY = useTransform(scrollYProgress, [0, 1], [-40, 40]);

  return (
    <section ref={ref} className="relative py-24 md:py-32 bg-slate-950 dark:bg-black text-white overflow-hidden">
      {/* Parallax grid */}
      <motion.div style={{ y: gridY }} className="absolute inset-0 bg-grid-dark pointer-events-none" />

      {/* Gradient accent orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 md:px-12 text-center">
        <FadeUp className="max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-6">
            <IconZap className="w-4 h-4 text-brand-400" />
            <span className="text-[12px] font-light tracking-wide text-slate-400">
              Ready to start
            </span>
          </div>

          <RevealMask>
            <h2 className="text-3xl md:text-4xl font-extralight tracking-tight leading-tight">
              Transform your{" "}
              <span className="font-normal">tax planning workflow</span>
            </h2>
          </RevealMask>

          <p className="mt-4 text-base font-light text-slate-400 leading-relaxed max-w-lg mx-auto">
            Join financial advisers who use Ovalens to deliver faster, more
            accurate tax planning for their clients.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 bg-white text-slate-900 text-sm font-normal px-6 py-3 rounded-lg hover:bg-slate-100 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-black/20"
            >
              Book a call
              <IconArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </a>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

/* ═══════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════ */

function Footer() {
  const cols = {
    Product: ["Features", "Pricing", "Changelog", "Documentation"],
    Company: ["About", "Blog", "Careers", "Contact"],
    Legal: ["Privacy", "Terms", "Security"],
  };

  return (
    <footer className="bg-slate-950 dark:bg-black border-t border-slate-800/50 dark:border-zinc-800/30 text-slate-400 dark:text-zinc-500 py-16">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid md:grid-cols-5 gap-10">
          <div className="md:col-span-2">
            <div className="text-white">
              <OvalensLogo className="h-6" />
            </div>
            <p className="mt-4 text-sm font-light leading-relaxed max-w-xs">
              Tax intelligence for UK financial advisers. Analyse, plan, and
              deliver better client outcomes.
            </p>
          </div>

          {Object.entries(cols).map(([heading, items]) => (
            <div key={heading}>
              <h4 className="text-[11px] font-medium uppercase tracking-[0.15em] text-slate-500 dark:text-zinc-600 mb-4">
                {heading}
              </h4>
              <ul className="space-y-2.5">
                {items.map((item) => (
                  <li key={item}>
                    <a
                      href={item === "Security" ? "/security" : "#"}
                      className="text-sm font-light hover:text-white transition-colors"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 pt-6 border-t border-slate-800/50 dark:border-zinc-800/30 text-[11px] font-light text-slate-600 dark:text-zinc-700">
          &copy; {new Date().getFullYear()} Ovalens. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════
   PAGE
   ═══════════════════════════════════════════════════ */

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (user) {
      router.replace("/chat");
    }
  }, [user, isLoading, router]);

  if (!isLoading && user) {
    return null; // redirecting to /chat
  }

  return (
    <main>
      <Navbar />
      <Hero />
      {/* <LogoCloud /> — Trusted by leading advisory firms */}
      <Features />
      <IntegrationsShowcase />
      <HowItWorks />
      <Stats />
      <Testimonial />
      <CTA />
      <Footer />
    </main>
  );
}
