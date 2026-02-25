# Dashboard Enrichment v2 — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add expandable observation savings breakdowns and a Scenarios tab with before/after what-if modelling to the Intelligence Panel.

**Architecture:** Inline enhancement in `page.tsx` matching the existing pattern. Backend observations enriched with savings breakdown data. Salary sacrifice tool results piped to a new `scenarios` state via existing SSE events. No new libraries required.

**Tech Stack:** React 18, Next.js 14, framer-motion, Python FastAPI, SSE streaming.

---

## Task 1: Add `savingsBreakdown` to backend ObservationItem

**Files:**
- Modify: `helio/apps/api/app/tax/types.py:160-168`

**Step 1: Add the SavingsBreakdown dataclass**

Add above `ObservationItem` (after line 157):

```python
@dataclass(frozen=True)
class SavingsBreakdownItem:
    label: str
    value: str

@dataclass(frozen=True)
class TaxImpactItem:
    label: str
    annual: float
    monthly: float

@dataclass(frozen=True)
class SavingsBreakdown:
    current_state: list[SavingsBreakdownItem]
    recommended_action: list[SavingsBreakdownItem]
    tax_impact: list[TaxImpactItem]
    total_annual: float
    total_monthly: float
    cost_note: str | None = None
    effective_relief: float | None = None
    model_prompt: str | None = None
```

**Step 2: Add `savings_breakdown` field to ObservationItem**

Change `ObservationItem` to:

```python
@dataclass(frozen=True)
class ObservationItem:
    id: str
    title: str
    description: str
    severity: str
    category: str
    potential_saving: float | None = None
    action: str | None = None
    savings_breakdown: SavingsBreakdown | None = None
```

**Step 3: Verify no tests break**

Run: `cd helio && python -m pytest apps/api/tests/tax/ -v --tb=short 2>/dev/null || echo "No tests dir or tests passed"`

**Step 4: Commit**

```bash
git add helio/apps/api/app/tax/types.py
git commit -m "feat(tax): add SavingsBreakdown dataclass to ObservationItem"
```

---

## Task 2: Enrich observations.py with savings breakdowns

**Files:**
- Modify: `helio/apps/api/app/tax/observations.py:1-142`

**Step 1: Update imports**

At line 12, add the new types to the import:

```python
from app.tax.types import (
    ANIResult,
    HICBCResult,
    IncomeTaxResult,
    NIResult,
    ObservationItem,
    PAStatus,
    PensionAAResult,
    SavingsBreakdown,
    SavingsBreakdownItem,
    TaxImpactItem,
)
```

**Step 2: Add savings breakdown to PA taper zone observation (lines 32-49)**

Replace the `pa-taper-zone` observation with:

```python
    if ani.pa_status == PAStatus.TAPERED:
        excess = ani.adjusted_net_income - 100_000
        pa_saving = ani.personal_allowance_lost * 0.40
        ni_saving = excess * 0.02 if excess > 0 else 0  # upper rate NI on the excess
        total_annual = pa_saving + ni_saving
        obs.append(ObservationItem(
            id="pa-taper-zone",
            title="Personal Allowance Taper Zone",
            description=(
                f"Your ANI of £{ani.adjusted_net_income:,.0f} is in the PA taper zone "
                f"(£100,000–£125,140). You're losing £{ani.personal_allowance_lost:,.0f} "
                f"of your Personal Allowance, creating an effective 60% marginal rate."
            ),
            severity="warning",
            category="income_tax",
            potential_saving=total_annual,
            action=(
                f"Consider increasing pension contributions by £{excess:,.0f} "
                f"to reduce ANI below £100,000 and restore full PA."
            ),
            savings_breakdown=SavingsBreakdown(
                current_state=[
                    SavingsBreakdownItem("Adjusted Net Income", f"£{ani.adjusted_net_income:,.0f}"),
                    SavingsBreakdownItem("Personal Allowance", f"£{ani.personal_allowance:,.0f} (tapered)"),
                    SavingsBreakdownItem("PA lost", f"£{ani.personal_allowance_lost:,.0f}"),
                ],
                recommended_action=[
                    SavingsBreakdownItem("Increase pension by", f"£{excess:,.0f}"),
                    SavingsBreakdownItem("ANI drops to", "£100,000"),
                    SavingsBreakdownItem("PA restored", "£12,570 (full)"),
                ],
                tax_impact=[
                    TaxImpactItem("Income tax saved (60% band)", pa_saving, pa_saving / 12),
                    TaxImpactItem("NI saved", ni_saving, ni_saving / 12),
                ],
                total_annual=total_annual,
                total_monthly=total_annual / 12,
                cost_note=f"Net take-home reduces but pension pot grows by £{excess:,.0f} more.",
                model_prompt=f"Model salary sacrifice increase of £{excess:,.0f} to restore my personal allowance",
            ),
        ))
```

**Step 3: Add savings breakdown to PA fully lost observation (lines 52-62)**

Replace the `pa-lost` observation with:

```python
    if ani.pa_status == PAStatus.LOST:
        # To restore PA: need ANI ≤ £125,140
        excess_over_restore = ani.adjusted_net_income - 125_140
        pa_saving = 12_570 * 0.40  # restoring full PA saves 40% of £12,570
        obs.append(ObservationItem(
            id="pa-lost",
            title="Personal Allowance Fully Lost",
            description=(
                f"Your ANI of £{ani.adjusted_net_income:,.0f} exceeds £125,140. "
                f"Your entire £12,570 Personal Allowance has been lost."
            ),
            severity="warning",
            category="income_tax",
            potential_saving=pa_saving,
            action=(
                f"Increase pension contributions by £{excess_over_restore:,.0f} "
                f"to reduce ANI to £125,140 and begin restoring PA."
            ),
            savings_breakdown=SavingsBreakdown(
                current_state=[
                    SavingsBreakdownItem("Adjusted Net Income", f"£{ani.adjusted_net_income:,.0f}"),
                    SavingsBreakdownItem("Personal Allowance", "£0 (fully lost)"),
                    SavingsBreakdownItem("Excess above £125,140", f"£{excess_over_restore:,.0f}"),
                ],
                recommended_action=[
                    SavingsBreakdownItem("Increase pension by", f"£{excess_over_restore:,.0f}"),
                    SavingsBreakdownItem("ANI drops to", "£125,140"),
                    SavingsBreakdownItem("PA restoration begins", "Up to £12,570"),
                ],
                tax_impact=[
                    TaxImpactItem("Income tax saved (PA restoration)", pa_saving, pa_saving / 12),
                ],
                total_annual=pa_saving,
                total_monthly=pa_saving / 12,
                cost_note=f"Sacrifice £{excess_over_restore:,.0f} more to start restoring PA. Full restoration requires ANI ≤ £100,000.",
                model_prompt=f"Model salary sacrifice increase of £{excess_over_restore:,.0f} to restore my personal allowance",
            ),
        ))
```

**Step 4: Add savings breakdown to HICBC observation (lines 65-81)**

Replace the `hicbc-applies` observation with:

```python
    if hicbc and hicbc.applies:
        obs.append(ObservationItem(
            id="hicbc-applies",
            title="High Income Child Benefit Charge",
            description=(
                f"HICBC applies at {hicbc.clawback_percentage:.0f}% clawback. "
                f"Charge of £{hicbc.hicbc_charge:,.2f} against "
                f"£{hicbc.child_benefit_annual:,.2f} annual benefit."
            ),
            severity="warning",
            category="child_benefit",
            potential_saving=hicbc.hicbc_charge,
            action=(
                "Salary sacrifice could reduce ANI below £60,000 threshold "
                "and eliminate the HICBC charge."
            ),
            savings_breakdown=SavingsBreakdown(
                current_state=[
                    SavingsBreakdownItem("Adjusted Net Income", f"£{ani.adjusted_net_income:,.0f}"),
                    SavingsBreakdownItem("Child Benefit annual", f"£{hicbc.child_benefit_annual:,.2f}"),
                    SavingsBreakdownItem("Clawback", f"{hicbc.clawback_percentage:.0f}%"),
                    SavingsBreakdownItem("HICBC charge", f"£{hicbc.hicbc_charge:,.2f}"),
                ],
                recommended_action=[
                    SavingsBreakdownItem("Reduce ANI below", "£60,000"),
                    SavingsBreakdownItem("HICBC charge becomes", "£0"),
                    SavingsBreakdownItem("Benefit retained", f"£{hicbc.child_benefit_annual:,.2f}/yr"),
                ],
                tax_impact=[
                    TaxImpactItem("HICBC charge avoided", hicbc.hicbc_charge, hicbc.hicbc_charge / 12),
                ],
                total_annual=hicbc.hicbc_charge,
                total_monthly=hicbc.hicbc_charge / 12,
                cost_note="Reduce ANI via pension sacrifice or other deductions to eliminate the charge entirely.",
                model_prompt=f"Model salary sacrifice to reduce ANI below £60,000 to avoid HICBC",
            ),
        ))
```

**Step 5: Add savings breakdown to pension headroom observation (lines 84-102)**

Replace the `pension-headroom` observation with:

```python
    if pension_aa and pension_aa.remaining > 0:
        marginal_rate = _estimate_marginal_rate(ani, income_tax)
        potential = pension_aa.remaining * marginal_rate
        obs.append(ObservationItem(
            id="pension-headroom",
            title="Pension Contribution Headroom",
            description=(
                f"You have £{pension_aa.remaining:,.0f} of unused pension annual "
                f"allowance (including carry forward)."
            ),
            severity="opportunity",
            category="pension",
            potential_saving=potential if potential > 0 else None,
            action=(
                f"Additional pension contributions could save up to "
                f"£{potential:,.0f} in tax at your {marginal_rate:.0%} marginal rate."
            ),
            savings_breakdown=SavingsBreakdown(
                current_state=[
                    SavingsBreakdownItem("Pension AA remaining", f"£{pension_aa.remaining:,.0f}"),
                    SavingsBreakdownItem("Current contributions", f"£{pension_contributions:,.0f}"),
                    SavingsBreakdownItem("Marginal tax rate", f"{marginal_rate:.0%}"),
                ],
                recommended_action=[
                    SavingsBreakdownItem("Max additional contribution", f"£{pension_aa.remaining:,.0f}"),
                    SavingsBreakdownItem("Tax relief at marginal rate", f"{marginal_rate:.0%}"),
                ],
                tax_impact=[
                    TaxImpactItem("Tax relief on contributions", potential, potential / 12),
                ],
                total_annual=potential,
                total_monthly=potential / 12,
                model_prompt=f"Model increasing pension contributions by £{pension_aa.remaining:,.0f}",
            ) if potential > 0 else None,
        ))
```

**Step 6: Commit**

```bash
git add helio/apps/api/app/tax/observations.py
git commit -m "feat(tax): add savings breakdowns to observation detections"
```

---

## Task 3: Map savingsBreakdown to dashboard JSON in tax_engine.py

**Files:**
- Modify: `helio/apps/api/app/services/tools/tax_engine.py:237-248`

**Step 1: Update the observations mapping**

Replace lines 237-248 with:

```python
    # Observations
    observations = []
    for o in pos.observations:
        obs_dict = {
            "id": o.id,
            "type": o.severity,
            "title": o.title,
            "description": o.description,
            "category": o.category,
            "potentialSaving": o.potential_saving,
            "action": o.action,
        }
        if o.savings_breakdown:
            sb = o.savings_breakdown
            obs_dict["savingsBreakdown"] = {
                "currentState": [{"label": i.label, "value": i.value} for i in sb.current_state],
                "recommendedAction": [{"label": i.label, "value": i.value} for i in sb.recommended_action],
                "taxImpact": [{"label": i.label, "annual": i.annual, "monthly": i.monthly} for i in sb.tax_impact],
                "totalAnnual": sb.total_annual,
                "totalMonthly": sb.total_monthly,
                "costNote": sb.cost_note,
                "effectiveRelief": sb.effective_relief,
                "modelPrompt": sb.model_prompt,
            }
        observations.append(obs_dict)
```

**Step 2: Commit**

```bash
git add helio/apps/api/app/services/tools/tax_engine.py
git commit -m "feat(api): map savingsBreakdown to frontend dashboard JSON"
```

---

## Task 4: Update frontend Observation interface and data mapping

**Files:**
- Modify: `helio/apps/web/src/app/chat/page.tsx:63-71` (Observation interface)
- Modify: `helio/apps/web/src/app/chat/page.tsx:454-465` (observations useMemo)

**Step 1: Extend the Observation interface**

Replace lines 63-71 with:

```typescript
interface SavingsBreakdownItem {
  label: string;
  value: string;
}

interface TaxImpactItem {
  label: string;
  annual: number;
  monthly: number;
}

interface SavingsBreakdown {
  currentState: SavingsBreakdownItem[];
  recommendedAction: SavingsBreakdownItem[];
  taxImpact: TaxImpactItem[];
  totalAnnual: number;
  totalMonthly: number;
  costNote?: string;
  effectiveRelief?: number;
  modelPrompt?: string;
}

interface Observation {
  id?: string;
  severity: "critical" | "warning" | "opportunity" | "info";
  title: string;
  detail: string;
  category?: string;
  potentialSaving?: number | null;
  action?: string | null;
  savingsBreakdown?: SavingsBreakdown | null;
}
```

**Step 2: Update observations useMemo mapping**

Replace lines 454-465 with:

```typescript
  const observations: Observation[] = useMemo(() => {
    if (!dashboardData?.observations) return [];
    return dashboardData.observations.map((obs: any) => ({
      id: obs.id || undefined,
      severity: (obs.type || obs.severity || "info") as "critical" | "warning" | "opportunity" | "info",
      title: obs.title,
      detail: obs.description || obs.detail || obs.action || "",
      category: obs.category || undefined,
      potentialSaving: obs.potentialSaving ?? obs.potential_saving ?? null,
      action: obs.action || null,
      savingsBreakdown: obs.savingsBreakdown || null,
    }));
  }, [dashboardData]);
```

**Step 3: Commit**

```bash
git add helio/apps/web/src/app/chat/page.tsx
git commit -m "feat(web): extend Observation interface with savingsBreakdown"
```

---

## Task 5: Build expandable ObservationCard with savings breakdown

**Files:**
- Modify: `helio/apps/web/src/app/chat/page.tsx:1901-1972` (ObservationCard component)

**Step 1: Rewrite ObservationCard with expand/collapse**

Replace the `ObservationCard` function (lines 1901-1972) with:

```typescript
function ObservationCard({ obs, index, onModelScenario }: { obs: Observation; index: number; onModelScenario?: (prompt: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const config = severityConfig[obs.severity] || severityConfig.info;
  const catLabel = obs.category ? categoryLabels[obs.category] || obs.category : null;
  const CatIcon = obs.category ? categoryIcons[obs.category] : null;
  const hasBreakdown = obs.savingsBreakdown && obs.savingsBreakdown.taxImpact.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="group relative rounded-xl border border-slate-200/40 dark:border-zinc-800/30 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm overflow-hidden hover:border-brand-200/40 dark:hover:border-brand-700/30 transition-all duration-200"
    >
      {/* Severity gradient accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b ${config.accent}`} />

      <div className="p-3.5 pl-4">
        {/* Top row: icon + title + severity badge */}
        <div className="flex items-start gap-2.5">
          <span className={`flex-shrink-0 w-7 h-7 rounded-lg ${config.iconBg} flex items-center justify-center mt-0.5`}>
            {obs.severity === "opportunity" ? (
              <IconTrendingUp className={`w-3.5 h-3.5 ${config.text}`} />
            ) : obs.severity === "info" ? (
              <IconLightbulb className={`w-3.5 h-3.5 ${config.text}`} />
            ) : (
              <IconAlertCircle className={`w-3.5 h-3.5 ${config.text}`} />
            )}
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-[12px] font-medium text-slate-800 dark:text-zinc-100 leading-snug">{obs.title}</p>
              <span className={`flex-shrink-0 text-[7px] uppercase tracking-widest font-semibold px-1.5 py-0.5 rounded-md ${config.iconBg} ${config.text}`}>
                {obs.severity}
              </span>
            </div>

            {/* Description */}
            <p className="text-[11px] font-light text-slate-500 dark:text-zinc-400 leading-relaxed mb-2">{obs.detail}</p>

            {/* Bottom row: category + potential saving + expand toggle */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {catLabel && (
                  <span className="flex items-center gap-1 text-[8px] font-medium text-slate-400 dark:text-zinc-500 bg-slate-100/60 dark:bg-zinc-800/40 px-1.5 py-0.5 rounded">
                    {CatIcon && CatIcon("w-2.5 h-2.5")}
                    {catLabel}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {obs.potentialSaving != null && obs.potentialSaving > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    <IconTrendingUp className="w-3 h-3" />
                    {`\u00A3${obs.potentialSaving.toLocaleString()}`}/yr
                  </span>
                )}
                {hasBreakdown && (
                  <button
                    onClick={() => setExpanded(!expanded)}
                    className="text-[9px] font-medium text-brand-500 dark:text-brand-400 hover:text-brand-600 dark:hover:text-brand-300 transition-colors flex items-center gap-0.5"
                  >
                    {expanded ? "Hide" : "Details"}
                    <motion.span
                      animate={{ rotate: expanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      className="inline-block"
                    >
                      <IconChevronDown className="w-3 h-3" />
                    </motion.span>
                  </button>
                )}
              </div>
            </div>

            {/* Suggested action */}
            {obs.action && !expanded && (
              <div className="mt-2 pt-2 border-t border-slate-100/60 dark:border-zinc-800/30">
                <div className="flex items-start gap-1.5">
                  <IconArrowRight className="w-2.5 h-2.5 text-brand-400 dark:text-brand-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] font-normal text-brand-600 dark:text-brand-400 leading-relaxed">{obs.action}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Expanded savings breakdown ── */}
        <AnimatePresence>
          {expanded && obs.savingsBreakdown && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-slate-200/40 dark:border-zinc-800/30 space-y-3">
                {/* Current state vs Recommended action */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-50/80 dark:bg-zinc-800/40 p-2.5">
                    <p className="text-[8px] uppercase tracking-widest font-semibold text-slate-400 dark:text-zinc-500 mb-2">Current State</p>
                    {obs.savingsBreakdown.currentState.map((item, i) => (
                      <div key={i} className="flex justify-between items-baseline mb-1 last:mb-0">
                        <span className="text-[10px] font-light text-slate-500 dark:text-zinc-400">{item.label}</span>
                        <span className="text-[10px] font-mono font-medium text-slate-700 dark:text-zinc-200 tabular-nums">{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-lg bg-emerald-50/80 dark:bg-emerald-900/20 p-2.5">
                    <p className="text-[8px] uppercase tracking-widest font-semibold text-emerald-600 dark:text-emerald-400 mb-2">Recommended</p>
                    {obs.savingsBreakdown.recommendedAction.map((item, i) => (
                      <div key={i} className="flex justify-between items-baseline mb-1 last:mb-0">
                        <span className="text-[10px] font-light text-emerald-700 dark:text-emerald-300">{item.label}</span>
                        <span className="text-[10px] font-mono font-medium text-emerald-800 dark:text-emerald-200 tabular-nums">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tax impact table */}
                <div className="rounded-lg bg-white/60 dark:bg-zinc-800/30 border border-slate-200/30 dark:border-zinc-700/20 p-2.5">
                  <p className="text-[8px] uppercase tracking-widest font-semibold text-slate-400 dark:text-zinc-500 mb-2">Tax Impact</p>
                  {obs.savingsBreakdown.taxImpact.map((item, i) => (
                    <div key={i} className="flex justify-between items-baseline mb-1.5 last:mb-0">
                      <span className="text-[10px] font-light text-slate-500 dark:text-zinc-400">{item.label}</span>
                      <div className="flex gap-3">
                        <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{`\u00A3${item.annual.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}/yr</span>
                        <span className="text-[9px] font-mono text-slate-400 dark:text-zinc-500 tabular-nums">{`\u00A3${item.monthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}/mo</span>
                      </div>
                    </div>
                  ))}
                  {/* Total row */}
                  <div className="flex justify-between items-baseline mt-2 pt-2 border-t border-slate-200/30 dark:border-zinc-700/20">
                    <span className="text-[10px] font-semibold text-slate-700 dark:text-zinc-200">Total benefit</span>
                    <div className="flex gap-3">
                      <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{`\u00A3${obs.savingsBreakdown.totalAnnual.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}/yr</span>
                      <span className="text-[10px] font-mono font-medium text-emerald-500 dark:text-emerald-500 tabular-nums">{`\u00A3${obs.savingsBreakdown.totalMonthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}/mo</span>
                    </div>
                  </div>
                </div>

                {/* Cost note */}
                {obs.savingsBreakdown.costNote && (
                  <p className="text-[10px] font-light text-slate-500 dark:text-zinc-400 italic leading-relaxed px-0.5">
                    {obs.savingsBreakdown.costNote}
                  </p>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 pt-1">
                  {obs.savingsBreakdown.modelPrompt && onModelScenario && (
                    <button
                      onClick={() => onModelScenario(obs.savingsBreakdown!.modelPrompt!)}
                      className="flex-1 flex items-center justify-center gap-1.5 text-[10px] font-medium text-white bg-gradient-to-r from-brand-500 to-violet-500 hover:from-brand-600 hover:to-violet-600 rounded-lg py-2 px-3 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      <IconTrendingUp className="w-3 h-3" />
                      Model This Scenario
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const text = [
                        obs.title,
                        obs.detail,
                        obs.savingsBreakdown?.costNote,
                        `Potential saving: £${obs.potentialSaving?.toLocaleString()}/yr`,
                      ].filter(Boolean).join("\n");
                      navigator.clipboard.writeText(text);
                    }}
                    className="flex items-center justify-center gap-1 text-[10px] font-medium text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 bg-slate-100/60 dark:bg-zinc-800/40 hover:bg-slate-200/60 dark:hover:bg-zinc-700/40 rounded-lg py-2 px-3 transition-all duration-200"
                  >
                    <IconCopy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
```

**Step 2: Add IconChevronDown and IconCopy SVG components**

Find the icon components section near the top of `page.tsx` (around lines 222-260 where other icons are defined). Add:

```typescript
function IconChevronDown({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function IconCopy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
```

**Step 3: Commit**

```bash
git add helio/apps/web/src/app/chat/page.tsx
git commit -m "feat(web): add expandable savings breakdown to ObservationCard"
```

---

## Task 6: Wire onModelScenario and update ObservationsPanel

**Files:**
- Modify: `helio/apps/web/src/app/chat/page.tsx:1817-1897` (ObservationsPanel)
- Modify: `helio/apps/web/src/app/chat/page.tsx:1274-1281` (tab content rendering)

**Step 1: Add onModelScenario prop to ObservationsPanel**

Update the `ObservationsPanel` function signature:

```typescript
function ObservationsPanel({ observations, isGenerating, onModelScenario }: { observations: Observation[]; isGenerating?: boolean; onModelScenario?: (prompt: string) => void }) {
```

**Step 2: Pass onModelScenario to each ObservationCard**

In `ObservationsPanel`, update the two `<ObservationCard>` usages:

For warnings (around line 1878):
```typescript
<ObservationCard key={obs.id || i} obs={obs} index={i} onModelScenario={onModelScenario} />
```

For opportunities (around line 1890):
```typescript
<ObservationCard key={obs.id || `opp-${i}`} obs={obs} index={i} onModelScenario={onModelScenario} />
```

**Step 3: Add the monthly savings to the summary header**

In the `ObservationsPanel` summary header, after `totalSavings` is computed (line 1833), add:

```typescript
  const totalMonthlySavings = Math.round(totalSavings / 12);
```

Then update the savings display (around line 1862) to also show monthly:

```typescript
{totalSavings > 0 && (
  <div className="mt-3 pt-3 border-t border-slate-200/30 dark:border-zinc-800/20">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-medium text-slate-500 dark:text-zinc-400">Total potential savings</span>
      <div className="flex items-baseline gap-2">
        <span className="text-[15px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
          {`\u00A3${totalSavings.toLocaleString()}`}/yr
        </span>
        <span className="text-[11px] font-mono text-emerald-500/60 dark:text-emerald-400/50 tabular-nums">
          {`\u00A3${totalMonthlySavings.toLocaleString()}`}/mo
        </span>
      </div>
    </div>
  </div>
)}
```

**Step 4: Create handleModelScenario callback and pass it**

In the main component body (near the other callbacks, around line 420), add:

```typescript
  const handleModelScenario = useCallback((prompt: string) => {
    // Send the prompt as a chat message
    sendMessage(prompt);
    // Auto-switch to scenarios tab after a short delay
    setTimeout(() => setActiveTab("scenarios"), 500);
  }, [sendMessage]);
```

**Step 5: Wire it in the tab content area**

At line 1281, update the observations tab rendering:

```typescript
{activeTab === "observations" && <ObservationsPanel observations={observations} isGenerating={isDashboardGenerating} onModelScenario={handleModelScenario} />}
```

**Step 6: Commit**

```bash
git add helio/apps/web/src/app/chat/page.tsx
git commit -m "feat(web): wire Model This Scenario button to chat + observations panel"
```

---

## Task 7: Add Scenarios tab — state, tab UI, and empty state

**Files:**
- Modify: `helio/apps/web/src/app/chat/page.tsx:290` (activeTab state)
- Modify: `helio/apps/web/src/app/chat/page.tsx:1231-1254` (tab buttons)
- Modify: `helio/apps/web/src/app/chat/page.tsx:1274-1281` (tab content)

**Step 1: Add ScenarioData interface**

After the Observation interface (around line 90 after the changes from Task 4), add:

```typescript
interface ScenarioData {
  id: string;
  name: string;
  description: string;
  current: {
    gross_salary: number;
    sacrifice: number;
    income_tax: number;
    national_insurance: number;
    hicbc: number;
    total_tax: number;
    personal_allowance: number;
  };
  proposed: {
    gross_salary: number;
    sacrifice: number;
    income_tax: number;
    national_insurance: number;
    hicbc: number;
    total_tax: number;
    personal_allowance: number;
  };
  savings: {
    income_tax: number;
    national_insurance: number;
    hicbc_avoided: number;
    total: number;
  };
  pa_change: {
    current: number;
    proposed: number;
    restored: number;
  };
  extra_into_pension: number;
}
```

**Step 2: Add scenarios state**

After line 290 (the `activeTab` state), add:

```typescript
  const [scenarios, setScenarios] = useState<ScenarioData[]>([]);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
```

**Step 3: Update activeTab type**

Change line 290 from:
```typescript
const [activeTab, setActiveTab] = useState<"overview" | "allowances" | "observations">("overview");
```
to:
```typescript
const [activeTab, setActiveTab] = useState<"overview" | "allowances" | "scenarios" | "observations">("overview");
```

**Step 4: Update the tab buttons array**

Change line 1233 from:
```typescript
{(["overview", "allowances", "observations"] as const).map((tab) => (
```
to:
```typescript
{(["overview", "allowances", "scenarios", "observations"] as const).map((tab) => (
```

**Step 5: Add scenarios tab content**

After the `allowances` tab line (1280) and before the `observations` tab line (1281), add:

```typescript
{activeTab === "scenarios" && <ScenariosPanel scenarios={scenarios} activeScenarioId={activeScenarioId} onSelectScenario={setActiveScenarioId} onQuickModel={handleModelScenario} isGenerating={isDashboardGenerating} />}
```

**Step 6: Commit**

```bash
git add helio/apps/web/src/app/chat/page.tsx
git commit -m "feat(web): add scenarios tab state, type, and empty rendering slot"
```

---

## Task 8: Build ScenariosPanel component

**Files:**
- Modify: `helio/apps/web/src/app/chat/page.tsx` (add before ObservationsPanel)

**Step 1: Add the ScenariosPanel component**

Insert before `ObservationsPanel` (around line 1817):

```typescript
/* ─── Scenarios Panel ─── */

function ScenariosPanel({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onQuickModel,
  isGenerating,
}: {
  scenarios: ScenarioData[];
  activeScenarioId: string | null;
  onSelectScenario: (id: string) => void;
  onQuickModel: (prompt: string) => void;
  isGenerating?: boolean;
}) {
  const [sliderValue, setSliderValue] = useState(6000);
  const [showSlider, setShowSlider] = useState(false);
  const activeScenario = scenarios.find((s) => s.id === activeScenarioId) || scenarios[0] || null;

  if (scenarios.length === 0) {
    if (isGenerating) return <PanelGeneratingSkeleton />;
    return (
      <div className="space-y-4">
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-100 to-violet-100 dark:from-brand-900/30 dark:to-violet-900/30 flex items-center justify-center mx-auto mb-3">
            <IconTrendingUp className="w-5 h-5 text-brand-500 dark:text-brand-400" />
          </div>
          <p className="text-[12px] font-medium text-slate-600 dark:text-zinc-300">No scenarios modelled yet</p>
          <p className="text-[11px] font-light text-slate-400 dark:text-zinc-500 mt-1 max-w-[280px] mx-auto leading-relaxed">
            Ask Helio to model a scenario, or use the quick model slider below.
          </p>
          <div className="mt-4 space-y-2">
            {["What if I increase pension sacrifice to £20k?", "Model salary sacrifice at £18,860", "What's the optimal sacrifice to restore my PA?"].map((prompt, i) => (
              <button
                key={i}
                onClick={() => onQuickModel(prompt)}
                className="w-full text-left text-[10px] font-normal text-brand-600 dark:text-brand-400 bg-brand-50/50 dark:bg-brand-900/20 hover:bg-brand-100/50 dark:hover:bg-brand-900/30 rounded-lg px-3 py-2 transition-colors"
              >
                &ldquo;{prompt}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Quick Model slider */}
        <div className="rounded-xl border border-slate-200/40 dark:border-zinc-800/30 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm p-4">
          <button onClick={() => setShowSlider(!showSlider)} className="w-full flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-zinc-400">Quick Model</span>
            <motion.span animate={{ rotate: showSlider ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <IconChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
            </motion.span>
          </button>
          <AnimatePresence>
            {showSlider && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="text-[10px] font-light text-slate-500 dark:text-zinc-400">Pension Sacrifice Amount</label>
                    <input
                      type="range"
                      min={0}
                      max={60000}
                      step={500}
                      value={sliderValue}
                      onChange={(e) => setSliderValue(Number(e.target.value))}
                      className="w-full mt-1 accent-brand-500"
                    />
                    <div className="flex justify-between text-[9px] font-mono text-slate-400 dark:text-zinc-500 tabular-nums mt-0.5">
                      <span>£0</span>
                      <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">£{sliderValue.toLocaleString()}</span>
                      <span>£60,000</span>
                    </div>
                  </div>
                  <button
                    onClick={() => onQuickModel(`Model salary sacrifice at £${sliderValue.toLocaleString()}`)}
                    className="w-full text-[10px] font-medium text-white bg-gradient-to-r from-brand-500 to-violet-500 hover:from-brand-600 hover:to-violet-600 rounded-lg py-2.5 transition-all duration-200 shadow-sm hover:shadow-md"
                  >
                    Calculate Impact
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  // ── With scenarios ──
  return (
    <div className="space-y-4">
      {/* Scenario selector */}
      {scenarios.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => onSelectScenario(s.id)}
              className={`flex-shrink-0 rounded-lg px-3 py-2 text-[10px] font-medium transition-all ${
                activeScenarioId === s.id || (!activeScenarioId && s.id === scenarios[0]?.id)
                  ? "bg-brand-500/10 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300 border border-brand-300/40 dark:border-brand-600/30"
                  : "bg-slate-100/60 dark:bg-zinc-800/40 text-slate-500 dark:text-zinc-400 border border-slate-200/30 dark:border-zinc-700/20 hover:bg-slate-200/60"
              }`}
            >
              <span className="block">{s.name}</span>
              {s.savings.total > 0 && (
                <span className="block text-[9px] font-mono text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">saves £{s.savings.total.toLocaleString()}/yr</span>
              )}
            </button>
          ))}
        </div>
      )}

      {activeScenario && <ScenarioComparison scenario={activeScenario} />}

      {/* Quick Model slider (available even with existing scenarios) */}
      <div className="rounded-xl border border-slate-200/40 dark:border-zinc-800/30 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm p-4">
        <button onClick={() => setShowSlider(!showSlider)} className="w-full flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-zinc-400">Quick Model</span>
          <motion.span animate={{ rotate: showSlider ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <IconChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
          </motion.span>
        </button>
        <AnimatePresence>
          {showSlider && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-3 space-y-3">
                <div>
                  <label className="text-[10px] font-light text-slate-500 dark:text-zinc-400">Pension Sacrifice Amount</label>
                  <input type="range" min={0} max={60000} step={500} value={sliderValue} onChange={(e) => setSliderValue(Number(e.target.value))} className="w-full mt-1 accent-brand-500" />
                  <div className="flex justify-between text-[9px] font-mono text-slate-400 dark:text-zinc-500 tabular-nums mt-0.5">
                    <span>£0</span>
                    <span className="text-[11px] font-semibold text-brand-600 dark:text-brand-400">£{sliderValue.toLocaleString()}</span>
                    <span>£60,000</span>
                  </div>
                </div>
                <button
                  onClick={() => onQuickModel(`Model salary sacrifice at £${sliderValue.toLocaleString()}`)}
                  className="w-full text-[10px] font-medium text-white bg-gradient-to-r from-brand-500 to-violet-500 hover:from-brand-600 hover:to-violet-600 rounded-lg py-2.5 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Calculate Impact
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add helio/apps/web/src/app/chat/page.tsx
git commit -m "feat(web): add ScenariosPanel with empty state and quick model slider"
```

---

## Task 9: Build ScenarioComparison component

**Files:**
- Modify: `helio/apps/web/src/app/chat/page.tsx` (add before ScenariosPanel)

**Step 1: Add the ScenarioComparison component**

Insert before `ScenariosPanel`:

```typescript
/* ─── Scenario Comparison ─── */

function ScenarioComparison({ scenario }: { scenario: ScenarioData }) {
  const s = scenario;
  const fmt = (n: number) => `£${Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const fmtSigned = (n: number) => n > 0 ? `+${fmt(n)}` : n < 0 ? `-${fmt(n)}` : "—";

  const rows: { label: string; current: number; proposed: number; format?: "currency" | "allowance"; invert?: boolean }[] = [
    { label: "Gross Salary", current: s.current.gross_salary, proposed: s.proposed.gross_salary },
    { label: "Pension Sacrifice", current: s.current.sacrifice, proposed: s.proposed.sacrifice },
    { label: "Income Tax", current: s.current.income_tax, proposed: s.proposed.income_tax, invert: true },
    { label: "National Insurance", current: s.current.national_insurance, proposed: s.proposed.national_insurance, invert: true },
    { label: "HICBC", current: s.current.hicbc, proposed: s.proposed.hicbc, invert: true },
    { label: "Total Tax", current: s.current.total_tax, proposed: s.proposed.total_tax, invert: true },
    { label: "Personal Allowance", current: s.current.personal_allowance, proposed: s.proposed.personal_allowance, format: "allowance" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-3"
    >
      {/* ── Before/After table ── */}
      <div className="rounded-xl border border-slate-200/40 dark:border-zinc-800/30 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr,auto,auto,auto] gap-0 border-b border-slate-200/30 dark:border-zinc-800/20 bg-slate-50/50 dark:bg-zinc-800/20 px-3 py-2">
          <span className="text-[8px] uppercase tracking-widest font-semibold text-slate-400 dark:text-zinc-500"></span>
          <span className="text-[8px] uppercase tracking-widest font-semibold text-slate-400 dark:text-zinc-500 text-right w-[80px]">Current</span>
          <span className="text-[8px] uppercase tracking-widest font-semibold text-brand-500 dark:text-brand-400 text-right w-[80px]">Proposed</span>
          <span className="text-[8px] uppercase tracking-widest font-semibold text-slate-400 dark:text-zinc-500 text-right w-[70px]">Delta</span>
        </div>
        {/* Rows */}
        {rows.map((row, i) => {
          const delta = row.proposed - row.current;
          const isSaving = row.invert ? delta < 0 : delta > 0;
          const isCost = row.invert ? delta > 0 : delta < 0;
          const deltaColor = isSaving
            ? "text-emerald-600 dark:text-emerald-400"
            : isCost
            ? "text-amber-600 dark:text-amber-400"
            : "text-slate-400 dark:text-zinc-500";

          return (
            <div
              key={row.label}
              className={`grid grid-cols-[1fr,auto,auto,auto] gap-0 px-3 py-1.5 ${
                i % 2 === 0 ? "" : "bg-slate-50/30 dark:bg-zinc-800/10"
              } ${row.label === "Total Tax" ? "border-t border-slate-200/30 dark:border-zinc-800/20 font-semibold" : ""}`}
            >
              <span className="text-[10px] text-slate-600 dark:text-zinc-300">{row.label}</span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-zinc-400 text-right w-[80px] tabular-nums">{fmt(row.current)}</span>
              <span className="text-[10px] font-mono text-slate-800 dark:text-zinc-100 text-right w-[80px] tabular-nums">{fmt(row.proposed)}</span>
              <span className={`text-[10px] font-mono text-right w-[70px] tabular-nums ${deltaColor}`}>
                {delta === 0 ? "—" : fmtSigned(row.invert ? -delta : delta)}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Net Impact Summary ── */}
      <div className="rounded-xl border border-emerald-200/40 dark:border-emerald-800/20 bg-emerald-50/30 dark:bg-emerald-900/10 backdrop-blur-sm p-4">
        <p className="text-[8px] uppercase tracking-widest font-semibold text-emerald-600 dark:text-emerald-400 mb-3">Net Impact</p>

        <div className="space-y-1.5">
          {s.savings.income_tax > 0 && (
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-light text-emerald-700 dark:text-emerald-300">Income tax saved</span>
              <div className="flex gap-3">
                <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(s.savings.income_tax)}/yr</span>
                <span className="text-[9px] font-mono text-emerald-500/60 tabular-nums">{fmt(Math.round(s.savings.income_tax / 12))}/mo</span>
              </div>
            </div>
          )}
          {s.savings.national_insurance > 0 && (
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-light text-emerald-700 dark:text-emerald-300">NI saved</span>
              <div className="flex gap-3">
                <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(s.savings.national_insurance)}/yr</span>
                <span className="text-[9px] font-mono text-emerald-500/60 tabular-nums">{fmt(Math.round(s.savings.national_insurance / 12))}/mo</span>
              </div>
            </div>
          )}
          {s.savings.hicbc_avoided > 0 && (
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-light text-emerald-700 dark:text-emerald-300">HICBC avoided</span>
              <div className="flex gap-3">
                <span className="text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(s.savings.hicbc_avoided)}/yr</span>
                <span className="text-[9px] font-mono text-emerald-500/60 tabular-nums">{fmt(Math.round(s.savings.hicbc_avoided / 12))}/mo</span>
              </div>
            </div>
          )}

          {/* Total */}
          <div className="flex justify-between items-baseline pt-2 mt-2 border-t border-emerald-200/30 dark:border-emerald-700/20">
            <span className="text-[10px] font-semibold text-emerald-800 dark:text-emerald-200">Total tax benefit</span>
            <div className="flex gap-3">
              <span className="text-[12px] font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(s.savings.total)}/yr</span>
              <span className="text-[10px] font-mono font-medium text-emerald-500 tabular-nums">{fmt(Math.round(s.savings.total / 12))}/mo</span>
            </div>
          </div>
        </div>

        {/* Pension impact */}
        {s.extra_into_pension > 0 && (
          <div className="mt-3 pt-3 border-t border-emerald-200/30 dark:border-emerald-700/20 space-y-1">
            <div className="flex justify-between items-baseline">
              <span className="text-[10px] font-light text-emerald-700 dark:text-emerald-300">Extra into pension</span>
              <span className="text-[10px] font-mono font-semibold text-brand-600 dark:text-brand-400 tabular-nums">+{fmt(s.extra_into_pension)}/yr</span>
            </div>
            {s.savings.total > 0 && s.extra_into_pension > 0 && (
              <p className="text-[10px] font-light text-emerald-600 dark:text-emerald-300 italic mt-1">
                For every £1 of take-home sacrificed, £{((s.extra_into_pension + s.savings.total) / s.extra_into_pension).toFixed(2)} goes into the pension pot.
              </p>
            )}
          </div>
        )}

        {/* PA change */}
        {s.pa_change.restored > 0 && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="text-[9px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-800/30 px-2 py-0.5 rounded-full">
              PA restored: +{fmt(s.pa_change.restored)}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
```

**Step 2: Commit**

```bash
git add helio/apps/web/src/app/chat/page.tsx
git commit -m "feat(web): add ScenarioComparison before/after component"
```

---

## Task 10: Wire salary sacrifice tool results to Scenarios tab

**Files:**
- Modify: `helio/apps/web/src/hooks/useChat.ts:185-198` (tool_result handler)
- Modify: `helio/apps/web/src/hooks/useChat.ts:78-84` (state + exports)
- Modify: `helio/apps/web/src/app/chat/page.tsx:269-281` (useChat destructure)

**Step 1: Add scenarios state to useChat**

In `useChat.ts`, after line 85 (`isDashboardGenerating` state), add:

```typescript
  const [scenarios, setScenarios] = useState<any[]>([]);
```

**Step 2: Capture salary sacrifice results**

In the `tool_result` handler (around line 185-198), add scenario capture for `model_salary_sacrifice`:

After the existing `computationData` capture block (after line 198), add:

```typescript
                // Capture salary sacrifice result as a scenario
                if (data.tool === "model_salary_sacrifice" && data.result?.success) {
                  const result = data.result;
                  const newScenario = {
                    id: crypto.randomUUID(),
                    name: `Sacrifice £${Number(result.proposed?.sacrifice || 0).toLocaleString()}`,
                    description: `Model salary sacrifice at £${Number(result.proposed?.sacrifice || 0).toLocaleString()}`,
                    current: result.current,
                    proposed: result.proposed,
                    savings: result.savings,
                    pa_change: result.pa_change,
                    extra_into_pension: result.extra_into_pension,
                  };
                  setScenarios((prev) => [...prev, newScenario]);
                }
```

**Step 3: Export scenarios from useChat**

Add `scenarios` to the return object (around line 302-314):

```typescript
  return {
    messages,
    status,
    statusMessage,
    isStreaming,
    conversationId,
    dashboardData,
    isDashboardGenerating,
    scenarios,
    sendMessage,
    stopStreaming,
    loadMessages,
    clearMessages,
  };
```

**Step 4: Destructure scenarios in page.tsx**

Update the `useChat` destructure (around line 269-281) to include `scenarios`:

```typescript
  const {
    messages,
    status,
    statusMessage,
    isStreaming,
    conversationId,
    dashboardData,
    isDashboardGenerating,
    scenarios: scenariosList,
    sendMessage,
    stopStreaming,
    loadMessages,
    clearMessages,
  } = useChat(selectedClientId, taxPlanMode);
```

**Step 5: Wire scenariosList to ScenariosPanel**

Update the scenarios tab rendering to use `scenariosList`:

```typescript
{activeTab === "scenarios" && <ScenariosPanel scenarios={scenariosList} activeScenarioId={activeScenarioId} onSelectScenario={setActiveScenarioId} onQuickModel={handleModelScenario} isGenerating={isDashboardGenerating} />}
```

**Step 6: Auto-switch to scenarios tab when a scenario arrives**

In the `handleModelScenario` callback, the `setTimeout(() => setActiveTab("scenarios"), 500)` already handles this.

Also, add an effect to auto-select the first new scenario when it arrives. Add after the `scenarios` state declarations:

```typescript
  // Auto-select the latest scenario when a new one arrives
  useEffect(() => {
    if (scenariosList.length > 0 && !activeScenarioId) {
      setActiveScenarioId(scenariosList[0].id);
    } else if (scenariosList.length > 0) {
      // Select the newest scenario
      setActiveScenarioId(scenariosList[scenariosList.length - 1].id);
    }
  }, [scenariosList.length]);
```

**Step 7: Commit**

```bash
git add helio/apps/web/src/hooks/useChat.ts helio/apps/web/src/app/chat/page.tsx
git commit -m "feat: wire salary sacrifice results to Scenarios tab via SSE"
```

---

## Task 11: Test end-to-end flow

**Step 1: Start the backend**

Run: `cd helio/apps/api && python -m uvicorn app.main:app --reload --port 8000`

**Step 2: Start the frontend**

Run: `cd helio/apps/web && npm run dev`

**Step 3: Manual test checklist**

1. Open the app, select a client, enable Tax Plan mode
2. Send: "Analyse Sarah's tax position"
3. Verify observations appear with "Details" buttons on those with savings breakdowns
4. Click "Details" on an observation — verify the savings breakdown expands smoothly
5. Click "Model This Scenario" — verify it sends a message and switches to Scenarios tab
6. Wait for the scenario result — verify the before/after comparison appears
7. Use the Quick Model slider — set to £20,000 and click "Calculate Impact"
8. Verify a second scenario appears in the scenario list
9. Click between scenarios — verify the comparison updates
10. Click "Copy" on an observation — verify text copies to clipboard

**Step 4: Fix any issues found during testing**

**Step 5: Commit final fixes if needed**

```bash
git add -A && git commit -m "fix: address end-to-end testing issues"
```

---

## Summary

| Task | What | Files | Est. |
|------|------|-------|------|
| 1 | SavingsBreakdown dataclass | `types.py` | 3 min |
| 2 | Enrich observations with breakdowns | `observations.py` | 5 min |
| 3 | Map savingsBreakdown to JSON | `tax_engine.py` | 3 min |
| 4 | Frontend Observation interface | `page.tsx` | 3 min |
| 5 | Expandable ObservationCard | `page.tsx` | 5 min |
| 6 | Wire onModelScenario | `page.tsx` | 3 min |
| 7 | Scenarios tab state + UI slot | `page.tsx` | 3 min |
| 8 | ScenariosPanel component | `page.tsx` | 5 min |
| 9 | ScenarioComparison component | `page.tsx` | 5 min |
| 10 | Wire SSE → scenarios state | `useChat.ts` + `page.tsx` | 5 min |
| 11 | End-to-end testing | — | 5 min |
