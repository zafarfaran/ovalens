# Pension Net Benefit & Basic Rate Relief Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add basic rate relief at source and net benefit calculations to both personal pension and salary sacrifice scenario results, fixing the missing 20% government top-up and giving advisers a clear cost-vs-benefit summary.

**Architecture:** Add a `net_benefit` dict to the return value of `analyse_personal_pension()` and `analyse_salary_sacrifice()`. Add `total_effective_relief_rate` to personal pension results. All additive — existing `savings` and `effective_relief_rate` remain untouched for backwards compatibility. No frontend changes needed — the LLM automatically picks up new fields.

**Tech Stack:** Python 3.12, pytest, existing tax engine (`app.tax.*`)

---

### Task 1: Personal Pension — Write Failing Tests for Net Benefit

**Files:**
- Modify: `helio/apps/api/tests/tax/test_personal_pension.py` (append new tests)

**Step 1: Write the failing tests**

Add these tests to the end of `test_personal_pension.py`:

```python
def test_net_benefit_higher_rate_taxpayer():
    """£80k salary, £10k gross pension. Higher rate taxpayer gets 40% total relief."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 80_000, "Employment")]
    r, _ = analyse_personal_pension(sources, proposed_contribution=10_000)

    nb = r["net_benefit"]
    assert nb["gross_contribution"] == 10_000
    assert nb["net_cost_to_client"] == 8_000          # 10k * 0.8
    assert nb["basic_rate_relief"] == 2_000            # 10k * 0.2
    # Higher rate relief = IT saving from BRB extension
    assert nb["higher_rate_relief"] == r["savings"]["income_tax"]
    assert nb["higher_rate_relief"] > 0
    assert nb["hicbc_avoided"] == 0
    assert nb["total_tax_relief"] == nb["basic_rate_relief"] + nb["higher_rate_relief"]
    assert nb["net_cost_after_relief"] == nb["net_cost_to_client"] - nb["higher_rate_relief"]
    assert nb["net_benefit"] == nb["total_tax_relief"]
    assert 0 < nb["effective_cost_per_pound_in_pension"] < 1

    # Total effective relief should be ~40% for a higher rate taxpayer
    assert r["total_effective_relief_rate"] > 35  # at least 35%


def test_net_benefit_basic_rate_taxpayer():
    """£30k salary, £5k gross pension. Basic rate taxpayer still gets 20% relief."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 30_000, "Employment")]
    r, _ = analyse_personal_pension(sources, proposed_contribution=5_000)

    nb = r["net_benefit"]
    assert nb["gross_contribution"] == 5_000
    assert nb["net_cost_to_client"] == 4_000
    assert nb["basic_rate_relief"] == 1_000
    # Basic rate taxpayer: BRB extension doesn't help (already in basic band)
    # So higher_rate_relief should be ~0
    assert nb["higher_rate_relief"] == r["savings"]["income_tax"]
    assert nb["total_tax_relief"] >= 1_000  # At least the basic rate relief
    assert r["total_effective_relief_rate"] >= 20.0


def test_net_benefit_pa_taper_zone():
    """£110k salary, £10k contribution. PA taper gives massive effective relief."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 110_000, "Employment")]
    r, _ = analyse_personal_pension(sources, proposed_contribution=10_000)

    nb = r["net_benefit"]
    assert nb["gross_contribution"] == 10_000
    assert nb["net_cost_to_client"] == 8_000
    assert nb["basic_rate_relief"] == 2_000
    # In PA taper zone, IT saving includes PA restoration = very high
    assert nb["higher_rate_relief"] > 3_000  # Much more than standard 40% due to PA taper
    assert r["total_effective_relief_rate"] > 50  # Should be well above 50%


def test_net_benefit_with_hicbc():
    """£70k + children, £10k contribution eliminates HICBC. Net benefit includes it."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 70_000, "Employment")]
    r, _ = analyse_personal_pension(
        sources,
        proposed_contribution=10_000,
        number_of_children=2,
        claims_child_benefit=True,
    )

    nb = r["net_benefit"]
    assert nb["hicbc_avoided"] == r["savings"]["hicbc_avoided"]
    assert nb["hicbc_avoided"] > 0
    assert nb["total_tax_relief"] == nb["basic_rate_relief"] + nb["higher_rate_relief"] + nb["hicbc_avoided"]
    assert nb["net_cost_after_relief"] == nb["net_cost_to_client"] - nb["higher_rate_relief"] - nb["hicbc_avoided"]


def test_net_benefit_zero_additional_contribution():
    """Current == proposed, no additional contribution. Net benefit all zeros."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 80_000, "Employment")]
    r, _ = analyse_personal_pension(
        sources,
        proposed_contribution=5_000,
        current_contribution=5_000,
    )

    nb = r["net_benefit"]
    assert nb["gross_contribution"] == 0
    assert nb["net_cost_to_client"] == 0
    assert nb["basic_rate_relief"] == 0
    assert nb["net_benefit"] == 0
    assert r["total_effective_relief_rate"] == 0


def test_net_benefit_existing_contribution_increase():
    """Already contributing £5k, propose £15k. Net benefit based on additional £10k."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 80_000, "Employment")]
    r, _ = analyse_personal_pension(
        sources,
        proposed_contribution=15_000,
        current_contribution=5_000,
    )

    nb = r["net_benefit"]
    # Net benefit is on the ADDITIONAL contribution only
    assert nb["gross_contribution"] == 10_000  # 15k - 5k
    assert nb["net_cost_to_client"] == 8_000   # 10k * 0.8
    assert nb["basic_rate_relief"] == 2_000    # 10k * 0.2
```

**Step 2: Run tests to verify they fail**

Run: `cd helio/apps/api && python -m pytest tests/tax/test_personal_pension.py -v -k "net_benefit"`
Expected: FAIL with `KeyError: 'net_benefit'`

**Step 3: Commit failing tests**

```bash
git add helio/apps/api/tests/tax/test_personal_pension.py
git commit -m "test: add failing tests for personal pension net benefit"
```

---

### Task 2: Personal Pension — Implement Net Benefit

**Files:**
- Modify: `helio/apps/api/app/tax/personal_pension.py:61-155` (add net_benefit computation and return key)

**Step 1: Add net_benefit computation after savings computation**

In `personal_pension.py`, after line 75 (after `effective_relief` is computed), add the net_benefit calculation. The additional contribution is already computed at line 69 as `additional_contribution`.

After line 75 (`else 0.0`), add:

```python
    # -- Net benefit (includes basic rate relief at source) --------------------
    basic_rate_relief = round_currency(additional_contribution * 0.2)
    net_cost_to_client = round_currency(additional_contribution * 0.8)
    higher_rate_relief = it_saving  # IT saving from BRB extension = the SA claim
    total_tax_relief = round_currency(basic_rate_relief + higher_rate_relief + hicbc_avoided)
    net_cost_after_relief = round_currency(net_cost_to_client - higher_rate_relief - hicbc_avoided)
    net_benefit_value = round_currency(additional_contribution - net_cost_after_relief)

    total_effective_relief = (
        round_currency(total_tax_relief / additional_contribution * 100)
        if additional_contribution > 0
        else 0.0
    )

    effective_cost_ppp = (
        round_currency(net_cost_after_relief / additional_contribution)
        if additional_contribution > 0
        else 0.0
    )
```

**Step 2: Add net_benefit and total_effective_relief_rate to the return dict**

In the return dict (line 121-155), add two new keys after `"pension_aa_warning"`:

After `"pension_aa_warning": pension_aa_warning,` (line 154), add:

```python
        "total_effective_relief_rate": total_effective_relief,
        "net_benefit": {
            "gross_contribution": round_currency(additional_contribution),
            "net_cost_to_client": net_cost_to_client,
            "basic_rate_relief": basic_rate_relief,
            "higher_rate_relief": higher_rate_relief,
            "hicbc_avoided": hicbc_avoided,
            "total_tax_relief": total_tax_relief,
            "net_cost_after_relief": net_cost_after_relief,
            "net_benefit": net_benefit_value,
            "effective_cost_per_pound_in_pension": effective_cost_ppp,
        },
```

**Step 3: Run tests to verify they pass**

Run: `cd helio/apps/api && python -m pytest tests/tax/test_personal_pension.py -v`
Expected: ALL PASS (both old and new tests)

**Step 4: Commit**

```bash
git add helio/apps/api/app/tax/personal_pension.py
git commit -m "feat: add net benefit and basic rate relief to personal pension analysis"
```

---

### Task 3: Salary Sacrifice — Write Failing Tests for Net Benefit

**Files:**
- Modify: `helio/apps/api/tests/tax/test_salary_sacrifice.py` (append new tests)

**Step 1: Write the failing tests**

Add to end of `test_salary_sacrifice.py`:

```python
def test_salary_sacrifice_net_benefit():
    """£100k salary, sacrifice £20k. Net benefit shows take-home reduction vs pension gained."""
    r, _ = analyse_salary_sacrifice(100_000, 20_000)

    nb = r["net_benefit"]
    assert nb["gross_into_pension"] == 20_000
    assert nb["income_tax_saved"] == r["savings"]["income_tax"]
    assert nb["ni_saved"] == r["savings"]["national_insurance"]
    assert nb["hicbc_avoided"] == r["savings"]["hicbc_avoided"]
    assert nb["total_saving"] == r["savings"]["total"]
    assert nb["take_home_reduction"] == 20_000 - r["savings"]["total"]
    assert 0 < nb["effective_cost_per_pound_in_pension"] < 1


def test_salary_sacrifice_net_benefit_with_hicbc():
    """£70k + children, sacrifice £10k. Net benefit includes HICBC saving."""
    r, _ = analyse_salary_sacrifice(
        70_000, 10_000,
        number_of_children=2,
        claims_child_benefit=True,
    )

    nb = r["net_benefit"]
    assert nb["gross_into_pension"] == 10_000
    assert nb["hicbc_avoided"] > 0
    assert nb["total_saving"] == nb["income_tax_saved"] + nb["ni_saved"] + nb["hicbc_avoided"]
    assert nb["take_home_reduction"] == 10_000 - nb["total_saving"]


def test_salary_sacrifice_net_benefit_existing_sacrifice():
    """Already sacrificing £5k, propose £15k. Net benefit based on additional £10k."""
    r, _ = analyse_salary_sacrifice(100_000, 15_000, current_sacrifice=5_000)

    nb = r["net_benefit"]
    # Net benefit is on the ADDITIONAL sacrifice
    assert nb["gross_into_pension"] == 10_000  # 15k - 5k
    assert nb["total_saving"] == r["savings"]["total"]
    assert nb["take_home_reduction"] == 10_000 - nb["total_saving"]
```

**Step 2: Run tests to verify they fail**

Run: `cd helio/apps/api && python -m pytest tests/tax/test_salary_sacrifice.py -v -k "net_benefit"`
Expected: FAIL with `KeyError: 'net_benefit'`

**Step 3: Commit failing tests**

```bash
git add helio/apps/api/tests/tax/test_salary_sacrifice.py
git commit -m "test: add failing tests for salary sacrifice net benefit"
```

---

### Task 4: Salary Sacrifice — Implement Net Benefit

**Files:**
- Modify: `helio/apps/api/app/tax/salary_sacrifice.py:65-116` (add net_benefit computation and return key)

**Step 1: Add net_benefit computation after savings computation**

In `salary_sacrifice.py`, after line 74 (`extra_pension` computation), add:

```python
    # -- Net benefit -------------------------------------------------------
    additional_sacrifice = sacrifice_amount - current_sacrifice
    take_home_reduction = round_currency(additional_sacrifice - total_saving)

    effective_cost_ppp = (
        round_currency(take_home_reduction / additional_sacrifice)
        if additional_sacrifice > 0
        else 0.0
    )
```

**Step 2: Add net_benefit to the return dict**

After `"extra_into_pension": extra_pension,` (line 114), add:

```python
        "net_benefit": {
            "gross_into_pension": round_currency(additional_sacrifice),
            "income_tax_saved": it_saving,
            "ni_saved": ni_saving,
            "hicbc_avoided": hicbc_avoided,
            "total_saving": total_saving,
            "take_home_reduction": take_home_reduction,
            "effective_cost_per_pound_in_pension": effective_cost_ppp,
        },
```

**Step 3: Run tests to verify they pass**

Run: `cd helio/apps/api && python -m pytest tests/tax/test_salary_sacrifice.py -v`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add helio/apps/api/app/tax/salary_sacrifice.py
git commit -m "feat: add net benefit to salary sacrifice analysis"
```

---

### Task 5: Edge Case Tests for 2025/26

**Files:**
- Modify: `helio/apps/api/tests/tax/test_personal_pension.py` (append edge case tests)

**Step 1: Write the edge case tests**

Add to end of `test_personal_pension.py`:

```python
def test_net_benefit_additional_rate_taxpayer():
    """£200k salary, £20k contribution. Additional rate taxpayer gets ~45% total relief."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 200_000, "Employment")]
    r, _ = analyse_personal_pension(sources, proposed_contribution=20_000)

    nb = r["net_benefit"]
    assert nb["basic_rate_relief"] == 4_000  # 20k * 0.2
    # Additional rate: BRB extension saves 25% (45% - 20%)
    assert nb["higher_rate_relief"] > 0
    assert r["total_effective_relief_rate"] >= 40  # Should be ~45% but some may be in higher band


def test_net_benefit_aa_warning_still_fires():
    """AA breach warning and net_benefit coexist."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 200_000, "Employment")]
    r, _ = analyse_personal_pension(sources, proposed_contribution=65_000)

    assert r["pension_aa_warning"] is not None
    assert "net_benefit" in r
    assert r["net_benefit"]["gross_contribution"] == 65_000


def test_net_benefit_consistency():
    """Net benefit + net cost after relief = gross contribution."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 80_000, "Employment")]
    r, _ = analyse_personal_pension(sources, proposed_contribution=10_000)

    nb = r["net_benefit"]
    # Fundamental identity: net_benefit + net_cost_after_relief = gross
    assert abs(nb["net_benefit"] + nb["net_cost_after_relief"] - nb["gross_contribution"]) < 0.01
    # basic_rate_relief + net_cost_to_client = gross
    assert abs(nb["basic_rate_relief"] + nb["net_cost_to_client"] - nb["gross_contribution"]) < 0.01
```

**Step 2: Run all tests**

Run: `cd helio/apps/api && python -m pytest tests/tax/ -v`
Expected: ALL PASS

**Step 3: Commit**

```bash
git add helio/apps/api/tests/tax/test_personal_pension.py
git commit -m "test: add 2025/26 edge case tests for pension net benefit"
```

---

### Task 6: Run Full Test Suite and Final Verification

**Step 1: Run all tax tests**

Run: `cd helio/apps/api && python -m pytest tests/tax/ -v`
Expected: ALL PASS, no regressions.

**Step 2: Verify no import errors**

Run: `cd helio/apps/api && python -c "from app.tax.personal_pension import analyse_personal_pension; from app.tax.salary_sacrifice import analyse_salary_sacrifice; print('OK')"`
Expected: `OK`

**Step 3: Verify tool executor integration**

The `execute_model_personal_pension` in `tax_engine.py:166` returns `{**result, ...}`, so `net_benefit` and `total_effective_relief_rate` automatically propagate. No changes needed. Verify by inspection:

Run: `cd helio/apps/api && python -c "
from app.tax.personal_pension import analyse_personal_pension
from app.tax.types import IncomeSource, IncomeType
r, _ = analyse_personal_pension([IncomeSource(IncomeType.EMPLOYMENT, 80_000, 'Emp')], 10_000)
print('net_benefit:', r['net_benefit'])
print('total_effective_relief_rate:', r['total_effective_relief_rate'])
print('savings (unchanged):', r['savings'])
print('effective_relief_rate (unchanged):', r['effective_relief_rate'])
"`
Expected: All fields populated, savings and effective_relief_rate unchanged from before.
