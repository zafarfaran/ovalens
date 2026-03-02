import Link from "next/link";
import { ThemeToggle } from "@/components/theme-provider";
import { OvalensLogo, IconArrowRight } from "@/components/icons";

type SecurityCard = {
  title: string;
  body: string;
  icon: "lock" | "rules" | "permissions";
};

type ProtocolCard = {
  title: string;
  body: string;
};

const CONTROL_CARDS: SecurityCard[] = [
  {
    title: "Your data stays yours",
    body:
      "We never train our models on your client data and make it easy for you to access all data, giving you and your clients peace of mind.",
    icon: "lock",
  },
  {
    title: "You set the rules",
    body:
      "Our process for data storage can be configured to your needs, with data stored in your local residency.",
    icon: "rules",
  },
  {
    title: "You set permissions",
    body:
      "You have full control over internal permissions. Who can create, read and write data is your choice.",
    icon: "permissions",
  },
];

const PROTOCOL_CARDS: ProtocolCard[] = [
  {
    title: "End-to-end encryption",
    body: "All client data is fully encrypted in transit and at rest using industry-standard controls.",
  },
  {
    title: "Comprehensive training",
    body: "All staff complete regular security and privacy training with strict access and handling standards.",
  },
  {
    title: "Independent audits",
    body: "External experts review our controls and processes to maintain strong compliance and data protection.",
  },
];

const CALENDLY_URL = "https://calendly.com/admin-ovalens";

const FOOTER_COLS = {
  Product: ["Features", "Pricing", "Documentation"],
  Company: ["About", "Blog", "Contact"],
  Legal: ["Privacy", "Terms", "Security"],
};

function SecurityIcon({ type }: { type: SecurityCard["icon"] }) {
  const shellClass =
    "relative w-14 h-14 rounded-2xl border border-slate-200/70 dark:border-zinc-800/70 bg-white/90 dark:bg-zinc-900/80 shadow-sm shadow-slate-200/50 dark:shadow-black/30 flex items-center justify-center";

  if (type === "lock") {
    return (
      <div className={shellClass}>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-200/30 to-violet-200/20 dark:from-brand-900/20 dark:to-violet-900/10" />
        <svg viewBox="0 0 24 24" className="relative w-7 h-7 text-slate-700 dark:text-zinc-200" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="9" rx="2.5" />
          <path d="M8.2 11V8.6a3.8 3.8 0 1 1 7.6 0V11" />
          <circle cx="12" cy="15.5" r="1.2" />
        </svg>
      </div>
    );
  }

  if (type === "rules") {
    return (
      <div className={shellClass}>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-200/30 to-cyan-200/20 dark:from-emerald-900/20 dark:to-cyan-900/10" />
        <svg viewBox="0 0 24 24" className="relative w-7 h-7 text-slate-700 dark:text-zinc-200" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round">
          <rect x="7" y="4" width="11" height="16" rx="2" />
          <path d="M9.5 8h6" />
          <path d="M9.5 12h6" />
          <path d="M9.5 16h4.2" />
          <circle cx="5.3" cy="15.6" r="2.1" />
          <path d="M4.5 15.6l.6.7 1.3-1.5" />
        </svg>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-200/30 to-brand-200/20 dark:from-amber-900/20 dark:to-brand-900/10" />
      <svg viewBox="0 0 24 24" className="relative w-7 h-7 text-slate-700 dark:text-zinc-200" fill="none" stroke="currentColor" strokeWidth="1.45" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4.8" y="3.8" width="14.4" height="16.4" rx="2.2" />
        <path d="M8.2 8h2.4" />
        <path d="M8.2 12h2.4" />
        <path d="M8.2 16h2.4" />
        <path d="M13.5 8.2l1 1 1.8-2" />
        <path d="M13.5 12.2l1 1 1.8-2" />
      </svg>
    </div>
  );
}

function SecurityNavbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/50 dark:border-zinc-800/50 backdrop-blur-xl bg-white/80 dark:bg-zinc-950/70">
      <div className="max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
        <Link href="/" className="text-slate-900 dark:text-white">
          <OvalensLogo />
        </Link>

        <div className="hidden md:flex items-center gap-8 text-[13px] font-light tracking-wide text-slate-500 dark:text-zinc-400">
          <Link href="/" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Home
          </Link>
          <a href="#controls" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Controls
          </a>
          <a href="#protocols" className="hover:text-slate-900 dark:hover:text-white transition-colors">
            Protocols
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
            className="group inline-flex items-center gap-2 text-[13px] font-normal bg-slate-900 dark:bg-white text-white dark:text-zinc-900 px-4 py-2 rounded-lg hover:bg-slate-800 dark:hover:bg-zinc-100 transition-colors"
          >
            Book a call
            <IconArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
          </a>
        </div>
      </div>
    </header>
  );
}

function SecurityFooter() {
  return (
    <footer className="bg-slate-950 dark:bg-black border-t border-slate-800/50 dark:border-zinc-800/30 text-slate-400 dark:text-zinc-500 py-16">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <div className="grid md:grid-cols-5 gap-10">
          <div className="md:col-span-2">
            <div className="text-white">
              <OvalensLogo className="h-6" />
            </div>
            <p className="mt-4 text-sm font-light leading-relaxed max-w-xs">
              Security-first tax intelligence for UK financial advisers.
              Transparent controls, robust safeguards, and accountable access.
            </p>
          </div>

          {Object.entries(FOOTER_COLS).map(([heading, items]) => (
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

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <SecurityNavbar />

      <section
        id="controls"
        className="relative pt-28 md:pt-36 pb-20 md:pb-28 border-b border-slate-200/60 dark:border-zinc-800/60 overflow-hidden"
      >
        <div className="absolute inset-0 pointer-events-none bg-dots opacity-15" />
        <div className="absolute -top-24 -right-20 w-[420px] h-[420px] rounded-full bg-brand-200/20 dark:bg-brand-800/12 blur-[110px] pointer-events-none" />
        <div className="absolute top-28 -left-28 w-[360px] h-[360px] rounded-full bg-violet-200/15 dark:bg-violet-900/12 blur-[100px] pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-6 md:px-12">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-brand-500 mb-5">Security</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extralight tracking-tight leading-[1.05] text-slate-900 dark:text-white">
              Designed for trust.
              <span className="block font-normal bg-gradient-to-r from-brand-600 via-violet-600 to-brand-500 dark:from-brand-400 dark:via-violet-400 dark:to-brand-400 bg-clip-text text-transparent">
                Built for control.
              </span>
            </h1>
            <p className="mt-5 text-base font-light text-slate-500 dark:text-zinc-400 leading-relaxed max-w-2xl mx-auto">
              Every safeguard is intentional: strict access boundaries, encrypted infrastructure,
              and transparent governance for sensitive client data.
            </p>
          </div>

          <div className="mt-14 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {CONTROL_CARDS.map((card) => (
              <article
                key={card.title}
                className="group relative rounded-2xl border border-slate-200/75 dark:border-zinc-800/70 bg-white/80 dark:bg-zinc-900/45 backdrop-blur-sm p-6 md:p-7 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-200/40 dark:hover:shadow-black/30"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/80 to-transparent dark:from-zinc-900/30 pointer-events-none" />
                <SecurityIcon type={card.icon} />
                <h2 className="mt-5 text-xl font-medium text-slate-900 dark:text-white">{card.title}</h2>
                <p className="mt-3 text-sm font-light text-slate-500 dark:text-zinc-400 leading-relaxed">{card.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="protocols" className="relative py-20 md:py-24">
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-slate-50/40 to-transparent dark:from-zinc-900/20" />
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <h2 className="text-center text-3xl md:text-4xl font-extralight tracking-tight text-slate-900 dark:text-white">
            Our protocols and practices
          </h2>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {PROTOCOL_CARDS.map((card) => (
              <article
                key={card.title}
                className="rounded-2xl border border-slate-200/75 dark:border-zinc-800/70 bg-white/70 dark:bg-zinc-900/35 p-6 md:p-7"
              >
                <h3 className="text-xl font-medium text-slate-900 dark:text-white">{card.title}</h3>
                <p className="mt-3 text-sm font-light text-slate-500 dark:text-zinc-400 leading-relaxed">{card.body}</p>
              </article>
            ))}
          </div>

          <div className="mt-14 md:mt-16 flex flex-col items-center gap-8">
            <div className="flex flex-wrap items-center justify-center gap-5 md:gap-6">
              <div className="w-[96px] h-[96px] rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col items-center justify-center shadow-md shadow-slate-200/50 dark:shadow-black/30">
                <span className="text-[20px] font-normal tracking-tight text-slate-800 dark:text-zinc-200">AICPA</span>
                <span className="text-[11px] font-light text-slate-500 dark:text-zinc-500 mt-0.5">SOC 2</span>
              </div>
              <div className="w-[96px] h-[96px] rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col items-center justify-center shadow-md shadow-slate-200/50 dark:shadow-black/30">
                <span className="text-[20px] font-normal tracking-tight text-slate-800 dark:text-zinc-200">GDPR</span>
                <span className="text-[11px] font-light text-slate-500 dark:text-zinc-500 mt-0.5">Ready</span>
              </div>
              <div className="w-[96px] h-[96px] rounded-full border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col items-center justify-center shadow-md shadow-slate-200/50 dark:shadow-black/30">
                <span className="text-[18px] font-normal tracking-tight text-slate-800 dark:text-zinc-200">Cyber</span>
                <span className="text-[11px] font-light text-slate-500 dark:text-zinc-500 mt-0.5">Essentials</span>
              </div>
            </div>

            <Link
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6 py-3 text-[16px] font-medium text-slate-800 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Visit trust centre
              <IconArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </section>

      <SecurityFooter />
    </main>
  );
}
