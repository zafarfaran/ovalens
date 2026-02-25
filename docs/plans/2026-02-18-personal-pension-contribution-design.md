# Personal Pension Contribution Scenario Tool — Design

**Date:** 2026-02-18
**Status:** Approved

## Purpose

Model the tax impact of making (or increasing) personal pension contributions (SIPP / relief at source). Given a proposed contribution amount, show the tax savings compared to the current position. Additionally, identify optimal contribution thresholds where key tax benefits kick in.

## Approach

**Single tool** (`model_personal_pension`) that:

1. Runs the tax engine **twice** (current contribution vs proposed contribution)
2. Diffs the results to show income tax saving, HICBC avoided, and PA restored
3. Identifies 3 key thresholds and calculates the exact contribution to reach each:
   - **PA taper avoidance** — contribute enough to bring ANI ≤ £100,000 (restores full Personal Allowance)
   - **HICBC avoidance** — contribute enough to bring ANI ≤ £50,000 (eliminates Child Benefit charge)
   - **Higher rate threshold** — contribute enough to bring ANI ≤ £50,270 (stay in basic rate band)
4. Flags if the proposed contribution would breach the pension annual allowance

## How personal pension contributions reduce tax

Personal pension contributions reduce **Adjusted Net Income (ANI)**:

```
ANI = Total Income - Personal Pension Contributions - Gift Aid (grossed up)
```

Lower ANI means:
- Less income taxed at higher/additional rates → **income tax saving**
- ANI below £100K → **Personal Allowance restored** (60% effective rate in taper zone)
- ANI below £50K → **HICBC avoided** (Child Benefit clawback eliminated)

**Key difference from salary sacrifice:** Personal pension contributions do NOT save National Insurance. NI is paid on the full gross salary before the contribution is made.

## Core Function

**File:** `helio/apps/api/app/tax/personal_pension.py`

```python
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
```

### Logic

1. `compute_full_tax_position(pension_contributions=current_contribution, ...)` → current
2. `compute_full_tax_position(pension_contributions=proposed_contribution, ...)` → proposed
3. Diff: IT saving, HICBC avoided, PA restored
4. For each threshold (£100K, £50,270, £50K):
   - Calculate: `contribution_needed = current_ANI - threshold` (clamped to ≥ current_contribution)
   - If contribution_needed > current_contribution and ≤ reasonable limit:
     - Run engine at that contribution
     - Compute savings vs current position
   - Mark as `feasible: false` if it exceeds pension AA
5. Check proposed contribution against pension annual allowance

### Return Shape

```python
{
    "current": {
        "pension_contribution": float,
        "income_tax": float,
        "national_insurance": float,
        "hicbc": float,
        "total_tax": float,
        "personal_allowance": float,
        "adjusted_net_income": float,
    },
    "proposed": {
        "pension_contribution": float,
        "income_tax": float,
        "national_insurance": float,
        "hicbc": float,
        "total_tax": float,
        "personal_allowance": float,
        "adjusted_net_income": float,
    },
    "savings": {
        "income_tax": float,
        "hicbc_avoided": float,
        "total": float,
    },
    "pa_change": {
        "current": float,
        "proposed": float,
        "restored": float,
    },
    "effective_relief_rate": float,  # total saving / additional contribution * 100
    "thresholds": [
        {
            "name": str,               # e.g. "Avoid PA taper (ANI ≤ £100,000)"
            "contribution_needed": float,
            "additional_over_current": float,
            "annual_saving": float,
            "effective_relief": float,  # saving / contribution * 100
            "feasible": bool,           # false if exceeds AA
        },
    ],
    "pension_aa_warning": str | None,   # warning message if proposed breaches AA
}
```

## Tool Registration

**Tool name:** `model_personal_pension`

**Added to:** `ENGINE_TOOLS` in `helio/apps/api/app/services/llm/claude.py`

**Input schema:**
- `income_sources` (required) — same format as `compute_tax_position`
- `proposed_contribution` (required) — the amount to model
- `current_contribution` — existing personal pension contribution (default 0)
- `employer_contributions` — for pension AA check (default 0)
- `gift_aid` — existing gift aid (default 0)
- `region`, `number_of_children`, `claims_child_benefit` — same as other tools

**Status phase:** Reuses `StatusPhase.MODELLING_SCENARIO`

## Tool Executor

**File:** `helio/apps/api/app/services/tools/tax_engine.py`

New function `execute_model_personal_pension()` following the same pattern as `execute_model_salary_sacrifice()`:
- Parse income sources from tool input
- Call `analyse_personal_pension()`
- Return `{"success": True, **result}`

**Tool dispatcher:** Update `execute_tool()` in `__init__.py` to route `model_personal_pension`.

## System Prompt Update

Add guidance for Claude on when/how to use the tool:
- Use for questions about pension contributions, SIPP top-ups, pension tax relief
- Always mention relevant thresholds when they're achievable
- Clarify that personal pension doesn't save NI (unlike salary sacrifice)

## Out of Scope

- No new frontend UI (chat tool only)
- No new REST API endpoint
- No pension carry-forward optimizer
- No auto-enrolment modelling
- No compound scenarios (pension + salary sacrifice in one call)

## Tests

Unit tests for `analyse_personal_pension()`:
- Basic income tax saving from contribution
- PA taper restoration (ANI crosses £100K boundary)
- HICBC avoidance (ANI crosses £50K boundary)
- Threshold identification with correct amounts
- AA warning when contribution exceeds allowance
- Edge case: contribution larger than income
- Edge case: already contributing, increasing amount
