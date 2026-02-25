# Pension Carry Forward Design

**Date:** 2026-02-19
**Status:** Approved

## Problem

Financial advisers need to see how much pension annual allowance a client can carry forward from the previous 3 tax years. The engine already supports carry forward calculation (`pension_aa.py`), but nothing feeds historical contribution data into it, and the UI doesn't display the breakdown.

## Requirements

1. Adviser inputs prior-year pension contributions via a form on the client profile page
2. Carry forward breakdown visible in: dashboard allowances section + client profile page
3. Historical data auto-feeds into all pension scenario tools (compute_tax_position, model_personal_pension, model_salary_sacrifice)
4. Polished chart/visual treatment for carry forward data

## Design

### Data Storage

Store in existing `TaxProfile.pension_data` JSONB column (no migration needed):

```json
{
  "contributions_history": {
    "2022/23": { "personal": 10000, "employer": 5000 },
    "2023/24": { "personal": 25000, "employer": 5000 },
    "2024/25": { "personal": 30000, "employer": 8000 }
  }
}
```

### API Endpoints

New endpoints on clients router:

- `GET /api/clients/{id}/pension-history` — returns contributions_history from current TaxProfile's pension_data
- `PUT /api/clients/{id}/pension-history` — accepts `{ "contributions_history": {...} }`, merges into pension_data

### Engine Integration

Tool executors fetch TaxProfile, extract contributions_history, build `pension_contributions_by_year` dict (personal + employer summed per year), pass to `compute_full_tax_position()`. Carry forward result already flows through `TaxPosition.pension_aa_result` into dashboard data.

Affected executors:
- `execute_compute_tax_position()`
- `execute_model_personal_pension()`
- `execute_model_salary_sacrifice()`

### Dashboard Display

Expand pension allowance entry in `allowancesTracker` to include carry forward detail:

```json
{
  "name": "Pension Annual Allowance",
  "annualLimit": 60000,
  "carryForward": [
    { "taxYear": "2022/23", "allowance": 40000, "used": 15000, "unused": 25000 },
    { "taxYear": "2023/24", "allowance": 60000, "used": 30000, "unused": 30000 },
    { "taxYear": "2024/25", "allowance": 60000, "used": 38000, "unused": 22000 }
  ],
  "totalCarryForward": 77000,
  "totalAvailable": 137000,
  "used": 20000,
  "remaining": 117000,
  "status": "GREEN"
}
```

Frontend: polished carry forward chart component in the dashboard allowances section showing year-by-year breakdown with visual treatment (stacked bars or similar). Use frontend-design skill for high quality UI.

### Client Profile Page

"Pension Contribution History" section on the client edit form:
- 3 input rows (one per carry-forward year)
- Each row: tax year label (read-only), personal contributions input, employer contributions input
- Saves via PUT /api/clients/{id}/pension-history

### System Prompt

Add carry forward context to Claude's client context:
> "Pension carry forward: £77,000 available from prior 3 years (2022/23: £25k unused, 2023/24: £30k, 2024/25: £22k). Total available AA this year: £137,000."

## Out of Scope

- Multiple pension schemes with different AAs
- MPAA interaction with carry forward (flag only)
- Anti-avoidance rules
- Automated import of historical contribution data
