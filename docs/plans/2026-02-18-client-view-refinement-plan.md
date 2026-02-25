# Client View Refinement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace gimmicky glassmorphism design with warm, refined, professional aesthetic across the client view page.

**Architecture:** CSS-first approach. Update color tokens and utility classes in globals.css, then update component classes in page.tsx and tab-bar.tsx. No structural/layout changes — purely visual refinement.

**Tech Stack:** Tailwind CSS, CSS custom properties, React (Next.js), Framer Motion (reduced usage)

---

### Task 1: Update CSS color tokens in globals.css

**Files:**
- Modify: `helio/apps/web/src/app/globals.css:6-43` (light mode `:root`)
- Modify: `helio/apps/web/src/app/globals.css:45-78` (dark mode `.dark`)

**Step 1: Update light mode color tokens**

Replace `:root` block variables with warm stone palette:

```css
:root {
    --background: #fafaf9;
    --foreground: #1c1917;
    --muted: #78716c;
    --muted-foreground: #a8a29e;
    --border: #e7e5e4;
    --border-subtle: #f5f5f4;
    --accent: #4f6478;
    --accent-hover: #3d5066;
    --accent-light: #f0f3f6;
    --accent-glow: rgba(79, 100, 120, 0.1);
    --surface: #f5f5f4;
    --surface-elevated: #ffffff;
    --success: #16a34a;
    --warning: #d97706;
    --danger: #dc2626;
    --info: #2563eb;
    --card: #ffffff;
    --card-border: #e7e5e4;
    --nav-bg: #fafaf9;

    /* Chart tokens — light */
    --chart-tooltip-bg: rgba(255, 255, 255, 0.95);
    --chart-tooltip-border: #e7e5e4;
    --chart-grid: rgba(120, 113, 108, 0.1);
    --chart-axis: #a8a29e;
    --chart-cursor: rgba(79, 100, 120, 0.06);
}
```

**Step 2: Update dark mode color tokens**

Replace `.dark` block:

```css
.dark {
    --background: #1c1917;
    --foreground: #e7e5e4;
    --muted: #a8a29e;
    --muted-foreground: #78716c;
    --border: #292524;
    --border-subtle: #1c1917;
    --accent: #7d9ab5;
    --accent-hover: #9bb4ca;
    --accent-light: rgba(125, 154, 181, 0.1);
    --accent-glow: rgba(125, 154, 181, 0.15);
    --surface: #292524;
    --surface-elevated: #44403c;
    --card: #292524;
    --card-border: #44403c;
    --nav-bg: #1c1917;

    /* Chart tokens — dark */
    --chart-tooltip-bg: rgba(28, 25, 23, 0.95);
    --chart-tooltip-border: #44403c;
    --chart-grid: rgba(168, 162, 158, 0.08);
    --chart-axis: #78716c;
    --chart-cursor: rgba(125, 154, 181, 0.06);
}
```

**Step 3: Verify the app still renders**

Run: `cd helio/apps/web && npm run dev`
Expected: App loads with new warm color scheme, no build errors.

**Step 4: Commit**

```bash
git add helio/apps/web/src/app/globals.css
git commit -m "style: update color tokens to warm stone palette"
```

---

### Task 2: Remove glassmorphism, orbs, glows, and heavy animations from globals.css

**Files:**
- Modify: `helio/apps/web/src/app/globals.css`

**Step 1: Remove glass token variables**

Delete these lines from both `:root` and `.dark` blocks (they will have been removed in Task 1 already — but if any remain from the glass tokens section, remove them):

- `--glass`, `--glass-hover`, `--glass-border`, `--glass-border-hover`
- `--glass-blur`, `--glass-glow`, `--glass-shadow`, `--glass-shadow-lg`

**Step 2: Remove flashy animation keyframes**

Delete the following keyframe blocks and their utility classes:
- `@keyframes char-rise` and `.animate-char-rise`
- `@keyframes fade-up` and `.animate-fade-up` (in @layer utilities)
- `@keyframes slide-in-left` and `.animate-slide-left`
- `@keyframes slide-in-right` and `.animate-slide-right`
- `@keyframes pulse-soft`
- `@keyframes float` and `.animate-float`
- All `.delay-*` utility classes (75-700)

Keep: `@keyframes fade-in` and `.animate-fade-in` (subtle, useful), `@keyframes draw-line` (for charts).

**Step 3: Remove glassmorphism system classes**

Delete entirely (lines 332-530 approx):
- `.glass`, `.glass:hover`
- `.glass-card`, `.glass-card:hover`
- `.glass-sidebar`
- `.glass-metric`, `.glass-metric::before`, `.glass-metric:hover`, `.glass-metric:hover::before`
- `.dashboard-mesh`, `.dashboard-mesh::before`, `.dark .dashboard-mesh::before`, `.dashboard-mesh::after`
- `.orb-accent-1`, `.orb-accent-2`, `.dark .orb-accent-1`, `.dark .orb-accent-2`
- `@keyframes orb-float-1`, `@keyframes orb-float-2`
- `.glass-tab`, `.glass-tab:hover`, `.glass-tab-active`
- `.luminous-border`, `.luminous-border::before`, `.luminous-border:hover::before`
- `.glow-accent`, `.glow-accent-sm`

**Step 4: Add clean replacement utility classes**

Add after the scrollbar section:

```css
/* ── Refined card system ── */

.refined-card {
  background: var(--card);
  border: 1px solid var(--card-border);
  border-radius: 12px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}

.refined-card:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border-color: var(--border);
}

.refined-sidebar {
  background: var(--surface);
  border-right: 1px solid var(--border);
}
```

**Step 5: Update card-hover to be more subtle**

Replace existing `.card-hover` block:

```css
.card-hover {
  transition: box-shadow 0.15s ease;
}
.card-hover:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}
.dark .card-hover:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
```

**Step 6: Commit**

```bash
git add helio/apps/web/src/app/globals.css
git commit -m "style: remove glassmorphism, orbs, glows, and heavy animations"
```

---

### Task 3: Update TabBar component

**Files:**
- Modify: `helio/apps/web/src/components/charts/tab-bar.tsx`

**Step 1: Replace the full component with clean underline-style tabs**

```tsx
"use client";

export type TabId = "profile" | "overview" | "breakdown" | "intelligence" | "notes";

interface Tab {
  id: TabId;
  label: string;
}

const TABS: Tab[] = [
  { id: "profile", label: "Profile" },
  { id: "overview", label: "Overview" },
  { id: "breakdown", label: "Breakdown" },
  { id: "intelligence", label: "Intelligence" },
  { id: "notes", label: "Notes" },
];

export function TabBar({
  active,
  onChange,
}: {
  active: TabId;
  onChange: (id: TabId) => void;
}) {
  return (
    <div className="flex items-center gap-6 mb-8 border-b border-[var(--border)]">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`relative pb-3 text-[13px] font-medium transition-colors duration-150 ${
            active === tab.id
              ? "text-[var(--foreground)]"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          }`}
        >
          {tab.label}
          {active === tab.id && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[var(--accent)] rounded-full" />
          )}
        </button>
      ))}
    </div>
  );
}
```

Note: This removes the `motion` import entirely — no more spring physics tab pill, replaced with a clean underline indicator.

**Step 2: Commit**

```bash
git add helio/apps/web/src/components/charts/tab-bar.tsx
git commit -m "style: replace glass pill tabs with clean underline tabs"
```

---

### Task 4: Update page.tsx — avatars, sidebar, header, and motion

**Files:**
- Modify: `helio/apps/web/src/app/clients/page.tsx`

**Step 1: Replace gradient avatar palette with solid muted colors**

Replace the `AVATAR_PAIRS` array (line 250-259) and `avatarColors` function (line 261-265) with:

```tsx
const AVATAR_COLORS: string[] = [
  "#78716c", // stone-500
  "#6b7280", // gray-500
  "#71717a", // zinc-500
  "#737373", // neutral-500
  "#a8a29e", // stone-400
  "#9ca3af", // gray-400
  "#a1a1aa", // zinc-400
  "#64748b", // slate-500
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
```

**Step 2: Remove motion variants and stagger config**

Remove lines 268-278 (the `ease`, `stagger`, and `fadeUp` const blocks). These will be replaced with simpler inline transitions.

**Step 3: Update ClientRow — remove gradient avatar and glow**

Replace the ClientRow avatar div (line 314-319):

From:
```tsx
style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
```
To:
```tsx
style={{ background: bg }}
```

And change the `avatarColors` call to use the new single-color function. Update the destructuring from `const [c1, c2] = avatarColors(name)` to `const bg = avatarColor(name)`.

Also in ClientRow, remove the glow shadow from the active state:
- Change `shadow-[0_0_20px_-6px_var(--accent-glow)]` to nothing (just the bg color change is enough)
- Change `hover:bg-[var(--glass)]` to `hover:bg-[var(--surface)]`

**Step 4: Update Metric component — remove glass classes**

Replace `glass-metric rounded-2xl p-5 h-full luminous-border` with `refined-card rounded-xl p-5 h-full`.

Remove the `relative z-10` wrapper div inside (no longer needed since the ::before pseudo-element is gone). Keep the inner content structure.

Remove `motion.div variants={fadeUp}` wrapper — use a plain `div` instead.

**Step 5: Update Card component — remove glass classes**

Replace `glass-card rounded-2xl overflow-hidden h-full luminous-border` with `refined-card rounded-xl overflow-hidden h-full`.

Replace `border-[var(--glass-border)]` in the header divider with `border-[var(--border)]`.

Remove `motion.div variants={fadeUp}` wrapper — use a plain `div` instead.

**Step 6: Update ObsItem — remove glass/blur**

Replace `backdrop-blur-md bg-[var(--glass)] border border-[var(--glass-border)]` with `bg-[var(--card)] border border-[var(--card-border)]`.

Remove `motion.div variants={fadeUp}` — use plain `div`.

**Step 7: Update main page layout — remove orbs and mesh**

In the main return (line 771): Change `dashboard-mesh` to just remove it (use plain background):
```tsx
<div className="h-screen flex bg-[var(--background)]">
```

Remove the two orb divs (lines 773-774):
```tsx
<div className="orb-accent-1" ... />
<div className="orb-accent-2" ... />
```

**Step 8: Update sidebar — remove glass class**

Replace `glass-sidebar` (line 777) with `refined-sidebar`.

Replace all `border-[var(--glass-border)]` in sidebar with `border-[var(--border)]`.

Replace the search input's `bg-[var(--glass)] backdrop-blur-sm border border-[var(--glass-border)]` with `bg-[var(--surface)] border border-[var(--border)]`.

Replace `focus:border-[var(--accent)]/30 focus:ring-1 focus:ring-[var(--accent)]/15` with `focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)]/20`.

**Step 9: Update header avatar — remove gradient and glow shadow**

Replace the header avatar (line 854-859):
```tsx
style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
```
With:
```tsx
style={{ background: avatarColor(name) }}
```

Change `shadow-[0_8px_30px_-4px_rgba(0,0,0,0.3)] ring-1 ring-white/10` to `shadow-sm`.

**Step 10: Update header badges — remove glass**

Replace the region badge's `bg-[var(--glass)] text-[var(--muted)] border border-[var(--glass-border)] backdrop-blur-sm` with `bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]`.

**Step 11: Update prev/next buttons — remove glass**

Replace `bg-[var(--glass)] border border-[var(--glass-border)]` and related hover glass classes with `bg-[var(--surface)] border border-[var(--border)]` and `hover:border-[var(--border)] hover:bg-[var(--surface-elevated)]`.

Remove `backdrop-blur-sm`.

**Step 12: Remove stagger wrappers from tab content**

In each tab's content, replace `<motion.div variants={stagger} initial="initial" animate="animate" className="space-y-5">` with `<div className="space-y-5">`.

This applies to: profile tab (line 952), overview tab (line 1033), breakdown tab (line 1093).

**Step 13: Simplify tab transition animations**

Keep the `AnimatePresence mode="wait"` and the per-tab `motion.div` wrappers, but simplify transitions:
- Remove `y` offset animations (no slide, just fade)
- Reduce duration to 0.15s

Change each tab wrapper from:
```tsx
initial={{ opacity: 0, y: 8 }}
animate={{ opacity: 1, y: 0 }}
exit={{ opacity: 0, y: -8 }}
transition={{ duration: 0.25, ease }}
```
To:
```tsx
initial={{ opacity: 0 }}
animate={{ opacity: 1 }}
exit={{ opacity: 0 }}
transition={{ duration: 0.15 }}
```

**Step 14: Update Intelligence tab filter pills — remove glass**

Replace `bg-[var(--glass)] backdrop-blur-md border border-[var(--glass-border)]` with `bg-[var(--surface)] border border-[var(--border)]`.

Replace active filter's `shadow-[0_0_12px_-3px_var(--accent-glow)]` with nothing (just the bg/border is enough).

Replace `hover:bg-[var(--glass)]` with `hover:bg-[var(--surface)]`.

**Step 15: Update Intelligence savings banner — remove glow/blur**

Replace the inline gradient background and blur orb in the savings banner (lines 571-579) with a simple left-stripe card:

```tsx
<div className="rounded-xl border border-emerald-200 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 border-l-[3px] border-l-emerald-500">
```

Remove the blur orb div (`absolute -top-12 -left-12 ...`).

**Step 16: Update empty state — remove glass**

Replace the "no observations" empty state (line 612):
`border-[var(--glass-border)] bg-[var(--glass)] backdrop-blur-sm` with `border-[var(--border)] bg-[var(--surface)]`.

**Step 17: Remove unused `ease` import references**

Since we removed the `ease` const, update `BandRow` and `SourceBar` and `AllowanceBar` components to use inline ease or remove the custom easing:

For progress bar `motion.div` transitions, replace `ease` with `"easeOut"` and remove stagger delays.

**Step 18: Commit**

```bash
git add helio/apps/web/src/app/clients/page.tsx
git commit -m "style: replace flashy effects with warm refined design"
```

---

### Task 5: Verify and test

**Step 1: Run dev server and check all tabs**

Run: `cd helio/apps/web && npm run dev`

Check:
- [ ] Sidebar renders with solid background, no glass blur
- [ ] Client avatars use solid muted colors, no gradients
- [ ] Tab bar uses clean underline style, no glow pill
- [ ] Metric cards have subtle borders and shadows, no glow on hover
- [ ] Cards are clean with simple borders
- [ ] No floating orbs or mesh gradient in background
- [ ] Tab transitions are quick fade only, no slide animations
- [ ] Intelligence observations have no glass backdrop
- [ ] Filter pills are clean, no glow shadow
- [ ] Dark mode works with new warm dark palette
- [ ] No console errors or build warnings

**Step 2: Run build to verify no compile errors**

Run: `cd helio/apps/web && npm run build`
Expected: Build succeeds with no errors.

**Step 3: Final commit if any adjustments needed**

```bash
git add -A
git commit -m "style: final refinement pass for warm professional design"
```
