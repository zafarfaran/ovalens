# Client View Refinement Design

**Date:** 2026-02-18
**Goal:** Replace gimmicky/flashy glassmorphism design with a warm, refined, professional aesthetic

## Problem

The current client view page uses heavy visual effects (floating orbs, glassmorphism, luminous borders, staggered animations, glow shadows) that feel more like a tech demo than a professional financial tool.

## Direction: Warm & Refined

Professional but approachable. Soft natural shadows, warm neutral palette, clean typography hierarchy. Inspired by Notion / Apple Finance.

## CSS Foundation (globals.css)

### Color Token Changes

| Token | Current | New (Light) | New (Dark) |
|-------|---------|-------------|------------|
| `--background` | `#ffffff` | `#fafaf9` (warm white) | `#1c1917` (stone-950) |
| `--foreground` | `#0a0a0b` | `#1c1917` (stone-900) | `#fafaf9` |
| `--muted` | `#64748b` | `#78716c` (stone-500) | `#a8a29e` (stone-400) |
| `--accent` | `#5c7cfa` (bright indigo) | `#4f6478` (muted slate-blue) | `#7d9ab5` |
| `--surface` | `#f8f9fb` | `#f5f5f4` (stone-100) | `#292524` (stone-800) |

### Classes to Remove

- All `.glass-*` classes (glass-card, glass-sidebar, glass-metric, etc.)
- All `.orb-*` classes and keyframes (orb-float-1, orb-float-2)
- `.luminous-border` and its `::before` pseudo-element
- `.dashboard-mesh` and its gradient background
- `@keyframes fade-up`, `char-rise`, `float`, `pulse-soft`
- `.glow-accent`, `.glass-shadow-lg`

### New Simple Classes

- `.card` — solid background, 1px border, 12px radius, `box-shadow: 0 1px 2px rgba(0,0,0,0.05)`
- `.card:hover` — `box-shadow: 0 2px 8px rgba(0,0,0,0.08)` (subtle lift)
- `.sidebar` — solid `var(--surface)` background with right border

## Component Changes (page.tsx)

### Sidebar
- Remove `glass-sidebar`, replace with solid `bg-stone-50 border-r border-stone-200`
- Avatars: single solid muted color with white initials, no gradients

### Tab Bar
- Remove frosted glass background
- Underline-style active indicator (border-b-2 in accent color)
- Clean border-b separator

### Metric Cards
- Remove `glass-metric`, `luminous-border`
- Simple bordered cards, prominent value, muted label
- Hover: slight shadow increase, no glow

### Content Areas
- Remove all Framer Motion staggered entrance animations
- Simple `transition-opacity 150ms` for tab switches
- Remove spring physics from tab indicator

### Observations/Intelligence
- Keep color-coded severity, reduce intensity
- Use `bg-emerald-50`, `bg-amber-50`, `bg-red-50` without glass/opacity modifiers

### Savings Banner
- Replace gradient/glow with bordered card + left accent stripe

## Unchanged

- Overall layout (sidebar + tabs + content grid)
- All chart components (donut, waterfall, bar, etc.)
- Font choices (Outfit + JetBrains Mono)
- Dark mode toggle
- Meeting notes timeline
- Search functionality
- Responsive grid layouts
