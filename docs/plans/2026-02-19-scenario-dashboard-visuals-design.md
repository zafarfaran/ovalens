# Scenario Dashboard Visual Overhaul — Design

**Date:** 2026-02-19
**Status:** Approved

## Problem

The Scenarios tab is entirely text-based — a 4-column numerical table + net impact summary box. Meanwhile the Overview tab has rich visuals (waterfall, donuts, bar charts). The scenario display needs visual parity with before/after charts showing tax breakdown changes at a glance, plus a net benefit card using the new `net_benefit` data from the engine.

## Solution

### 1. Before/After Stacked Bars (replaces comparison table)

Two horizontal stacked bars — "Current" above "Proposed" — showing tax composition:

- **Income Tax** segment (brand/indigo)
- **National Insurance** segment (violet) — salary sacrifice only
- **HICBC** segment (amber) — if applicable

Bars are proportional to the same max scale. The "shrink" from current to proposed is immediately visible. Delta (savings) appears right-aligned with emerald color. Built with Recharts `BarChart` (horizontal) matching existing chart patterns.

New component: `components/charts/scenario-comparison-chart.tsx`

### 2. Net Benefit Card (replaces "Net Impact" box)

Upgraded emerald summary box showing the new `net_benefit` data:

**Personal pension:** Shows net cost to client, government top-up (+20%), total into pension, tax relief (self-assessment), HICBC avoided, total relief, net cost after relief. A mini progress bar showing effective relief rate with "Xp per £1 in pension" tagline.

**Salary sacrifice:** Shows gross into pension, IT saved, NI saved, HICBC avoided, total saving, take-home reduction. Progress bar with cost-per-pound tagline.

### 3. Collapsible Detail Table

The old numerical before/after table moves into a collapsible "View full breakdown" section. Advisers who want exact numbers can expand it.

### 4. Thresholds + AA Warning (unchanged)

These sections stay as-is.

## ScenarioData Interface Updates

Add to the existing interface:
```typescript
net_benefit?: {
  // Personal pension
  gross_contribution?: number;
  net_cost_to_client?: number;
  basic_rate_relief?: number;
  higher_rate_relief?: number;
  hicbc_avoided?: number;
  total_tax_relief?: number;
  net_cost_after_relief?: number;
  net_benefit?: number;
  effective_cost_per_pound_in_pension?: number;
  // Salary sacrifice
  gross_into_pension?: number;
  income_tax_saved?: number;
  ni_saved?: number;
  total_saving?: number;
  take_home_reduction?: number;
};
total_effective_relief_rate?: number;
```

## Files

1. **Create:** `helio/apps/web/src/components/charts/scenario-comparison-chart.tsx`
2. **Modify:** `helio/apps/web/src/app/chat/page.tsx` — ScenarioData interface, ScenarioComparison component

## Design Skill

Use `frontend-design` skill during implementation for polished visual treatment of the chart component and net benefit card.

## Tech

- Recharts (already installed, v3.7.0) for horizontal stacked bars
- Framer Motion for animated bar entrances and collapsible details
- Existing CSS custom properties for theming (--foreground, --muted, --accent, etc.)
- Existing chart patterns (CustomTooltip, ResponsiveContainer, etc.)
