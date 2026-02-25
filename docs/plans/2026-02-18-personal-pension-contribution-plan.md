# Personal Pension Contribution Scenario Tool — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a `model_personal_pension` tool that models the tax impact of personal pension contributions and identifies optimal contribution thresholds.

**Architecture:** New `personal_pension.py` module in the tax engine, following the exact same pattern as `salary_sacrifice.py`. Runs the engine twice (current vs proposed), diffs the results, then calculates optimal thresholds by running the engine at each relevant ANI boundary. Registered as a Claude chat tool via `ENGINE_TOOLS`.

**Tech Stack:** Python, FastAPI, existing `compute_full_tax_position()` engine, pytest

**Design doc:** `docs/plans/2026-02-18-personal-pension-contribution-design.md`

---

### Task 1: Write the core analysis function tests

**Files:**
- Create: `helio/apps/api/tests/tax/test_personal_pension.py`

**Step 1: Write the failing tests**

Create `helio/apps/api/tests/tax/test_personal_pension.py`:

```python
"""Tests for personal pension contribution analysis."""

from app.tax.personal_pension import analyse_personal_pension
from app.tax.types import IncomeSource, IncomeType


def test_basic_income_tax_saving():
    """£80k salary, propose £10k pension contribution. Should save income tax."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 80_000, "Employment")]
    r = analyse_personal_pension(sources, proposed_contribution=10_000)

    assert r["savings"]["income_tax"] > 0
    assert r["savings"]["total"] > 0
    # Personal pension does NOT save NI
    assert r["current"]["national_insurance"] == r["proposed"]["national_insurance"]
    assert r["proposed"]["pension_contribution"] == 10_000
    assert r["current"]["pension_contribution"] == 0


def test_pa_taper_restoration():
    """£125k salary, contribute £25,140 to bring ANI to £100k. PA fully restored."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 125_140, "Employment")]
    r = analyse_personal_pension(sources, proposed_contribution=25_140)

    # Current: ANI=125,140 → PA=0. Proposed: ANI=100,000 → PA=12,570.
    assert r["pa_change"]["current"] == 0
    assert r["pa_change"]["proposed"] == 12_570
    assert r["pa_change"]["restored"] == 12_570


def test_hicbc_avoidance():
    """£70k salary + 2 children, contribute £10k to bring ANI to £60k → HICBC eliminated."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 70_000, "Employment")]
    r = analyse_personal_pension(
        sources,
        proposed_contribution=10_000,
        number_of_children=2,
        claims_child_benefit=True,
    )
    assert r["savings"]["hicbc_avoided"] > 0
    assert r["savings"]["total"] > 0


def test_threshold_identification():
    """£120k salary should identify PA taper and higher-rate thresholds."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 120_000, "Employment")]
    r = analyse_personal_pension(sources, proposed_contribution=5_000)

    thresholds = r["thresholds"]
    assert len(thresholds) > 0

    # Should have a PA taper threshold
    pa_thresh = [t for t in thresholds if "PA taper" in t["name"]]
    assert len(pa_thresh) == 1
    assert pa_thresh[0]["contribution_needed"] == 20_000  # 120k - 100k
    assert pa_thresh[0]["annual_saving"] > 0


def test_threshold_hicbc_with_children():
    """£75k salary + children should identify HICBC threshold at £60k ANI."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 75_000, "Employment")]
    r = analyse_personal_pension(
        sources,
        proposed_contribution=5_000,
        number_of_children=2,
        claims_child_benefit=True,
    )

    hicbc_thresh = [t for t in r["thresholds"] if "HICBC" in t["name"]]
    assert len(hicbc_thresh) == 1
    assert hicbc_thresh[0]["contribution_needed"] == 15_000  # 75k - 60k


def test_pension_aa_warning():
    """Contribution exceeding AA should generate a warning."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 200_000, "Employment")]
    r = analyse_personal_pension(sources, proposed_contribution=65_000)

    assert r["pension_aa_warning"] is not None


def test_existing_contribution_increase():
    """Already contributing £5k, propose increasing to £15k."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 80_000, "Employment")]
    r = analyse_personal_pension(
        sources,
        proposed_contribution=15_000,
        current_contribution=5_000,
    )
    assert r["current"]["pension_contribution"] == 5_000
    assert r["proposed"]["pension_contribution"] == 15_000
    assert r["savings"]["total"] > 0


def test_effective_relief_rate():
    """Effective relief rate should be saving / additional contribution * 100."""
    sources = [IncomeSource(IncomeType.EMPLOYMENT, 80_000, "Employment")]
    r = analyse_personal_pension(sources, proposed_contribution=10_000)

    expected_rate = r["savings"]["total"] / 10_000 * 100
    assert abs(r["effective_relief_rate"] - expected_rate) < 0.01


def test_multiple_income_sources():
    """Should work with employment + dividends + rental."""
    sources = [
        IncomeSource(IncomeType.EMPLOYMENT, 100_000, "Employment"),
        IncomeSource(IncomeType.DIVIDENDS, 20_000, "Dividends"),
        IncomeSource(IncomeType.RENTAL, 15_000, "Rental"),
    ]
    r = analyse_personal_pension(sources, proposed_contribution=10_000)
    assert r["savings"]["total"] > 0
    # With £135k total income, PA taper threshold should appear
    pa_thresh = [t for t in r["thresholds"] if "PA taper" in t["name"]]
    assert len(pa_thresh) == 1
```

**Step 2: Run tests to verify they fail**

Run: `cd /Users/faran.zafar/Desktop/saturn-work-week/helio/apps/api && python -m pytest tests/tax/test_personal_pension.py -v`

Expected: FAIL with `ModuleNotFoundError: No module named 'app.tax.personal_pension'`

**Step 3: Commit test file**

```bash
git add helio/apps/api/tests/tax/test_personal_pension.py
git commit -m "test: add failing tests for personal pension contribution analysis"
```

---

### Task 2: Implement `analyse_personal_pension()`

**Files:**
- Create: `helio/apps/api/app/tax/personal_pension.py`

**Step 1: Write the implementation**

Create `helio/apps/api/app/tax/personal_pension.py`:

```python
"""Personal pension contribution analysis.

Models the income tax savings from making personal pension contributions
(SIPP / relief at source). Calls compute_full_tax_position twice
(current vs proposed) and diffs. Also identifies optimal contribution
thresholds (PA taper, HICBC, higher rate band).

Key difference from salary sacrifice: personal pension contributions
do NOT save National Insurance — NI is paid on the full gross salary.
"""

import structlog

from app.tax.constants import get_tax_year_constants
from app.tax.engine import compute_full_tax_position
from app.tax.rounding import round_currency
from app.tax.types import IncomeSource

logger = structlog.get_logger(__name__)


def analyse_personal_pension(
    income_sources: list[IncomeSource],
    proposed_contribution: float,
    *,
    current_contribution: float = 0,
    employer_contributions: float = 0,
    gift_aid: float = 0,
    region: str = "england",
    number_of_children: int = 0,
    claims_child_benefit: bool = False,
) -> dict:
    """Analyse tax savings from personal pension contributions.

    Computes current and proposed tax positions, returns the diff
    plus optimal contribution thresholds.
    """
    common_kwargs = dict(
        income_sources=income_sources,
        employer_contributions=employer_contributions,
        gift_aid=gift_aid,
        region=region,
        number_of_children=number_of_children,
        claims_child_benefit=claims_child_benefit,
    )

    # ── Current position ──────────────────────────────────────────────
    current = compute_full_tax_position(
        pension_contributions=current_contribution,
        **common_kwargs,
    )

    # ── Proposed position ─────────────────────────────────────────────
    proposed = compute_full_tax_position(
        pension_contributions=proposed_contribution,
        **common_kwargs,
    )

    # ── Compute savings ───────────────────────────────────────────────
    it_saving = round_currency(current.income_tax - proposed.income_tax)

    current_hicbc = current.hicbc_result.hicbc_charge if current.hicbc_result else 0
    proposed_hicbc = proposed.hicbc_result.hicbc_charge if proposed.hicbc_result else 0
    hicbc_avoided = round_currency(current_hicbc - proposed_hicbc)

    total_saving = round_currency(it_saving + hicbc_avoided)
    additional_contribution = proposed_contribution - current_contribution

    effective_relief = (
        round_currency(total_saving / additional_contribution * 100)
        if additional_contribution > 0
        else 0.0
    )

    # ── Threshold analysis ────────────────────────────────────────────
    current_ani = current.adjusted_net_income
    thresholds = _identify_thresholds(
        current_ani=current_ani,
        current_contribution=current_contribution,
        common_kwargs=common_kwargs,
        current_position=current,
        number_of_children=number_of_children,
        claims_child_benefit=claims_child_benefit,
    )

    # ── Pension AA warning ────────────────────────────────────────────
    c = get_tax_year_constants("2025/26")
    aa_limit = c["pension"]["annual_allowance"]
    total_pension = proposed_contribution + employer_contributions
    pension_aa_warning = None
    if total_pension > aa_limit:
        pension_aa_warning = (
            f"Proposed total pension contributions (£{total_pension:,.0f}) "
            f"exceed the annual allowance (£{aa_limit:,.0f}). "
            f"Check carry-forward availability."
        )

    logger.info(
        "Personal pension analysed",
        it_saving=it_saving,
        hicbc_avoided=hicbc_avoided,
        total=total_saving,
        effective_relief=effective_relief,
        thresholds_found=len(thresholds),
    )

    return {
        "current": {
            "pension_contribution": current_contribution,
            "income_tax": current.income_tax,
            "national_insurance": current.national_insurance,
            "hicbc": current_hicbc,
            "total_tax": current.total_tax,
            "personal_allowance": current.personal_allowance,
            "adjusted_net_income": current.adjusted_net_income,
        },
        "proposed": {
            "pension_contribution": proposed_contribution,
            "income_tax": proposed.income_tax,
            "national_insurance": proposed.national_insurance,
            "hicbc": proposed_hicbc,
            "total_tax": proposed.total_tax,
            "personal_allowance": proposed.personal_allowance,
            "adjusted_net_income": proposed.adjusted_net_income,
        },
        "savings": {
            "income_tax": it_saving,
            "hicbc_avoided": hicbc_avoided,
            "total": total_saving,
        },
        "pa_change": {
            "current": current.personal_allowance,
            "proposed": proposed.personal_allowance,
            "restored": round_currency(
                proposed.personal_allowance - current.personal_allowance
            ),
        },
        "effective_relief_rate": effective_relief,
        "thresholds": thresholds,
        "pension_aa_warning": pension_aa_warning,
    }


def _identify_thresholds(
    *,
    current_ani: float,
    current_contribution: float,
    common_kwargs: dict,
    current_position,
    number_of_children: int,
    claims_child_benefit: bool,
) -> list[dict]:
    """Identify optimal contribution thresholds and compute savings for each."""
    c = get_tax_year_constants("2025/26")
    aa_limit = c["pension"]["annual_allowance"]
    employer_contributions = common_kwargs.get("employer_contributions", 0)

    targets = [
        ("Avoid PA taper (ANI ≤ £100,000)", c["pa_taper"]["threshold"]),
        ("Drop to basic rate (ANI ≤ £50,270)", c["income_tax"]["basic_rate_ceiling"]),
    ]

    # Only include HICBC threshold if client has children and claims CB
    if claims_child_benefit and number_of_children > 0:
        targets.append(
            ("Avoid HICBC (ANI ≤ £60,000)", c["hicbc"]["start_threshold"]),
        )

    current_hicbc = (
        current_position.hicbc_result.hicbc_charge
        if current_position.hicbc_result
        else 0
    )

    thresholds = []
    for name, target_ani in targets:
        contribution_needed = current_ani - target_ani
        if contribution_needed <= current_contribution:
            # Already below this threshold, skip
            continue

        # Run engine at this contribution level
        position_at_threshold = compute_full_tax_position(
            pension_contributions=contribution_needed,
            **common_kwargs,
        )

        hicbc_at_threshold = (
            position_at_threshold.hicbc_result.hicbc_charge
            if position_at_threshold.hicbc_result
            else 0
        )
        it_saving = round_currency(
            current_position.income_tax - position_at_threshold.income_tax
        )
        hicbc_saving = round_currency(current_hicbc - hicbc_at_threshold)
        annual_saving = round_currency(it_saving + hicbc_saving)

        additional = contribution_needed - current_contribution
        relief_rate = (
            round_currency(annual_saving / additional * 100)
            if additional > 0
            else 0.0
        )

        total_pension = contribution_needed + employer_contributions
        feasible = total_pension <= aa_limit

        thresholds.append({
            "name": name,
            "contribution_needed": round_currency(contribution_needed),
            "additional_over_current": round_currency(additional),
            "annual_saving": annual_saving,
            "effective_relief": relief_rate,
            "feasible": feasible,
        })

    # Sort by contribution_needed ascending
    thresholds.sort(key=lambda t: t["contribution_needed"])
    return thresholds
```

**Step 2: Run tests to verify they pass**

Run: `cd /Users/faran.zafar/Desktop/saturn-work-week/helio/apps/api && python -m pytest tests/tax/test_personal_pension.py -v`

Expected: All 9 tests PASS

**Step 3: Commit**

```bash
git add helio/apps/api/app/tax/personal_pension.py
git commit -m "feat: add personal pension contribution analysis function"
```

---

### Task 3: Add the tool executor

**Files:**
- Modify: `helio/apps/api/app/services/tools/tax_engine.py` (add new function after line 113)
- Modify: `helio/apps/api/app/services/tools/__init__.py` (add to registry at lines 7-10, 18)

**Step 1: Add executor function to `tax_engine.py`**

Add this import at line 5 (after the `salary_sacrifice` import):

```python
from app.tax.personal_pension import analyse_personal_pension
```

Add this function at the end of `tax_engine.py` (after `execute_model_salary_sacrifice`):

```python
async def execute_model_personal_pension(
    tool_input: dict, *, context: dict | None = None
) -> dict:
    """Execute model_personal_pension tool."""
    try:
        raw_sources = tool_input.get("income_sources", [])
        income_sources = [
            IncomeSource(
                source_type=IncomeType(s["source_type"]),
                gross_amount=float(s["gross_amount"]),
                label=s.get("label", ""),
            )
            for s in raw_sources
        ]

        result = analyse_personal_pension(
            income_sources=income_sources,
            proposed_contribution=float(tool_input["proposed_contribution"]),
            current_contribution=float(tool_input.get("current_contribution", 0)),
            employer_contributions=float(tool_input.get("employer_contributions", 0)),
            gift_aid=float(tool_input.get("gift_aid", 0)),
            region=tool_input.get("region", "england"),
            number_of_children=int(tool_input.get("number_of_children", 0)),
            claims_child_benefit=bool(tool_input.get("claims_child_benefit", False)),
        )

        logger.info(
            "Personal pension modelled",
            total_saving=result["savings"]["total"],
        )

        return {"success": True, **result}

    except Exception as e:
        logger.exception("Personal pension error")
        return {"success": False, "error": str(e)}
```

**Step 2: Register in `__init__.py`**

In `helio/apps/api/app/services/tools/__init__.py`, add the import:

```python
from app.services.tools.tax_engine import (
    execute_compute_tax_position,
    execute_model_salary_sacrifice,
    execute_model_personal_pension,
)
```

And add to `TOOL_EXECUTORS` dict:

```python
"model_personal_pension": execute_model_personal_pension,
```

**Step 3: Commit**

```bash
git add helio/apps/api/app/services/tools/tax_engine.py helio/apps/api/app/services/tools/__init__.py
git commit -m "feat: add tool executor for personal pension modelling"
```

---

### Task 4: Register the Claude tool definition

**Files:**
- Modify: `helio/apps/api/app/services/llm/claude.py` (add tool to `ENGINE_TOOLS` after line 158)

**Step 1: Add tool definition**

Add this tool to the `ENGINE_TOOLS` list after the `model_salary_sacrifice` entry (after line 158):

```python
    {
        "name": "model_personal_pension",
        "description": (
            "Model the tax impact of personal pension contributions (SIPP / relief at source). "
            "Computes current vs proposed tax positions and returns savings breakdown "
            "(income tax, HICBC avoided, PA restored) plus optimal contribution thresholds. "
            "You MUST call this tool for EVERY pension contribution scenario — including "
            "follow-ups. Never extrapolate from a previous result; tax is non-linear."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "income_sources": {
                    "type": "array",
                    "description": "List of income sources",
                    "items": {
                        "type": "object",
                        "properties": {
                            "source_type": {
                                "type": "string",
                                "enum": [
                                    "employment", "self_employment", "rental",
                                    "pension_income", "savings", "dividends", "other",
                                ],
                            },
                            "gross_amount": {"type": "number"},
                            "label": {"type": "string"},
                        },
                        "required": ["source_type", "gross_amount"],
                    },
                },
                "proposed_contribution": {
                    "type": "number",
                    "description": (
                        "The proposed annual gross personal pension contribution to model"
                    ),
                },
                "current_contribution": {
                    "type": "number",
                    "description": (
                        "Existing annual personal pension contribution (default 0)"
                    ),
                },
                "employer_contributions": {
                    "type": "number",
                    "description": (
                        "Annual employer pension contributions including salary sacrifice "
                        "(for pension AA check only — does not affect tax savings)"
                    ),
                },
                "gift_aid": {
                    "type": "number",
                    "description": "Net gift aid donations (default 0)",
                },
                "region": {"type": "string"},
                "number_of_children": {"type": "integer"},
                "claims_child_benefit": {"type": "boolean"},
            },
            "required": ["income_sources", "proposed_contribution"],
        },
    },
```

**Step 2: Add status mapping for the new tool**

In the `stream_chat` method, the `tool_status` dict (around line 288-294) already maps `model_salary_sacrifice` to `StatusPhase.MODELLING_SCENARIO`. Add the new tool to the same mapping:

```python
"model_personal_pension": StatusPhase.MODELLING_SCENARIO,
```

**Step 3: Commit**

```bash
git add helio/apps/api/app/services/llm/claude.py
git commit -m "feat: register model_personal_pension as Claude tool"
```

---

### Task 5: Update system prompt

**Files:**
- Modify: `helio/apps/api/app/services/system_prompt.py` (update `_TOOL_INSTRUCTIONS` around lines 45-62)

**Step 1: Add tool instructions**

After the `model_salary_sacrifice` section (around line 46) and before the `generate_dashboard` section (around line 48), add:

```python
### model_personal_pension
Models tax impact of personal pension contributions (SIPP / relief at source). Use when adviser asks about pension contributions, SIPP top-ups, or pension tax relief. Returns current vs proposed position with savings breakdown PLUS optimal contribution thresholds (PA taper, HICBC, higher rate). Always mention relevant thresholds if achievable. Note: personal pension contributions do NOT save NI (unlike salary sacrifice).
```

Also update the scenarios section (around lines 56-61) to add:

```python
- "What if she puts £10K into a SIPP?" → call `model_personal_pension`
- "What's the optimal pension contribution?" → call `model_personal_pension` with any reasonable amount — the thresholds section shows optimal amounts
```

**Step 2: Commit**

```bash
git add helio/apps/api/app/services/system_prompt.py
git commit -m "feat: add personal pension tool instructions to system prompt"
```

---

### Task 6: Run full test suite and verify

**Step 1: Run all tax engine tests**

Run: `cd /Users/faran.zafar/Desktop/saturn-work-week/helio/apps/api && python -m pytest tests/tax/ -v`

Expected: All tests PASS (existing salary sacrifice, engine, ANI, etc. + new personal pension tests)

**Step 2: Run the full API test suite**

Run: `cd /Users/faran.zafar/Desktop/saturn-work-week/helio/apps/api && python -m pytest tests/ -v`

Expected: All tests PASS

**Step 3: Smoke test — start the API and verify tool is loaded**

Run: `cd /Users/faran.zafar/Desktop/saturn-work-week/helio/apps/api && python -c "from app.services.tools import TOOL_EXECUTORS; print(list(TOOL_EXECUTORS.keys()))"`

Expected output should include `model_personal_pension` in the list.

**Step 4: Commit (if any fixes were needed)**

Only if fixes were needed, otherwise this task is just verification.

---

## Summary of files changed

| Action | File |
|--------|------|
| Create | `helio/apps/api/app/tax/personal_pension.py` |
| Create | `helio/apps/api/tests/tax/test_personal_pension.py` |
| Modify | `helio/apps/api/app/services/tools/tax_engine.py` |
| Modify | `helio/apps/api/app/services/tools/__init__.py` |
| Modify | `helio/apps/api/app/services/llm/claude.py` |
| Modify | `helio/apps/api/app/services/system_prompt.py` |
