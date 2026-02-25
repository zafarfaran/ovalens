# Client Profile Page — Interactive Charts & Enhanced Information

**Date:** 2026-02-18
**Status:** Approved

## Summary

Redesign the client profile page from a single scrollable view into a **tabbed dashboard** with interactive Recharts visualizations, a net income takeaway section, tax savings summary, and meeting notes timeline.

## Tech Decisions

- **Charting library:** Recharts (React-native, D3-based, declarative components)
- **Layout:** Tabbed sections (Overview, Breakdown, Intelligence, Notes)
- **Animation:** Framer Motion (already installed) for tab transitions
- **Styling:** CSS custom properties (existing design system)

## Tab Structure

The client header (avatar, name, badges, navigation, edit button) remains pinned above the tabs. The 4 metric cards move into the Overview tab.

### Tab 1: Overview

The primary view. Tells the full tax story at a glance.

**Components:**
1. **Metric cards row** — Total Income, Total Tax, Effective Rate, Marginal Rate (moved from header)
2. **Net income takeaway card** — prominent "Your Take-Home: £X" with horizontal stacked bar showing gross → tax → NI → net proportions
3. **Tax composition donut chart** (Recharts `PieChart`) — slices for Income Tax, NI, Dividend Tax, HICBC. Custom tooltip on hover with amount + percentage. Legend below.
4. **Income → Net waterfall chart** (Recharts `BarChart` with custom rendering) — bars showing Gross Income → Personal Allowance deduction → Taxable Income → Income Tax → NI → Net Income. Green for positive, red for deductions.
5. **Tax savings summary card** — aggregates `potential_saving` from all observations. Shows count of opportunities + warnings. Link to Intelligence tab.

**Layout:** Donut and waterfall charts sit side-by-side in a 2-column grid on desktop, stack on smaller screens.

### Tab 2: Breakdown

Drill-down into the numbers with interactive charts.

**Components:**
1. **Income sources horizontal bar chart** (Recharts `BarChart`) — each income source as a horizontal bar with hover tooltip showing amount + % of total
2. **Tax bands grouped bar chart** (Recharts `BarChart`) — for each band: income in band and tax on band side-by-side. Color-coded by rate.
3. **National Insurance donut chart** (Recharts `PieChart`) — Class 1/2/4 split with total NI
4. **Allowances radial bar chart** (Recharts `RadialBarChart`) — used vs remaining for each allowance type (Personal, Pension Annual, Dividend, ISA, CGT)
5. **HICBC section** (if applicable) — Child Benefit amount, Clawback %, HICBC Charge

**Layout:** Income sources and tax bands full-width. NI donut and allowances radial chart in 2-column grid.

### Tab 3: Intelligence

Tax observations and savings tracking.

**Components:**
1. **Savings banner** — total potential savings aggregated from all observations, with a progress-style bar
2. **Severity filter pills** — [All] [Opportunities] [Warnings] [Critical] [Info] — filters the observation list
3. **Observation cards** — existing design enhanced with filter support. Each card shows: severity badge, title, source tag (AI/Engine), potential saving (if any), description, action required, deadline

### Tab 4: Notes

Meeting notes timeline.

**Components:**
1. **Vertical timeline** — meeting notes ordered by date DESC, each with a date marker dot and content area
2. **Empty state** — "No meeting notes yet" message when no notes exist

**Data source:** Existing `GET /api/clients/{id}/meeting-notes` endpoint.

## Chart Theming

All Recharts components use the app's CSS custom properties:
- `--accent` for primary chart colors
- `--surface` for chart backgrounds
- `--text-secondary` for axis labels
- `--border` for grid lines
- Custom color palette derived from existing tax band colors (gray, sky, accent, indigo)

## Data Flow

No new API endpoints needed. All data comes from:
- `GET /api/clients/{id}` — client details, tax profile, observations
- `GET /api/clients/{id}/meeting-notes` — meeting notes

The tax profile response already contains all needed data: `income_sources`, `tax_breakdown`, `ni_breakdown`, `allowances`, `hicbc`, and observations with `potential_saving`.

## New Dependencies

- `recharts` — npm package for React charting

## Files to Modify

- `helio/apps/web/package.json` — add recharts dependency
- `helio/apps/web/src/app/clients/page.tsx` — major refactor into tabbed layout
- New component files (in `helio/apps/web/src/components/charts/`):
  - `tax-donut-chart.tsx`
  - `waterfall-chart.tsx`
  - `income-bar-chart.tsx`
  - `tax-bands-chart.tsx`
  - `ni-donut-chart.tsx`
  - `allowances-radial-chart.tsx`
  - `net-income-bar.tsx`
  - `savings-banner.tsx`
  - `meeting-notes-timeline.tsx`
  - `tab-bar.tsx`
