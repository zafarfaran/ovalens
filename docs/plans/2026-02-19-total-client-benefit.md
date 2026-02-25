# Total Client Benefit Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `total_benefit` section to both pension analysis functions (with employer NI savings and PA restoration value), and create a TotalBenefitHero frontend component that shows the headline "how much does the client benefit" at the top of scenario results.

**Architecture:** Add `total_benefit` dict to `analyse_personal_pension()` and `analyse_salary_sacrifice()` return values, aggregating all financial benefits including employer NI savings (new) and PA restoration annotation. Create a `TotalBenefitHero` React component rendered above the existing chart. Update `ScenarioData` interface to include the new data.

**Tech Stack:** Python 3.12, pytest, React 19, Next.js 15, Framer Motion 12.x, Tailwind CSS, TypeScript

---

### Task 1: Personal Pension — Write Failing Tests for total_benefit

**Files:**
- Modify: `helio/apps/api/tests/tax/test_personal_pension.py` (append new tests)

**Step 1: Write the failing tests**

Add these tests to the end of `test_personal_pension.py`:

```python
def test_total_benefit_higher_rate():
    """£80k salary, £10k contribution. total_benefit aggregates all relief."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 80_000, "Employment")]
    r, _ = analyse_personal_pension(sources, proposed_contribution=10_000)

    tb = r["total_benefit"]
    # Components match net_benefit
    assert tb["basic_rate_relief"] == r["net_benefit"]["basic_rate_relief"]
    assert tb["higher_rate_relief"] == r["net_benefit"]["higher_rate_relief"]
    assert tb["hicbc_avoided"] == r["net_benefit"]["hicbc_avoided"]
    # Total = basic + higher + hicbc
    assert tb["total_annual_benefit"] == tb["basic_rate_relief"] + tb["higher_rate_relief"] + tb["hicbc_avoided"]
    assert tb["total_annual_benefit"] > 0
    # Into pension = gross additional contribution
    assert tb["into_pension"] == 10_000
    # Client out of pocket = net cost after relief
    assert tb["client_out_of_pocket"] == r["net_benefit"]["net_cost_after_relief"]
    # Monthly equivalents
    assert tb["monthly_benefit"] == round(tb["total_annual_benefit"] / 12, 2)
    assert tb["monthly_cost"] == round(tb["client_out_of_pocket"] / 12, 2)
    # PA restoration value (no PA taper at £80k, so should be 0)
    assert tb["pa_restoration_value"] == 0


def test_total_benefit_pa_taper():
    """£110k salary, £10k contribution. PA restoration value shown."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 110_000, "Employment")]
    r, _ = analyse_personal_pension(sources, proposed_contribution=10_000)

    tb = r["total_benefit"]
    # PA is restored
    assert r["pa_change"]["restored"] > 0
    # PA restoration value = restored * 0.40 (higher rate)
    assert tb["pa_restoration_value"] == round(r["pa_change"]["restored"] * 0.40, 2)
    assert tb["pa_restoration_value"] > 0
    # PA restoration is a SUBSET of higher_rate_relief (annotation, not additive)
    assert tb["pa_restoration_value"] <= tb["higher_rate_relief"]


def test_total_benefit_zero_contribution():
    """No additional contribution → total_benefit all zeros."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 80_000, "Employment")]
    r, _ = analyse_personal_pension(
        sources, proposed_contribution=5_000, current_contribution=5_000
    )

    tb = r["total_benefit"]
    assert tb["total_annual_benefit"] == 0
    assert tb["into_pension"] == 0
    assert tb["client_out_of_pocket"] == 0
    assert tb["monthly_benefit"] == 0
    assert tb["monthly_cost"] == 0
    assert tb["pa_restoration_value"] == 0
```

**Step 2: Run tests to verify they fail**

Run: `cd helio/apps/api && .venv/bin/python -m pytest tests/tax/test_personal_pension.py -v -k "total_benefit"`
Expected: FAIL with `KeyError: 'total_benefit'`

**Step 3: Commit failing tests**

```bash
git add helio/apps/api/tests/tax/test_personal_pension.py
git commit -m "test: add failing tests for personal pension total_benefit"
```

---

### Task 2: Personal Pension — Implement total_benefit

**Files:**
- Modify: `helio/apps/api/app/tax/personal_pension.py:95-187` (add total_benefit computation and return key)

**Step 1: Add total_benefit computation after net benefit block**

In `personal_pension.py`, after line 95 (after `effective_cost_ppp` computation, before threshold analysis), add:

```python
    # -- Total benefit (headline summary) --------------------------------------
    pa_restored = round_currency(
        proposed.personal_allowance - current.personal_allowance
    )
    pa_restoration_value = round_currency(pa_restored * 0.40) if pa_restored > 0 else 0.0
    total_annual_benefit = total_tax_relief  # basic + higher + hicbc (already computed)
    client_out_of_pocket = net_cost_after_relief
    monthly_benefit = round_currency(total_annual_benefit / 12) if total_annual_benefit > 0 else 0.0
    monthly_cost = round_currency(client_out_of_pocket / 12) if client_out_of_pocket > 0 else 0.0
```

**Step 2: Add total_benefit to the return dict**

In the return dict (starts at line 141), add after the `"net_benefit"` block (after line 186 closing brace):

```python
        "total_benefit": {
            "basic_rate_relief": basic_rate_relief,
            "higher_rate_relief": higher_rate_relief,
            "hicbc_avoided": hicbc_avoided,
            "pa_restoration_value": pa_restoration_value,
            "total_annual_benefit": total_annual_benefit,
            "into_pension": round_currency(additional_contribution),
            "client_out_of_pocket": client_out_of_pocket,
            "monthly_benefit": monthly_benefit,
            "monthly_cost": monthly_cost,
        },
```

**Step 3: Run tests to verify they pass**

Run: `cd helio/apps/api && .venv/bin/python -m pytest tests/tax/test_personal_pension.py -v`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add helio/apps/api/app/tax/personal_pension.py
git commit -m "feat: add total_benefit summary to personal pension analysis"
```

---

### Task 3: Salary Sacrifice — Write Failing Tests for total_benefit + Employer NI

**Files:**
- Modify: `helio/apps/api/tests/tax/test_salary_sacrifice.py` (append new tests)

**Step 1: Write the failing tests**

Add these tests to the end of `test_salary_sacrifice.py`:

```python
def test_total_benefit_salary_sacrifice():
    """£100k salary, £20k sacrifice. total_benefit includes employer NI."""
    r, _ = analyse_salary_sacrifice(100_000, 20_000)

    tb = r["total_benefit"]
    # Components match savings
    assert tb["income_tax_saved"] == r["savings"]["income_tax"]
    assert tb["employee_ni_saved"] == r["savings"]["national_insurance"]
    assert tb["hicbc_avoided"] == r["savings"]["hicbc_avoided"]
    # Employer NI saved should be > 0 (15% on sacrificed amount above secondary threshold)
    assert tb["employer_ni_saved"] > 0
    # Total = IT + employee NI + employer NI + HICBC
    assert tb["total_annual_benefit"] == (
        tb["income_tax_saved"] + tb["employee_ni_saved"]
        + tb["employer_ni_saved"] + tb["hicbc_avoided"]
    )
    # Into pension = additional sacrifice
    assert tb["into_pension"] == 20_000
    # Take-home reduction = sacrifice - employee savings (not employer NI)
    assert tb["take_home_reduction"] == r["net_benefit"]["take_home_reduction"]
    # Monthly equivalents
    assert tb["monthly_benefit"] == round(tb["total_annual_benefit"] / 12, 2)
    assert tb["monthly_take_home_drop"] == round(tb["take_home_reduction"] / 12, 2)
    # PA restoration value (no PA taper at £100k, so 0)
    assert tb["pa_restoration_value"] == 0


def test_total_benefit_employer_ni_amount():
    """Employer NI saved should be approximately 15% of the sacrificed amount."""
    r, _ = analyse_salary_sacrifice(100_000, 20_000)

    tb = r["total_benefit"]
    # Employer NI rate is 15%, secondary threshold is £5,000
    # Current: employer NI on £100k. Proposed: employer NI on £80k.
    # Difference should be approximately 20_000 * 0.15 = £3,000
    assert 2_500 < tb["employer_ni_saved"] < 3_500


def test_total_benefit_salary_sacrifice_pa_taper():
    """£112k salary, sacrifice £12k. PA restored, pa_restoration_value computed."""
    r, _ = analyse_salary_sacrifice(112_000, 12_000)

    tb = r["total_benefit"]
    assert r["pa_change"]["restored"] > 0
    assert tb["pa_restoration_value"] == round(r["pa_change"]["restored"] * 0.40, 2)
    assert tb["pa_restoration_value"] > 0


def test_total_benefit_salary_sacrifice_zero():
    """No additional sacrifice → total_benefit all zeros."""
    r, _ = analyse_salary_sacrifice(100_000, 5_000, current_sacrifice=5_000)

    tb = r["total_benefit"]
    assert tb["total_annual_benefit"] == 0
    assert tb["into_pension"] == 0
    assert tb["employer_ni_saved"] == 0
    assert tb["monthly_benefit"] == 0
```

**Step 2: Run tests to verify they fail**

Run: `cd helio/apps/api && .venv/bin/python -m pytest tests/tax/test_salary_sacrifice.py -v -k "total_benefit"`
Expected: FAIL with `KeyError: 'total_benefit'`

**Step 3: Commit failing tests**

```bash
git add helio/apps/api/tests/tax/test_salary_sacrifice.py
git commit -m "test: add failing tests for salary sacrifice total_benefit and employer NI"
```

---

### Task 4: Salary Sacrifice — Implement total_benefit + Employer NI

**Files:**
- Modify: `helio/apps/api/app/tax/salary_sacrifice.py:73-134` (add employer NI, total_benefit computation and return key)

**Step 1: Add employer NI and total_benefit computation**

In `salary_sacrifice.py`, after line 84 (after `effective_cost_ppp` computation, before the `logger.info` call), add:

```python
    # -- Employer NI savings ---------------------------------------------------
    current_employer_ni = (
        current.ni_result.class_1.total_employer_ni
        if current.ni_result.class_1 else 0.0
    )
    proposed_employer_ni = (
        proposed.ni_result.class_1.total_employer_ni
        if proposed.ni_result.class_1 else 0.0
    )
    employer_ni_saved = round_currency(current_employer_ni - proposed_employer_ni)

    # -- Total benefit (headline summary) --------------------------------------
    pa_restored = round_currency(
        proposed.personal_allowance - current.personal_allowance
    )
    pa_restoration_value = round_currency(pa_restored * 0.40) if pa_restored > 0 else 0.0
    total_annual_benefit = round_currency(
        it_saving + ni_saving + employer_ni_saved + hicbc_avoided
    )
    monthly_benefit = round_currency(total_annual_benefit / 12) if total_annual_benefit > 0 else 0.0
    monthly_take_home_drop = round_currency(take_home_reduction / 12) if take_home_reduction > 0 else 0.0
```

**Step 2: Add employer_ni_saved to the existing savings dict**

In the return dict, modify the `"savings"` section (line 113-118) to add employer NI:

After `"hicbc_avoided": hicbc_avoided,` (line 116), add:

```python
            "employer_ni": employer_ni_saved,
```

**Step 3: Add total_benefit to the return dict**

In the return dict (starts at line 94), add after the `"net_benefit"` block (after line 133 closing brace):

```python
        "total_benefit": {
            "income_tax_saved": it_saving,
            "employee_ni_saved": ni_saving,
            "employer_ni_saved": employer_ni_saved,
            "hicbc_avoided": hicbc_avoided,
            "pa_restoration_value": pa_restoration_value,
            "total_annual_benefit": total_annual_benefit,
            "into_pension": round_currency(additional_sacrifice),
            "take_home_reduction": take_home_reduction,
            "monthly_benefit": monthly_benefit,
            "monthly_take_home_drop": monthly_take_home_drop,
        },
```

**Step 4: Run tests to verify they pass**

Run: `cd helio/apps/api && .venv/bin/python -m pytest tests/tax/test_salary_sacrifice.py -v`
Expected: ALL PASS

**Step 5: Run all tax tests for regression**

Run: `cd helio/apps/api && .venv/bin/python -m pytest tests/tax/ -v`
Expected: ALL PASS (should be 80+ tests now)

**Step 6: Commit**

```bash
git add helio/apps/api/app/tax/salary_sacrifice.py
git commit -m "feat: add total_benefit with employer NI savings to salary sacrifice"
```

---

### Task 5: Update ScenarioData Interface

**Files:**
- Modify: `helio/apps/web/src/app/chat/page.tsx:99-168` (ScenarioData interface)

**Step 1: Add total_benefit to the interface**

In `chat/page.tsx`, find the `ScenarioData` interface. After the closing `};` of the `net_benefit` block (line 167), add:

```typescript
  total_benefit?: {
    // Personal pension fields
    basic_rate_relief?: number;
    higher_rate_relief?: number;
    // Salary sacrifice fields
    income_tax_saved?: number;
    employee_ni_saved?: number;
    employer_ni_saved?: number;
    take_home_reduction?: number;
    monthly_take_home_drop?: number;
    // Shared fields
    hicbc_avoided?: number;
    pa_restoration_value?: number;
    total_annual_benefit?: number;
    into_pension?: number;
    client_out_of_pocket?: number;
    monthly_benefit?: number;
    monthly_cost?: number;
  };
```

Also add `employer_ni` to the `savings` type (line 128):

After `national_insurance?: number;` (line 128), add:

```typescript
    employer_ni?: number;
```

**Step 2: Verify build**

Run: `cd helio/apps/web && npx next build`
Expected: Build succeeds (type is additive, no breaking changes)

**Step 3: Commit**

```bash
git add helio/apps/web/src/app/chat/page.tsx
git commit -m "feat: add total_benefit fields to ScenarioData interface"
```

---

### Task 6: Create TotalBenefitHero Component

**IMPORTANT:** Use the `frontend-design` skill for this task to ensure polished visual treatment.

**Files:**
- Create: `helio/apps/web/src/components/charts/total-benefit-hero.tsx`

**Context for the implementer:**

This component renders a prominent hero card at the top of scenario results showing the total annual benefit the client receives. Match the existing chart aesthetic in the codebase:
- CSS custom properties: `var(--foreground)`, `var(--muted)`, etc.
- Font sizes: 10-12px for labels, larger for hero number
- Animation: framer-motion entrance with `ease: [0.16, 1, 0.3, 1]`
- Glassmorphism card: `rounded-xl border border-slate-200/40 dark:border-zinc-800/30 bg-white/50 dark:bg-zinc-900/30 backdrop-blur-sm`
- Emerald theme for positive financial outcomes

**Requirements:**

The component accepts:
```typescript
interface TotalBenefitHeroProps {
  totalBenefit: ScenarioData["total_benefit"];
  isPension: boolean;
  paChange: ScenarioData["pa_change"];
}
```

**Personal pension layout:**

```
┌──────────────────────────────────────────────────────┐
│  TOTAL ANNUAL BENEFIT                                │
│                                                      │
│  £4,800 /yr                        £400 /month       │
│                                                      │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │ Tax relief   │ │ Into pension │ │ You pay      │  │
│  │ £4,800       │ │ £10,000      │ │ £5,200       │  │
│  └─────────────┘ └──────────────┘ └──────────────┘  │
│                                                      │
│  ▸ Gov top-up (20%)        £2,000                    │
│  ▸ Tax relief (SA)         £2,000                    │
│  ▸ HICBC avoided             £800                    │
│  ▸ PA restored: +£12,570 (worth £5,028 in tax)      │
└──────────────────────────────────────────────────────┘
```

**Salary sacrifice layout:**

```
┌──────────────────────────────────────────────────────┐
│  TOTAL ANNUAL BENEFIT                                │
│                                                      │
│  £9,050 /yr                        £754 /month       │
│                                                      │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────┐  │
│  │ Total saving │ │ Into pension │ │ Take-home    │  │
│  │ £9,050       │ │ £20,000      │ │ -£14,000/yr  │  │
│  └─────────────┘ └──────────────┘ └──────────────┘  │
│                                                      │
│  ▸ Income tax saved        £4,000                    │
│  ▸ Employee NI saved       £2,000                    │
│  ▸ Employer NI saved       £2,250                    │
│  ▸ HICBC avoided             £800                    │
│  ▸ PA restored: +£12,570 (worth £5,028 in tax)      │
└──────────────────────────────────────────────────────┘
```

**Design details:**
- Hero number in large font, emerald color
- Monthly equivalent right-aligned, smaller, muted
- Three metric boxes in a horizontal row (flex, responsive)
- Breakdown lines: only show items with value > 0
- PA restoration line: only show if `paChange.restored > 0`, with `pa_restoration_value` annotation
- If `totalBenefit` is undefined (backwards compat), don't render the component
- Currency values: font-mono, tabular-nums
- Framer Motion: staggered entrance for metric boxes

**Step 1: Create the component file**

Create `helio/apps/web/src/components/charts/total-benefit-hero.tsx` with the implementation. Use `frontend-design` skill for the actual code.

**Step 2: Verify build**

Run: `cd helio/apps/web && npx next build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add helio/apps/web/src/components/charts/total-benefit-hero.tsx
git commit -m "feat: add TotalBenefitHero component for scenario results"
```

---

### Task 7: Integrate TotalBenefitHero into ScenarioComparison

**Files:**
- Modify: `helio/apps/web/src/app/chat/page.tsx:2427-2460` (ScenarioComparison function)

**Step 1: Add import**

At the top of `chat/page.tsx`, with the other chart imports (around line 17-20), add:

```typescript
import { TotalBenefitHero } from "@/components/charts/total-benefit-hero";
```

**Step 2: Add TotalBenefitHero above the chart**

In the `ScenarioComparison` function (line 2427), inside the `motion.div` container (after line 2459, before the `{/* 1. Before/After chart */}` comment at line 2460), add:

```tsx
      {/* 0. Total Benefit Hero */}
      {s.total_benefit && (
        <TotalBenefitHero
          totalBenefit={s.total_benefit}
          isPension={isPension}
          paChange={s.pa_change}
        />
      )}
```

**Step 3: Also pass employer_ni to the ScenarioComparisonChart savings**

In the `ScenarioComparisonChart` component call (line 2461-2466), the `savings` prop already maps to `s.savings`. Since we added `employer_ni` to the savings dict in the backend, the chart will now have access to it. No code change needed — but verify the chart type accepts optional employer_ni.

Check `helio/apps/web/src/components/charts/scenario-comparison-chart.tsx` and add `employer_ni?: number` to the savings type if it has a strict interface.

**Step 4: Verify build**

Run: `cd helio/apps/web && npx next build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add helio/apps/web/src/app/chat/page.tsx
git commit -m "feat: integrate TotalBenefitHero into scenario comparison display"
```

---

### Task 8: Final Verification

**Step 1: Run all backend tests**

Run: `cd helio/apps/api && .venv/bin/python -m pytest tests/tax/ -v`
Expected: ALL PASS (80+ tests, 0 failures)

**Step 2: Run production build**

Run: `cd helio/apps/web && npx next build`
Expected: Build succeeds with no TypeScript errors

**Step 3: Verify tool executor integration**

The `execute_model_personal_pension` in `tax_engine.py` returns `{**result, ...}`, so `total_benefit` automatically propagates. Verify by inspection:

Run: `cd helio/apps/api && .venv/bin/python -c "
from app.tax.personal_pension import analyse_personal_pension
from app.tax.types import IncomeSource, IncomeType
r, _ = analyse_personal_pension([IncomeSource(IncomeType.EMPLOYMENT, 80_000, 'Emp')], 10_000)
print('total_benefit:', r['total_benefit'])
"`
Expected: All fields populated

Run: `cd helio/apps/api && .venv/bin/python -c "
from app.tax.salary_sacrifice import analyse_salary_sacrifice
r, _ = analyse_salary_sacrifice(100_000, 20_000)
print('total_benefit:', r['total_benefit'])
print('employer_ni_saved:', r['total_benefit']['employer_ni_saved'])
"`
Expected: All fields populated, employer_ni_saved > 0

**Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "fix: total client benefit polish"
```
