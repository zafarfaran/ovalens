const s = { strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
const f = { fill: "currentColor", opacity: 0.1 }; // subtle fill accent

export function OvalensLogo({ className = "h-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 190 32" className={className} aria-label="Ovalens">
      {/* Sun mark — filled center with rays */}
      <circle cx="16" cy="16" r="5.5" fill="currentColor" opacity="0.12" />
      <circle cx="16" cy="16" r="7" stroke="currentColor" {...s} />
      <line x1="16" y1="3" x2="16" y2="7" stroke="currentColor" {...s} />
      <line x1="16" y1="25" x2="16" y2="29" stroke="currentColor" {...s} />
      <line x1="3" y1="16" x2="7" y2="16" stroke="currentColor" {...s} />
      <line x1="25" y1="16" x2="29" y2="16" stroke="currentColor" {...s} />
      <line x1="6.8" y1="6.8" x2="9.6" y2="9.6" stroke="currentColor" {...s} />
      <line x1="22.4" y1="22.4" x2="25.2" y2="25.2" stroke="currentColor" {...s} />
      <line x1="6.8" y1="25.2" x2="9.6" y2="22.4" stroke="currentColor" {...s} />
      <line x1="22.4" y1="9.6" x2="25.2" y2="6.8" stroke="currentColor" {...s} />
      {/* "ovalens" */}
      <text x="38" y="22" fontFamily="inherit" fontWeight="500" fontSize="18" fill="currentColor" letterSpacing="-0.02em">ovalens</text>
    </svg>
  );
}

export function IconCalculator({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <rect x="4" y="2" width="16" height="20" rx="2.5" {...f} />
      <rect x="4" y="2" width="16" height="20" rx="2.5" />
      <rect x="7" y="5" width="10" height="3.5" rx="1" stroke="none" fill="currentColor" opacity="0.15" />
      <circle cx="8.5" cy="12" r="0.8" stroke="none" fill="currentColor" />
      <circle cx="12" cy="12" r="0.8" stroke="none" fill="currentColor" />
      <circle cx="15.5" cy="12" r="0.8" stroke="none" fill="currentColor" />
      <circle cx="8.5" cy="15.5" r="0.8" stroke="none" fill="currentColor" />
      <circle cx="12" cy="15.5" r="0.8" stroke="none" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="0.8" stroke="none" fill="currentColor" />
      <circle cx="8.5" cy="19" r="0.8" stroke="none" fill="currentColor" />
      <rect x="11" y="18.2" width="5.5" height="1.6" rx="0.8" stroke="none" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

export function IconShield({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <path d="M12 2.5l7.5 3.75v5.25c0 5-3.25 8.25-7.5 9.5-4.25-1.25-7.5-4.5-7.5-9.5V6.25L12 2.5z" {...f} />
      <path d="M12 2.5l7.5 3.75v5.25c0 5-3.25 8.25-7.5 9.5-4.25-1.25-7.5-4.5-7.5-9.5V6.25L12 2.5z" />
      <path d="M9 12.5l2 2 4-4.5" strokeWidth="1.6" />
    </svg>
  );
}

export function IconChart({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <path d="M3 20V4" />
      <path d="M3 20h18" />
      <path d="M7 16l4-5.5 3.5 2.5L20 6" strokeWidth="1.6" />
      <circle cx="7" cy="16" r="1.5" stroke="none" fill="currentColor" opacity="0.2" />
      <circle cx="11" cy="10.5" r="1.5" stroke="none" fill="currentColor" opacity="0.2" />
      <circle cx="14.5" cy="13" r="1.5" stroke="none" fill="currentColor" opacity="0.2" />
      <circle cx="20" cy="6" r="1.5" stroke="none" fill="currentColor" opacity="0.2" />
    </svg>
  );
}

export function IconLightbulb({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" {...f} />
      <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
      <line x1="9" y1="19" x2="15" y2="19" />
      <line x1="10" y1="21.5" x2="14" y2="21.5" />
      <path d="M10 12.5l2-2 2 2" strokeWidth="1.2" opacity="0.5" />
    </svg>
  );
}

export function IconArrowRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <path d="M5 12h14" />
      <path d="M13 5l7 7-7 7" />
    </svg>
  );
}

export function IconEye({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

export function IconEyeOff({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="2.5" />
      <line x1="5" y1="5" x2="19" y2="19" />
    </svg>
  );
}

export function IconLink({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

export function IconMessage({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <path d="M21 14.5a2 2 0 0 1-2 2H7l-4 4V4.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" {...f} />
      <path d="M21 14.5a2 2 0 0 1-2 2H7l-4 4V4.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="8" y1="8" x2="16" y2="8" strokeWidth="1.2" opacity="0.3" />
      <line x1="8" y1="11.5" x2="13" y2="11.5" strokeWidth="1.2" opacity="0.3" />
    </svg>
  );
}

export function IconTarget({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <circle cx="12" cy="12" r="10" {...f} />
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" fill="currentColor" opacity="0.25" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

export function IconUpload({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M12 3v12" />
      <path d="M17 8l-5-5-5 5" />
    </svg>
  );
}

export function IconZap({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" {...f} />
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export function IconSend({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <path d="M22 2L11 13" />
      <path d="M22 2L15 22 11 13 2 9z" {...f} />
      <path d="M22 2L15 22 11 13 2 9z" />
    </svg>
  );
}

export function IconChevronDown({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconUser({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <circle cx="12" cy="8" r="4" {...f} />
      <circle cx="12" cy="8" r="4" />
      <path d="M20 21a8 8 0 1 0-16 0" />
    </svg>
  );
}

export function IconCheck({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s} strokeWidth={1.8}>
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

export function IconAlertCircle({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <circle cx="12" cy="12" r="10" {...f} />
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" strokeWidth="1.8" />
      <circle cx="12" cy="16" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconTrendingUp({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <path d="M23 6l-9.5 9.5-5-5L1 18" />
      <path d="M17 6h6v6" />
    </svg>
  );
}

export function IconPieChart({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" {...f} />
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" fill="currentColor" opacity="0.12" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );
}

export function IconWallet({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <rect x="2" y="6" width="20" height="14" rx="2" {...f} />
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <circle cx="17" cy="15" r="1.5" fill="currentColor" opacity="0.2" />
      <circle cx="17" cy="15" r="1.5" />
    </svg>
  );
}

export function IconSparkles({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" fill="currentColor" opacity="0.1" />
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
      <path d="M19 14l.9 2.6L22.5 17.5l-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14z" fill="currentColor" opacity="0.15" />
      <path d="M19 14l.9 2.6L22.5 17.5l-2.6.9L19 21l-.9-2.6-2.6-.9 2.6-.9L19 14z" />
    </svg>
  );
}

export function IconPanelRight({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <rect x="15" y="3" width="6" height="18" rx="0" fill="currentColor" opacity="0.08" stroke="none" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </svg>
  );
}

export function IconClock({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <circle cx="12" cy="12" r="10" {...f} />
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" strokeWidth="1.6" />
    </svg>
  );
}

export function IconBookOpen({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" {...f} />
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" {...f} />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

export function IconPlus({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s} strokeWidth={1.6}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function IconMaximize({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

export function IconMinimize({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <polyline points="4 14 10 14 10 20" />
      <polyline points="20 10 14 10 14 4" />
      <line x1="14" y1="10" x2="21" y2="3" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  );
}

export function IconMic({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <rect x="9" y="2" width="6" height="11" rx="3" {...f} />
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="17" x2="12" y2="21" />
      <line x1="8" y1="21" x2="16" y2="21" />
    </svg>
  );
}

export function IconMicOff({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <line x1="1" y1="1" x2="23" y2="23" />
      <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
      <path d="M17 16.95A7 7 0 0 1 5 12" />
      <path d="M19 10a7 7 0 0 1-.11 1.23" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

export function IconStop({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
    </svg>
  );
}

export function IconOvalensMark({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none">
      <circle cx="12" cy="12" r="4" fill="currentColor" opacity="0.15" />
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2.5" x2="12" y2="5.5" />
      <line x1="12" y1="18.5" x2="12" y2="21.5" />
      <line x1="2.5" y1="12" x2="5.5" y2="12" />
      <line x1="18.5" y1="12" x2="21.5" y2="12" />
      <line x1="5.3" y1="5.3" x2="7.3" y2="7.3" />
      <line x1="16.7" y1="16.7" x2="18.7" y2="18.7" />
      <line x1="5.3" y1="18.7" x2="7.3" y2="16.7" />
      <line x1="16.7" y1="7.3" x2="18.7" y2="5.3" />
    </svg>
  );
}

export function IconSettings({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <circle cx="12" cy="12" r="3" {...f} />
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

export function IconBell({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" {...f} />
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function IconKey({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <circle cx="15.5" cy="8.5" r="5.5" {...f} />
      <circle cx="15.5" cy="8.5" r="5.5" />
      <path d="M11.5 12.5L3 21" />
      <path d="M3 21l3-1.5" />
      <path d="M3 21l1.5-3" />
    </svg>
  );
}

export function IconGlobe({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <circle cx="12" cy="12" r="10" {...f} />
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

export function IconDatabase({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <ellipse cx="12" cy="5" rx="9" ry="3" {...f} />
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

export function IconFileText({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" {...f} />
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" strokeWidth="1.2" opacity="0.4" />
      <line x1="8" y1="17" x2="13" y2="17" strokeWidth="1.2" opacity="0.4" />
    </svg>
  );
}

export function IconUsers({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <circle cx="9" cy="7" r="4" {...f} />
      <circle cx="9" cy="7" r="4" />
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="19" cy="7" r="3" />
      <path d="M23 21v-2a3 3 0 0 0-2.5-2.96" />
    </svg>
  );
}

export function IconCreditCard({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <rect x="1" y="4" width="22" height="16" rx="2" {...f} />
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

export function IconLock({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <rect x="3" y="11" width="18" height="11" rx="2" {...f} />
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      <circle cx="12" cy="16.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconMail({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <rect x="2" y="4" width="20" height="16" rx="2" {...f} />
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="22 4 12 13 2 4" />
    </svg>
  );
}

export function IconChevronRight({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function IconToggle({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <rect x="1" y="5" width="22" height="14" rx="7" {...f} />
      <rect x="1" y="5" width="22" height="14" rx="7" />
      <circle cx="16" cy="12" r="3" fill="currentColor" opacity="0.15" />
      <circle cx="16" cy="12" r="3" />
    </svg>
  );
}

export function IconExternalLink({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function IconSearch({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <circle cx="11" cy="11" r="8" {...f} />
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" strokeWidth="1.6" />
    </svg>
  );
}

export function IconPanelLeft({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <rect x="3" y="3" width="6" height="18" rx="0" fill="currentColor" opacity="0.08" stroke="none" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

export function IconTrash({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} stroke="currentColor" {...s}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" strokeWidth="1.2" opacity="0.5" />
      <line x1="14" y1="11" x2="14" y2="17" strokeWidth="1.2" opacity="0.5" />
    </svg>
  );
}
