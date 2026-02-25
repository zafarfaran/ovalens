# Deterministic Tax Engine — Implementation Plan

> How to make every number in Helio come from code, not from the LLM. The AI explains and orchestrates — it never does arithmetic.

---

## The Problem Right Now

```
Current architecture:

Adviser: "Analyse Sarah's tax position"
    → System prompt includes Sarah's raw data (income: £195,500...)
    → Claude reads the numbers
    → Claude does math in its head (income tax = ?, NI = ?, effective rate = ?...)
    → Claude generates dashboard JSON with its calculated numbers
    → generate_dashboard tool is a PASS-THROUGH — just forwards Claude's output
    → Dashboard displays Claude's numbers

What goes wrong:
    → Claude says tax is £52,847 one time, £51,900 the next
    → Claude forgets to apply the PA taper correctly
    → Claude rounds differently between messages
    → Claude hallucinates the HICBC charge
    → Two conversations about the same client show different numbers
    → You can't unit test Claude's arithmetic
```

The `generate_dashboard` tool in `services/tools/dashboard.py` literally just passes through whatever Claude invents:

```python
# Current — Claude makes up the numbers
async def execute_generate_dashboard(tool_input, **kwargs):
    tax_data = tool_input.get("relevantTaxData", {})  # Claude's invention
    return {"success": True, "dashboardData": tax_data}  # Pass it straight through
```

---

## The Fix

```
New architecture:

Adviser: "Analyse Sarah's tax position"
    → System prompt includes Sarah's raw data
    → Claude understands the INTENT (analyse tax position)
    → Claude calls tool: compute_tax_position(income_sources=[...], pension=..., region=...)
    → Tool runs DETERMINISTIC Python engine:
        → calculate_adjusted_net_income()    → exact number
        → calculate_personal_allowance()     → exact number
        → calculate_income_tax()             → exact band-by-band breakdown
        → calculate_national_insurance()     → exact NI by class
        → calculate_hicbc()                  → exact clawback
        → detect_observations()              → flags based on thresholds
    → Tool returns ALL numbers to Claude as structured JSON
    → Claude receives the numbers — CANNOT change them
    → Claude explains them in natural language
    → Dashboard populated from engine output (not Claude's imagination)

What's different:
    → Same client = same numbers, every time, every conversation
    → Numbers are unit-testable (pytest, no AI needed)
    → Claude's job is EXPLANATION, not CALCULATION
    → If tax rates change, update constants.py — all calculations update
```

---

## The Separation of Concerns

| Layer | Responsibility | Does Math? | Uses AI? |
|-------|---------------|-----------|----------|
| **Tax Engine** (`app/tax/`) | Compute exact numbers from inputs | **Yes** — deterministic Python | No |
| **Tool Layer** (`app/services/tools/`) | Bridge between AI and engine | No — just calls engine | No |
| **AI Layer** (`app/services/llm/`) | Understand intent, call tools, explain results | **Never** | Yes |
| **System Prompt** | Tell Claude what tools are available and when to use them | No | Configures AI |

The rule is absolute: **if it involves arithmetic, it's in `app/tax/`. Period.**

---

## What Each Tax Module Needs to Do

### 1. `ani.py` — Adjusted Net Income

The foundation. Everything else depends on ANI.

```
Input:
    total_income: float              # Sum of all income sources
    pension_contributions: float     # Gross personal pension contributions
    gift_aid: float                  # Net Gift Aid donations (will be grossed up)

Computation:
    gift_aid_gross = gift_aid / 0.8  # £80 donation = £100 gross
    ani = total_income - pension_contributions - gift_aid_gross

Output:
    {
        "total_income": 195500.00,
        "pension_contributions": 18000.00,
        "gift_aid_gross": 0.00,
        "adjusted_net_income": 177500.00,
        "personal_allowance": 0.00,          # Computed from ANI
        "personal_allowance_lost": 12570.00,
        "pa_status": "lost",                 # "full" | "tapered" | "lost"
        "in_taper_zone": false,              # true only if £100k < ANI < £125,140
        "effective_marginal_rate": 47.0       # 45% + 2% NI (no taper here)
    }

Key logic:
    if ani <= 100_000:
        pa = 12_570 (full)
    elif ani >= 125_140:
        pa = 0 (lost)
    else:
        reduction = (ani - 100_000) / 2
        pa = max(0, 12_570 - reduction)
        # in_taper_zone = True → marginal rate is 62%
```

### 2. `income_tax.py` — Income Tax Calculator

Handles England/Wales/NI and Scotland bands. Respects income ordering (non-savings → savings → dividends).

```
Input:
    non_savings_income: float        # Employment, self-employment, rental, pension
    savings_income: float            # Bank interest
    dividend_income: float           # Dividends
    personal_allowance: float        # From ANI calculator (after taper)
    is_scottish: bool
    gift_aid: float                  # Extends basic rate band

Computation:
    1. Deduct PA from non-savings income first
    2. Apply remaining PA to savings, then dividends
    3. Stack: non-savings fills lowest bands first
    4. Savings income gets PSA (£1000 basic, £500 higher, £0 additional)
    5. Dividends get £500 allowance, then dividend-specific rates
    6. If Scottish, use 6 bands for non-savings only (savings + dividends = UK rates)
    7. Gift Aid extends the basic rate band (£37,700 + gift_aid_gross)

Output:
    {
        "non_savings_tax": 42432.00,
        "savings_tax": 0.00,
        "dividend_tax": 4069.00,
        "total_income_tax": 46501.00,
        "tax_breakdown": [
            {"band": "Basic Rate", "income": 37700, "rate": 0.20, "tax": 7540.00},
            {"band": "Higher Rate", "income": 74870, "rate": 0.40, "tax": 29948.00},
            {"band": "Additional Rate", "income": 52360, "rate": 0.45, "tax": 23562.00}
        ],
        "dividend_breakdown": [
            {"band": "Allowance", "income": 500, "rate": 0.00, "tax": 0.00},
            {"band": "Additional Rate", "income": 32000, "rate": 0.3935, "tax": 12592.00}
        ],
        "effective_rate": 23.8,
        "marginal_rate": 45.0
    }

Key logic (England):
    bands = [(37700, 0.20), (74870, 0.40), (unlimited, 0.45)]
    # PA already deducted from taxable income by caller
    # Walk through bands, filling each with income

Key logic (Scotland):
    bands = [(2306, 0.19), (11685, 0.20), (17101, 0.21), (31338, 0.42),
             (50140, 0.45), (unlimited, 0.48)]
    # Only for non-savings, non-dividend income
```

### 3. `national_insurance.py` — NI by Class

```
Class 1 (Employees):
    Input: gross_earnings: float
    
    earnings_in_main_band = min(earnings, 50270) - 12570  # capped
    earnings_above_uel = max(0, earnings - 50270)
    main_ni = earnings_in_main_band * 0.08
    upper_ni = earnings_above_uel * 0.02
    employer_ni = max(0, earnings - 9100) * 0.138
    
    Output:
    {
        "class": 1,
        "earnings_in_main_band": 37700.00,
        "main_rate": 0.08,
        "main_ni": 3016.00,
        "earnings_above_uel": 94730.00,
        "upper_rate": 0.02,
        "upper_ni": 1894.60,
        "total_employee_ni": 4910.60,
        "employer_ni": 19943.20
    }

Class 4 (Self-Employed):
    Input: net_profit: float
    
    profit_in_main_band = min(profit, 50270) - 12570
    profit_above_upl = max(0, profit - 50270)
    main_ni = profit_in_main_band * 0.06
    upper_ni = profit_above_upl * 0.02
    
    Output:
    {
        "class": 4,
        "profit_in_main_band": 23430.00,
        "main_rate": 0.06,
        "main_ni": 1405.80,
        "profit_above_upl": 0,
        "upper_ni": 0,
        "total_ni": 1405.80
    }

Class 2 (Self-Employed flat rate):
    if profit > 12570: total = 52 * 3.45 = £179.40
```

### 4. `hicbc.py` — High Income Child Benefit Charge

```
Input:
    adjusted_net_income: float
    number_of_children: int
    claims_child_benefit: bool

Computation:
    first_child_annual = 25.60 * 52   # £1,331.20
    additional_child_annual = 16.95 * 52  # £881.40
    total_benefit = first_child_annual + (number_of_children - 1) * additional_child_annual

    if ani <= 60000:
        clawback_pct = 0
    elif ani >= 80000:
        clawback_pct = 100
    else:
        clawback_pct = ((ani - 60000) / 200) * 1  # 1% per £200 over

    charge = total_benefit * (clawback_pct / 100)

Output:
    {
        "applies": true,
        "child_benefit_annual": 2212.60,
        "clawback_percentage": 100.0,
        "hicbc_charge": 2212.60,
        "net_benefit": 0.00,
        "income_to_keep_full_benefit": 60000.00
    }
```

### 5. `salary_sacrifice.py` — Scenario Modelling

```
Input:
    current_gross: float
    current_sacrifice: float
    proposed_sacrifice: float
    other_income: float              # Rental, dividends, etc.
    is_scottish: bool
    number_of_children: int
    claims_child_benefit: bool

Computation:
    # Run the full tax engine TWICE — current vs proposed
    current_result = compute_full_position(current_gross - current_sacrifice + other_income, ...)
    proposed_result = compute_full_position(current_gross - proposed_sacrifice + other_income, ...)

    # Diff everything
    it_saving = current_result.income_tax - proposed_result.income_tax
    ni_saving = current_result.ni - proposed_result.ni
    hicbc_saving = current_result.hicbc_charge - proposed_result.hicbc_charge
    pa_restored = proposed_result.personal_allowance - current_result.personal_allowance

Output:
    {
        "current": { ...full tax position... },
        "proposed": { ...full tax position... },
        "savings": {
            "income_tax": 8800.00,
            "national_insurance": 240.00,
            "hicbc_avoided": 2212.60,
            "total": 11252.60
        },
        "pa_change": {
            "before": 6570.00,
            "after": 12570.00,
            "restored": 6000.00
        },
        "net_pay_impact": {
            "reduction_annual": 10547.40,
            "reduction_monthly": 878.95
        },
        "pension_contribution": {
            "before": 6000,
            "after": 18000,
            "extra_into_pot": 12000
        },
        "effective_relief": "93.8%"
    }

Key: This tool calls compute_full_position TWICE. Same deterministic
engine, different inputs. The diff IS the scenario.
```

### 6. `pension_aa.py` — Annual Allowance + Carry Forward

```
Input:
    current_year_contributions: float
    prior_years: dict[str, float]     # {"2024/25": 15000, "2023/24": 14000, "2022/23": 12000}
    threshold_income: float           # For taper check
    adjusted_income: float            # For taper check
    mpaa_triggered: bool

Computation:
    # Standard AA
    aa = 60000

    # Taper check
    if threshold_income > 200000 and adjusted_income > 260000:
        reduction = (adjusted_income - 260000) / 2
        aa = max(10000, 60000 - reduction)

    # MPAA override
    if mpaa_triggered:
        aa = 10000  # No carry forward allowed

    # Carry forward (3 years)
    carry_forward = {}
    for year, contributions in prior_years:
        aa_that_year = PENSION_AA_HISTORY[year]
        unused = max(0, aa_that_year - contributions)
        carry_forward[year] = unused

    total_available = aa + sum(carry_forward.values())
    remaining = total_available - current_year_contributions

Output:
    {
        "annual_allowance": 60000,
        "is_tapered": false,
        "tapered_amount": null,
        "current_year_used": 18000,
        "carry_forward": {
            "2024/25": {"available": 60000, "used": 15000, "unused": 45000},
            "2023/24": {"available": 60000, "used": 14000, "unused": 46000},
            "2022/23": {"available": 40000, "used": 12000, "unused": 28000}
        },
        "total_carry_forward": 119000,
        "total_available": 179000,
        "remaining": 161000,
        "mpaa_applies": false
    }
```

### 7. `engine.py` (NEW) — The Orchestrator

This is the new file that ties everything together. One function that takes raw inputs and returns the complete tax position.

```
Input:
    income_sources: list[dict]       # From tax_profiles.income_sources JSONB
    pension_contributions: dict      # From tax_profiles.pension_data JSONB
    region: str                      # "england" | "scotland" | etc.
    number_of_children: int
    claims_child_benefit: bool
    gift_aid: float

Computation:
    1. Sum income by type (non-savings, savings, dividends)
    2. calculate_adjusted_net_income(total, pension, gift_aid)
    3. Derive personal_allowance from ANI
    4. calculate_income_tax(non_savings, savings, dividends, pa, is_scottish, gift_aid)
    5. calculate_national_insurance(employment_income) — Class 1 or Class 4
    6. calculate_hicbc(ani, children, claims_cb)
    7. calculate_pension_aa(contributions, prior_years, ...)
    8. Build allowances array (ISA, pension AA, CGT AEA, dividend, savings)
    9. detect_observations(all results) — threshold-based alerts

Output:
    The COMPLETE tax_profiles row — all cached summaries, all JSONB fields,
    all flags, all breakdowns. Ready to write straight to the database.
    
    {
        "total_income": 195500.00,
        "adjusted_net_income": 177500.00,
        "taxable_income": 177500.00,
        "income_tax": 46501.00,
        "national_insurance": 4910.60,
        "dividend_tax": 4069.00,
        "total_tax": 55480.60,
        "effective_rate": 28.38,
        "marginal_rate": 47.00,
        "personal_allowance": 0,
        "pa_status": "lost",
        "in_pa_taper_zone": false,
        "hicbc_applies": true,
        "pension_taper_applies": false,
        "tax_breakdown": [...],
        "ni_breakdown": {...},
        "hicbc": {...},
        "pension_data": {...},
        "allowances": [...],
        "observations": [...]
    }
```

---

## How Claude Uses the Engine (Tool Registration)

### New Tool Definitions

Replace the current `generate_dashboard` pass-through with engine-backed tools:

```python
TOOLS = [
    {
        "name": "compute_tax_position",
        "description": (
            "Compute a client's complete UK tax position using the deterministic "
            "tax engine. Returns exact figures for income tax, NI, HICBC, "
            "allowances, and observations. Use this EVERY TIME you need to "
            "present tax numbers — never calculate them yourself."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "income_sources": {
                    "type": "array",
                    "description": "Array of income sources from the client's tax profile",
                    "items": {
                        "type": "object",
                        "properties": {
                            "source_type": {"type": "string"},
                            "gross_amount": {"type": "number"},
                            "expenses": {"type": "number", "default": 0}
                        }
                    }
                },
                "pension_contributions": {"type": "number", "default": 0},
                "gift_aid": {"type": "number", "default": 0},
                "region": {"type": "string", "enum": ["england","wales","northern_ireland","scotland"]},
                "number_of_children": {"type": "integer", "default": 0},
                "claims_child_benefit": {"type": "boolean", "default": false}
            },
            "required": ["income_sources"]
        }
    },
    {
        "name": "model_salary_sacrifice",
        "description": (
            "Model the tax impact of changing salary sacrifice amount. "
            "Runs the full tax engine twice (current vs proposed) and returns "
            "the exact savings. Use when adviser asks 'what if' about pension."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "current_gross_salary": {"type": "number"},
                "current_sacrifice": {"type": "number", "default": 0},
                "proposed_sacrifice": {"type": "number"},
                "other_income": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "source_type": {"type": "string"},
                            "gross_amount": {"type": "number"}
                        }
                    }
                },
                "region": {"type": "string", "default": "england"},
                "number_of_children": {"type": "integer", "default": 0},
                "claims_child_benefit": {"type": "boolean", "default": false}
            },
            "required": ["current_gross_salary", "proposed_sacrifice"]
        }
    },
    {
        "name": "generate_dashboard",
        "description": "Generate the tax dashboard. Requires engine-computed data — pass the output from compute_tax_position directly.",
        "input_schema": {
            "type": "object",
            "properties": {
                "mode": {"type": "string", "enum": ["reset", "iterate"]},
                "taxData": {"type": "object", "description": "Output from compute_tax_position"}
            },
            "required": ["mode", "taxData"]
        }
    },
    {
        "name": "search_meeting_notes",
        "description": "Search client meeting notes (already implemented — no changes needed)"
    }
]
```

### System Prompt Addition

Add this to the system prompt so Claude knows the rules:

```
## CRITICAL: Tax Calculation Rules

You have access to a deterministic UK tax engine via the compute_tax_position
and model_salary_sacrifice tools. You MUST follow these rules:

1. NEVER calculate tax figures yourself. Always use compute_tax_position.
2. NEVER invent, estimate, or round numbers. The engine returns exact figures.
3. When presenting numbers to the adviser, use ONLY the values returned by the tools.
4. If the adviser asks "what if?", use model_salary_sacrifice to get exact comparisons.
5. Your job is to EXPLAIN the numbers, not COMPUTE them.
6. When calling generate_dashboard, pass the engine output as taxData — do not modify it.

Workflow:
1. Adviser asks about a client's tax position
2. You call compute_tax_position with the client's income data
3. Engine returns exact numbers
4. You call generate_dashboard with those numbers
5. You write a brief explanation of the key findings

The engine handles: income tax bands, PA taper, NI (Class 1/2/4), HICBC,
pension AA (with carry forward and taper), salary sacrifice modelling,
Scottish rates, dividend tax, savings tax, and allowance tracking.
```

---

## Tool Execution Flow

```
Adviser: "Analyse Sarah's tax position"

Claude thinks: "I need to compute the tax position"
    ↓
Claude calls: compute_tax_position({
    income_sources: [
        {source_type: "employment", gross_amount: 145000},
        {source_type: "dividends", gross_amount: 32500},
        {source_type: "rental", gross_amount: 18000}
    ],
    pension_contributions: 18000,
    region: "england",
    number_of_children: 2,
    claims_child_benefit: true
})
    ↓
Tool executor calls: engine.compute_full_tax_position(...)
    ↓
Engine runs (deterministic Python — no AI):
    → ani.calculate_adjusted_net_income()
    → income_tax.calculate_income_tax()
    → national_insurance.calculate_class_1_ni()
    → hicbc.calculate_hicbc()
    → pension_aa.calculate_pension_aa()
    → Returns complete result dict
    ↓
Tool returns result to Claude as JSON
    ↓
Claude calls: generate_dashboard({
    mode: "reset",
    taxData: { ...exact engine output... }
})
    ↓
Dashboard populated with deterministic numbers
    ↓
Claude writes: "Sarah's total tax liability is £55,480.60 with an
effective rate of 28.4%. Her PA is fully lost — I've identified
three planning opportunities..."

The numbers in Claude's text MATCH the dashboard MATCH the engine
output. Always. Every time.
```

---

## What Changes in Each File

| File | Current State | Change Needed |
|------|--------------|---------------|
| `tax/ani.py` | Stub → `NotImplementedError` | Implement full ANI + PA taper calculation |
| `tax/income_tax.py` | Stub | Implement England + Scotland band calculations with income ordering |
| `tax/national_insurance.py` | Stub | Implement Class 1, Class 2, Class 4 |
| `tax/hicbc.py` | Stub | Implement HICBC clawback formula |
| `tax/pension_aa.py` | Stub | Implement AA + taper + carry forward + MPAA |
| `tax/salary_sacrifice.py` | Stub | Implement by running engine twice and diffing |
| `tax/bed_and_isa.py` | Stub | Implement (lower priority — Phase 3) |
| **`tax/engine.py`** | **Doesn't exist** | **Create — the orchestrator that calls all modules** |
| `services/tools/__init__.py` | 2 tools registered | Add `compute_tax_position` + `model_salary_sacrifice` |
| **`services/tools/tax_engine.py`** | **Doesn't exist** | **Create — tool executor that bridges AI ↔ engine** |
| `services/tools/dashboard.py` | Pass-through | Change to require engine output, not Claude invention |
| `services/llm/claude.py` | `DASHBOARD_TOOLS` + `BASE_TOOLS` | Add engine tool definitions |
| `services/system_prompt.py` | Tells Claude to populate dashboard data | Add "never calculate — use tools" rules |
| `db/seed.py` | Hardcoded numbers | Replace with engine-computed numbers (run engine on seed data) |

---

## Implementation Order

### Step 1: Core Calculators (no AI dependency)

```
1. tax/ani.py              ← Everything depends on this
2. tax/income_tax.py       ← The biggest module (band logic, income ordering)
3. tax/national_insurance.py  ← Straightforward formulas
4. tax/hicbc.py            ← Simple formula
5. tax/pension_aa.py       ← Carry forward logic is the trickiest part
```

Each of these is pure Python, zero dependencies on AI or database. They take numbers in, return numbers out. **You can write pytest tests for each one immediately.**

### Step 2: Orchestrator

```
6. tax/engine.py           ← Calls all the above, returns complete tax position
```

One function: `compute_full_tax_position()`. Takes raw income data, returns everything the dashboard needs.

### Step 3: Tool Wiring

```
7. services/tools/tax_engine.py   ← Tool executor calling engine.py
8. services/tools/__init__.py     ← Register new tools
9. services/tools/dashboard.py    ← Require engine output
10. services/llm/claude.py        ← Add tool definitions
11. services/system_prompt.py     ← Add "never calculate" rules
```

### Step 4: Salary Sacrifice (Scenario Tool)

```
12. tax/salary_sacrifice.py       ← Calls engine twice, returns diff
13. services/tools/tax_engine.py  ← Add model_salary_sacrifice executor
```

### Step 5: Validation

```
14. Update seed.py to use engine-computed numbers (prove they're correct)
15. Write tests for each tax module against known HMRC examples
```

---

## Testing Strategy

Each tax module gets its own test file with known-good inputs and outputs. These come straight from HMRC examples and your research doc.

```
tests/
├── tax/
│   ├── test_ani.py
│   │   ├── test_full_pa()                    # Income £40K → PA £12,570
│   │   ├── test_tapered_pa()                 # Income £112K → PA £6,570
│   │   ├── test_lost_pa()                    # Income £130K → PA £0
│   │   └── test_exact_boundary()             # Income £100K → PA £12,570 (just below)
│   │
│   ├── test_income_tax.py
│   │   ├── test_basic_rate_only()            # Income £30K → check exact tax
│   │   ├── test_higher_rate()                # Income £80K → check band split
│   │   ├── test_additional_rate()            # Income £200K → check all 3 bands
│   │   ├── test_scottish_rates()             # Same income, Scottish bands
│   │   ├── test_dividends_stacking()         # Employment + dividends
│   │   └── test_gift_aid_extends_band()      # Gift Aid extends BRB
│   │
│   ├── test_ni.py
│   │   ├── test_class_1_basic()              # Earnings £30K
│   │   ├── test_class_1_above_uel()          # Earnings £100K
│   │   ├── test_class_4_self_employed()      # Profit £36K
│   │   └── test_class_2_flat_rate()          # 52 × £3.45
│   │
│   ├── test_hicbc.py
│   │   ├── test_no_hicbc_below_60k()         # ANI £55K → no charge
│   │   ├── test_partial_clawback()           # ANI £70K → 50% clawback
│   │   ├── test_full_clawback()              # ANI £85K → 100% clawback
│   │   └── test_two_children_vs_one()        # Different benefit amounts
│   │
│   ├── test_pension_aa.py
│   │   ├── test_standard_aa()                # No taper, no carry forward
│   │   ├── test_with_carry_forward()         # 3 years of unused AA
│   │   ├── test_tapered_aa()                 # High earner
│   │   └── test_mpaa()                       # Flexibly accessed
│   │
│   └── test_engine.py
│       ├── test_marcus_chen()                # Full end-to-end: the 60% trap client
│       ├── test_olivia_harper()              # Director: salary + dividends
│       ├── test_ewan_macleod()               # Scottish taxpayer
│       ├── test_aisha_patel()                # Self-employed
│       └── test_george_williams()            # Retiree
```

The 5 synthetic clients from your `helio_synthetic_data.md` become the integration tests. If the engine produces the same numbers as the doc, you know it's right.

---

## What Claude's Role Becomes

| Before (LLM does math) | After (engine does math) |
|------------------------|--------------------------|
| "Income tax is approximately £42,432" | "Income tax is £42,432.00" (from engine) |
| Numbers vary between conversations | Numbers are identical every time |
| Can't explain HOW it got the number | Claude can reference the band breakdown the engine returned |
| Dashboard shows Claude's guesses | Dashboard shows engine's exact output |
| No way to audit the calculation | Full audit trail: inputs → engine → output |
| Untestable | Every module has pytest coverage |

**Claude is still essential.** It does things the engine can't:
- Understands natural language ("what if she puts more into pension?")
- Decides WHICH tool to call based on the question
- Explains results in adviser-friendly language
- Connects observations to actionable advice
- Handles ambiguity ("her income might go up next year")
- Searches meeting notes for historical context

The engine does the maths. Claude does the thinking.
