# Scenario Modelling — How It Works

> Every "what if" question is just the engine running twice with different inputs. The diff IS the scenario.

---

## The Core Pattern

Every scenario in Helio follows the same pattern:

```
1. Compute CURRENT tax position → TaxPosition A
2. Change one or more inputs
3. Compute PROPOSED tax position → TaxPosition B
4. Diff A and B → savings, PA change, net pay impact
5. Present side-by-side comparison on the Scenarios tab
```

The engine (`compute_full_tax_position`) is deterministic. Same inputs = same outputs. So comparing two positions is guaranteed to produce a meaningful, exact diff.

---

## What's Already Built

```
app/tax/
├── engine.py                ✅ compute_full_tax_position() → TaxPosition
├── salary_sacrifice.py      ✅ analyse_salary_sacrifice() → runs engine 2x, returns diff
├── types.py                 ✅ TaxPosition, all sub-results as frozen dataclasses
├── observations.py          ✅ detect_observations() → flags opportunities
└── bed_and_isa.py           ⬜ Stub (placeholder)
```

`analyse_salary_sacrifice()` is the template for all scenario functions. It:
1. Builds `current_sources` with the existing sacrifice amount
2. Builds `proposed_sources` with the new sacrifice amount
3. Calls `compute_full_tax_position()` twice
4. Diffs income tax, NI, HICBC, personal allowance
5. Returns a structured comparison dict

---

## Scenario Types

### 1. Salary Sacrifice — BUILT

**What changes**: Employment income decreases, employer pension contributions increase.

**Engine calls**:
```python
# Current: salary £145k, sacrifice £6k
current = compute_full_tax_position(
    income_sources=[IncomeSource(EMPLOYMENT, 145_000 - 6_000)],
    employer_contributions=6_000,
    ...
)

# Proposed: salary £145k, sacrifice £18k
proposed = compute_full_tax_position(
    income_sources=[IncomeSource(EMPLOYMENT, 145_000 - 18_000)],
    employer_contributions=18_000,
    ...
)
```

**What the diff shows**:
- Income tax saving (from lower taxable income)
- Employee NI saving (from lower gross pay)
- Employer NI saving (from lower gross pay — the employer keeps this)
- HICBC saving (if ANI drops below thresholds)
- PA restoration (if ANI drops into/below the taper zone)
- Net take-home reduction
- Extra going into pension pot
- Effective relief rate (total tax saved / take-home sacrificed)

**File**: `app/tax/salary_sacrifice.py` — `analyse_salary_sacrifice()`

---

### 2. Personal Pension Contribution — TO BUILD

**What changes**: Personal pension contributions increase. Unlike salary sacrifice, gross pay stays the same, but ANI drops (personal contributions reduce ANI directly).

**How it differs from salary sacrifice**:
- Salary sacrifice: gross pay drops, employer contributes more. NI savings on both sides.
- Personal contribution: gross pay stays, you claim relief. No NI saving (NI based on gross pay). But ANI drops more directly.

**Engine calls**:
```python
# Current: total income £120k, personal pension contributions £5k
current = compute_full_tax_position(
    income_sources=[IncomeSource(EMPLOYMENT, 120_000)],
    pension_contributions=5_000,  # Reduces ANI, extends BRB
    ...
)

# Proposed: same income, personal pension contributions £25k
proposed = compute_full_tax_position(
    income_sources=[IncomeSource(EMPLOYMENT, 120_000)],
    pension_contributions=25_000,  # Reduces ANI by £20k more
    ...
)
```

**What the diff shows**:
- Income tax saving (from extended basic rate band + lower ANI)
- PA restoration (if ANI drops below £125,140 or below £100k)
- HICBC saving (if ANI drops below £80k/£60k)
- No NI saving (NI is on gross employment income, unchanged)
- Net cost (the contribution itself, minus the tax relief)

**New function** — `app/tax/pension_contribution.py`:

```python
def analyse_pension_contribution(
    income_sources: list[IncomeSource],
    current_contributions: float,
    proposed_contributions: float,
    *,
    employer_contributions: float = 0,
    gift_aid: float = 0,
    region: str = "england",
    number_of_children: int = 0,
    claims_child_benefit: bool = False,
) -> dict:
    """Compare tax positions with different personal pension contributions."""
    
    current = compute_full_tax_position(
        income_sources=income_sources,
        pension_contributions=current_contributions,
        employer_contributions=employer_contributions,
        gift_aid=gift_aid,
        region=region,
        number_of_children=number_of_children,
        claims_child_benefit=claims_child_benefit,
    )
    
    proposed = compute_full_tax_position(
        income_sources=income_sources,
        pension_contributions=proposed_contributions,
        employer_contributions=employer_contributions,
        gift_aid=gift_aid,
        region=region,
        number_of_children=number_of_children,
        claims_child_benefit=claims_child_benefit,
    )
    
    extra_contribution = proposed_contributions - current_contributions
    it_saving = current.income_tax - proposed.income_tax
    hicbc_saved = (
        (current.hicbc_result.hicbc_charge if current.hicbc_result else 0)
        - (proposed.hicbc_result.hicbc_charge if proposed.hicbc_result else 0)
    )
    total_saving = it_saving + hicbc_saved
    net_cost = extra_contribution - total_saving  # what it actually costs after relief
    
    return {
        "scenario_type": "pension_contribution",
        "current": _position_summary(current, current_contributions),
        "proposed": _position_summary(proposed, proposed_contributions),
        "savings": {
            "income_tax": it_saving,
            "national_insurance": 0,  # NI doesn't change
            "hicbc_avoided": hicbc_saved,
            "total_tax_saved": total_saving,
        },
        "contribution_change": {
            "before": current_contributions,
            "after": proposed_contributions,
            "extra": extra_contribution,
        },
        "net_cost": net_cost,
        "effective_relief_rate": (total_saving / extra_contribution * 100) if extra_contribution > 0 else 0,
        "pa_change": {
            "before": current.personal_allowance,
            "after": proposed.personal_allowance,
            "restored": proposed.personal_allowance - current.personal_allowance,
        },
    }
```

---

### 3. Gift Aid Planning — TO BUILD

**What changes**: Gift Aid donations increase. ANI drops (grossed-up donation is deducted). Basic rate band extends.

**Engine calls**:
```python
# Current: no Gift Aid
current = compute_full_tax_position(
    income_sources=[...],
    gift_aid=0,
    ...
)

# Proposed: £10,000 net Gift Aid (= £12,500 gross)
proposed = compute_full_tax_position(
    income_sources=[...],
    gift_aid=10_000,  # Engine grosses up: £10k / 0.8 = £12,500
    ...
)
```

**What the diff shows**:
- Income tax saving (higher rate relief claimed back)
- PA restoration (if grossed-up amount reduces ANI below thresholds)
- HICBC saving (if ANI drops below £80k/£60k)
- The charity gets more (gross-up effect explained)
- Net cost of giving after tax relief

**New function** — `app/tax/gift_aid.py`:

```python
def analyse_gift_aid(
    income_sources: list[IncomeSource],
    current_gift_aid: float,
    proposed_gift_aid: float,
    *,
    pension_contributions: float = 0,
    region: str = "england",
    number_of_children: int = 0,
    claims_child_benefit: bool = False,
) -> dict:
    """Compare tax positions with different Gift Aid levels."""
    
    current = compute_full_tax_position(
        income_sources=income_sources,
        pension_contributions=pension_contributions,
        gift_aid=current_gift_aid,
        region=region,
        number_of_children=number_of_children,
        claims_child_benefit=claims_child_benefit,
    )
    
    proposed = compute_full_tax_position(
        income_sources=income_sources,
        pension_contributions=pension_contributions,
        gift_aid=proposed_gift_aid,
        region=region,
        number_of_children=number_of_children,
        claims_child_benefit=claims_child_benefit,
    )
    
    extra_donated = proposed_gift_aid - current_gift_aid
    gross_up = extra_donated / 0.8  # What the charity actually gets
    it_saving = current.income_tax - proposed.income_tax
    
    return {
        "scenario_type": "gift_aid",
        "current": _position_summary(current),
        "proposed": _position_summary(proposed),
        "donation": {
            "net_donated": extra_donated,
            "gross_to_charity": gross_up,
            "basic_rate_reclaimed_by_charity": gross_up - extra_donated,
        },
        "savings": {
            "income_tax": it_saving,
            "total_tax_saved": it_saving,
        },
        "net_cost_of_giving": extra_donated - it_saving,
        "pa_change": {
            "before": current.personal_allowance,
            "after": proposed.personal_allowance,
            "restored": proposed.personal_allowance - current.personal_allowance,
        },
    }
```

---

### 4. Director Salary/Dividend Split — TO BUILD

**What changes**: Reduces salary, increases dividends. Tax-efficient for company directors who control their remuneration.

This is the most complex scenario because it involves two parties (director and company). The typical strategy: take salary up to the NI Primary Threshold (£12,570), then extract profits as dividends.

**Engine calls**:
```python
# Current: salary £60k, dividends £40k
current = compute_full_tax_position(
    income_sources=[
        IncomeSource(EMPLOYMENT, 60_000),
        IncomeSource(DIVIDENDS, 40_000),
    ],
    region="england",
)

# Proposed: salary £12,570 (NI threshold), dividends £87,430
proposed = compute_full_tax_position(
    income_sources=[
        IncomeSource(EMPLOYMENT, 12_570),  # At NI threshold = zero NI
        IncomeSource(DIVIDENDS, 87_430),   # Taxed at dividend rates
    ],
    region="england",
)
```

**What the diff shows**:
- Income tax change (dividend rates are lower than income tax rates at basic/higher rate)
- Employee NI saving (no NI on dividends)
- Employer NI saving (lower salary = lower employer NI)
- Corporation tax impact (dividends paid from post-CT profits; salary is deductible)
- Total combined saving (personal + company)
- Cash extraction efficiency

**New function** — `app/tax/salary_dividend.py`:

```python
def analyse_salary_dividend_split(
    total_extraction: float,
    current_salary: float,
    current_dividends: float,
    proposed_salary: float,
    proposed_dividends: float,
    *,
    other_income: list[IncomeSource] | None = None,
    corporation_tax_rate: float = 0.25,  # 25% main rate (or 19% small profits)
    region: str = "england",
    number_of_children: int = 0,
    claims_child_benefit: bool = False,
) -> dict:
    """Compare salary/dividend splits for a company director.
    
    Considers both personal tax AND corporation tax impact.
    """
    other = other_income or []
    
    # Personal tax: current
    current_personal = compute_full_tax_position(
        income_sources=[
            IncomeSource(EMPLOYMENT, current_salary),
            IncomeSource(DIVIDENDS, current_dividends),
            *other,
        ],
        region=region,
        number_of_children=number_of_children,
        claims_child_benefit=claims_child_benefit,
    )
    
    # Personal tax: proposed
    proposed_personal = compute_full_tax_position(
        income_sources=[
            IncomeSource(EMPLOYMENT, proposed_salary),
            IncomeSource(DIVIDENDS, proposed_dividends),
            *other,
        ],
        region=region,
        number_of_children=number_of_children,
        claims_child_benefit=claims_child_benefit,
    )
    
    # Corporation tax impact
    # Salary is a deductible expense for CT. Dividends are paid from post-CT profits.
    # So higher salary = lower CT bill, but higher NI.
    current_employer_ni = (
        current_personal.ni_result.class_1.total_employer_ni
        if current_personal.ni_result.class_1 else 0
    )
    proposed_employer_ni = (
        proposed_personal.ni_result.class_1.total_employer_ni
        if proposed_personal.ni_result.class_1 else 0
    )
    
    # CT on the profit used for dividends
    # Company needs to earn enough pre-tax to pay dividends after CT
    current_pre_tax_for_divs = current_dividends / (1 - corporation_tax_rate)
    proposed_pre_tax_for_divs = proposed_dividends / (1 - corporation_tax_rate)
    current_ct = current_pre_tax_for_divs * corporation_tax_rate
    proposed_ct = proposed_pre_tax_for_divs * corporation_tax_rate
    
    return {
        "scenario_type": "salary_dividend_split",
        "current": {
            "salary": current_salary,
            "dividends": current_dividends,
            "personal_tax": current_personal.total_tax,
            "employer_ni": current_employer_ni,
            "corporation_tax": current_ct,
            "total_tax_all": current_personal.total_tax + current_employer_ni + current_ct,
        },
        "proposed": {
            "salary": proposed_salary,
            "dividends": proposed_dividends,
            "personal_tax": proposed_personal.total_tax,
            "employer_ni": proposed_employer_ni,
            "corporation_tax": proposed_ct,
            "total_tax_all": proposed_personal.total_tax + proposed_employer_ni + proposed_ct,
        },
        "savings": {
            "personal_tax": current_personal.total_tax - proposed_personal.total_tax,
            "employer_ni": current_employer_ni - proposed_employer_ni,
            "corporation_tax": current_ct - proposed_ct,  # Will be negative if dividends increase
            "total_combined": (
                (current_personal.total_tax + current_employer_ni + current_ct)
                - (proposed_personal.total_tax + proposed_employer_ni + proposed_ct)
            ),
        },
    }
```

---

### 5. Bed & ISA — TO BUILD (stub exists)

**What changes**: Sell holdings in a General Investment Account, use CGT Annual Exempt Amount, rebuy inside an ISA. Future growth is tax-free.

This doesn't use `compute_full_tax_position` directly — it's a CGT + income tax calculation. But it does need the client's marginal rate to compute the value of the ISA shelter.

**New function** — replace stub in `app/tax/bed_and_isa.py`:

```python
def analyse_bed_and_isa(
    holding_value: float,
    acquisition_cost: float,
    *,
    annual_yield: float = 0,           # Expected dividend/interest yield %
    expected_growth: float = 0,        # Expected capital growth %
    holding_period_years: int = 10,    # How long sheltered
    marginal_income_tax_rate: float = 0.40,
    marginal_cgt_rate: float = 0.20,   # CGT rate (basic/higher)
    remaining_isa_allowance: float = 20_000,
    remaining_cgt_aea: float = 3_000,
) -> dict:
    """Analyse Bed & ISA benefit over a holding period."""
    
    # Step 1: Current gain
    gain = holding_value - acquisition_cost
    
    # Step 2: Amount transferable (limited by ISA allowance)
    transfer_amount = min(holding_value, remaining_isa_allowance)
    transfer_pct = transfer_amount / holding_value if holding_value > 0 else 0
    gain_on_transfer = gain * transfer_pct
    
    # Step 3: CGT on the sell (use AEA)
    taxable_gain = max(0, gain_on_transfer - remaining_cgt_aea)
    cgt_on_sell = taxable_gain * marginal_cgt_rate
    
    # Step 4: Future benefit of ISA shelter
    # Income sheltered each year
    annual_income_sheltered = transfer_amount * (annual_yield / 100)
    annual_income_tax_saved = annual_income_sheltered * marginal_income_tax_rate
    
    # Growth sheltered over period
    future_value_gia = transfer_amount * ((1 + expected_growth / 100) ** holding_period_years)
    future_gain_gia = future_value_gia - transfer_amount
    future_cgt_avoided = future_gain_gia * marginal_cgt_rate
    
    total_tax_saved_over_period = (
        annual_income_tax_saved * holding_period_years
        + future_cgt_avoided
    )
    
    return {
        "scenario_type": "bed_and_isa",
        "current_holding": {
            "value": holding_value,
            "acquisition_cost": acquisition_cost,
            "unrealised_gain": gain,
        },
        "transfer": {
            "amount": transfer_amount,
            "gain_realised": gain_on_transfer,
            "cgt_aea_used": min(gain_on_transfer, remaining_cgt_aea),
            "taxable_gain": taxable_gain,
            "cgt_payable_now": cgt_on_sell,
        },
        "future_benefit": {
            "holding_period_years": holding_period_years,
            "annual_income_sheltered": annual_income_sheltered,
            "annual_income_tax_saved": annual_income_tax_saved,
            "future_growth_sheltered": future_gain_gia,
            "future_cgt_avoided": future_cgt_avoided,
            "total_tax_saved": total_tax_saved_over_period,
        },
        "net_benefit": total_tax_saved_over_period - cgt_on_sell,
        "breakeven_years": (
            cgt_on_sell / annual_income_tax_saved
            if annual_income_tax_saved > 0 else None
        ),
    }
```

---

### 6. Spousal Income Transfer — TO BUILD (NEXT PRIORITY)

**What changes**: Income-producing assets (rental property, dividend shares) are transferred from the higher-earning spouse to the lower-earning spouse. This is a **household-level** scenario — it runs the engine for **both** spouses.

**Why this is high value for the demo**:
- Most tax tools can only model one person. Household planning is a differentiator.
- Sarah and James Mitchell are already linked as a household in the demo data.
- Meeting notes explicitly mention "explore spousal transfer of rental property to utilise James's basic rate band".
- The numbers are immediately compelling: Sarah pays 40%+ on rental income that James would pay 20% on.

**How it differs from other scenarios**:
- Other scenarios change ONE input for ONE person (sacrifice amount, pension contribution).
- This scenario changes inputs for TWO people simultaneously — income moves from A to B.
- Requires 4 engine calls instead of 2 (current + proposed for each spouse).

**Engine calls**:
```python
# Current household: Sarah has rental, James doesn't
sarah_current = compute_full_tax_position(
    income_sources=[
        IncomeSource(EMPLOYMENT, 145_000),
        IncomeSource(DIVIDENDS, 32_500),
        IncomeSource(RENTAL, 18_000),      # Sarah has the rental
    ],
    pension_contributions=18_000,
    number_of_children=2,
    claims_child_benefit=True,
)
james_current = compute_full_tax_position(
    income_sources=[
        IncomeSource(SELF_EMPLOYMENT, 45_000),
    ],
)

# Proposed household: James has rental, Sarah doesn't
sarah_proposed = compute_full_tax_position(
    income_sources=[
        IncomeSource(EMPLOYMENT, 145_000),
        IncomeSource(DIVIDENDS, 32_500),
        # No rental — transferred to James
    ],
    pension_contributions=18_000,
    number_of_children=2,
    claims_child_benefit=True,
)
james_proposed = compute_full_tax_position(
    income_sources=[
        IncomeSource(SELF_EMPLOYMENT, 45_000),
        IncomeSource(RENTAL, 18_000),       # James now has the rental
    ],
)
```

**What the diff shows**:
- Sarah's tax reduction (rental no longer taxed at her 40%+ marginal rate)
- James's tax increase (rental taxed at his 20-40% rate)
- **Net household saving** (the headline number — Sarah's reduction minus James's increase)
- PA changes for both spouses
- HICBC impact (Sarah is still the higher earner, so HICBC doesn't shift)
- NI: No change (NI not charged on rental income for either spouse)

**New function** — `app/tax/spousal_transfer.py`:

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
    """Compare household tax positions before and after spousal income transfer.

    Runs the engine 4 times:
      1. Spouse A current (with transferred income)
      2. Spouse B current (without transferred income)
      3. Spouse A proposed (without transferred income)
      4. Spouse B proposed (with transferred income)

    Returns per-person breakdowns + household summary.
    """

    # 1. Current: A has the income, B doesn't
    a_current = compute_full_tax_position(
        income_sources=spouse_a_sources,
        pension_contributions=spouse_a_pension,
        employer_contributions=spouse_a_employer_contributions,
        gift_aid=spouse_a_gift_aid,
        region=spouse_a_region,
        number_of_children=spouse_a_children,
        claims_child_benefit=spouse_a_claims_cb,
    )
    b_current = compute_full_tax_position(
        income_sources=spouse_b_sources,
        pension_contributions=spouse_b_pension,
        employer_contributions=spouse_b_employer_contributions,
        gift_aid=spouse_b_gift_aid,
        region=spouse_b_region,
        number_of_children=spouse_b_children,
        claims_child_benefit=spouse_b_claims_cb,
    )

    # 2. Proposed: remove transfer_sources from A, add to B
    a_proposed_sources = [
        s for s in spouse_a_sources
        if not _matches_transfer(s, transfer_sources)
    ]
    b_proposed_sources = [*spouse_b_sources, *transfer_sources]

    a_proposed = compute_full_tax_position(
        income_sources=a_proposed_sources,
        pension_contributions=spouse_a_pension,
        employer_contributions=spouse_a_employer_contributions,
        gift_aid=spouse_a_gift_aid,
        region=spouse_a_region,
        number_of_children=spouse_a_children,
        claims_child_benefit=spouse_a_claims_cb,
    )
    b_proposed = compute_full_tax_position(
        income_sources=b_proposed_sources,
        pension_contributions=spouse_b_pension,
        employer_contributions=spouse_b_employer_contributions,
        gift_aid=spouse_b_gift_aid,
        region=spouse_b_region,
        number_of_children=spouse_b_children,
        claims_child_benefit=spouse_b_claims_cb,
    )

    # 3. Diff
    household_current = a_current.total_tax + b_current.total_tax
    household_proposed = a_proposed.total_tax + b_proposed.total_tax
    net_saving = round_currency(household_current - household_proposed)

    return {
        "scenario_type": "spousal_transfer",
        "spouse_a": {
            "current": _person_summary(a_current),
            "proposed": _person_summary(a_proposed),
            "savings": {
                "income_tax": round_currency(a_current.income_tax - a_proposed.income_tax),
                "national_insurance": round_currency(a_current.national_insurance - a_proposed.national_insurance),
                "hicbc_avoided": round_currency(
                    (a_current.hicbc_result.hicbc_charge if a_current.hicbc_result else 0)
                    - (a_proposed.hicbc_result.hicbc_charge if a_proposed.hicbc_result else 0)
                ),
                "total": round_currency(a_current.total_tax - a_proposed.total_tax),
            },
            "pa_change": {
                "current": a_current.personal_allowance,
                "proposed": a_proposed.personal_allowance,
                "restored": round_currency(a_proposed.personal_allowance - a_current.personal_allowance),
            },
        },
        "spouse_b": {
            "current": _person_summary(b_current),
            "proposed": _person_summary(b_proposed),
            "additional_tax": {
                "income_tax": round_currency(b_proposed.income_tax - b_current.income_tax),
                "national_insurance": round_currency(b_proposed.national_insurance - b_current.national_insurance),
                "total": round_currency(b_proposed.total_tax - b_current.total_tax),
            },
        },
        "household": {
            "current_total_tax": round_currency(household_current),
            "proposed_total_tax": round_currency(household_proposed),
            "net_saving": net_saving,
        },
        "transfer": {
            "sources": [
                {"type": s.source_type.value, "amount": s.gross_amount, "label": s.label}
                for s in transfer_sources
            ],
            "total_transferred": sum(s.gross_amount for s in transfer_sources),
        },
    }
```

---

### 7. Multi-Variable "Optimiser" — FUTURE

Instead of the adviser specifying exact numbers, the engine finds the optimal:

```
"What's the optimal salary sacrifice to minimise Marcus's tax?"
```

This sweeps across a range of sacrifice amounts and finds the best one:

```python
def find_optimal_sacrifice(
    gross_salary: float,
    other_income: list[IncomeSource],
    *,
    min_sacrifice: float = 0,
    max_sacrifice: float | None = None,  # defaults to gross_salary
    step: float = 1_000,
    region: str = "england",
    number_of_children: int = 0,
    claims_child_benefit: bool = False,
) -> dict:
    """Sweep sacrifice amounts and find the optimal point."""
    
    max_sacrifice = max_sacrifice or gross_salary
    best = None
    results = []
    
    for amount in range(int(min_sacrifice), int(max_sacrifice) + 1, int(step)):
        result = analyse_salary_sacrifice(
            gross_salary=gross_salary,
            sacrifice_amount=float(amount),
            other_income_sources=other_income,
            region=region,
            number_of_children=number_of_children,
            claims_child_benefit=claims_child_benefit,
        )
        
        efficiency = result["savings"]["total"] / amount if amount > 0 else 0
        results.append({
            "sacrifice": amount,
            "total_saving": result["savings"]["total"],
            "net_pay": gross_salary - amount - result["proposed"]["total_tax"],
            "efficiency": efficiency,
        })
        
        if best is None or result["savings"]["total"] > best["savings"]["total"]:
            best = result
    
    # Find key thresholds
    thresholds = _find_thresholds(results)
    
    return {
        "optimal": best,
        "sweep": results,
        "thresholds": thresholds,  # e.g., "PA restored at £34,360", "HICBC eliminated at £X"
    }
```

This is a Phase 3 feature — useful for the adviser but not required for the demo.

---

## How a Scenario Flows End-to-End

### Step 1: Adviser Asks

```
"What if Marcus increases his pension sacrifice from £6k to £18k?"
```

### Step 2: Intent Router Classifies

```
Input: "What if Marcus increases his pension sacrifice from £6k to £18k?"
Output: SCENARIO
```

### Step 3: Scenario Modeller Agent Receives

The agent gets:
- The message
- Marcus's client context (income sources, region, children, current sacrifice)
- Marcus's current tax position (from `tax_profiles.cached_summary`)
- Tools: `model_salary_sacrifice`, `compute_tax_position`, `generate_dashboard`

### Step 4: Agent Calls `model_salary_sacrifice` Tool

Claude builds the tool call from the message + client context:

```json
{
  "name": "model_salary_sacrifice",
  "input": {
    "current_gross_salary": 145000,
    "current_sacrifice": 6000,
    "proposed_sacrifice": 18000,
    "other_income": [
      {"source_type": "rental", "gross_amount": 18000},
      {"source_type": "dividends", "gross_amount": 32500}
    ],
    "region": "england",
    "number_of_children": 2,
    "claims_child_benefit": true
  }
}
```

### Step 5: Tool Executor Calls Engine

`services/tools/tax_engine.py` → `execute_model_salary_sacrifice()`:

```python
# Calls analyse_salary_sacrifice() which calls compute_full_tax_position() TWICE
result = analyse_salary_sacrifice(
    gross_salary=145_000,
    sacrifice_amount=18_000,
    current_sacrifice=6_000,
    other_income_sources=[
        IncomeSource(IncomeType.RENTAL, 18_000),
        IncomeSource(IncomeType.DIVIDENDS, 32_500),
    ],
    region="england",
    number_of_children=2,
    claims_child_benefit=True,
)
```

### Step 6: Engine Returns Deterministic Result

```python
{
    "current": {
        "gross_salary": 145000,
        "sacrifice": 6000,
        "income_tax": 51832.00,
        "national_insurance": 5151.60,
        "hicbc": 2212.60,
        "total_tax": 59196.20,
        "personal_allowance": 0,
    },
    "proposed": {
        "gross_salary": 145000,
        "sacrifice": 18000,
        "income_tax": 47032.00,
        "national_insurance": 4911.60,
        "hicbc": 2212.60,
        "total_tax": 54156.20,
        "personal_allowance": 0,
    },
    "savings": {
        "income_tax": 4800.00,
        "national_insurance": 240.00,
        "hicbc_avoided": 0.00,
        "total": 5040.00,
    },
    "pa_change": {
        "current": 0,
        "proposed": 0,
        "restored": 0,
    },
    "extra_into_pension": 12000,
}
```

### Step 7: Agent Calls `generate_dashboard`

Claude passes the scenario result to the dashboard tool:

```json
{
  "name": "generate_dashboard",
  "input": {
    "mode": "iterate",
    "taxData": {
      "scenario": { ...engine result above... }
    }
  }
}
```

### Step 8: Dashboard Scenarios Tab Updates

The frontend receives a `dashboard_update` SSE event and populates the Scenarios tab with the before/after comparison.

### Step 9: Agent Writes Explanation

Using ONLY the engine numbers:

```
Increasing Marcus's salary sacrifice from £6,000 to £18,000 would save £5,040 per year 
in tax:
- Income tax: £4,800 saved (lower taxable employment income)
- Employee NI: £240 saved (2% above UEL on the additional £12k)
- HICBC: No change (ANI still above £80k — full clawback either way)

His take-home pay would reduce by £6,960/yr (£580/month), but £12,000 extra goes 
into his pension pot. For every £1 of take-home sacrificed, £1.72 goes into the pension.

Note: His Personal Allowance remains fully lost in both scenarios — his ANI is still 
well above £125,140. To restore the PA, he'd need to sacrifice approximately £34,360 
total. Want me to model that?
```

---

## The Tool Definitions for the Scenario Agent

These are the Anthropic-format tool schemas that the Scenario Modeller agent has access to.

### `model_salary_sacrifice`

```python
{
    "name": "model_salary_sacrifice",
    "description": (
        "Model the tax impact of changing salary sacrifice amount. "
        "Runs the deterministic engine twice (current vs proposed) and "
        "returns exact savings breakdown. Use for any question about "
        "pension sacrifice, employer contributions, or salary redirection."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "current_gross_salary": {
                "type": "number",
                "description": "Gross salary before any sacrifice"
            },
            "current_sacrifice": {
                "type": "number",
                "default": 0,
                "description": "Current sacrifice amount"
            },
            "proposed_sacrifice": {
                "type": "number",
                "description": "Proposed new sacrifice amount to model"
            },
            "other_income": {
                "type": "array",
                "description": "Non-salary income (rental, dividends, etc.)",
                "items": {
                    "type": "object",
                    "properties": {
                        "source_type": {"type": "string"},
                        "gross_amount": {"type": "number"},
                        "label": {"type": "string"},
                    },
                    "required": ["source_type", "gross_amount"],
                },
            },
            "region": {
                "type": "string",
                "enum": ["england", "wales", "northern_ireland", "scotland"],
                "default": "england",
            },
            "number_of_children": {"type": "integer", "default": 0},
            "claims_child_benefit": {"type": "boolean", "default": False},
        },
        "required": ["current_gross_salary", "proposed_sacrifice"],
    },
}
```

### `model_pension_contribution`

```python
{
    "name": "model_pension_contribution",
    "description": (
        "Model the tax impact of changing personal pension contributions "
        "(SIPP, relief at source). Unlike salary sacrifice, NI doesn't change — "
        "the benefit is income tax relief and ANI reduction."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "income_sources": {
                "type": "array",
                "description": "All income sources (same as compute_tax_position)",
                "items": {
                    "type": "object",
                    "properties": {
                        "source_type": {"type": "string"},
                        "gross_amount": {"type": "number"},
                    },
                    "required": ["source_type", "gross_amount"],
                },
            },
            "current_contributions": {
                "type": "number",
                "default": 0,
                "description": "Current annual personal pension contributions",
            },
            "proposed_contributions": {
                "type": "number",
                "description": "Proposed new contribution level",
            },
            "employer_contributions": {
                "type": "number",
                "default": 0,
                "description": "Employer contributions (unchanged by this scenario)",
            },
            "region": {"type": "string", "default": "england"},
            "number_of_children": {"type": "integer", "default": 0},
            "claims_child_benefit": {"type": "boolean", "default": False},
        },
        "required": ["income_sources", "proposed_contributions"],
    },
}
```

### `model_salary_dividend_split`

```python
{
    "name": "model_salary_dividend_split",
    "description": (
        "Model the combined personal + corporation tax impact of changing "
        "the salary/dividend split for a company director. Considers employer NI, "
        "corporation tax, and personal tax together."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "total_extraction": {
                "type": "number",
                "description": "Total amount to extract from company",
            },
            "current_salary": {"type": "number"},
            "current_dividends": {"type": "number"},
            "proposed_salary": {"type": "number"},
            "proposed_dividends": {"type": "number"},
            "other_income": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "source_type": {"type": "string"},
                        "gross_amount": {"type": "number"},
                    },
                },
            },
            "corporation_tax_rate": {
                "type": "number",
                "default": 0.25,
                "description": "CT rate (0.19 for small profits, 0.25 main rate)",
            },
            "region": {"type": "string", "default": "england"},
            "number_of_children": {"type": "integer", "default": 0},
            "claims_child_benefit": {"type": "boolean", "default": False},
        },
        "required": ["current_salary", "current_dividends", "proposed_salary", "proposed_dividends"],
    },
}
```

### `model_spousal_transfer`

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

### `compute_tax_position`

The Scenario agent also has access to `compute_tax_position` for ad-hoc scenarios that don't fit a pre-built template. It can call it twice manually with different inputs.

---

## Frontend: Scenarios Tab

The dashboard enhancement plan describes the Scenarios tab UI. Here's how it connects to the data.

### Data Shape From the Engine

Every scenario tool returns a standardised comparison structure. The frontend Scenarios tab expects:

```typescript
interface ScenarioResult {
  scenario_type: string;              // "salary_sacrifice" | "pension_contribution" | "salary_dividend_split" | etc.
  
  current: {
    total_tax: number;
    income_tax: number;
    national_insurance: number;
    hicbc: number;
    personal_allowance: number;
    [key: string]: number;            // scenario-specific fields
  };
  
  proposed: {
    total_tax: number;
    income_tax: number;
    national_insurance: number;
    hicbc: number;
    personal_allowance: number;
    [key: string]: number;
  };
  
  savings: {
    income_tax: number;
    national_insurance: number;
    hicbc_avoided: number;
    total: number;
    [key: string]: number;            // e.g., corporation_tax for director scenarios
  };
  
  pa_change: {
    before: number;
    after: number;
    restored: number;
  };
}
```

### Multiple Scenarios in One Session

The adviser might model several options:

```
Turn 1: "What if Marcus sacrifices 18k?"     → Scenario A
Turn 2: "What about 25k?"                    → Scenario B
Turn 3: "And model putting it all the way to restore the PA"  → Scenario C
```

Each scenario is stored in the dashboard data as an entry in a `scenarios` array. The Scenarios tab shows a list on the left and the selected comparison on the right:

```
┌─ Scenarios ─────────────┬─ Comparison ──────────────────────────────────┐
│                         │                                               │
│ A. Sacrifice £18k       │  Current (£6k)       Proposed (£18k)         │
│    Saves £5,040 ✓       │                                               │
│                         │  Income tax  £51,832  £47,032  ✅ -£4,800    │
│ B. Sacrifice £25k       │  NI          £5,152   £4,912   ✅ -£240     │
│    Saves £7,840         │  HICBC       £2,213   £2,213   — no change  │
│                         │  Total       £59,196  £54,156  ✅ -£5,040   │
│ C. Sacrifice £34,360    │                                               │
│    Saves £12,680        │  Take-home:  -£6,960/yr (-£580/mo)           │
│    ★ Best value         │  Into pension: +£12,000/yr                    │
│                         │  Effective relief: 142%                       │
└─────────────────────────┴───────────────────────────────────────────────┘
```

### Dashboard Data Update

When a scenario is modelled, the `generate_dashboard` tool receives:

```json
{
  "mode": "iterate",
  "taxData": {
    "scenarios": [
      {
        "id": "scenario-a",
        "name": "Sacrifice £18k",
        "scenario_type": "salary_sacrifice",
        "current": { ... },
        "proposed": { ... },
        "savings": { "total": 5040 },
        ...
      }
    ]
  }
}
```

The frontend appends this to the existing `dashboardData.scenarios` array. Previous scenarios are preserved — the adviser builds up a comparison set across multiple turns.

---

## Implementation Checklist

| # | Task | File | Status |
|---|------|------|--------|
| 1 | Salary sacrifice analyser | `tax/salary_sacrifice.py` | ✅ Done |
| 2 | Personal pension contribution analyser | `tax/pension_contribution.py` | To build |
| 3 | Gift Aid analyser | `tax/gift_aid.py` | To build |
| 4 | Salary/dividend split analyser | `tax/salary_dividend.py` | To build |
| 5 | Bed & ISA analyser | `tax/bed_and_isa.py` | To build (replace stub) |
| 6 | **Spousal income transfer analyser** | `tax/spousal_transfer.py` | **To build (next)** |
| 7 | Tool executor: `model_salary_sacrifice` | `services/tools/tax_engine.py` | To build |
| 8 | Tool executor: `model_pension_contribution` | `services/tools/tax_engine.py` | To build |
| 9 | Tool executor: `model_salary_dividend_split` | `services/tools/tax_engine.py` | To build |
| 10 | **Tool executor: `model_spousal_transfer`** | `services/tools/tax_engine.py` | **To build (next)** |
| 11 | Register tools in registry | `services/tools/__init__.py` | To build |
| 12 | Scenario Modeller agent prompt | `services/agents/scenario_modeller.py` | To build |
| 13 | Tool definitions for agent | `services/agents/scenario_modeller.py` | To build |
| 14 | Frontend: Scenarios tab component | `apps/web/.../ScenariosTab.tsx` | To build |
| 15 | Frontend: ScenarioResult type | `packages/shared/src/types/scenarios.ts` | To update |
| 16 | Frontend: scenario list + comparison layout | `apps/web/.../ScenariosTab.tsx` | To build |
| 17 | Optimal sacrifice sweep | `tax/salary_sacrifice.py` | Phase 3 |
| 18 | Spousal transfer sweep optimizer | `tax/spousal_transfer.py` | Phase 3 |

### Priority for Demo

**P1 — Must have**:
- Salary sacrifice (already built in engine, just needs tool + agent wiring)
- **Spousal income transfer** (household-level planning — the differentiator)
- Scenarios tab on the frontend (before/after layout + savings table)

**P2 — High value**:
- Personal pension contribution (simple — engine runs twice)
- Salary/dividend split (needed for director clients)
- Multiple scenario accumulation across turns

**P3 — Later**:
- Gift Aid analyser
- Bed & ISA (replace stub)
- Optimal sacrifice sweep
- Spousal transfer sweep (find optimal transfer %)
- Marriage Allowance modelling
- Student loan planning
- Compound scenarios (rental transfer + salary sacrifice combined)

### Why Spousal Transfer is P1

1. **Differentiator**: Most tax tools model one person. Household planning is what advisers actually do — and what they can't find software for.
2. **Demo data supports it**: Sarah + James are already linked. Meeting notes mention this exact planning opportunity.
3. **Impressive to both audiences**: Advisers see real planning value. Investors see the AI doing something no competitor does.
4. **Builds on existing architecture**: Same engine pattern (run twice, diff), just extended to two people (run 4 times).
5. **Leads to a natural follow-up**: "Want me to also model increasing her salary sacrifice to restore the PA?" — shows how scenarios chain together.

---

## Future Scenario Research

### Scenarios Investigated but Not Yet Prioritised

#### Marriage Allowance Transfer
- One spouse can transfer £1,260 of their PA to the other if the transferor earns below £12,570 and the recipient is a basic rate taxpayer.
- **Not relevant for Sarah/James** (both earn above the PA), but useful for other client profiles.
- Simple engine call: recipient gets £1,260 × 20% = £252 saving. Low complexity, low value.

#### CGT Bed & ISA Analysis
- Sell holdings in GIA, use CGT Annual Exempt Amount, rebuy inside ISA.
- Stub exists in `app/tax/bed_and_isa.py`. Requires CGT calculation (not income tax engine).
- Sarah has £85k in a global equity fund with £12k unrealised gains (from meeting notes).
- Medium complexity, medium value for demo.

#### Pension Carry-Forward Planning
- Sarah has £14k unused from 2021/22 + current year headroom.
- Engine already supports `pension_contributions_by_year` parameter.
- Could model "what if Sarah uses all carry-forward this year" — reduces ANI significantly.
- Medium complexity, high value but overlaps with personal pension contribution scenario.

#### Bonus Planning
- Sarah expects an £80k bonus in Feb 2026 (from meeting notes).
- Model the impact of the bonus on tax + strategies to mitigate (pension sacrifice, timing).
- High value for demo (dramatic numbers), but essentially a salary sacrifice variant with different inputs.

#### Spousal Pension Contribution
- Sarah funds contributions into James's pension.
- Reduces household tax while building James's retirement pot.
- Could combine with spousal transfer for a compound scenario.
- Medium complexity, high value.

#### Multi-Lever Optimiser
- Instead of modelling one lever at a time, sweep across combinations:
  "What's the optimal salary sacrifice + rental transfer + pension contribution to minimise household tax?"
- Phase 3 feature — computationally intensive but very impressive.
- Could use the engine in a grid search or gradient-free optimiser.
