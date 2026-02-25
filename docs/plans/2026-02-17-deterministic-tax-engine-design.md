# Deterministic Tax Engine — Design Document

> Validated design for replacing LLM-computed tax numbers with a deterministic Python engine.
> Based on: `docs/demo/deterministic_tax_engine_plan.md` with additions for logging, modularity, and pitfall mitigation.

## Core Principle

**The AI explains — it never does arithmetic.** Every number shown to the user comes from deterministic Python code that can be unit-tested.

## Module Structure

```
app/tax/
├── constants.py          # Year-keyed tax rates and thresholds
├── types.py              # Shared dataclasses for all engine I/O
├── rounding.py           # HMRC-compliant rounding (truncate per-band)
├── ani.py                # Adjusted Net Income + PA taper
├── income_tax.py         # England/Scotland bands, income ordering
├── national_insurance.py # Class 1, 2, 4
├── hicbc.py              # High Income Child Benefit Charge
├── pension_aa.py         # Annual Allowance + carry forward + taper
├── salary_sacrifice.py   # Runs engine twice, diffs results
├── observations.py       # Threshold-based alert detection
├── engine.py             # Orchestrator — compute_full_tax_position()
├── bed_and_isa.py        # Stub (Phase 3)
├── marriage_allowance.py # Stub with interface
└── student_loan.py       # Stub with interface
```

## Design Decisions

### 1. Year-Keyed Constants

Constants are organized by tax year so multiple years can coexist:

```python
TAX_YEARS = {
    "2025/26": {
        "income_tax": {"pa": 12_570, "bands": [...]},
        "ni": {"class_1": {...}, "class_4": {...}},
        ...
    }
}

def get_tax_year_constants(tax_year: str = "2025/26") -> dict:
    ...
```

Rationale: Adding a new tax year is a single dict entry. No code changes needed.

### 2. Shared Types (`types.py`)

All engine inputs and outputs use dataclasses defined in one file. Benefits:
- Type safety across all modules
- Single source of truth for data contracts
- IDE autocomplete and static analysis

### 3. HMRC-Compliant Rounding (`rounding.py`)

HMRC truncates tax per-band to whole pounds, not at the final total. Centralizing rounding prevents off-by-£1 errors between modules.

### 4. Extracted Observations (`observations.py`)

Observation rules (threshold checks, planning alerts) live in their own module rather than inline in engine.py. This is the fastest-growing part of the engine — new planning strategies = new observation rules. Keeps engine.py focused on orchestration.

### 5. Stub Modules with Interfaces

Marriage Allowance, Student Loans, and Blind Person's Allowance get function signatures and types now, but raise `NotImplementedError`. Engine orchestrator has optional slots for them.

### 6. Structured Audit Logging

Each calculation step logs inputs → outputs with structured logging (JSON format). Uses the existing structured logger from `core/logging.py`. Enables debugging, compliance audit, and future analytics.

## Pitfalls Identified

1. **Rounding** — HMRC rounds per-band, not at end. Mitigated by `rounding.py`.
2. **Income ordering** — Non-savings → savings → dividends must stack through bands correctly. This is the most complex part of `income_tax.py`.
3. **Frontend contract** — Dashboard expects `relevantTaxData` shape. Engine output must map to this or frontend breaks. Tool layer handles the mapping.
4. **Scottish rates** — Only apply to non-savings income. Savings and dividends always use UK rates even for Scottish taxpayers.
5. **PA taper interaction** — The 60% effective marginal rate trap (£100k-£125,140) must be modelled correctly. ANI feeds into PA which feeds into income tax.
6. **Gift Aid band extension** — Extends basic rate band, not just for the donor's non-savings income but also affects dividend/savings rates.

## Integration Points

| File | Change |
|------|--------|
| `services/tools/tax_engine.py` | NEW — tool executor bridging AI ↔ engine |
| `services/tools/__init__.py` | Register `compute_tax_position` + `model_salary_sacrifice` |
| `services/tools/dashboard.py` | Require engine output, not Claude invention |
| `services/llm/claude.py` | Add engine tool definitions |
| `services/system_prompt.py` | Add "never calculate — use tools" rules |
| `db/seed.py` | Replace hardcoded numbers with engine-computed numbers |

## Testing Strategy

- Each tax module gets its own test file with known HMRC examples
- 5 synthetic clients from `helio_synthetic_data.md` become integration tests
- Pure Python, zero AI dependency — all tests run instantly with pytest
