# Deterministic AI Observations RFC

**Status:** Future — ideas for improving AI observation accuracy and quality

**Context:** The `save_observation` tool lets Claude persist advisory insights to a client's record during chat. Currently, Claude provides free-form text and an optional `potential_saving` number with no server-side validation. This creates two risks:

1. **Numerical accuracy** — Claude may estimate or miscalculate `potential_saving` figures
2. **Quality control** — Claude may save low-value, redundant, or incorrect observations

This doc outlines three progressive approaches to address both.

---

## Phase 1: Validation Layer (Near-term)

**Goal:** Keep the flexible `save_observation` tool but add server-side checks before persisting.

### Numerical Validation

- Cross-check `potential_saving` against the client's latest tax profile
- Reject values that exceed total income or total tax (obvious outliers)
- Warn on savings > 20% of total tax (flag for review, still save)
- If no tax profile exists, strip `potential_saving` entirely (can't validate)

### Deduplication

- Before saving, check existing observations (both engine and AI) for title similarity
- Use simple substring/keyword matching — if an engine observation already covers the same topic, reject the AI one
- Example: engine already flagged "Pension Contribution Headroom" → reject AI observation titled "Pension Headroom Opportunity"

### Engine Reference Requirement

- Add optional `engine_reference` field to the tool schema
- Instruct Claude to cite which engine output supports the observation (e.g. "Based on compute_tax_position result showing ANI of £108,000")
- Observations with citations get higher trust display in the UI
- Observations without citations get a softer "unverified" indicator

### Confidence Scoring

- Add `confidence` field to the tool (enum: high / medium / low)
- Claude self-rates its confidence in the observation
- Display confidence alongside the AI badge in the frontend
- Track confidence vs adviser actions (dismiss rate) to calibrate over time

### Implementation Notes

- All changes in `execute_save_observation` executor
- Add `engine_reference` and `confidence` columns to Observation model
- Update system prompt with citation instructions
- Frontend: show confidence indicator on AI observations

---

## Phase 2: Hybrid Tool (Mid-term)

**Goal:** Replace free-form number entry with engine-backed calculations for common observation types.

### New Tool: `compute_and_save_observation`

Instead of Claude providing raw numbers, it provides structured parameters and the server computes the figures:

```
Tool input:
{
  "observation_type": "marriage_allowance",
  "params": {
    "client_income": 10000,
    "spouse_is_basic_rate": true
  }
}

Server computes:
- Validates eligibility (income < PA threshold)
- Calculates exact saving: £252/yr
- Generates description from template
- Saves with source="ai", engine_validated=true
```

### Supported Observation Types

Start with a small set that maps cleanly to engine calculations:

| Type | Parameters | Engine Calculation |
|------|-----------|-------------------|
| `marriage_allowance` | client_income, spouse_band | Transfer amount * 20% |
| `pension_sacrifice_to_restore_pa` | current_ani, target_ani | Sacrifice amount * marginal rate |
| `gift_aid_relief` | donation_amount, marginal_rate | Gross-up * (marginal - basic) |
| `hicbc_avoidance` | current_ani, num_children | Sacrifice to < £60k, HICBC saved |
| `cgt_bed_and_isa` | gains, losses | Tax saved by realising gains within AEA |

### Fallback for Unsupported Types

- If Claude identifies an insight that doesn't fit a predefined type, fall back to qualitative-only `save_observation` (no `potential_saving` allowed)
- This preserves Claude's ability to surface novel insights while ensuring all numbers are engine-backed

### Implementation Notes

- New tool definition in claude.py with typed observation enum
- Server-side observation calculators (one function per type)
- Each calculator calls into the existing tax engine modules
- `save_observation` remains available but with `potential_saving` removed

---

## Phase 3: Template + Free-form Split (Long-term)

**Goal:** Full separation of quantitative (deterministic) and qualitative (AI judgment) observations.

### Two Distinct Tools

1. **`save_quantitative_observation`** — template-based, engine-backed
   - Predefined observation types with structured parameters
   - Server computes all numbers deterministically
   - Tagged `source="ai"`, `engine_validated=true`
   - Displayed with full confidence (no "AI" caveat needed for numbers)

2. **`save_qualitative_observation`** — free-form, no numbers
   - Title + description only, no `potential_saving` field
   - For novel insights, planning reminders, deadline warnings
   - Tagged `source="ai"`, `engine_validated=false`
   - Displayed with AI badge and "advisory" indicator

### Quality Feedback Loop

- Track adviser actions on AI observations: dismissed, acknowledged, acted upon
- Build a scoring model: which observation types/topics get the best engagement?
- Feed scores back into the system prompt to guide Claude toward higher-value observations
- Periodic review: auto-archive AI observations that go unacted for 90+ days

### Observation Analytics

- Dashboard for advisers showing AI observation hit rate
- Compare engine vs AI observation engagement metrics
- Surface patterns: "Claude's pension observations are acted on 80% of the time, but CGT observations only 20%"

### Implementation Notes

- Requires observation engagement tracking (new `observation_events` table)
- Analytics aggregation job (daily/weekly)
- System prompt dynamically adjusted based on observation quality scores
- Significant effort — only worthwhile once Phase 1 and 2 have validated the approach

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Progressive phases, not big bang | Each phase delivers value independently; later phases depend on learnings from earlier ones |
| Keep free-form tool available | Claude surfaces insights humans wouldn't think to template; removing it loses value |
| Server-side validation, not prompt-only | Prompts are suggestions; server-side checks are guarantees |
| AI badge always visible | Adviser trust requires transparency about what's engine-verified vs AI-generated |
