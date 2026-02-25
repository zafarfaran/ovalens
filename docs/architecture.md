# UK Helio — System Architecture & Integrations

> How to build UK Helio: system overview, data flow, data ingestion, calculation engine, dashboard artifacts, and what needs building.

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Data Flow Diagram](#data-flow-diagram)
3. [Intelligent Ingestion Layer](#intelligent-ingestion-layer)
4. [Data Ingestion — Integrations](#data-ingestion--integrations)
5. [Calculation Engine](#calculation-engine)
6. [Dashboard Artifacts](#dashboard-artifacts)
7. [Architecture Summary](#architecture-summary)

---

## System Architecture Overview

How UK Helio works end-to-end — from data sources through to the interactive dashboard.

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                  UK Helio SYSTEM                                     │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │   Emails    │    │  Contacts   │    │ Households  │    │    Notes    │          │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘          │
│         │                  │                  │                  │                  │
│  ┌──────┴──────┐    ┌──────┴──────┐    ┌──────┴──────┐    ┌──────┴──────┐          │
│  │  Meetings   │    │ Transcripts │    │   Adviser   │    │  Platform   │          │
│  └──────┬──────┘    └──────┬──────┘    │    Info     │    │    Data     │          │
│         │                  │           └──────┬──────┘    └──────┬──────┘          │
│         │                  │                  │                  │                  │
│         └──────────────────┴────────┬─────────┴──────────────────┘                  │
│                                     │                                                │
│                                     ▼                                                │
│                        ┌────────────────────────┐                                    │
│                        │    Helio API LAYER     │                                    │
│                        │  (Async Python Tools)  │                                    │
│                        └───────────┬────────────┘                                    │
│                                    │                                                 │
└────────────────────────────────────┼─────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                           LLM — ORCHESTRATION LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│   ┌─────────────────────────────────────────────────────────────────────────────┐   │
│   │                           TOOL EXECUTION LAYER                               │   │
│   │                                                                              │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │   │
│   │  │    code_    │  │    text_    │  │    bash_    │  │    web_     │        │   │
│   │  │  execution  │  │   editor    │  │  execution  │  │   search    │        │   │
│   │  │  (Python)   │  │  (Files)    │  │  (Shell)    │  │ (Internet)  │        │   │
│   │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │   │
│   │         │                │                │                │                │   │
│   │         └────────────────┴────────┬───────┴────────────────┘                │   │
│   │                                   │                                          │   │
│   └───────────────────────────────────┼──────────────────────────────────────────┘   │
│                                       │                                              │
│   ┌───────────────────────────────────┼──────────────────────────────────────────┐   │
│   │                        UK PROCESSING PIPELINE                                 │   │
│   │                                   │                                           │   │
│   │    ┌──────────────────────────────┼───────────────────────────────────┐      │   │
│   │    │                              ▼                                   │      │   │
│   │    │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐│      │   │
│   │    │  │  Input  │─▶│ Extract │─▶│Validate │─▶│ Enrich  │─▶│Analyse ││      │   │
│   │    │  │(SA/P60) │  │  Data   │  │  Data   │  │  Data   │  │  Data  ││      │   │
│   │    │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └───┬────┘│      │   │
│   │    │                                                          │      │      │   │
│   │    └──────────────────────────────────────────────────────────┼──────┘      │   │
│   │                                                               │              │   │
│   └───────────────────────────────────────────────────────────────┼──────────────┘   │
│                                                                   │                  │
│                                                                   ▼                  │
│                                                    ┌─────────────────────────┐       │
│                                                    │   generate_dashboard    │       │
│                                                    │   (UK Tax Artifact)     │       │
│                                                    └────────────┬────────────┘       │
│                                                                 │                    │
└─────────────────────────────────────────────────────────────────┼────────────────────┘
                                                                  │
                                                                  ▼
                                                   ┌─────────────────────────┐
                                                   │   INTERACTIVE DASHBOARD  │
                                                   │     (Side Panel UI)      │
                                                   └─────────────────────────┘
```

---

## Data Flow Diagram

Step-by-step flow from document input to dashboard output.

```
┌──────────────────────────────────────┐
│  UK Tax Documents                    │
│  (SA100, P60, P11D, platform data)   │
└────────────────┬─────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  code_execution                      │
│  - PyMuPDF extraction                │
│  - Pattern matching (SA100 lines)    │
│  - HMRC form recognition             │
└────────────────┬─────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  Data Validation                     │
│  - ANI = Income - Pension - Gift Aid │
│  - Tax = sum of band calculations    │
│  - NI = Class 1/2/4 cross-check     │
│  - Flag confidence levels            │
└────────────────┬─────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  web_search                          │
│  - Current UK tax bands              │
│  - Scottish rates (if applicable)    │
│  - Pension AA / ISA limits           │
│  - HICBC thresholds                  │
│  - NI rates and thresholds           │
└────────────────┬─────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  UK Analysis Engine                  │
│  - PA taper zone detection           │
│  - HICBC calculation                 │
│  - Pension AA + carry forward        │
│  - Salary sacrifice modelling        │
│  - Bed & ISA opportunities           │
│  - Marginal rate analysis            │
│  - Scottish comparison (if needed)   │
└────────────────┬─────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  generate_dashboard                  │
│  - mode: "reset" | "iterate"         │
│  - relevantTaxData: { UK schema }    │
└────────────────┬─────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  Interactive UK Tax Dashboard        │
│  (rendered in side panel)            │
└──────────────────────────────────────┘
```

### Iteration Flow

```
USER ACTION                              UK Helio RESPONSE
───────────────────────────────────────────────────────────────────────

"Analyse this tax return"         ──▶    1. Receive SA100/P60
        │                                2. Extract data (code_execution)
        │                                3. Validate extractions
        │                                4. Ask: Scotland? Children? Pension?
        ▼
"England, 2 kids, salary         ──▶    5. Note context
 sacrifice available"                    6. Search current UK rates (web_search)
        │                                7. Calculate ANI, check PA taper
        │                                8. Generate dashboard
        ▼
[Dashboard Displayed]             ◀──    "I've analysed the return. James has
        │                                 lost his entire Personal Allowance.
        │                                 A pension contribution could save £18k."
        ▼
"What if he salary               ──▶    9. Model salary sacrifice scenario
 sacrifices £50K?"                      10. Calculate new ANI, PA restoration
        │                               11. Calculate NI saving, HICBC impact
        │                               12. Iterate dashboard
        ▼
[Dashboard Updated]               ◀──    "I've added that scenario. £50K sacrifice
        │                                 restores full PA, eliminates HICBC.
        │                                 Total benefit: £24,024."
        ▼
"Check our notes for any         ──▶   13. Search CRM (getNotesTool)
 retirement or pension plans"          14. Search meetings (getMeetingsTool)
        │                              15. Get transcript if relevant
        │                              16. Incorporate into analysis
        ▼
[Context Added]                   ◀──    "Found notes from March meeting — they
                                          discussed maximising pension before
                                          age 57 access change in 2028."
```

---

## Intelligent Ingestion Layer

The ideal data ingestion architecture for UK Helio, replacing fragile PDF extraction.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     INTELLIGENT UK INGESTION LAYER                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│                           ┌─────────────────┐                               │
│                           │  INTAKE ROUTER  │                               │
│                           └────────┬────────┘                               │
│                                    │                                         │
│         ┌──────────────────────────┼──────────────────────────┐             │
│         │                          │                          │             │
│         ▼                          ▼                          ▼             │
│  ┌─────────────┐           ┌─────────────┐           ┌─────────────┐       │
│  │  ACCOUNTING │           │    HMRC     │           │   MANUAL    │       │
│  │  SOFTWARE   │           │    APIs     │           │    ENTRY    │       │
│  │             │           │             │           │             │       │
│  │ • Xero      │           │ • Self      │           │  Structured │       │
│  │ • QuickBooks│           │   Assessment│           │  form with  │       │
│  │ • FreeAgent │           │ • PAYE API  │           │  validation │       │
│  │ • Sage      │           │ • NI Record │           │             │       │
│  └──────┬──────┘           └──────┬──────┘           └──────┬──────┘       │
│         │                          │                          │             │
│         └──────────────────────────┼──────────────────────────┘             │
│                                    │                                         │
│                                    ▼                                         │
│                        ┌─────────────────────┐                              │
│                        │  CANONICAL UK TAX   │                              │
│                        │  DATA STRUCTURE     │                              │
│                        │                     │                              │
│                        │  • Typed fields     │                              │
│                        │  • UK tax year      │                              │
│                        │  • Validation rules │                              │
│                        │  • Source tracking  │                              │
│                        │  • Confidence scores│                              │
│                        └─────────────────────┘                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

WHAT THIS FIXES:
───────────────────────────────────────────────────────────────────────────────
❌ Current: Regex extraction from arbitrary PDFs (fragile, error-prone)
✅ New: Direct integration with HMRC APIs and UK accounting software

❌ Current: No way to verify extraction accuracy
✅ New: HMRC PAYE/SA API provides ground truth comparison

❌ Current: Manual re-entry when extraction fails
✅ New: Structured form with real-time validation as fallback
```

### Current vs Ideal Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CURRENT ARCHITECTURE PAIN POINTS                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │  SA100/P60  │────▶│   EXTRACT   │────▶│  VALIDATE   │                   │
│  │  PDF IN     │     │  (fragile)  │     │  (manual)   │                   │
│  │  (messy)    │     │             │     │             │                   │
│  └─────────────┘     └─────────────┘     └─────────────┘                   │
│        │                   │                   │                            │
│        ▼                   ▼                   ▼                            │
│   No standard         Regex-based         No ground                        │
│   SA format           pattern matching    truth to                         │
│                       breaks often        compare                          │
│                                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │  WEB SEARCH │────▶│  CALCULATE  │────▶│  DASHBOARD  │                   │
│  │  (slow)     │     │ (redundant) │     │  (limited)  │                   │
│  └─────────────┘     └─────────────┘     └─────────────┘                   │
│        │                   │                   │                            │
│        ▼                   ▼                   ▼                            │
│   UK rates should    Recalculating       Single artifact                   │
│   be cached/         PA taper, NI,       type only                         │
│   pre-loaded         HICBC every time                                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Speed Targets

```
ESTIMATED SPEED IMPROVEMENTS:
───────────────────────────────────────────────────────────────────────────────
Current full analysis:        60-90 seconds
With improvements:            10-15 seconds

Current iteration:            20-30 seconds
With improvements:            1-2 seconds (real-time)
```

---

## Data Ingestion — Integrations

### HMRC Integrations

| API | Data Provided |
|-----|---------------|
| Self Assessment API | Complete tax return data (SA100 + supplementary pages) |
| PAYE API | Employment income, tax paid (real-time, not just year-end) |
| NI Record API | NI contributions history, state pension forecast |
| Tax Account API | Liabilities, payments, refunds |

### UK Investment Platform Integrations

| Platform | Data |
|----------|------|
| Hargreaves Lansdown | ISA, SIPP, GIA holdings |
| AJ Bell Youinvest | ISA, SIPP, GIA holdings |
| Interactive Investor | ISA, SIPP, GIA holdings |
| Vanguard UK | ISA, SIPP holdings |
| Fidelity UK | ISA, SIPP holdings |

**Unified Investment View:**
- ISA holdings & history
- SIPP holdings
- GIA with cost basis
- Dividend income tracking
- Unrealised gains

### UK Pension Provider Integrations

Standard Life, Aviva, Legal & General, Scottish Widows

**Pension Consolidation View:**
- Workplace pensions
- Old employer schemes
- SIPPs
- DB scheme valuations
- Annual Allowance tracking

### UK Payroll / Accounting Software

| Software | Data |
|----------|------|
| Xero | Trading income, expenses, VAT, corporation tax |
| QuickBooks | Trading income, expenses |
| FreeAgent | Trading income, expenses |
| Sage | Trading income, expenses, payroll |

**Business / Self-Employment View:**
- Trading income
- Expenses & deductions
- VAT position
- Corporation Tax
- Director's loan account

---

## Calculation Engine

### Income Tax Calculator

**Process:**

1. **Calculate Adjusted Net Income**
   - Gross income - pension contributions - Gift Aid

2. **Determine Personal Allowance**
   - Apply taper if ANI > £100,000

3. **Calculate Taxable Income**
   - ANI - Personal Allowance

4. **Apply Income Ordering Rules**
   - a) Non-savings income (employment, rental, pension)
   - b) Savings income (interest)
   - c) Dividend income

5. **Calculate Tax by Band**
   - Non-savings: 20% / 40% / 45% (or Scottish rates)
   - Savings: 0% (PSA) / 20% / 40% / 45%
   - Dividends: 0% (allowance) / 8.75% / 33.75% / 39.35%

6. **Apply Gift Aid Extension**
   - Extends basic rate band

7. **Calculate National Insurance**
   - Class 1 / Class 2 / Class 4 as applicable

8. **Apply HICBC if applicable**

### Marginal Rate Analyser

Critical for UK planning — marginal rates are NOT straightforward!

| Income Level | Effective Marginal Rate |
|-------------|------------------------|
| £0 - £12,570 | 0% (Personal Allowance) |
| £12,571 - £50,270 | 20% IT + 8% NI = **28%** |
| £50,271 - £60,000 | 40% IT + 2% NI = **42%** |
| £60,000 - £80,000 | 42% + HICBC clawback = up to **52%** |
| £80,001 - £100,000 | 40% IT + 2% NI = **42%** |
| £100,001 - £125,140 | 40% IT + 2% NI + 20% PA loss = **62%** |
| £125,141+ | 45% IT + 2% NI = **47%** |

Scottish taxpayers have different rates.

### CGT Calculator

**Process:**
1. Calculate gain per asset
2. Net gains vs losses (current year, then brought forward)
3. Deduct Annual Exempt Amount (£3,000)
4. Check for reliefs (BADR, Investors' Relief, Rollover, etc.)
5. Determine rate based on income + gain position
6. Apply residential property surcharge if applicable

### Pension Optimiser

**Calculates:**
- Available Annual Allowance (inc. carry forward)
- Tapered AA if high earner
- Optimal contribution to restore Personal Allowance
- Optimal contribution to avoid HICBC
- Employer vs personal contribution efficiency
- Salary sacrifice benefit analysis

**Outputs scenario comparison:**
- Take as salary (net after tax/NI)
- Personal pension contribution (tax relief)
- Salary sacrifice (NI savings too)

### IHT Estimator

**Inputs:**
- Asset values (property, investments, cash, etc.)
- Liabilities (mortgages, loans)
- Gifts in last 7 years
- Spouse/civil partner status
- Business/agricultural assets
- Life insurance (in/out of trust)

**Calculates:**
- Net estate value
- Available NRB (£325k + transferred from spouse)
- Available RNRB (£175k if qualifying)
- BPR/APR reliefs
- Potential IHT liability
- 7-year PET taper relief

---

## Dashboard Artifacts

### `generate_uk_tax_summary`

Shows:
- Income by source (employment, self-employment, dividends, etc.)
- Tax bands utilisation (visual bar chart)
- Personal Allowance status (full / tapered / lost)
- Effective vs marginal rates
- NI contributions breakdown
- Scotland vs rUK comparison (if applicable)

### `generate_allowances_tracker`

Shows:
- ISA allowance: used vs remaining
- Pension AA: used vs remaining (inc. carry forward)
- CGT annual exempt: used vs remaining
- Dividend allowance: used
- Savings allowance: used
- IHT annual exemptions: used

**Visual:** Traffic light system (green/amber/red)
- Green: plenty of allowance remaining
- Amber: partially used, action may be needed
- Red: fully used or about to be lost

### `generate_pension_planner`

Shows:
- Current pension values (all schemes consolidated)
- Annual Allowance position (current year + carry forward)
- Tapered AA calculation (if high earner)
- Optimal contribution calculator
- Tax relief breakdown (basic auto + higher rate claim)
- Salary sacrifice benefit analysis
- Projected fund at retirement (with assumptions)
- PCLS (tax-free lump sum) projection

### `generate_isa_optimiser`

Shows:
- Current ISA holdings by type
- Bed & ISA opportunities (GIA holdings with gains < £3k)
- Projected tax savings from ISA vs GIA
- LISA vs S&S ISA decision support
- Historical ISA contributions by year

### `generate_cgt_planner`

Shows:
- Unrealised gains by holding
- Annual exempt amount remaining
- Optimal disposals to use AEA
- Loss harvesting opportunities
- Spouse transfer opportunities
- CGT rate based on total income
- BADR / Investors' Relief eligibility

### `generate_iht_snapshot`

Shows:
- Estate value breakdown (property, investments, other)
- Available nil rate bands (NRB + RNRB)
- Projected IHT liability
- Impact of gifts / PETs
- BPR / APR eligible assets
- Life insurance coverage analysis
- Opportunities (gifting, trusts, insurance)

### `generate_director_remuneration`

Shows:
- Optimal salary vs dividend split
- Corporation Tax impact
- Personal tax comparison
- NI savings analysis
- Pension contribution via company
- Director's loan account position

### `generate_tax_year_end_checklist`

Shows (before 5 April):
- ISA allowance remaining → action: top up
- Pension AA remaining → action: contribute
- CGT AEA remaining → action: crystallise gains
- Gift allowances → action: make gifts
- Dividend timing → action: defer if hitting threshold
- Personal Allowance taper → action: pension contribution
- HICBC impact → action: salary sacrifice

---

## Architecture Summary

### What Needs Building

| Component | Requirement |
|-----------|-------------|
| Tax Knowledge Base | UK rates, bands, allowances, NI classes |
| Calculation Engine | Income ordering, PA taper, HICBC, Scottish rates |
| Data Integrations | HMRC APIs, UK platforms (HL, AJ Bell, etc.), UK payroll (Xero, Sage) |
| Planning Logic | PA taper, pension AA, ISA optimisation, IHT |
| Dashboards | Allowance tracker, pension planner, IHT snapshot, director remuneration |
| Calendar | Tax year 6 April - 5 April, UK deadlines |
| Rates Database | England/Wales/NI vs Scotland distinction |
| Web Search | UK sources (gov.uk, HMRC, FCA) |

### UK-Specific Tools Summary

| Tool | Purpose |
|------|---------|
| `generate_dashboard` | UK schema: ANI, PA taper, NI classes, allowances tracker, Scottish comparison |
| `calculateANI` | 60% trap detection |
| `calculateHICBC` | Child Benefit clawback |
| `calculatePensionAA` | AA with carry forward |
| `calculateScottishComparison` | Scottish vs rUK rates |
| `calculateSalarySacrifice` | Key UK planning tool |
| `calculateBedAndISA` | CGT AEA harvesting |
| `getContactsTool` | NI Number, UTR, UK residence |

### Ideal UK Helio Features

| Feature | Description |
|---------|-------------|
| HMRC Integration | Real-time PAYE data, Self Assessment history |
| Platform Links | Hargreaves Lansdown, AJ Bell, Interactive Investor, etc. |
| Pension Aggregation | Workplace + old schemes + SIPPs consolidated |
| Scottish Detection | Automatic rate switching based on residence |
| PA Taper Alerts | Proactive warning when approaching £100k |
| HICBC Calculator | Integrated with pension optimisation |
| Tax Year Countdown | Automatic allowance expiry tracking |
| IHT Estimator | Estate planning with gift tracking |

### The Core Design Principle

**UK Helio asks:** "Is their Adjusted Net Income near £100k? Should we increase pension contributions to restore the Personal Allowance?"

This is the equivalent of the US tool asking about IRMAA thresholds — it's the single most impactful planning lever for most UK higher earners.
