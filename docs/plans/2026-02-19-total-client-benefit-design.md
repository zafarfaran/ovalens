# Total Client Benefit — Design

**Date:** 2026-02-19
**Status:** Approved

## Problem

The scenario results show individual tax benefits (IT savings, NI savings, HICBC avoided, basic rate relief) scattered across the chart and net benefit card, but there's no single "how much does the client benefit overall?" number. Additionally:

- **Employer NI savings** (salary sacrifice) — the employer saves 15% NI on the sacrificed amount, which is a major benefit not currently shown at all
- **PA restoration value** — we show "PA restored: +£12,570" as a badge, but not what it's worth in tax terms (e.g. £5,028 for a 40% taxpayer)
- **No monthly equivalents** — advisers think in monthly terms when discussing take-home impact

## Solution

### 1. Backend: `total_benefit` section

Add a `total_benefit` dict to both `analyse_personal_pension()` and `analyse_salary_sacrifice()` that aggregates all financial benefits into a single object with a headline total.

**Personal pension:**
```python
"total_benefit": {
    "basic_rate_relief": 2_000,           # 20% government top-up
    "higher_rate_relief": 2_000,          # IT saving via self-assessment
    "hicbc_avoided": 800,                 # HICBC reduction
    "pa_restoration_value": 5_028,        # Annotation: subset of higher_rate_relief
    "total_annual_benefit": 4_800,        # basic + higher + hicbc
    "into_pension": 10_000,               # Gross contribution going into pension
    "client_out_of_pocket": 5_200,        # Net cost after all relief
    "monthly_benefit": 400,               # total_annual_benefit / 12
    "monthly_cost": 433,                  # client_out_of_pocket / 12
}
```

**Salary sacrifice:**
```python
"total_benefit": {
    "income_tax_saved": 4_000,
    "employee_ni_saved": 2_000,
    "employer_ni_saved": 2_250,           # NEW: employer NI savings
    "hicbc_avoided": 800,
    "pa_restoration_value": 5_028,        # Annotation: subset of IT saving
    "total_annual_benefit": 9_050,        # IT + employee NI + employer NI + HICBC
    "into_pension": 20_000,
    "take_home_reduction": 14_000,
    "monthly_benefit": 754,               # total_annual_benefit / 12
    "monthly_take_home_drop": 1_167,      # take_home_reduction / 12
}
```

**PA restoration value** is already captured within the IT saving (the engine diff accounts for it). It's shown as an informational annotation, not additive to the total.

**Employer NI** is computed by diffing `current.ni_result.class_1.total_employer_ni - proposed.ni_result.class_1.total_employer_ni`. The data is already in TaxPosition.

### 2. Frontend: TotalBenefitHero Component

New component: `components/charts/total-benefit-hero.tsx`

Rendered above the existing ScenarioComparisonChart. Shows:

- Large headline number: "£X,XXX/yr" in emerald
- Monthly equivalent below
- Three KPI metric boxes: Total saving | Into pension | Client cost
- Expandable breakdown showing individual components
- PA restoration as informational annotation with monetized value
- Glassmorphic card, Framer Motion entrance

### 3. ScenarioData Interface Update

Add `total_benefit` to the existing ScenarioData type in `chat/page.tsx`.

### 4. Integration

In `ScenarioComparison`, render `<TotalBenefitHero>` above `<ScenarioComparisonChart>`.

## Files

**Backend:**
1. Modify: `helio/apps/api/app/tax/personal_pension.py` — Add total_benefit computation
2. Modify: `helio/apps/api/app/tax/salary_sacrifice.py` — Add total_benefit + employer NI
3. Modify: `helio/apps/api/tests/tax/test_personal_pension.py` — Tests for total_benefit
4. Modify: `helio/apps/api/tests/tax/test_salary_sacrifice.py` — Tests for total_benefit + employer NI

**Frontend:**
5. Create: `helio/apps/web/src/components/charts/total-benefit-hero.tsx`
6. Modify: `helio/apps/web/src/app/chat/page.tsx` — Interface + integration

## Tech

- Python (backend calculations)
- React 19, Recharts, Framer Motion, Tailwind CSS (frontend)
- Existing TaxPosition.ni_result.class_1.total_employer_ni for employer NI data
