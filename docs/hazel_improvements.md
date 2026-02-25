# Hazel — Honest Self-Assessment & Improvement Areas

> Extracted from the original Hazel research. These are the pain points, limitations, and proposed fixes that Hazel itself identified. Reframed for Helio (UK) so we know exactly what to build better.

---

## Table of Contents

1. [Architecture Pain Points](#1-architecture-pain-points)
2. [Honest Limitations](#2-honest-limitations)
3. [Performance Bottlenecks](#3-performance-bottlenecks)
4. [Current vs Ideal (Gap Analysis)](#4-current-vs-ideal)
5. [Priority Fixes (Hazel's Own Ranking)](#5-priority-fixes)
6. [Self-Assessment Scorecard](#6-self-assessment-scorecard)
7. [What This Means for Helio](#7-what-this-means-for-helio)

---

## 1. Architecture Pain Points

Six core weaknesses in Hazel's current architecture.

### 1A. Data Ingestion — Fragile PDF Extraction

```
PROBLEM PIPELINE:

  PDF IN        →   EXTRACT        →   VALIDATE
  (messy)           (fragile)           (manual)

  - No standard     - Regex-based       - No ground truth
    format spec       pattern matching     to compare against
                      breaks often
```

**What goes wrong:**
- Tax returns come in many formats (TurboTax, H&R Block, CPA-prepared, scanned images)
- Scanned/image PDFs have no selectable text at all
- Handwritten annotations get ignored or misread
- Multi-column layouts confuse text extraction
- Different state returns have non-standard formats

**Impact:** Hazel may miss data or extract incorrectly — the entire analysis can be built on wrong numbers.

**Hazel's proposed fix:**
- Direct integration with tax software APIs (structured, reliable)
- Government transcript APIs provide ground truth comparison
- Structured manual entry form with real-time validation as fallback

---

### 1B. Tax Knowledge — Web Search Every Time

```
PROBLEM:

  Every rate lookup  →  Web search  →  Parse results  →  Hope it's current

  - Slow (network latency on every calculation)
  - May get outdated or incorrect info from web
  - No offline capability
  - Recalculating known formulas from scratch every time
```

**What goes wrong:**
- Web search for tax rates adds 2-5 seconds per lookup
- Search results may return prior year rates
- No structured data — has to parse HTML/text from web results
- Edge cases and special situations often missed entirely

**Hazel's proposed fix:**
- Pre-loaded, versioned tax knowledge base
- Complete rate database with calculation engines
- Comprehensive rules library with automatic triggers for edge cases
- Background refresh for rate changes

---

### 1C. No Real-Time Data

```
PROBLEM:

  Hazel can only see what you give it.

  ❌ No visibility into investment holdings or unrealised gains
  ❌ Can't see account balances (IRA, Roth, taxable, ISA, SIPP)
  ❌ Can't see YTD income or projected year-end
  ❌ No access to employer data (vesting schedules, bonus projections)
```

**Impact:** Can't do proper gains harvesting, conversion planning, or proactive alerts without manual data entry.

**Hazel's proposed fix:**
- Real-time brokerage/platform integrations
- Unified holdings view with lot-level cost basis
- Live account balance feeds
- YTD payroll data for current-year projections

---

### 1D. Single Dashboard Output

```
PROBLEM:

  One tool: generate_dashboard
  One output type: interactive dashboard
  One audience: the adviser

  ❌ No client-ready reports
  ❌ No PDF export
  ❌ No CPA/accountant memo
  ❌ No presentation/slide deck
  ❌ No actionable checklist
  ❌ Static output — iteration requires full regeneration
```

**Hazel's proposed fix:**
- Multiple artifact types: dashboard, report, memo, checklist, presentation, letter
- Interactive widgets (sliders for "what if" scenarios)
- Export to PDF/Excel
- Share link for client review

---

### 1E. No Memory Between Sessions

```
PROBLEM:

  Every conversation starts from scratch.

  ❌ No persistent client profiles
  ❌ No tracking of past recommendations
  ❌ No year-over-year comparison
  ❌ No proactive alerts ("Client X approaching threshold")
  ❌ Reactive only — adviser must ask, Hazel doesn't volunteer
```

**Impact:** Context is lost. Adviser has to re-explain the client's situation every time. Can't build on prior analysis.

**Hazel's proposed fix:**
- Persistent client profile database (tax history, goals, constraints, preferences)
- Action tracking (what was recommended, what was implemented, outcomes)
- Proactive monitoring and alerts
- Year-over-year trend analysis

---

### 1F. Calculation Limitations

```
PROBLEM:

  ❌ Single-year analysis only — can't project multi-year
  ❌ One scenario at a time — no side-by-side comparison
  ❌ No Monte Carlo / probability analysis
  ❌ Can miss interactions between different tax systems
  ❌ No optimisation engine ("find the best strategy for this goal")
```

**Hazel's proposed fix:**
- Multi-year projection engine with inflation adjustment
- Monte Carlo sensitivity analysis
- Optimisation engine: "minimise lifetime tax" → optimal conversion schedule
- Holistic calculation that captures all interactions

---

## 2. Honest Limitations

Hazel's candid self-assessment of where it struggles.

### Limitation 1: PDF Extraction Reliability

| Issue | Detail |
|-------|--------|
| Scanned PDFs | No selectable text — extraction fails completely |
| Format variation | Different software outputs render differently |
| Handwriting | Annotations are invisible to extraction |
| Multi-column | Text extraction can jumble column order |
| Poor scan quality | OCR produces garbage |

**Mitigation used:** Flag confidence levels, ask adviser to verify critical numbers, cross-validate where possible.

---

### Limitation 2: Ambiguous Data

| Issue | Detail |
|-------|--------|
| Numbers without context | Is this £50,000 a gain or a loss? |
| Income categorisation | Are these dividends within allowance or taxable? |
| Attribution | Which spouse does this P60 belong to? |
| Schedule interpretation | Is Schedule E showing profit or loss? |

**Mitigation used:** Show extraction for verification, flag uncertainty, cross-validate.

---

### Limitation 3: Forward-Looking Data

| Issue | Detail |
|-------|--------|
| YTD income | Not on prior year return |
| Expected bonuses/vesting | Not visible to Hazel |
| Planned asset sales | Adviser must volunteer this |
| Life events | Marriage, death, birth, divorce change everything |
| Employment changes | New job, redundancy, retirement |

**Mitigation used:** Ask about changes, note analysis is based on prior year, build in explicit assumptions.

---

### Limitation 4: Edge Cases

Complex situations where Hazel may oversimplify:

- Foreign income / overseas assets
- Stock options (ISO vs NSO, AMT interaction)
- Net Operating Losses
- Passive Activity Loss rules
- Trusts and estates
- Complex business structures (partnerships, LLPs)
- Non-domicile tax status

**Mitigation used:** Flag indicators of complexity, recommend specialist review, never pretend expertise.

---

## 3. Performance Bottlenecks

| Bottleneck | Current Speed | Cause | Proposed Solution |
|-----------|---------------|-------|-------------------|
| PDF extraction | Slow | Sequential page processing | Parallel processing, pre-trained form recogniser, or skip PDF entirely via API |
| Tax rate lookups | 2-5s per lookup | Web search + parsing | Pre-loaded database, cached with versioning |
| Recalculation | Slow | Full recalc from scratch on any change | Incremental calculation engine, dependency graph, memoisation |
| CRM data fetching | Slow | Sequential tool calls | Parallel fetching, pre-fetched client profiles, smart caching |
| Dashboard regeneration | 20-30s per iteration | Full regeneration each time | Incremental updates, WebSocket real-time binding, client-side calculation for sliders |

### Speed Targets

```
Current full analysis:        60-90 seconds
Target with improvements:     10-15 seconds

Current iteration:            20-30 seconds
Target with improvements:     1-2 seconds (real-time)
```

---

## 4. Current vs Ideal

| Component | Current (Hazel) | Ideal |
|-----------|----------------|-------|
| Data Ingestion | PDF regex extraction | API integration + structured fallback |
| Tax Knowledge | Web search each time | Pre-loaded versioned database |
| Holdings Data | Manual input | Real-time platform integration |
| Account Balances | Not available | Live feeds |
| Calculations | Single-year, manual | Multi-year optimisation engine |
| Scenarios | One at a time | Monte Carlo + sensitivity + side-by-side |
| Artifacts | Dashboard only | Full suite (reports, memos, checklists, decks) |
| Client Memory | None (session only) | Persistent profiles + history |
| Alerting | Reactive only | Proactive monitoring |
| Speed | 60-90 sec full, 20-30 sec iterate | 10-15 sec full, 1-2 sec real-time iterate |

---

## 5. Priority Fixes

Hazel's own ranking of what would have the most impact:

| Priority | Fix | Impact |
|----------|-----|--------|
| **1** | Tax software / API integration | Eliminates extraction errors, 10x faster ingestion |
| **2** | Pre-loaded tax knowledge base | Instant, accurate rates; works offline |
| **3** | Platform data integration | Enables proper gains harvesting, shows full picture |
| **4** | Multi-year projection engine | Dramatically better pension/retirement planning |
| **5** | Persistent client profiles | Context carries forward, enables proactive alerts |

---

## 6. Self-Assessment Scorecard

Hazel's self-rated capabilities (US context, but the pattern applies to UK):

| Capability | Rating | Notes |
|-----------|--------|-------|
| Bracket analysis | 5/5 | Very strong |
| Conversion / contribution modelling | 5/5 | Very strong |
| Threshold planning (IRMAA → PA taper) | 5/5 | Very strong |
| Capital gains optimisation | 4/5 | Strong, but needs basis data |
| Deduction / allowance analysis | 4/5 | Strong |
| PDF extraction reliability | 3/5 | Moderate — format dependent |
| Regional tax analysis (State → Scottish) | 3/5 | Moderate — complexity varies |
| Business / complex structures | 2/5 | Limited |
| Alternative tax (AMT → complex NI) | 2/5 | Limited |
| International / cross-border | 1/5 | Minimal |

### What Hazel is genuinely good at:

- **Pattern recognition** — spotting optimisation opportunities across multiple dimensions simultaneously
- **Scenario modelling** — quickly calculating "what if" scenarios
- **Cross-referencing** — connecting tax data with CRM context to personalise recommendations
- **Calculation accuracy** — maths is reliable once data is clean
- **Threshold optimisation** — finding the exact amount to fill a band, avoid a cliff, or restore an allowance
- **Explaining complexity** — breaking down why a strategy works in plain language

---

## 7. What This Means for Helio

Translating Hazel's lessons into Helio's build priorities.

### Pain points we're already addressing in the plan:

| Hazel Problem | Helio Solution | Plan Task |
|--------------|----------------|-----------|
| Fragile PDF extraction | AI-powered extraction with confidence scores | Milestone 6 (6.3) |
| Web search for rates every time | Pre-loaded tax reference baked into system prompt | Task 2.4 |
| Single dashboard output | Multiple dashboard cards, PDF export | Milestones 4 + 9.5 |
| No memory between sessions | PostgreSQL persistence, client profiles | Milestone 7 |
| No real-time platform data | Browser extension captures platform data | Milestone 8 |
| Slow iteration | Deterministic tax engine (server-side, instant) + incremental dashboard updates | Milestone 3 |
| Reactive only | Year-end checklist, allowance expiry alerts | Task 10.2 |
| One scenario at a time | Multi-scenario comparison | Task 10.3 |

### Pain points we should add to the plan:

| Hazel Problem | What Helio Should Do | Priority |
|--------------|---------------------|----------|
| No confidence scoring on extracted data | Show confidence badges (high/medium/low) on each extracted field | HIGH — add to 6.3 |
| No cross-validation | Validate extracted numbers against each other (e.g., does tax paid match the band calculation?) | HIGH — add to Milestone 3 |
| Ambiguous data attribution | Ask clarifying questions when extraction is uncertain (spouse attribution, gain vs loss) | MEDIUM — add to 5.4 |
| Edge case detection | Flag indicators of complexity (foreign income, trusts, LLP structures) and recommend specialist review | MEDIUM — add to system prompt |
| No multi-year analysis | Multi-year projection for pension drawdown, ISA growth, IHT planning | FUTURE — post-MVP |
| No Monte Carlo | Sensitivity analysis for retirement planning scenarios | FUTURE — post-MVP |

### Key design principle from Hazel's experience:

> **"I'm a planning aid, not a preparer."**
>
> Helio should always:
> - Show its working (not just results)
> - Flag confidence levels
> - Ask clarifying questions when uncertain
> - Recommend professional review for complex situations
> - Never pretend expertise it doesn't have

---

## Appendix: Hazel's Tips for Working With It Effectively

These translate directly to Helio UX guidance:

### Do this (design the UX to encourage):

- Upload clean, text-based PDFs (show a format guide)
- Provide residence (England/Scotland/Wales/NI) up front
- Share ages (critical for pension planning, HICBC)
- Mention life changes since last tax year
- Give context ("they want to retire at 57", "they're buying a house")
- Ask to see the working (build a "show calculation" toggle)
- Request confidence levels (show them by default)

### Avoid this (design the UX to prevent):

- Assuming extraction was correct (always show extracted data for review)
- Relying on Scottish/regional analysis without verification (flag it)
- Expecting real-time data without the extension (make extension value clear)
- Skipping clarifying questions (make them part of the flow, not optional)
- Using output without professional review for complex cases (add disclaimer)
