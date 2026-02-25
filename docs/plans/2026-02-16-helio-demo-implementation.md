# Helio End-to-End Demo — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Get a working end-to-end demo where an adviser provides income data (via chat or PDF upload), Claude analyses it with real tax calculators, and a live dashboard renders with tax summary, alerts, and scenario modelling.

**Architecture:** FastAPI backend (Python) owns all tax calculations and AI orchestration. Next.js frontend renders the two-panel UI (chat + dashboard). Claude calls tax calculator tools via the FastAPI chat endpoint, and results are streamed to the frontend which updates the dashboard in real time.

**Tech Stack:** FastAPI, Anthropic SDK, Pydantic, Next.js 14, React, Tailwind CSS, Zustand (state), SSE streaming.

**Reference docs:**
- Tax constants: `helio/apps/api/app/tax/constants.py`
- Tax reference: `docs/tax_reference.md`
- Planning strategies: `docs/planning_strategies.md`
- Tool definitions: `docs/tool_definitions.md`
- System prompt: `docs/system_prompt.md`

---

## Task 1: ANI Calculator (Adjusted Net Income)

This is the foundation — every other calculator depends on knowing the ANI.

**Files:**
- Modify: `helio/apps/api/app/tax/ani.py`
- Create: `helio/apps/api/tests/test_ani.py`

**Step 1: Write the failing tests**

```python
# tests/test_ani.py
"""ANI calculator tests."""

import pytest
from app.tax.ani import calculate_adjusted_net_income


def test_ani_basic_no_deductions() -> None:
    """ANI equals total income when no deductions."""
    result = calculate_adjusted_net_income(80_000)
    assert result["adjusted_net_income"] == 80_000
    assert result["personal_allowance"] == 12_570
    assert result["pa_status"] == "full"


def test_ani_with_pension_contributions() -> None:
    """Pension contributions reduce ANI."""
    result = calculate_adjusted_net_income(120_000, pension_contributions=20_000)
    assert result["adjusted_net_income"] == 100_000
    assert result["personal_allowance"] == 12_570
    assert result["pa_status"] == "full"


def test_ani_in_taper_zone() -> None:
    """ANI between 100k-125,140 tapers PA."""
    result = calculate_adjusted_net_income(110_000)
    assert result["adjusted_net_income"] == 110_000
    # PA reduced by (110,000 - 100,000) / 2 = 5,000
    assert result["personal_allowance"] == 7_570
    assert result["pa_status"] == "tapered"
    assert result["taper_amount"] == 5_000
    assert result["in_taper_zone"] is True


def test_ani_pa_fully_lost() -> None:
    """ANI above 125,140 means PA is fully lost."""
    result = calculate_adjusted_net_income(150_000)
    assert result["adjusted_net_income"] == 150_000
    assert result["personal_allowance"] == 0
    assert result["pa_status"] == "lost"
    assert result["in_taper_zone"] is False


def test_ani_with_gift_aid() -> None:
    """Gift Aid (net) is grossed up and deducted from ANI."""
    # £8,000 net Gift Aid = £10,000 gross (grossed up by 100/80)
    result = calculate_adjusted_net_income(115_000, gift_aid=8_000)
    assert result["adjusted_net_income"] == 105_000
    assert result["pa_status"] == "tapered"


def test_ani_pension_restores_pa() -> None:
    """The classic 60% trap mitigation — pension contribution restores PA."""
    # James Mitchell scenario: £147,425 income
    result_before = calculate_adjusted_net_income(147_425)
    assert result_before["personal_allowance"] == 0
    assert result_before["pa_status"] == "lost"

    # £47,425 pension contribution brings ANI to £100,000
    result_after = calculate_adjusted_net_income(147_425, pension_contributions=47_425)
    assert result_after["adjusted_net_income"] == 100_000
    assert result_after["personal_allowance"] == 12_570
    assert result_after["pa_status"] == "full"
```

**Step 2: Run tests to verify they fail**

Run: `cd helio/apps/api && source .venv/bin/activate && pytest tests/test_ani.py -v`
Expected: FAIL — `NotImplementedError`

**Step 3: Implement the calculator**

```python
# app/tax/ani.py
"""Adjusted Net Income (ANI) calculator.

ANI = Total Income - Gross pension contributions - Gift Aid (grossed up)
Used to determine: PA tapering, HICBC, pension AA taper.
"""

from app.tax.constants import PERSONAL_ALLOWANCE, PA_TAPER_THRESHOLD, PA_TAPER_RATE


def calculate_adjusted_net_income(
    total_income: float,
    *,
    pension_contributions: float = 0,
    gift_aid: float = 0,
) -> dict[str, object]:
    """Calculate Adjusted Net Income and Personal Allowance status.

    Args:
        total_income: Gross total income from all sources.
        pension_contributions: Gross pension contributions (employee + personal).
                              Employer contributions do NOT reduce ANI.
        gift_aid: Net Gift Aid donations (will be grossed up by 100/80).

    Returns:
        Dict with: adjusted_net_income, personal_allowance, pa_status,
        taper_amount, in_taper_zone, effective_marginal_rate.
    """
    # Gift Aid is grossed up: net amount / 0.8 gives gross, difference is the deduction
    gift_aid_gross = gift_aid / 0.8 if gift_aid > 0 else 0

    ani = total_income - pension_contributions - gift_aid_gross

    # Personal Allowance taper
    pa = PERSONAL_ALLOWANCE
    taper_amount = 0.0

    if ani > PA_TAPER_THRESHOLD:
        taper_amount = (ani - PA_TAPER_THRESHOLD) * PA_TAPER_RATE
        taper_amount = min(taper_amount, PERSONAL_ALLOWANCE)
        pa = PERSONAL_ALLOWANCE - taper_amount

    # Determine status
    if pa == PERSONAL_ALLOWANCE:
        pa_status = "full"
    elif pa > 0:
        pa_status = "tapered"
    else:
        pa_status = "lost"

    # In taper zone = ANI is between 100k and 125,140 (where PA is partially but not fully lost)
    pa_fully_lost_threshold = PA_TAPER_THRESHOLD + (PERSONAL_ALLOWANCE / PA_TAPER_RATE)
    in_taper_zone = PA_TAPER_THRESHOLD < ani < pa_fully_lost_threshold

    # Effective marginal rate in taper zone: 40% + 2% NI + 20% PA loss = 62%
    effective_marginal_rate = 0.62 if in_taper_zone else None

    return {
        "total_income": total_income,
        "pension_contributions": pension_contributions,
        "gift_aid_gross": gift_aid_gross,
        "adjusted_net_income": ani,
        "personal_allowance": pa,
        "pa_status": pa_status,
        "taper_amount": taper_amount,
        "in_taper_zone": in_taper_zone,
        "effective_marginal_rate": effective_marginal_rate,
    }
```

**Step 4: Run tests to verify they pass**

Run: `cd helio/apps/api && source .venv/bin/activate && pytest tests/test_ani.py -v`
Expected: All 6 tests PASS

**Step 5: Run ruff and mypy**

Run: `ruff check app/tax/ani.py && mypy app/tax/ani.py`
Expected: Clean

**Step 6: Commit**

```bash
git add app/tax/ani.py tests/test_ani.py
git commit -m "feat: implement ANI calculator with PA taper logic"
```

---

## Task 2: Income Tax Calculator

**Files:**
- Modify: `helio/apps/api/app/tax/income_tax.py`
- Create: `helio/apps/api/tests/test_income_tax.py`

**Step 1: Write the failing tests**

```python
# tests/test_income_tax.py
"""Income tax calculator tests."""

from app.tax.income_tax import calculate_income_tax


def test_income_below_personal_allowance() -> None:
    """No tax when income is below PA."""
    result = calculate_income_tax(10_000)
    assert result["income_tax"] == 0
    assert result["effective_rate"] == 0


def test_basic_rate_only() -> None:
    """Tax on income in basic rate band only."""
    # £30,000 income: PA = £12,570, taxable = £17,430 at 20%
    result = calculate_income_tax(30_000)
    assert result["taxable_income"] == 17_430
    assert result["income_tax"] == pytest.approx(3_486)
    assert len(result["bands"]) > 0


def test_higher_rate() -> None:
    """Tax on income spanning basic and higher rate."""
    # £80,000: PA=12570, basic=37700 @20%=7540, higher=(80000-50270) @40%=11892
    result = calculate_income_tax(80_000)
    assert result["income_tax"] == pytest.approx(7_540 + 11_892)


def test_additional_rate() -> None:
    """Tax on income in additional rate band (PA lost)."""
    # £200,000: PA lost, basic=37700 @20%=7540, higher=74870 @40%=29948, additional=74860 @45%=33687
    result = calculate_income_tax(200_000)
    assert result["income_tax"] == pytest.approx(7_540 + 29_948 + 33_687)


def test_pa_taper_applied() -> None:
    """Income tax accounts for PA taper in 100k-125k zone."""
    # £110,000: PA = 12570 - (10000/2) = 7570
    # Taxable = 110000 - 7570 = 102430
    result = calculate_income_tax(110_000)
    assert result["personal_allowance"] == 7_570
    assert result["taxable_income"] == 102_430


def test_scottish_rates() -> None:
    """Scottish income tax uses different bands."""
    result = calculate_income_tax(50_000, is_scottish=True)
    assert result["taxable_income"] == 50_000 - 12_570
    # Scottish has starter(19%), basic(20%), intermediate(21%), higher(42%)
    assert result["income_tax"] != calculate_income_tax(50_000)["income_tax"]


def test_pension_reduces_tax() -> None:
    """Pension contributions reduce tax via ANI reduction."""
    tax_without = calculate_income_tax(120_000)
    tax_with = calculate_income_tax(120_000, pension_contributions=20_000)
    assert tax_with["income_tax"] < tax_without["income_tax"]


def test_marginal_rate_in_taper_zone() -> None:
    """Marginal rate should be 62% in the PA taper zone."""
    result = calculate_income_tax(110_000)
    # 40% + 20% PA loss effective = 60% (NI not included in income tax marginal)
    assert result["marginal_rate"] == pytest.approx(0.60)


def test_marginal_rate_basic() -> None:
    result = calculate_income_tax(30_000)
    assert result["marginal_rate"] == pytest.approx(0.20)


def test_marginal_rate_higher() -> None:
    result = calculate_income_tax(80_000)
    assert result["marginal_rate"] == pytest.approx(0.40)


def test_marginal_rate_additional() -> None:
    result = calculate_income_tax(200_000)
    assert result["marginal_rate"] == pytest.approx(0.45)
```

**Step 2: Run tests to verify they fail**

Run: `pytest tests/test_income_tax.py -v`
Expected: FAIL

**Step 3: Implement the calculator**

```python
# app/tax/income_tax.py
"""Income tax calculator.

Computes income tax liability for England/Wales/NI and Scotland,
handling the income ordering rule (non-savings, savings, dividends),
personal allowance tapering, and marginal rate calculations.
"""

from app.tax.ani import calculate_adjusted_net_income
from app.tax.constants import (
    INCOME_TAX_BANDS,
    PERSONAL_ALLOWANCE,
    SCOTTISH_INCOME_TAX_BANDS,
)


def _tax_on_bands(
    taxable_income: float, bands: list[dict[str, object]]
) -> tuple[float, list[dict[str, float]]]:
    """Calculate tax across bands, returning total and band breakdown."""
    tax = 0.0
    band_results: list[dict[str, float]] = []
    remaining = taxable_income

    for band in bands:
        lower = float(band["lower"])
        upper = band["upper"]
        rate = float(band["rate"])

        if upper is not None:
            band_width = float(upper) - lower + 1
        else:
            band_width = remaining

        if remaining <= 0:
            break

        # Skip the PA band (rate 0) — we already deducted PA from taxable income
        if rate == 0:
            continue

        amount_in_band = min(remaining, band_width)
        band_tax = amount_in_band * rate
        tax += band_tax
        remaining -= amount_in_band

        band_results.append({
            "name": str(band["name"]),
            "lower_limit": lower,
            "upper_limit": float(upper) if upper is not None else 0,
            "rate": rate,
            "amount": amount_in_band,
            "tax": band_tax,
        })

    return tax, band_results


def _get_marginal_rate(
    total_income: float,
    personal_allowance: float,
    *,
    is_scottish: bool = False,
) -> float:
    """Determine the marginal rate on the next pound of income."""
    bands = SCOTTISH_INCOME_TAX_BANDS if is_scottish else INCOME_TAX_BANDS

    # Check PA taper zone: effective 60% marginal (40% tax + 20% PA loss)
    if 100_000 < total_income < 125_140 and not is_scottish:
        return 0.60
    if 100_000 < total_income < 125_140 and is_scottish:
        # Scottish taper zone: the rate depends on which Scottish band they're in
        # At £100k-£125k, Scottish higher rate is 42%, plus 21% PA loss effect ≈ 63%
        return 0.63

    taxable = total_income - personal_allowance
    if taxable <= 0:
        return 0.0

    # Find which band the last pound falls in
    for band in reversed(bands):
        lower = float(band["lower"])
        rate = float(band["rate"])
        if rate == 0:
            continue
        # The taxable bands start after PA, so we need to check against gross income thresholds
        if total_income >= lower:
            return rate

    return 0.0


def calculate_income_tax(
    total_income: float,
    *,
    is_scottish: bool = False,
    pension_contributions: float = 0,
    gift_aid: float = 0,
) -> dict[str, object]:
    """Calculate income tax liability.

    Args:
        total_income: Gross total income from all sources.
        is_scottish: Whether Scottish income tax rates apply.
        pension_contributions: Gross pension contributions (reduces ANI).
        gift_aid: Net Gift Aid donations (reduces ANI).

    Returns:
        Dict with: personal_allowance, taxable_income, income_tax,
        effective_rate, marginal_rate, bands.
    """
    # Calculate ANI to determine PA
    ani_result = calculate_adjusted_net_income(
        total_income,
        pension_contributions=pension_contributions,
        gift_aid=gift_aid,
    )

    personal_allowance = float(ani_result["personal_allowance"])
    ani = float(ani_result["adjusted_net_income"])

    # Taxable income after PA (use ANI for tax calculation base)
    taxable_income = max(0, ani - personal_allowance)

    # Select band set (skip the PA band since we deducted PA already)
    bands = SCOTTISH_INCOME_TAX_BANDS if is_scottish else INCOME_TAX_BANDS

    # Calculate tax — we need to compute tax on the taxable portion
    # The bands are defined in terms of gross income thresholds
    # We need to map taxable_income onto the non-PA bands
    income_tax = 0.0
    band_results: list[dict[str, float]] = []
    remaining = taxable_income

    # Get the taxable bands (skip PA band at rate 0)
    taxable_bands = [b for b in bands if float(b["rate"]) > 0]

    for band in taxable_bands:
        if remaining <= 0:
            break

        rate = float(band["rate"])
        lower = float(band["lower"])
        upper = band["upper"]

        # Band width: from lower to upper, but adjusted for PA
        # The first taxable band starts right after PA
        band_start = lower - PERSONAL_ALLOWANCE  # position relative to taxable income
        if upper is not None:
            band_end = float(upper) - PERSONAL_ALLOWANCE
            band_width = band_end - max(0, band_start)
        else:
            band_width = remaining

        band_width = max(0, band_width)
        amount_in_band = min(remaining, band_width)

        if amount_in_band > 0:
            band_tax = amount_in_band * rate
            income_tax += band_tax
            remaining -= amount_in_band

            band_results.append({
                "name": str(band["name"]),
                "lower_limit": lower,
                "upper_limit": float(upper) if upper is not None else 0,
                "rate": rate,
                "amount": amount_in_band,
                "tax": round(band_tax, 2),
            })

    effective_rate = income_tax / total_income if total_income > 0 else 0
    marginal_rate = _get_marginal_rate(
        ani, personal_allowance, is_scottish=is_scottish
    )

    return {
        "total_income": total_income,
        "personal_allowance": personal_allowance,
        "taxable_income": taxable_income,
        "income_tax": round(income_tax, 2),
        "effective_rate": round(effective_rate, 4),
        "marginal_rate": marginal_rate,
        "bands": band_results,
        "is_scottish": is_scottish,
        "ani": ani_result,
    }
```

**Step 4: Run tests**

Run: `pytest tests/test_income_tax.py -v`
Expected: All PASS. If band width calculations are off, debug with print statements — the tricky part is mapping gross income thresholds to taxable income offsets.

**Step 5: Run linting**

Run: `ruff check app/tax/income_tax.py && mypy app/tax/income_tax.py`

**Step 6: Commit**

```bash
git add app/tax/income_tax.py tests/test_income_tax.py
git commit -m "feat: implement income tax calculator with PA taper and Scottish rates"
```

---

## Task 3: National Insurance Calculator

**Files:**
- Modify: `helio/apps/api/app/tax/national_insurance.py`
- Create: `helio/apps/api/tests/test_ni.py`

**Step 1: Write the failing tests**

```python
# tests/test_ni.py
"""National Insurance calculator tests."""

import pytest
from app.tax.national_insurance import calculate_class_1_ni, calculate_class_4_ni


def test_class1_below_threshold() -> None:
    result = calculate_class_1_ni(10_000)
    assert result["employee_ni"] == 0


def test_class1_basic_band() -> None:
    # £30,000: (30000-12570) * 0.08 = £1,394.40
    result = calculate_class_1_ni(30_000)
    assert result["employee_ni"] == pytest.approx(1_394.40)


def test_class1_above_uel() -> None:
    # £80,000: main = (50270-12570)*0.08=3016, upper = (80000-50270)*0.02=594.60
    result = calculate_class_1_ni(80_000)
    assert result["employee_ni"] == pytest.approx(3_016 + 594.60)
    assert result["main_ni"] == pytest.approx(3_016)
    assert result["upper_ni"] == pytest.approx(594.60)


def test_class1_employer_ni() -> None:
    # £50,000: (50000-9100)*0.138 = 5,644.20
    result = calculate_class_1_ni(50_000)
    assert result["employer_ni"] == pytest.approx(5_644.20)


def test_class4_below_threshold() -> None:
    result = calculate_class_4_ni(10_000)
    assert result["class4_ni"] == 0


def test_class4_main_band() -> None:
    # £30,000: (30000-12570)*0.06 = 1,045.80
    result = calculate_class_4_ni(30_000)
    assert result["class4_ni"] == pytest.approx(1_045.80)


def test_class4_above_upper() -> None:
    # £80,000: main=(50270-12570)*0.06=2262, upper=(80000-50270)*0.02=594.60
    result = calculate_class_4_ni(80_000)
    assert result["class4_ni"] == pytest.approx(2_262 + 594.60)
```

**Step 2: Run to verify failure**

**Step 3: Implement**

```python
# app/tax/national_insurance.py
"""National Insurance contributions calculator."""

from app.tax.constants import (
    NI_CLASS_4_LOWER_PROFIT_LIMIT,
    NI_CLASS_4_MAIN_RATE,
    NI_CLASS_4_UPPER_PROFIT_LIMIT,
    NI_CLASS_4_UPPER_RATE,
    NI_EMPLOYEE_MAIN_RATE,
    NI_EMPLOYEE_UPPER_RATE,
    NI_EMPLOYER_RATE,
    NI_EMPLOYER_SECONDARY_THRESHOLD,
    NI_PRIMARY_THRESHOLD,
    NI_UPPER_EARNINGS_LIMIT,
)


def calculate_class_1_ni(earnings: float) -> dict[str, float]:
    """Calculate Class 1 employee and employer NICs.

    Employee: 8% on earnings £12,570-£50,270, then 2% above.
    Employer: 13.8% on earnings above £9,100.
    """
    # Employee NI
    main_ni = 0.0
    upper_ni = 0.0

    if earnings > NI_PRIMARY_THRESHOLD:
        main_earnings = min(earnings, NI_UPPER_EARNINGS_LIMIT) - NI_PRIMARY_THRESHOLD
        main_ni = main_earnings * NI_EMPLOYEE_MAIN_RATE

    if earnings > NI_UPPER_EARNINGS_LIMIT:
        upper_earnings = earnings - NI_UPPER_EARNINGS_LIMIT
        upper_ni = upper_earnings * NI_EMPLOYEE_UPPER_RATE

    employee_ni = round(main_ni + upper_ni, 2)

    # Employer NI
    employer_ni = 0.0
    if earnings > NI_EMPLOYER_SECONDARY_THRESHOLD:
        employer_ni = round(
            (earnings - NI_EMPLOYER_SECONDARY_THRESHOLD) * NI_EMPLOYER_RATE, 2
        )

    return {
        "earnings": earnings,
        "main_ni": round(main_ni, 2),
        "upper_ni": round(upper_ni, 2),
        "employee_ni": employee_ni,
        "employer_ni": employer_ni,
        "total_ni": round(employee_ni + employer_ni, 2),
    }


def calculate_class_4_ni(profits: float) -> dict[str, float]:
    """Calculate Class 4 self-employed NICs.

    6% on profits £12,570-£50,270, then 2% above.
    """
    main_ni = 0.0
    upper_ni = 0.0

    if profits > NI_CLASS_4_LOWER_PROFIT_LIMIT:
        main_profits = (
            min(profits, NI_CLASS_4_UPPER_PROFIT_LIMIT) - NI_CLASS_4_LOWER_PROFIT_LIMIT
        )
        main_ni = main_profits * NI_CLASS_4_MAIN_RATE

    if profits > NI_CLASS_4_UPPER_PROFIT_LIMIT:
        upper_profits = profits - NI_CLASS_4_UPPER_PROFIT_LIMIT
        upper_ni = upper_profits * NI_CLASS_4_UPPER_RATE

    return {
        "profits": profits,
        "main_ni": round(main_ni, 2),
        "upper_ni": round(upper_ni, 2),
        "class4_ni": round(main_ni + upper_ni, 2),
    }
```

**Step 4-6: Run tests, lint, commit**

```bash
pytest tests/test_ni.py -v
ruff check app/tax/national_insurance.py
git commit -m "feat: implement National Insurance calculator (Class 1 + Class 4)"
```

---

## Task 4: HICBC Calculator

**Files:**
- Modify: `helio/apps/api/app/tax/hicbc.py`
- Create: `helio/apps/api/tests/test_hicbc.py`

**Step 1: Write the failing tests**

```python
# tests/test_hicbc.py
"""HICBC calculator tests."""

import pytest
from app.tax.hicbc import calculate_hicbc


# 2025/26 Child Benefit: first child £1,331.20/yr, additional £881.40/yr

def test_hicbc_not_applicable_below_60k() -> None:
    result = calculate_hicbc(55_000, num_children=2)
    assert result["applies"] is False
    assert result["hicbc_charge"] == 0


def test_hicbc_partial_clawback() -> None:
    """At £70k, clawback is 50%."""
    result = calculate_hicbc(70_000, num_children=2)
    assert result["applies"] is True
    assert result["clawback_percentage"] == pytest.approx(50)
    # 2 children: £1,331.20 + £881.40 = £2,212.60, 50% = £1,106.30
    assert result["hicbc_charge"] == pytest.approx(1_106.30)


def test_hicbc_full_clawback_at_80k() -> None:
    result = calculate_hicbc(80_000, num_children=1)
    assert result["clawback_percentage"] == 100
    assert result["hicbc_charge"] == pytest.approx(1_331.20)


def test_hicbc_above_80k() -> None:
    result = calculate_hicbc(100_000, num_children=1)
    assert result["clawback_percentage"] == 100


def test_hicbc_child_benefit_amount_multiple_children() -> None:
    result = calculate_hicbc(55_000, num_children=3)
    # First: 1331.20, additional x2: 881.40 * 2 = 1762.80
    assert result["annual_child_benefit"] == pytest.approx(1_331.20 + 881.40 * 2)
```

**Step 2: Run to verify failure**

**Step 3: Implement**

```python
# app/tax/hicbc.py
"""High Income Child Benefit Charge (HICBC) calculator.

HICBC applies when ANI exceeds £60,000. The charge equals
1% of child benefit for every £200 of income over £60,000,
reaching 100% at £80,000.
"""

from app.tax.constants import HICBC_FULL_CLAWBACK, HICBC_START

# 2025/26 Child Benefit rates
CHILD_BENEFIT_FIRST_CHILD_WEEKLY = 25.60
CHILD_BENEFIT_ADDITIONAL_CHILD_WEEKLY = 16.95
WEEKS_PER_YEAR = 52


def _annual_child_benefit(num_children: int) -> float:
    """Calculate annual Child Benefit for given number of children."""
    if num_children <= 0:
        return 0.0
    first = CHILD_BENEFIT_FIRST_CHILD_WEEKLY * WEEKS_PER_YEAR
    additional = CHILD_BENEFIT_ADDITIONAL_CHILD_WEEKLY * WEEKS_PER_YEAR * (num_children - 1)
    return round(first + additional, 2)


def calculate_hicbc(
    adjusted_net_income: float,
    *,
    num_children: int = 0,
    annual_child_benefit: float | None = None,
) -> dict[str, object]:
    """Calculate HICBC.

    Args:
        adjusted_net_income: The higher earner's ANI.
        num_children: Number of children (used to calculate benefit if not provided).
        annual_child_benefit: Override annual child benefit amount.

    Returns:
        Dict with: applies, annual_child_benefit, clawback_percentage,
        hicbc_charge, net_benefit.
    """
    benefit = annual_child_benefit if annual_child_benefit is not None else _annual_child_benefit(num_children)

    if adjusted_net_income <= HICBC_START or benefit == 0:
        return {
            "applies": False,
            "annual_child_benefit": benefit,
            "clawback_percentage": 0,
            "hicbc_charge": 0,
            "net_benefit": benefit,
        }

    # Clawback: 1% per £200 over £60,000
    excess = adjusted_net_income - HICBC_START
    clawback_pct = min(100, (excess / 200) * 1)
    charge = round(benefit * clawback_pct / 100, 2)

    return {
        "applies": True,
        "annual_child_benefit": benefit,
        "clawback_percentage": round(clawback_pct, 2),
        "hicbc_charge": charge,
        "net_benefit": round(benefit - charge, 2),
    }
```

**Step 4-6: Run tests, lint, commit**

```bash
pytest tests/test_hicbc.py -v
git commit -m "feat: implement HICBC calculator"
```

---

## Task 5: Salary Sacrifice Analyser

**Files:**
- Modify: `helio/apps/api/app/tax/salary_sacrifice.py`
- Create: `helio/apps/api/tests/test_salary_sacrifice.py`

**Step 1: Write the failing tests**

```python
# tests/test_salary_sacrifice.py
"""Salary sacrifice analyser tests."""

import pytest
from app.tax.salary_sacrifice import analyse_salary_sacrifice


def test_basic_salary_sacrifice() -> None:
    """Salary sacrifice should reduce tax and NI."""
    result = analyse_salary_sacrifice(80_000, 10_000)
    assert result["before"]["gross_salary"] == 80_000
    assert result["after"]["gross_salary"] == 70_000
    assert result["savings"]["total_saving"] > 0


def test_salary_sacrifice_in_taper_zone() -> None:
    """Salary sacrifice from 120k to 100k should restore PA — big savings."""
    result = analyse_salary_sacrifice(120_000, 20_000)
    # Should save tax AND restore PA
    assert result["savings"]["income_tax_saving"] > 0
    assert result["savings"]["employee_ni_saving"] > 0
    assert result["savings"]["employer_ni_saving"] > 0
    assert result["after"]["personal_allowance"] == 12_570  # PA restored


def test_salary_sacrifice_effective_relief() -> None:
    """Check effective relief rate is calculated."""
    result = analyse_salary_sacrifice(80_000, 10_000)
    assert "effective_relief" in result["savings"]
    assert result["savings"]["effective_relief"] > 0
```

**Step 2: Run to verify failure**

**Step 3: Implement**

```python
# app/tax/salary_sacrifice.py
"""Salary sacrifice analysis.

Models the tax + NI savings from redirecting salary into
employer pension contributions via salary sacrifice arrangement.
"""

from app.tax.income_tax import calculate_income_tax
from app.tax.national_insurance import calculate_class_1_ni


def analyse_salary_sacrifice(
    gross_salary: float,
    sacrifice_amount: float,
    *,
    is_scottish: bool = False,
    num_children: int = 0,
) -> dict[str, object]:
    """Analyse salary sacrifice tax savings.

    Args:
        gross_salary: Current gross salary.
        sacrifice_amount: Amount to sacrifice into pension.
        is_scottish: Whether Scottish tax rates apply.
        num_children: For HICBC calculation (if applicable).

    Returns:
        Dict with before/after comparison and total savings.
    """
    new_salary = gross_salary - sacrifice_amount

    # Before
    tax_before = calculate_income_tax(gross_salary, is_scottish=is_scottish)
    ni_before = calculate_class_1_ni(gross_salary)

    # After
    tax_after = calculate_income_tax(new_salary, is_scottish=is_scottish)
    ni_after = calculate_class_1_ni(new_salary)

    it_saving = float(tax_before["income_tax"]) - float(tax_after["income_tax"])
    ee_ni_saving = ni_before["employee_ni"] - ni_after["employee_ni"]
    er_ni_saving = ni_before["employer_ni"] - ni_after["employer_ni"]
    total_saving = round(it_saving + ee_ni_saving + er_ni_saving, 2)

    effective_relief = total_saving / sacrifice_amount if sacrifice_amount > 0 else 0

    return {
        "before": {
            "gross_salary": gross_salary,
            "income_tax": float(tax_before["income_tax"]),
            "employee_ni": ni_before["employee_ni"],
            "employer_ni": ni_before["employer_ni"],
            "personal_allowance": float(tax_before["personal_allowance"]),
            "net_pay": round(
                gross_salary
                - float(tax_before["income_tax"])
                - ni_before["employee_ni"],
                2,
            ),
        },
        "after": {
            "gross_salary": new_salary,
            "income_tax": float(tax_after["income_tax"]),
            "employee_ni": ni_after["employee_ni"],
            "employer_ni": ni_after["employer_ni"],
            "personal_allowance": float(tax_after["personal_allowance"]),
            "net_pay": round(
                new_salary
                - float(tax_after["income_tax"])
                - ni_after["employee_ni"],
                2,
            ),
        },
        "savings": {
            "income_tax_saving": round(it_saving, 2),
            "employee_ni_saving": round(ee_ni_saving, 2),
            "employer_ni_saving": round(er_ni_saving, 2),
            "total_saving": total_saving,
            "effective_relief": round(effective_relief, 4),
            "sacrifice_amount": sacrifice_amount,
        },
    }
```

**Step 4-6: Run tests, lint, commit**

```bash
pytest tests/test_salary_sacrifice.py -v
git commit -m "feat: implement salary sacrifice analyser"
```

---

## Task 6: Orchestration Service — Analyse Client (combines all calculators)

This is the integration layer: take client data, run all calculators, produce the `RelevantTaxData` dashboard payload.

**Files:**
- Modify: `helio/apps/api/app/services/ai.py` (rename to `analysis.py` — this task is the deterministic analysis, AI comes next)
- Create: `helio/apps/api/app/services/analysis.py`
- Create: `helio/apps/api/tests/test_analysis.py`

**Step 1: Write the failing test**

```python
# tests/test_analysis.py
"""Analysis service integration tests."""

from app.services.analysis import analyse_client


def test_analyse_client_produces_dashboard_data() -> None:
    """Full analysis should return structured dashboard data."""
    result = analyse_client(
        name="James Mitchell",
        region="england",
        employment_income=147_425,
        pension_contributions=0,
        num_children=2,
        claims_child_benefit=True,
    )
    assert result["client"]["name"] == "James Mitchell"
    assert result["income"]["total_income"] == 147_425
    assert result["tax"]["income_tax"] > 0
    assert result["ani"]["pa_status"] == "lost"  # PA fully lost at 147k
    assert len(result["observations"]) > 0


def test_analyse_with_salary_sacrifice_scenario() -> None:
    """Scenario modelling should show before/after."""
    result = analyse_client(
        name="James Mitchell",
        region="england",
        employment_income=147_425,
        pension_contributions=0,
        scenario_sacrifice=50_000,
    )
    assert len(result["scenarios"]) > 0
    scenario = result["scenarios"][0]
    assert scenario["saving"] > 0
```

**Step 2: Run to verify failure**

**Step 3: Implement**

```python
# app/services/analysis.py
"""Client tax analysis service.

Takes client data, runs all tax calculators, produces the
structured dashboard payload (RelevantTaxData equivalent).
"""

from app.tax.ani import calculate_adjusted_net_income
from app.tax.constants import (
    CGT_ANNUAL_EXEMPT_AMOUNT,
    DIVIDEND_ALLOWANCE,
    ISA_ALLOWANCE,
    PENSION_ANNUAL_ALLOWANCE,
    PERSONAL_ALLOWANCE,
)
from app.tax.hicbc import calculate_hicbc
from app.tax.income_tax import calculate_income_tax
from app.tax.national_insurance import calculate_class_1_ni
from app.tax.salary_sacrifice import analyse_salary_sacrifice
from app.utils.tax_year import days_until_tax_year_end, get_current_tax_year


def analyse_client(
    *,
    name: str,
    region: str = "england",
    employment_income: float = 0,
    self_employment_income: float = 0,
    dividend_income: float = 0,
    savings_income: float = 0,
    rental_income: float = 0,
    pension_income: float = 0,
    other_income: float = 0,
    pension_contributions: float = 0,
    gift_aid: float = 0,
    num_children: int = 0,
    claims_child_benefit: bool = False,
    isa_used: float = 0,
    pension_aa_used: float = 0,
    cgt_used: float = 0,
    scenario_sacrifice: float | None = None,
) -> dict[str, object]:
    """Run full tax analysis for a client.

    Returns a structured dict matching the RelevantTaxData schema.
    """
    total_income = (
        employment_income + self_employment_income + dividend_income
        + savings_income + rental_income + pension_income + other_income
    )
    is_scottish = region == "scotland"

    # Core calculations
    ani_result = calculate_adjusted_net_income(
        total_income,
        pension_contributions=pension_contributions,
        gift_aid=gift_aid,
    )

    tax_result = calculate_income_tax(
        total_income,
        is_scottish=is_scottish,
        pension_contributions=pension_contributions,
        gift_aid=gift_aid,
    )

    ni_result = calculate_class_1_ni(employment_income)

    # HICBC
    hicbc_result = None
    if claims_child_benefit and num_children > 0:
        hicbc_result = calculate_hicbc(
            float(ani_result["adjusted_net_income"]),
            num_children=num_children,
        )

    # Observations
    observations = _generate_observations(
        ani_result, tax_result, ni_result, hicbc_result, total_income
    )

    # Scenarios
    scenarios: list[dict[str, object]] = []
    if scenario_sacrifice is not None and scenario_sacrifice > 0:
        ss_result = analyse_salary_sacrifice(
            employment_income, scenario_sacrifice, is_scottish=is_scottish
        )
        scenarios.append({
            "id": "salary-sacrifice",
            "name": f"Salary sacrifice £{scenario_sacrifice:,.0f}",
            "description": f"Redirect £{scenario_sacrifice:,.0f} of salary into employer pension",
            "current_tax": float(tax_result["income_tax"]) + ni_result["employee_ni"],
            "projected_tax": float(ss_result["after"]["income_tax"]) + float(ss_result["after"]["employee_ni"]),
            "saving": float(ss_result["savings"]["total_saving"]),
            "detail": ss_result,
        })

    # Allowances
    pa_amount = float(ani_result["personal_allowance"])
    allowances = {
        "personal_allowance": {
            "name": "Personal Allowance",
            "annual_limit": PERSONAL_ALLOWANCE,
            "used": PERSONAL_ALLOWANCE - pa_amount,
            "remaining": pa_amount,
        },
        "isa_allowance": {
            "name": "ISA Allowance",
            "annual_limit": ISA_ALLOWANCE,
            "used": isa_used,
            "remaining": ISA_ALLOWANCE - isa_used,
        },
        "pension_annual_allowance": {
            "name": "Pension Annual Allowance",
            "annual_limit": PENSION_ANNUAL_ALLOWANCE,
            "used": pension_aa_used + pension_contributions,
            "remaining": max(0, PENSION_ANNUAL_ALLOWANCE - pension_aa_used - pension_contributions),
        },
        "cgt_annual_exempt": {
            "name": "CGT Annual Exempt Amount",
            "annual_limit": CGT_ANNUAL_EXEMPT_AMOUNT,
            "used": cgt_used,
            "remaining": CGT_ANNUAL_EXEMPT_AMOUNT - cgt_used,
        },
        "dividend_allowance": {
            "name": "Dividend Allowance",
            "annual_limit": DIVIDEND_ALLOWANCE,
            "used": min(dividend_income, DIVIDEND_ALLOWANCE),
            "remaining": max(0, DIVIDEND_ALLOWANCE - dividend_income),
        },
    }

    return {
        "client": {
            "name": name,
            "region": region,
            "tax_year": get_current_tax_year(),
        },
        "income": {
            "employment": employment_income,
            "self_employment": self_employment_income,
            "dividends": dividend_income,
            "savings": savings_income,
            "rental": rental_income,
            "pension": pension_income,
            "other": other_income,
            "total_income": total_income,
        },
        "ani": ani_result,
        "tax": tax_result,
        "national_insurance": ni_result,
        "hicbc": hicbc_result,
        "allowances": allowances,
        "observations": observations,
        "scenarios": scenarios,
        "days_until_year_end": days_until_tax_year_end(),
    }


def _generate_observations(
    ani: dict[str, object],
    tax: dict[str, object],
    ni: dict[str, float],
    hicbc: dict[str, object] | None,
    total_income: float,
) -> list[dict[str, object]]:
    """Generate tax planning observations based on analysis results."""
    observations: list[dict[str, object]] = []

    pa_status = ani["pa_status"]
    ani_value = float(ani["adjusted_net_income"])
    pa_amount = float(ani["personal_allowance"])

    # PA taper warning
    if pa_status == "lost":
        pension_to_restore = ani_value - 100_000
        tax_saving = pension_to_restore * 0.60  # 60% effective relief in taper zone
        observations.append({
            "id": "pa-lost",
            "title": "Personal Allowance Fully Lost",
            "description": (
                f"ANI of £{ani_value:,.0f} exceeds £125,140. Full PA of £12,570 has been lost. "
                f"A pension contribution of £{pension_to_restore:,.0f} would restore the full PA."
            ),
            "severity": "action_required",
            "category": "personal_allowance",
            "potential_saving": round(tax_saving, 2),
        })
    elif pa_status == "tapered":
        taper_amount = float(ani["taper_amount"])
        extra_tax = taper_amount * 0.40  # tax on the lost PA amount
        pension_to_restore = ani_value - 100_000
        observations.append({
            "id": "pa-tapered",
            "title": "Personal Allowance Tapered",
            "description": (
                f"ANI of £{ani_value:,.0f} is in the 60% tax trap zone. "
                f"£{taper_amount:,.0f} of PA has been lost, costing approximately £{extra_tax:,.0f} in extra tax. "
                f"A pension contribution of £{pension_to_restore:,.0f} would restore the full PA."
            ),
            "severity": "warning",
            "category": "personal_allowance",
            "potential_saving": round(pension_to_restore * 0.60, 2),
        })

    # HICBC warning
    if hicbc is not None and hicbc.get("applies"):
        charge = float(hicbc["hicbc_charge"])
        if charge > 0:
            observations.append({
                "id": "hicbc",
                "title": "High Income Child Benefit Charge",
                "description": (
                    f"HICBC charge of £{charge:,.2f} applies "
                    f"({hicbc['clawback_percentage']}% clawback). "
                    "Consider pension contributions to reduce ANI below £60,000."
                ),
                "severity": "warning",
                "category": "hicbc",
                "potential_saving": round(charge, 2),
            })

    # Year-end allowances
    observations.append({
        "id": "year-end",
        "title": "Tax Year End Approaching",
        "description": "Review ISA, pension, and CGT allowances before 5 April. These are use-it-or-lose-it.",
        "severity": "info",
        "category": "allowances",
        "potential_saving": None,
    })

    return observations
```

**Step 4-6: Run tests, lint, commit**

```bash
pytest tests/test_analysis.py -v
git commit -m "feat: implement analysis service combining all tax calculators"
```

---

## Task 7: Chat Endpoint with Claude Tool Calling

This is the AI integration — Claude receives messages, calls tax tools, returns structured analysis.

**Files:**
- Modify: `helio/apps/api/app/routers/chat.py`
- Create: `helio/apps/api/app/services/ai.py` (rewrite)
- Modify: `helio/apps/api/app/config.py` (ensure anthropic key available)
- Create: `helio/apps/api/tests/test_chat.py`

**Step 1: Write a basic integration test**

```python
# tests/test_chat.py
"""Chat endpoint tests."""

from fastapi.testclient import TestClient


def test_chat_endpoint_accepts_messages(client: TestClient) -> None:
    """Chat endpoint should accept a messages array."""
    response = client.post(
        "/api/chat",
        json={
            "messages": [
                {"role": "user", "content": "Analyse James Mitchell, employed, gross income £147,425, lives in England, 2 children, claims child benefit"}
            ]
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "response" in data or "message" in data
```

**Step 2: Run to verify it fails with current stub**

**Step 3: Implement the chat endpoint and AI service**

```python
# app/services/ai.py
"""AI orchestration service using Anthropic Claude with tool calling."""

import json

from anthropic import Anthropic

from app.config import get_settings
from app.services.analysis import analyse_client


SYSTEM_PROMPT = """You are Hazel, a UK tax planning assistant for financial advisers.

You have CTA-level sophistication in UK tax. You help advisers analyse client tax positions and identify optimisation opportunities.

When an adviser describes a client, extract the key data and use the analyse_client tool to run the tax calculations. Then explain the results conversationally, highlighting:
1. The client's tax position (effective rate, marginal rate)
2. Key alerts (PA taper, HICBC, expiring allowances)
3. Planning opportunities (pension contributions, salary sacrifice)

Always confirm: tax year (default 2025/26), residence (England/Scotland), filing status.

Keep responses concise. The dashboard shows the numbers — focus on insights and recommendations."""


TOOLS = [
    {
        "name": "analyse_client",
        "description": "Run a comprehensive UK tax analysis for a client. Returns tax calculations, allowance tracking, observations, and scenario modelling.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string", "description": "Client name"},
                "region": {"type": "string", "enum": ["england", "wales", "northern_ireland", "scotland"], "description": "UK region for tax rates"},
                "employment_income": {"type": "number", "description": "Gross employment income"},
                "self_employment_income": {"type": "number", "description": "Self-employment profit", "default": 0},
                "dividend_income": {"type": "number", "description": "Dividend income", "default": 0},
                "savings_income": {"type": "number", "description": "Savings interest", "default": 0},
                "rental_income": {"type": "number", "description": "Rental profit", "default": 0},
                "pension_income": {"type": "number", "description": "Pension income", "default": 0},
                "other_income": {"type": "number", "description": "Other income", "default": 0},
                "pension_contributions": {"type": "number", "description": "Gross pension contributions (employee/personal)", "default": 0},
                "gift_aid": {"type": "number", "description": "Net Gift Aid donations", "default": 0},
                "num_children": {"type": "integer", "description": "Number of children", "default": 0},
                "claims_child_benefit": {"type": "boolean", "description": "Whether household claims Child Benefit", "default": False},
                "scenario_sacrifice": {"type": "number", "description": "Optional: model a salary sacrifice of this amount"},
            },
            "required": ["name", "region", "employment_income"],
        },
    },
    {
        "name": "run_scenario",
        "description": "Run a what-if salary sacrifice scenario on existing client data.",
        "input_schema": {
            "type": "object",
            "properties": {
                "name": {"type": "string"},
                "region": {"type": "string", "enum": ["england", "wales", "northern_ireland", "scotland"]},
                "employment_income": {"type": "number"},
                "sacrifice_amount": {"type": "number", "description": "Amount to salary sacrifice"},
                "num_children": {"type": "integer", "default": 0},
                "claims_child_benefit": {"type": "boolean", "default": False},
            },
            "required": ["name", "region", "employment_income", "sacrifice_amount"],
        },
    },
]


def _handle_tool_call(tool_name: str, tool_input: dict) -> dict[str, object]:
    """Execute a tool call and return the result."""
    if tool_name == "analyse_client":
        return analyse_client(**tool_input)
    elif tool_name == "run_scenario":
        sacrifice = tool_input.pop("sacrifice_amount")
        return analyse_client(**tool_input, scenario_sacrifice=sacrifice)
    else:
        return {"error": f"Unknown tool: {tool_name}"}


def chat_with_tools(messages: list[dict[str, str]]) -> dict[str, object]:
    """Send messages to Claude, handle tool calls, return final response.

    Returns:
        Dict with 'response' (text), 'dashboard_data' (if tools were called),
        and 'tool_calls' (list of tool invocations).
    """
    settings = get_settings()

    if not settings.anthropic_api_key:
        return {
            "response": "Anthropic API key not configured. Please set ANTHROPIC_API_KEY in .env",
            "dashboard_data": None,
            "tool_calls": [],
        }

    client = Anthropic(api_key=settings.anthropic_api_key)

    # Convert messages to Anthropic format
    anthropic_messages = []
    for msg in messages:
        anthropic_messages.append({
            "role": msg["role"],
            "content": msg["content"],
        })

    dashboard_data = None
    tool_calls_made: list[dict[str, object]] = []

    # Initial request
    response = client.messages.create(
        model=settings.ai_model,
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        tools=TOOLS,
        messages=anthropic_messages,
    )

    # Handle tool use loop
    while response.stop_reason == "tool_use":
        tool_use_blocks = [b for b in response.content if b.type == "tool_use"]

        tool_results = []
        for tool_use in tool_use_blocks:
            result = _handle_tool_call(tool_use.name, tool_use.input)
            dashboard_data = result  # Last tool result becomes dashboard data
            tool_calls_made.append({
                "tool": tool_use.name,
                "input": tool_use.input,
            })

            tool_results.append({
                "type": "tool_result",
                "tool_use_id": tool_use.id,
                "content": json.dumps(result, default=str),
            })

        # Send tool results back to Claude
        anthropic_messages.append({"role": "assistant", "content": response.content})
        anthropic_messages.append({"role": "user", "content": tool_results})

        response = client.messages.create(
            model=settings.ai_model,
            max_tokens=4096,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=anthropic_messages,
        )

    # Extract final text response
    text_response = ""
    for block in response.content:
        if hasattr(block, "text"):
            text_response += block.text

    return {
        "response": text_response,
        "dashboard_data": dashboard_data,
        "tool_calls": tool_calls_made,
    }
```

Now update the chat router:

```python
# app/routers/chat.py
"""Chat endpoint — AI-powered tax analysis."""

from fastapi import APIRouter
from pydantic import BaseModel

from app.services.ai import chat_with_tools


router = APIRouter(tags=["chat"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


@router.post("/chat")
async def chat(request: ChatRequest) -> dict[str, object]:
    """AI chat endpoint with tax calculator tool calling.

    Accepts conversation messages, sends to Claude with tax tools,
    returns AI response and dashboard data.
    """
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    result = chat_with_tools(messages)
    return result
```

**Step 4: Test manually**

Run: `cd helio/apps/api && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000`

Then in another terminal:
```bash
curl -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Analyse James Mitchell, employed, gross income £147,425, England, 2 children, claims child benefit"}]}'
```

Expected: JSON response with `response` (text), `dashboard_data` (analysis results), `tool_calls`.

**Note:** This requires `ANTHROPIC_API_KEY` set in `helio/apps/api/.env`. Without it, the endpoint returns a graceful error message.

**Step 5: Run linting**

```bash
ruff check app/routers/chat.py app/services/ai.py
mypy app/routers/chat.py app/services/ai.py
```

**Step 6: Commit**

```bash
git add app/routers/chat.py app/services/ai.py
git commit -m "feat: implement chat endpoint with Claude tool calling"
```

---

## Task 8: Frontend — Two-Panel Layout with Chat and Dashboard

Now we build the UI. This is a single large task that creates the main page layout.

**Files:**
- Modify: `helio/apps/web/package.json` (add deps)
- Modify: `helio/apps/web/src/app/page.tsx` (two-panel layout)
- Create: `helio/apps/web/src/app/components/ChatPanel.tsx`
- Create: `helio/apps/web/src/app/components/DashboardPanel.tsx`
- Create: `helio/apps/web/src/app/components/TaxSummaryCard.tsx`
- Create: `helio/apps/web/src/app/components/AllowancesCard.tsx`
- Create: `helio/apps/web/src/app/components/AlertsCard.tsx`
- Create: `helio/apps/web/src/app/components/ScenarioCard.tsx`
- Create: `helio/apps/web/src/store/index.ts` (Zustand store)

**Step 1: Add dependencies**

Add to `apps/web/package.json` dependencies:
- `"zustand": "^4.5.0"` — state management

Run: `cd helio && npm install`

**Step 2: Create the Zustand store**

```typescript
// src/store/index.ts
import { create } from "zustand";

export interface DashboardData {
  client?: { name: string; region: string; tax_year: string };
  income?: Record<string, number>;
  ani?: Record<string, unknown>;
  tax?: Record<string, unknown>;
  national_insurance?: Record<string, number>;
  hicbc?: Record<string, unknown> | null;
  allowances?: Record<string, Record<string, unknown>>;
  observations?: Array<Record<string, unknown>>;
  scenarios?: Array<Record<string, unknown>>;
  days_until_year_end?: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface HelioStore {
  messages: ChatMessage[];
  dashboardData: DashboardData | null;
  isLoading: boolean;
  addMessage: (message: ChatMessage) => void;
  setDashboardData: (data: DashboardData) => void;
  setLoading: (loading: boolean) => void;
  sendMessage: (content: string) => Promise<void>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const useHelioStore = create<HelioStore>((set, get) => ({
  messages: [],
  dashboardData: null,
  isLoading: false,

  addMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),

  setDashboardData: (data) => set({ dashboardData: data }),

  setLoading: (loading) => set({ isLoading: loading }),

  sendMessage: async (content: string) => {
    const { messages, addMessage, setDashboardData, setLoading } = get();

    addMessage({ role: "user", content });
    setLoading(true);

    try {
      const allMessages = [...messages, { role: "user" as const, content }];

      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      addMessage({ role: "assistant", content: data.response });

      if (data.dashboard_data) {
        setDashboardData(data.dashboard_data);
      }
    } catch (error) {
      addMessage({
        role: "assistant",
        content: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    } finally {
      setLoading(false);
    }
  },
}));
```

**Step 3: Create the Chat Panel**

```tsx
// src/app/components/ChatPanel.tsx
"use client";

import { useState } from "react";
import { useHelioStore } from "@/store";

export default function ChatPanel() {
  const [input, setInput] = useState("");
  const { messages, isLoading, sendMessage } = useHelioStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const message = input;
    setInput("");
    await sendMessage(message);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="text-lg font-semibold">Chat with Hazel</h2>
        <p className="text-sm text-gray-500">UK tax planning assistant</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <p className="text-lg font-medium">Start a conversation</p>
            <p className="mt-2 text-sm">
              Try: &quot;Analyse James Mitchell, employed, gross income £147,425, England, 2 children, claims child benefit&quot;
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-900"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2 text-sm text-gray-500">
              Analysing...
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Describe a client or ask a question..."
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
```

**Step 4: Create Dashboard Cards**

```tsx
// src/app/components/TaxSummaryCard.tsx
"use client";

interface TaxSummaryProps {
  income: Record<string, number>;
  tax: Record<string, unknown>;
  ani: Record<string, unknown>;
  ni: Record<string, number>;
}

export default function TaxSummaryCard({ income, tax, ani, ni }: TaxSummaryProps) {
  const totalIncome = income.total_income || 0;
  const incomeTax = Number(tax.income_tax) || 0;
  const employeeNI = ni.employee_ni || 0;
  const totalTax = incomeTax + employeeNI;
  const effectiveRate = totalIncome > 0 ? (totalTax / totalIncome) * 100 : 0;
  const marginalRate = (Number(tax.marginal_rate) || 0) * 100;
  const paStatus = String(ani.pa_status || "");
  const pa = Number(ani.personal_allowance) || 0;

  const paColor = paStatus === "full" ? "text-green-600" : paStatus === "tapered" ? "text-amber-600" : "text-red-600";
  const paLabel = paStatus === "full" ? "Full" : paStatus === "tapered" ? "Tapered" : "Lost";

  return (
    <div className="rounded-lg border bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Tax Summary</h3>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div>
          <p className="text-xs text-gray-500">Total Income</p>
          <p className="text-xl font-bold">£{totalIncome.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">ANI</p>
          <p className="text-xl font-bold">£{Number(ani.adjusted_net_income || 0).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Personal Allowance</p>
          <p className={`text-xl font-bold ${paColor}`}>
            £{pa.toLocaleString()} <span className="text-xs font-normal">({paLabel})</span>
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Income Tax</p>
          <p className="text-xl font-bold">£{incomeTax.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">National Insurance</p>
          <p className="text-xl font-bold">£{employeeNI.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Effective / Marginal Rate</p>
          <p className="text-xl font-bold">{effectiveRate.toFixed(1)}% / {marginalRate.toFixed(0)}%</p>
        </div>
      </div>
    </div>
  );
}
```

```tsx
// src/app/components/AllowancesCard.tsx
"use client";

interface AllowancesProps {
  allowances: Record<string, Record<string, unknown>>;
  daysUntilYearEnd: number;
}

export default function AllowancesCard({ allowances, daysUntilYearEnd }: AllowancesProps) {
  const items = Object.values(allowances);

  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Allowances</h3>
        <span className="text-xs font-medium text-amber-600">{daysUntilYearEnd} days to 5 April</span>
      </div>
      <div className="mt-4 space-y-3">
        {items.map((item) => {
          const name = String(item.name || "");
          const limit = Number(item.annual_limit) || 0;
          const used = Number(item.used) || 0;
          const remaining = Number(item.remaining) || 0;
          const pct = limit > 0 ? (used / limit) * 100 : 0;
          const color = pct > 80 ? "bg-red-500" : pct > 50 ? "bg-amber-500" : "bg-green-500";

          return (
            <div key={name}>
              <div className="flex justify-between text-xs text-gray-600">
                <span>{name}</span>
                <span>£{remaining.toLocaleString()} / £{limit.toLocaleString()}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-gray-200">
                <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

```tsx
// src/app/components/AlertsCard.tsx
"use client";

interface AlertsProps {
  observations: Array<Record<string, unknown>>;
}

const severityColors: Record<string, string> = {
  action_required: "border-red-500 bg-red-50",
  warning: "border-amber-500 bg-amber-50",
  opportunity: "border-blue-500 bg-blue-50",
  info: "border-gray-300 bg-gray-50",
};

const severityLabels: Record<string, string> = {
  action_required: "CRITICAL",
  warning: "WARNING",
  opportunity: "OPPORTUNITY",
  info: "INFO",
};

export default function AlertsCard({ observations }: AlertsProps) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Alerts & Opportunities</h3>
      <div className="mt-4 space-y-3">
        {observations.map((obs) => {
          const severity = String(obs.severity || "info");
          const saving = obs.potential_saving ? Number(obs.potential_saving) : null;

          return (
            <div key={String(obs.id)} className={`rounded-lg border-l-4 p-3 ${severityColors[severity] || severityColors.info}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase">{severityLabels[severity] || "INFO"}</span>
                {saving != null && <span className="text-xs font-semibold text-green-700">£{saving.toLocaleString()} potential saving</span>}
              </div>
              <p className="mt-1 text-sm font-semibold">{String(obs.title)}</p>
              <p className="mt-1 text-xs text-gray-700">{String(obs.description)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

```tsx
// src/app/components/ScenarioCard.tsx
"use client";

interface ScenarioProps {
  scenarios: Array<Record<string, unknown>>;
}

export default function ScenarioCard({ scenarios }: ScenarioProps) {
  if (scenarios.length === 0) return null;

  return (
    <div className="rounded-lg border bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Scenario Comparison</h3>
      {scenarios.map((scenario) => {
        const detail = scenario.detail as Record<string, Record<string, unknown>> | undefined;
        const saving = Number(scenario.saving) || 0;

        return (
          <div key={String(scenario.id)} className="mt-4">
            <p className="font-semibold">{String(scenario.name)}</p>
            <p className="text-xs text-gray-500 mt-1">{String(scenario.description)}</p>

            {detail && (
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="font-medium text-gray-500">Metric</div>
                <div className="font-medium text-gray-500">Before</div>
                <div className="font-medium text-gray-500">After</div>

                <div>Gross Salary</div>
                <div>£{Number(detail.before?.gross_salary || 0).toLocaleString()}</div>
                <div>£{Number(detail.after?.gross_salary || 0).toLocaleString()}</div>

                <div>Income Tax</div>
                <div>£{Number(detail.before?.income_tax || 0).toLocaleString()}</div>
                <div className="text-green-700">£{Number(detail.after?.income_tax || 0).toLocaleString()}</div>

                <div>Employee NI</div>
                <div>£{Number(detail.before?.employee_ni || 0).toLocaleString()}</div>
                <div className="text-green-700">£{Number(detail.after?.employee_ni || 0).toLocaleString()}</div>

                <div>Net Pay</div>
                <div>£{Number(detail.before?.net_pay || 0).toLocaleString()}</div>
                <div className="font-semibold text-green-700">£{Number(detail.after?.net_pay || 0).toLocaleString()}</div>
              </div>
            )}

            <div className="mt-3 rounded-lg bg-green-50 p-3 text-center">
              <p className="text-lg font-bold text-green-700">£{saving.toLocaleString()} annual saving</p>
              <p className="text-xs text-green-600">
                Effective relief: {((Number((detail?.savings as Record<string, unknown>)?.effective_relief || 0)) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

**Step 5: Create the Dashboard Panel**

```tsx
// src/app/components/DashboardPanel.tsx
"use client";

import { useHelioStore } from "@/store";
import TaxSummaryCard from "./TaxSummaryCard";
import AllowancesCard from "./AllowancesCard";
import AlertsCard from "./AlertsCard";
import ScenarioCard from "./ScenarioCard";

export default function DashboardPanel() {
  const { dashboardData } = useHelioStore();

  if (!dashboardData) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400">
        <div className="text-center">
          <p className="text-2xl font-bold">Helio</p>
          <p className="mt-2">Dashboard will appear after analysis</p>
        </div>
      </div>
    );
  }

  const { income, tax, ani, national_insurance, allowances, observations, scenarios, days_until_year_end, client } = dashboardData;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-4">
      {client && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{client.name}</h2>
          <span className="text-sm text-gray-500">{client.tax_year} | {client.region}</span>
        </div>
      )}

      {income && tax && ani && national_insurance && (
        <TaxSummaryCard income={income} tax={tax} ani={ani} ni={national_insurance} />
      )}

      {allowances && days_until_year_end != null && (
        <AllowancesCard allowances={allowances} daysUntilYearEnd={days_until_year_end} />
      )}

      {observations && observations.length > 0 && (
        <AlertsCard observations={observations} />
      )}

      {scenarios && scenarios.length > 0 && (
        <ScenarioCard scenarios={scenarios} />
      )}
    </div>
  );
}
```

**Step 6: Wire up the main page**

```tsx
// src/app/page.tsx
"use client";

import ChatPanel from "./components/ChatPanel";
import DashboardPanel from "./components/DashboardPanel";

export default function Home() {
  return (
    <main className="flex h-screen">
      <div className="w-[40%] border-r">
        <ChatPanel />
      </div>
      <div className="w-[60%] bg-gray-50">
        <DashboardPanel />
      </div>
    </main>
  );
}
```

**Step 7: Install zustand and verify**

```bash
cd helio && npm install
npx turbo run type-check --filter='@helio/web'
```

**Step 8: Commit**

```bash
git add apps/web/
git commit -m "feat: implement two-panel UI with chat and tax dashboard"
```

---

## Task 9: PDF Upload Endpoint

**Files:**
- Modify: `helio/apps/api/app/routers/documents.py`
- Create: `helio/apps/api/tests/test_documents.py`

**Step 1: Add pymupdf dependency**

Add `"pymupdf>=1.24.0"` to `pyproject.toml` dependencies.
Run: `pip install -e ".[dev]"`

**Step 2: Implement the extraction endpoint**

```python
# app/routers/documents.py
"""Document extraction endpoints."""

import json
import tempfile
from pathlib import Path

import fitz  # pymupdf
from anthropic import Anthropic
from fastapi import APIRouter, UploadFile

from app.config import get_settings
from app.services.analysis import analyse_client

router = APIRouter(tags=["documents"])

EXTRACTION_PROMPT = """Extract the following tax-relevant data from this document text. Return JSON only.

Fields to extract:
- name: Client name
- region: "england", "wales", "northern_ireland", or "scotland"
- employment_income: Gross employment income (number)
- self_employment_income: Self-employment profit (number, 0 if not present)
- dividend_income: Dividend income (number, 0 if not present)
- savings_income: Savings interest (number, 0 if not present)
- rental_income: Rental profit (number, 0 if not present)
- pension_income: Pension income (number, 0 if not present)
- pension_contributions: Employee pension contributions (number, 0 if not present)
- gift_aid: Gift Aid donations net amount (number, 0 if not present)

If a field is unclear, use 0 and add a note in the "uncertainties" array.
Return format: {"data": {...}, "uncertainties": ["..."]}

Document text:
"""


@router.post("/extract")
async def extract_document(file: UploadFile) -> dict[str, object]:
    """Extract tax data from an uploaded PDF and run analysis.

    Accepts a PDF file, extracts text using PyMuPDF, sends to Claude
    for structured data extraction, then runs the tax analysis.
    """
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        return {"error": "Only PDF files are supported"}

    # Save and extract text
    content = await file.read()
    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        doc = fitz.open(tmp_path)
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    if not text.strip():
        return {"error": "Could not extract text from PDF"}

    # Use Claude to parse the extracted text
    settings = get_settings()
    if not settings.anthropic_api_key:
        return {"error": "Anthropic API key not configured"}

    client = Anthropic(api_key=settings.anthropic_api_key)
    response = client.messages.create(
        model=settings.ai_model,
        max_tokens=2048,
        messages=[{"role": "user", "content": EXTRACTION_PROMPT + text[:10000]}],
    )

    # Parse Claude's response
    response_text = response.content[0].text
    try:
        # Find JSON in the response
        start = response_text.index("{")
        end = response_text.rindex("}") + 1
        parsed = json.loads(response_text[start:end])
        extracted_data = parsed.get("data", parsed)
        uncertainties = parsed.get("uncertainties", [])
    except (ValueError, json.JSONDecodeError):
        return {"error": "Failed to parse extracted data", "raw_text": text[:2000]}

    # Run analysis with extracted data
    analysis = analyse_client(
        name=extracted_data.get("name", "Unknown Client"),
        region=extracted_data.get("region", "england"),
        employment_income=float(extracted_data.get("employment_income", 0)),
        self_employment_income=float(extracted_data.get("self_employment_income", 0)),
        dividend_income=float(extracted_data.get("dividend_income", 0)),
        savings_income=float(extracted_data.get("savings_income", 0)),
        rental_income=float(extracted_data.get("rental_income", 0)),
        pension_income=float(extracted_data.get("pension_income", 0)),
        pension_contributions=float(extracted_data.get("pension_contributions", 0)),
        gift_aid=float(extracted_data.get("gift_aid", 0)),
    )

    return {
        "extracted_data": extracted_data,
        "uncertainties": uncertainties,
        "analysis": analysis,
    }
```

**Step 3: Commit**

```bash
git add app/routers/documents.py pyproject.toml
git commit -m "feat: implement PDF extraction endpoint with Claude-powered parsing"
```

---

## Task 10: Frontend PDF Upload + Integration

**Files:**
- Create: `helio/apps/web/src/app/components/FileUpload.tsx`
- Modify: `helio/apps/web/src/app/components/ChatPanel.tsx` (add upload button)
- Modify: `helio/apps/web/src/store/index.ts` (add upload action)

**Step 1: Add upload to Zustand store**

Add this method to the store:

```typescript
// Add to HelioStore interface:
uploadPDF: (file: File) => Promise<void>;

// Add to create():
uploadPDF: async (file: File) => {
  const { addMessage, setDashboardData, setLoading } = get();
  addMessage({ role: "user", content: `Uploading ${file.name}...` });
  setLoading(true);

  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(`${API_URL}/api/extract`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.error) {
      addMessage({ role: "assistant", content: `Error: ${data.error}` });
      return;
    }

    if (data.analysis) {
      setDashboardData(data.analysis);
      addMessage({
        role: "assistant",
        content: `Extracted and analysed data from ${file.name}. Dashboard has been updated with the results.${
          data.uncertainties?.length > 0
            ? `\n\nUncertainties:\n${data.uncertainties.map((u: string) => `- ${u}`).join("\n")}`
            : ""
        }`,
      });
    }
  } catch (error) {
    addMessage({
      role: "assistant",
      content: `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  } finally {
    setLoading(false);
  }
},
```

**Step 2: Add file upload to ChatPanel**

Add a file input and upload button to the chat panel form area (next to the text input). When a PDF is dropped or selected, call `uploadPDF(file)`.

**Step 3: Verify end-to-end**

1. Start backend: `cd helio/apps/api && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000`
2. Start frontend: `cd helio && npx turbo run dev --filter='@helio/web'`
3. Open `http://localhost:3000`
4. Type: "Analyse James Mitchell, employed, gross income £147,425, England, 2 children, claims child benefit"
5. See dashboard populate with tax summary, allowances, alerts
6. Ask: "What if James salary sacrifices £50,000?"
7. See scenario comparison card appear

**Step 4: Commit**

```bash
git add apps/web/
git commit -m "feat: add PDF upload and wire end-to-end chat + dashboard flow"
```

---

## Verification Checklist

After all tasks are complete:

1. `cd helio/apps/api && pytest -v` — All tests pass (ANI, income tax, NI, HICBC, salary sacrifice, analysis, health)
2. `ruff check app/` — Clean
3. `mypy app/` — Clean
4. `npx turbo run type-check` — All packages pass
5. Backend `curl localhost:8000/health` — Returns OK
6. Chat endpoint works with Claude tool calling (requires ANTHROPIC_API_KEY)
7. Frontend shows two-panel layout at localhost:3000
8. Chat message triggers analysis and dashboard updates
9. PDF upload extracts data and populates dashboard

---

## Dependency Graph

```
Task 1: ANI Calculator ──────┐
Task 2: Income Tax Calculator ├──→ Task 6: Analysis Service ──→ Task 7: Chat + AI ──→ Task 8: Frontend UI ──→ Task 10: Integration
Task 3: NI Calculator ───────┤                                                        Task 9: PDF Upload ─────┘
Task 4: HICBC Calculator ────┤
Task 5: Salary Sacrifice ────┘
```

Tasks 1-5 can be parallelised. Task 6 depends on 1-5. Task 7 depends on 6. Tasks 8 and 9 can run in parallel after 7. Task 10 ties everything together.
