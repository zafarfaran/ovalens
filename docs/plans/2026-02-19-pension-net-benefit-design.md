# Pension Net Benefit & Tax Relief Validation — Design

**Date:** 2026-02-19
**Status:** Approved

## Problem

The pension scenario engine (`analyse_personal_pension` and `analyse_salary_sacrifice`) correctly models income tax savings through BRB extension and ANI reduction, but omits the 20% basic rate relief at source — the single most important pension benefit. This means:

- Basic rate taxpayers see **zero savings** (wrong — they get 20% relief at source)
- Higher rate taxpayers see ~20% effective relief (should be ~40% total)
- Additional rate taxpayers see ~25% effective relief (should be ~45% total)
- There is no "net benefit" summary showing what the client actually pays vs what goes into the pension

## Solution: Add `net_benefit` Section

### Personal Pension

Add a `net_benefit` dict to the return value of `analyse_personal_pension()`:

```python
"net_benefit": {
    "gross_contribution": 10_000,                  # Total going into pension pot
    "net_cost_to_client": 8_000,                   # gross * 0.8 (what client pays out of pocket)
    "basic_rate_relief": 2_000,                    # gross * 0.2 (government top-up, automatic)
    "higher_rate_relief": 2_000,                   # IT saving from BRB extension (claimed via SA)
    "hicbc_avoided": 0,                            # HICBC charge reduction
    "total_tax_relief": 4_000,                     # basic + higher + hicbc
    "net_cost_after_relief": 6_000,                # net_cost - higher_rate_relief - hicbc
    "net_benefit": 4_000,                          # total_tax_relief (= gross - net_cost_after_relief)
    "effective_cost_per_pound_in_pension": 0.60,   # net_cost_after_relief / gross
}
```

The `effective_relief_rate` at the top level is also updated to include basic rate relief:
- Old: `(IT_saving + hicbc) / additional_contribution * 100`
- New: `(IT_saving + hicbc + basic_rate_relief) / additional_contribution * 100`

Wait — `effective_relief_rate` divides by the GROSS additional contribution. But the basic rate relief IS 20% of that gross. So adding basic rate relief would always add 20 percentage points. That's correct: a higher rate taxpayer should see ~40%, not ~20%.

Actually, we should keep the existing `effective_relief_rate` as-is (it represents the self-assessment claim) and add a new `total_effective_relief_rate` that includes basic rate:

```python
"effective_relief_rate": 20.0,        # Self-assessment claim only (existing)
"total_effective_relief_rate": 40.0,  # Including basic rate at source (new)
```

### Salary Sacrifice

Add a `net_benefit` dict to the return value of `analyse_salary_sacrifice()`:

```python
"net_benefit": {
    "gross_into_pension": 20_000,                  # Sacrifice amount -> pension
    "income_tax_saved": 4_000,                     # IT saving
    "ni_saved": 2_000,                             # Employee NI saving
    "hicbc_avoided": 0,                            # HICBC saving
    "total_saving": 6_000,                         # IT + NI + HICBC
    "take_home_reduction": 14_000,                 # sacrifice_amount - total_saving
    "effective_cost_per_pound_in_pension": 0.70,   # take_home_reduction / gross_into_pension
}
```

No basic rate relief applies to salary sacrifice (the employer contributes pre-tax).

### Threshold Analysis Update

Each threshold in `personal_pension.thresholds[]` also gets a `net_benefit` sub-dict showing:
- The basic rate relief on the contribution needed
- The total relief at that threshold (basic + higher + hicbc)
- The net cost at that threshold

## 2025/26 Edge Cases to Test

1. **Basic rate taxpayer** — £30k salary, £5k gross contribution. Should show 20% total relief (all from basic rate at source), IT saving ~£0, net_benefit.basic_rate_relief = £1,000.

2. **Scottish intermediate (21%)** — 20% at source + 1% BRB extension = 21%. Verify higher_rate_relief captures the 1%.

3. **Scottish starter (19%)** — 20% at source, but marginal rate is 19%. The BRB extension gives 0% (or slight negative in edge cases). Total relief is still 20% because the provider claims it regardless.

4. **PA taper zone (£110k)** — 60% effective marginal rate. Pension contribution reduces ANI, restoring PA. The IT saving from BRB extension + PA restoration is huge. Verify net_benefit captures the full picture.

5. **Zero additional contribution** — current_contribution == proposed_contribution. No division errors. net_benefit all zeros.

6. **Contribution exceeding income** — Contributions capped at 100% of earnings for tax relief purposes. Not currently enforced. Flag for future.

7. **AA breach** — pension_aa_warning still fires alongside net_benefit section.

## Constants Validation (2025/26)

All pension constants verified correct:
- PA: 12,570 | Basic rate limit: 37,700 | Higher ceiling: 125,140
- NI Class 1: 8%/2% | Class 4: 6%/2% | Employer: 15% (from 5,000)
- Pension AA: 60,000 | Tapered min: 10,000 | MPAA: 10,000
- HICBC: 60,000 start / 80,000 full clawback
- Carry-forward: 2022/23 @ 40k, 2023/24 @ 60k, 2024/25 @ 60k

**Unrelated fix needed:** BADR rate should be 0.14 (not 0.10) for 2025/26 per October 2024 Budget. Same for Investors' Relief. Out of scope for this task.

## Files to Modify

1. `helio/apps/api/app/tax/personal_pension.py` — Add net_benefit section, update effective_relief_rate
2. `helio/apps/api/app/tax/salary_sacrifice.py` — Add net_benefit section
3. `helio/apps/api/tests/tax/test_personal_pension.py` — Add net_benefit tests + edge cases
4. `helio/apps/api/tests/tax/test_salary_sacrifice.py` — Add net_benefit tests
5. `helio/apps/api/app/services/tools/tax_engine.py` — No changes needed (result auto-spreads via `**result`)

## Backwards Compatibility

The existing `savings` dict and `effective_relief_rate` remain unchanged. The new `net_benefit` section and `total_effective_relief_rate` are purely additive. No frontend changes required — the LLM will automatically pick up the new fields when presenting results.
