# Spousal Income Transfer Scenario — Design

> Household-level "what if" modelling: transfer income-producing assets between spouses to minimise combined tax.

**Date**: 2026-02-18
**Status**: Approved

---

## Problem

Individual tax tools can model "what if" for one person. But the most valuable planning conversations involve **two people** — spouses in a household. Transferring rental income from a higher-rate spouse to a basic-rate spouse is one of the most common and impactful adviser recommendations, yet most tools can't model it because they only compute one person's tax at a time.

Helio already has:
- A deterministic engine (`compute_full_tax_position`) that runs identically for any inputs
- A salary sacrifice scenario that runs the engine twice and diffs
- Sarah + James Mitchell linked as a household with spouse IDs
- Meeting notes that explicitly mention "explore spousal transfer of rental property"

The gap: no scenario function that runs the engine for **both spouses** and shows the **household-level** saving.

---

## Approach: Household Dual-Engine Diff

Run `compute_full_tax_position()` for **both spouses** in both the current and proposed scenarios — **4 engine calls** total:

```
Current:  engine(Sarah with rental) + engine(James without rental) → Household Tax A
Proposed: engine(Sarah without rental) + engine(James with rental) → Household Tax B
Diff:     Household Tax A - Household Tax B → Net Household Saving
```

This captures all cascading effects:
- Rate differences (Sarah at 40%+ vs James at 20%)
- PA taper impacts on Sarah
- HICBC threshold effects
- NI changes (rental doesn't affect NI, but future transfers of employment-like income might)
- Band shifts on both sides

### Why not simpler approaches?

- **Rate arbitrage** (just multiply rate difference × amount): Misses PA taper, HICBC, and band shift effects. Advisers would spot the inaccuracy.
- **Sweep optimizer** (run many transfer percentages): Overkill for the demo. Can be added later as a Phase 3 feature.

---

## Engine Function

**File**: `helio/apps/api/app/tax/spousal_transfer.py`

```python
def analyse_spousal_transfer(
    # Spouse A (the one losing income)
    spouse_a_sources: list[IncomeSource],
    spouse_a_pension: float = 0,
    spouse_a_employer_contributions: float = 0,
    spouse_a_gift_aid: float = 0,
    spouse_a_region: str = "england",
    spouse_a_children: int = 0,
    spouse_a_claims_cb: bool = False,
    # Spouse B (the one gaining income)
    spouse_b_sources: list[IncomeSource],
    spouse_b_pension: float = 0,
    spouse_b_employer_contributions: float = 0,
    spouse_b_gift_aid: float = 0,
    spouse_b_region: str = "england",
    spouse_b_children: int = 0,
    spouse_b_claims_cb: bool = False,
    # Transfer details
    transfer_sources: list[IncomeSource],  # income to move from A → B
) -> dict:
```

### Logic

1. Build `spouse_a_current_sources` = `spouse_a_sources` (includes the transferable income)
2. Build `spouse_a_proposed_sources` = `spouse_a_sources` minus `transfer_sources`
3. Build `spouse_b_current_sources` = `spouse_b_sources` (without the transferred income)
4. Build `spouse_b_proposed_sources` = `spouse_b_sources` + `transfer_sources`
5. Run engine 4 times
6. Diff per-person and sum for household

### Return Shape

```python
{
    "scenario_type": "spousal_transfer",
    "spouse_a": {
        "name": "Sarah",
        "current": {
            "total_income": ...,
            "income_tax": ...,
            "national_insurance": ...,
            "hicbc": ...,
            "total_tax": ...,
            "personal_allowance": ...,
        },
        "proposed": { ... },
        "savings": {
            "income_tax": ...,
            "national_insurance": ...,
            "hicbc_avoided": ...,
            "total": ...,
        },
        "pa_change": {
            "current": ...,
            "proposed": ...,
            "restored": ...,
        },
    },
    "spouse_b": {
        "name": "James",
        "current": { ... },
        "proposed": { ... },
        "additional_tax": {
            "income_tax": ...,
            "national_insurance": ...,
            "total": ...,
        },
    },
    "household": {
        "current_total_tax": ...,
        "proposed_total_tax": ...,
        "net_saving": ...,  # headline number
    },
    "transfer": {
        "sources": [{"type": "rental", "amount": 18000}],
        "total_transferred": 18000,
    },
}
```

---

## Tool Definition

```python
{
    "name": "model_spousal_transfer",
    "description": (
        "Model the household tax impact of transferring income-producing assets "
        "between spouses (e.g., rental property, dividend-generating shares). "
        "Runs the engine for BOTH spouses in current and proposed scenarios "
        "(4 engine calls total). Returns per-person and household savings."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "spouse_a_client_id": {
                "type": "string",
                "description": "Client ID of the spouse losing the income (higher earner)",
            },
            "spouse_b_client_id": {
                "type": "string",
                "description": "Client ID of the spouse gaining the income (lower earner)",
            },
            "transfer_type": {
                "type": "string",
                "enum": ["rental", "dividends", "savings"],
                "description": "Type of income being transferred",
            },
            "transfer_amount": {
                "type": "number",
                "description": "Annual income amount to transfer",
            },
            "transfer_label": {
                "type": "string",
                "description": "Description of the transferred asset (e.g., 'Buy-to-let flats')",
            },
        },
        "required": [
            "spouse_a_client_id",
            "spouse_b_client_id",
            "transfer_type",
            "transfer_amount",
        ],
    },
}
```

---

## Tool Executor

**File**: `helio/apps/api/app/services/tools/tax_engine.py` — new function `execute_model_spousal_transfer()`

1. Look up both clients from DB (income sources, pension data, region, children, child benefit)
2. Build `IncomeSource` lists for each spouse
3. Build `transfer_sources` from the tool input
4. Call `analyse_spousal_transfer()`
5. Return structured result

---

## Agent Wiring

The Scenario Modeller agent prompt gains:
- Awareness that household/spousal questions should use `model_spousal_transfer`
- It needs both client IDs (can resolve from the conversation context — "Sarah and James" → look up spouse link)
- Tool is registered in the tool registry alongside `model_salary_sacrifice`

---

## Demo Flow

```
Adviser: "Sarah and James discussed transferring the rental properties
         to James at the last meeting. Can you model that?"

Agent:   [Looks up Sarah's spouse → James]
         [Calls model_spousal_transfer(
            spouse_a = client-sarah,
            spouse_b = client-james,
            transfer_type = "rental",
            transfer_amount = 18000
         )]

Engine:  4 calls → household diff

Agent:   "Transferring the £18,000 rental income from Sarah to James
         would save the household approximately £X,XXX per year:

         Sarah's tax reduces by £Y,YYY
         - Income tax: -£A,AAA (rental no longer taxed at her 40% rate)
         - NI: No change (NI not charged on rental income)

         James's tax increases by £Z,ZZZ
         - Income tax: +£B,BBB (rental taxed at his 20-40% rate)
         - NI: No change

         Net household saving: £X,XXX/year (£XXX/month)

         Note: Sarah's Personal Allowance remains fully tapered — her ANI
         is still well above £125,140. To restore the PA, she'd also need
         to increase salary sacrifice. Want me to model that combination?"
```

---

## Files to Create/Modify

| # | Task | File | Type |
|---|------|------|------|
| 1 | Spousal transfer analyser | `app/tax/spousal_transfer.py` | New |
| 2 | Tool executor | `services/tools/tax_engine.py` | Modify |
| 3 | Tool definition schema | `services/tools/tax_engine.py` | Modify |
| 4 | Register tool in registry | `services/tools/__init__.py` | Modify |
| 5 | Agent prompt update | `services/agents/` or system prompt | Modify |
| 6 | Tests | `tests/tax/test_spousal_transfer.py` | New |

---

## Out of Scope (Future)

- Spousal transfer sweep optimizer (find optimal transfer %)
- Marriage Allowance transfer modelling (separate scenario)
- CGT implications of the actual property transfer (legal/SDLT considerations)
- Compound scenarios (rental transfer + salary sacrifice in one analysis)
- Frontend Scenarios tab (separate design doc)
