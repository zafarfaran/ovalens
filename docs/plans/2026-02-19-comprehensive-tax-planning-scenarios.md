# Helio: Comprehensive Tax Planning Scenarios Research

**Date:** 2026-02-19
**Purpose:** Exhaustive inventory of every tax planning scenario Helio needs to model for production, with phased roadmap
**Scope:** Deep personal tax now, full landscape mapped for future phases

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [PHASE 1 — Personal Income Tax](#2-phase-1--personal-income-tax)
3. [PHASE 2 — Pensions & Retirement](#3-phase-2--pensions--retirement)
4. [PHASE 3 — Capital Gains Tax](#4-phase-3--capital-gains-tax)
5. [PHASE 4 — Property Taxation](#5-phase-4--property-taxation)
6. [PHASE 5 — Inheritance Tax & Estate Planning](#6-phase-5--inheritance-tax--estate-planning)
7. [PHASE 6 — Business & Corporate Tax](#7-phase-6--business--corporate-tax)
8. [PHASE 7 — Cross-Border & International](#8-phase-7--cross-border--international)
9. [PHASE 8 — Compliance, Anti-Avoidance & Regulatory](#9-phase-8--compliance-anti-avoidance--regulatory)
10. [PHASE 9 — Production Readiness](#10-phase-9--production-readiness)
11. [Priority Matrix & Phased Roadmap](#11-priority-matrix--phased-roadmap)
12. [Data Model Extensions Required](#12-data-model-extensions-required)
13. [Constants Corrections & Additions](#13-constants-corrections--additions)

---

## 1. Current State Assessment

### What Helio Has Today

| Module | File | Status |
|--------|------|--------|
| Full tax position computation | `tax/engine.py` | COMPLETE |
| ANI / PA taper (60% trap) | `tax/ani.py` | COMPLETE |
| Income tax (England/Wales/NI + Scotland, income ordering) | `tax/income_tax.py` | COMPLETE |
| Savings income with PSA | `tax/income_tax.py` | COMPLETE |
| Dividend income with dividend allowance | `tax/income_tax.py` | COMPLETE |
| National Insurance (Class 1, 2, 4) | `tax/national_insurance.py` | COMPLETE |
| HICBC | `tax/hicbc.py` | COMPLETE |
| Pension Annual Allowance (standard, taper, carry forward, MPAA) | `tax/pension_aa.py` | COMPLETE |
| Salary sacrifice analysis | `tax/salary_sacrifice.py` | COMPLETE |
| Personal pension contribution analysis | `tax/personal_pension.py` | COMPLETE |
| Gift Aid band extension & higher rate relief | `tax/ani.py`, `tax/income_tax.py` | COMPLETE |
| Observations engine (10 rules) | `tax/observations.py` | COMPLETE |
| HMRC rounding rules | `tax/rounding.py` | COMPLETE |
| Marriage Allowance | `tax/marriage_allowance.py` | STUB |
| Bed & ISA analysis | `tax/bed_and_isa.py` | STUB |
| Student loan repayment | `tax/student_loan.py` | STUB |
| Spousal income transfer | Design doc exists | NOT BUILT |

### Known Constants Issues

| Constant | Current Value | Correct 2025/26 Value | File |
|----------|--------------|----------------------|------|
| `blind_persons` | 3,070 | **3,130** | `tax/constants.py` |
| `badr_rate` | 0.10 | **0.14** (from 6 April 2025) | `tax/constants.py` |
| `investors_relief_limit` | 10,000,000 | **1,000,000** (from 30 Oct 2024) | `tax/constants.py` |
| NI Class 2 weekly rate | 3.45 | **3.50** | `tax/constants.py` |

---

## 2. PHASE 1 — Personal Income Tax

### 2.1 Marriage Allowance Transfer

**Priority: P0 — Quick Win (stub exists)**

Transfer of £1,260 PA from non-taxpayer spouse to basic rate taxpayer spouse. Max saving: £252/year. Can be backdated 4 years.

**Key thresholds (2025/26):**
- Transferable amount: £1,260
- Transferor must earn < £12,570
- Recipient must be basic rate taxpayer (< £50,270 taxable, or < £43,662 Scottish)
- Saving: £1,260 x 20% = £252

**Data inputs:** Both spouses' incomes, marital status, whether born after 5 April 1935, recipient's region

**Modelling logic:**
1. Confirm transferor income ≤ £12,570
2. Confirm recipient taxable income ≤ basic rate limit
3. Warning if transferor income between £11,310-£12,570 (could create tax liability — transfer is all-or-nothing)
4. Calculate backdating value (up to 4 years x £252 = £1,008)

**Edge cases:** Part-year entitlement (marriage mid-year), Scottish recipients (still 20% UK rate), transferor might get a job mid-year

---

### 2.2 Student Loan Repayments

**Priority: P0 — Quick Win (stub exists)**

| Plan | Rate | Threshold (2025/26) |
|------|------|-------------------|
| Plan 1 (pre-2012) | 9% | £26,065 |
| Plan 2 (post-2012) | 9% | £28,470 |
| Plan 4 (Scotland) | 9% | £32,745 |
| Plan 5 (post-2023) | 9% | £25,000 |
| Postgraduate | 6% | £21,000 |

**Critical insight:** Combined marginal rates can exceed 70% when student loans stack with HICBC and PA taper. Someone earning £105k with Plan 2 + postgrad + 2 children faces: 40% IT + 2% NI + 9% student loan + 6% postgrad + effective HICBC rate = **~62%+ marginal rate**.

**Data inputs:** Loan plan type(s), gross income, outstanding balance (for voluntary repayment analysis)

**Modelling logic:**
1. Repayment = (income - threshold) x rate per plan
2. Multiple plans apply simultaneously
3. Salary sacrifice reduces income used for student loan calculation
4. Voluntary repayment vs investing analysis: will borrower repay in full before write-off?

---

### 2.3 Starting Rate for Savings Band

**Priority: P1 — Gap in Engine**

Up to £5,000 of savings income taxed at 0% if non-savings income < £17,570. Band reduced £1-for-£1 by non-savings income above PA.

**Current state:** Constants exist (`starting_rate_band: 5_000`, `starting_rate: 0.0`) but NOT wired into `income_tax.py`. The `_tax_savings_through_bands` function lacks this step.

**Data inputs:** Non-savings income, savings income

**Modelling logic:**
1. Starting rate band available = max(0, £5,000 - non-savings taxable income)
2. Apply 0% to savings income within available band
3. PSA applies ON TOP of starting rate band

**Who benefits:** Retirees with low pension income + significant savings; anyone with non-savings income below £17,570

---

### 2.4 Blind Person's Allowance

**Priority: P2 — Niche but Easy**

Additional £3,130 allowance for registered severely sight impaired. Stacks on PA. Transferable to spouse if unused.

**Key point:** BPA is deducted AFTER PA taper — taper applies to standard PA, then BPA is added back.

**Data inputs:** Registration status, income, spouse income

---

### 2.5 Salary/Dividend Optimiser for Company Directors

**Priority: P0 — Highest Impact Missing Feature**

The single most common question UK advisers face. Model the interplay between salary, dividends, employer pension contributions, and corporation tax simultaneously.

**Key thresholds (2025/26):**
- Optimal salary candidates: £5,000 (employer NI ST), £12,570 (PA), £50,270 (basic rate ceiling)
- Employer NI: 15% above £5,000 (secondary threshold)
- Employment Allowance: £10,500 (offsets employer NI; now available to ALL employers)
- CT rates: 19% (≤£50k profits), 25% (>£250k), marginal relief between
- Dividend rates: 8.75% / 33.75% / 39.35% (after £500 allowance)

**Data inputs:** Company profits before extraction, director's other income, spouse's income (for dividend splitting), number of associated companies, Employment Allowance availability, other employees

**Modelling logic:**
1. For each candidate salary level, calculate:
   - Corporation tax on remaining profits (after salary + employer NI deduction)
   - Income tax + employee NI on salary
   - Dividend tax on remaining post-CT profit
2. Add employer pension contribution as variable
3. Find the salary/dividend/pension split minimising total tax (personal + corporate)
4. Factor in Employment Allowance
5. Check state pension qualification (salary must exceed LEL of £6,500)
6. Factor in IR35 status if relevant

**Edge cases:** Multiple directors sharing EA, salary below NLW risk, mortgage application impact, associated company rules affecting CT thresholds

---

### 2.6 Spousal Income Splitting / Family Company Planning

**Priority: P1 — High Value**

Allocating shares to lower-earning spouse so dividends taxed at their marginal rate.

**Key rules:**
- Arctic Systems: settlements legislation generally does NOT apply to ordinary shares in a company owned by married couple
- Alphabet shares: different share classes with customisable dividend rights
- Minor children as shareholders: settlements rules DO apply (income >£100 taxed on parent)
- Dividend waivers: must be documented BEFORE declaration; HMRC challenge risk

**Data inputs:** Both spouses' income, shareholding structure, share classes, children's ages

**Modelling logic:**
1. Calculate combined household tax at various dividend split ratios
2. Optimise to minimise combined tax
3. Check settlements legislation risk
4. Model alphabet share restructuring benefit

---

### 2.7 EIS / SEIS / VCT Income Tax Relief

**Priority: P2 — Investment Planning**

| Scheme | IT Relief | Max Investment | Holding Period | CGT Treatment |
|--------|----------|---------------|----------------|---------------|
| EIS | 30% | £1m (£2m KIC) | 3 years | Exempt + deferral |
| SEIS | 50% | £200k | 3 years | 50% reinvestment relief |
| VCT | 30% (20% from Apr 2026) | £200k | 5 years | Exempt (no loss relief) |

**Key planning insight:** These do NOT reduce ANI (unlike pension/Gift Aid). They reduce tax liability directly.

**Data inputs:** Investment amount, client's IT liability, carry-back election, CGT position

---

### 2.8 Gift Aid Planning

**Priority: P1 — Extends Existing Engine**

Already handles basic Gift Aid extension. Need to add:
- **Carry-back elections:** Donations made 6 Apr 2025 - 31 Jan 2026 can be allocated to 2024/25
- **Donor liability check:** Donor must have paid enough tax to cover 20% basic rate claim
- **Gift of shares/property to charity:** CGT-exempt + income tax deduction at market value
- **Scottish taxpayers:** Additional relief = difference between Scottish marginal rate and 20%

---

### 2.9 Benefits in Kind / Company Car Calculator

**Priority: P2 — Common Planning**

| Benefit | BIK Rate 2025/26 |
|---------|-----------------|
| Electric car | 3% of P11D value |
| Ultra-low emission (1-50g CO2) | 2-14% depending on electric range |
| Cycle to work | Exempt |
| Workplace nursery | Exempt |
| Mobile phone (1 per employee) | Exempt |
| Private medical insurance | Full P11D value |
| Trivial benefits | Exempt if ≤£50 per benefit |

**Data inputs:** BIK type, P11D value, CO2 emissions, electric range, employee marginal rate

**Modelling logic:** Compare BIK tax cost vs buying privately, factoring in employer/employee NI savings from salary sacrifice

---

### 2.10 Rent-a-Room Relief

**Priority: P3 — Niche**

£7,500 tax-free for renting a furnished room in main home. Compare flat-rate exemption vs actual expense deduction.

---

### 2.11 Property & Trading Allowances

**Priority: P3 — Minor**

£1,000 each. Auto-exempt if gross income below threshold. Compare with actual expenses if above.

---

### 2.12 Scottish vs English Tax — Enhanced Modelling

**Priority: P1 — Already Implemented but Needs Enrichment**

Current engine handles Scottish bands. Need to add:
- Marriage Allowance always at 20% UK rate (not Scottish rate)
- Gift Aid: Scottish intermediate rate (21%) gives only 1% additional relief; starter rate (19%) may create 1% liability
- Pension relief at source: only 20% automatic; must claim additional via SA

---

### 2.13 Childcare Cliff-Edge Calculator

**Priority: P0 — Massive Marginal Impact**

At £100k income, clients lose:
- 30 hours free childcare (worth up to £10,400/year per child)
- Tax-free childcare (£2,000/year per child)
- This creates effective marginal rates exceeding **1,000%** in some cases

**Data inputs:** Number of children, ages, childcare costs, current income

**Modelling logic:** Quantify the total cliff-edge cost and compare against pension sacrifice to stay below £100k

---

## 3. PHASE 2 — Pensions & Retirement

### 3.1 Pension vs ISA Comparison

**Priority: P1 — Key Planning Decision**

| Factor | Pension | ISA |
|--------|---------|-----|
| Relief on contribution | 20-48% | None |
| Employer NI saving (sacrifice) | 15% | None |
| Growth | Tax-free | Tax-free |
| Withdrawal | 75% taxed at marginal rate | Tax-free |
| 25% PCLS | Tax-free | N/A |
| Access age | 55 (57 from 2028) | Any time |
| IHT | Outside estate until 2027 | In estate |
| Annual limit | £60k | £20k |

**Key insight:** Pension wins if contribution tax rate > withdrawal tax rate. IHT advantage disappears from April 2027.

---

### 3.2 Tax Relief Method Comparison

**Priority: P2 — Educates Advisers**

Compare Relief at Source vs Net Pay vs Salary Sacrifice:
- Salary sacrifice: saves employee IT + NI + employer NI (most tax-efficient)
- Net pay: saves employee IT + NI at payroll (no SA claim needed)
- Relief at source: 20% auto, rest via SA; extends basic rate band

**Note:** From April 2025, HMRC top-up payments for low earners in net pay schemes.

---

### 3.3 PCLS / Drawdown Strategy Modeller

**Priority: P1 — Retirement Planning Core**

Model phased crystallisation vs full crystallisation:
- PCLS limited to £268,275 (Lump Sum Allowance)
- Phase across tax years to use PA each year
- Compare PCLS + drawdown vs UFPLS vs full encashment
- Factor in State Pension commencement pushing into higher band
- Emergency tax warning on first drawdown (month 1 basis)

**Data inputs:** Pension fund value(s), other income, LSA used to date, State Pension amount/age, desired income

---

### 3.4 Small Pots Rule

**Priority: P2 — Niche but Valuable**

Up to 3 personal pension pots of ≤£10,000 can be commuted as lump sum. Does NOT trigger MPAA. Does NOT reduce LSA.

**Key planning:** Take small pots BEFORE flexible access to avoid MPAA on remaining pots.

---

### 3.5 Pension Recycling Check

**Priority: P2 — Anti-Avoidance**

Flag if PCLS > £7,500 AND contributions increase by >30% of PCLS over 5-year period. Penalties: 40% + 15% surcharge.

---

### 3.6 LSA/LSDBA Tracking (Post-LTA Regime)

**Priority: P2 — Transitional**

- LSA: £268,275 (tax-free lump sum lifetime limit)
- LSDBA: £1,073,100 (lump sum + death benefit limit)
- Reduced by prior LTA usage percentage
- Protections (FP2016, IP2016) may give enhanced amounts

---

### 3.7 Decumulation Sequencing

**Priority: P1 — Multi-Year**

Model optimal order for drawing income in retirement:
1. ISA first (preserves pension IHT exemption until 2027)?
2. Pension first (use PA while it's available)?
3. GIA first (crystalise gains within AEA)?

Sequencing changes dramatically from April 2027 when pensions enter IHT.

---

## 4. PHASE 3 — Capital Gains Tax

### 4.1 CGT Position Calculator

**Priority: P0 — Core Missing Feature**

**Key rates (2025/26):**
- AEA: £3,000
- Standard: 18% (basic rate) / 24% (higher rate)
- Residential property: 18% / 24% (unified from April 2024)
- BADR: **14%** (rising to 18% from April 2026). Lifetime limit: £1m
- Investors' Relief: **14%** (rising to 18% from April 2026). Lifetime limit: **£1m** (reduced from £10m)

**Data inputs:** Asset type, acquisition cost, disposal proceeds, holding period, other income (for band determination), reliefs claimed

**Modelling logic:**
1. Calculate gain = proceeds - cost - incidental costs - enhancement expenditure
2. Deduct AEA (£3,000)
3. Determine CGT rate: remaining basic rate band available after income determines split
4. Apply relevant relief (BADR, PPR, holdover, rollover)

---

### 4.2 Bed & ISA / Bed & Pension / Bed & Spouse

**Priority: P0 — Stub Exists**

Sell GIA holdings and rebuy in ISA/pension/spouse's name to shelter future gains/income.

**Bed & ISA logic:**
1. Calculate crystallised gain on GIA sale (CGT cost today)
2. Calculate future tax saved by ISA sheltering (ongoing savings)
3. Compare: is the upfront CGT cost worth the ongoing shelter?
4. Check remaining ISA allowance
5. Enforce 30-day rule for share identification (cannot rebuy same shares within 30 days in own name — but CAN rebuy in ISA immediately as ISA is separate portfolio)

**Bed & Spouse:** Transfer to spouse (CGT-free), spouse sells and uses their AEA. Combined AEA: £6,000.

---

### 4.3 Share Identification Rules

**Priority: P2 — Technical Accuracy**

Three matching rules in order:
1. **Same-day rule:** Shares acquired same day as disposal match first
2. **30-day rule (Bed & Breakfast):** Shares acquired within 30 days AFTER disposal match next
3. **Section 104 pool:** Remaining shares matched against the weighted average cost pool

---

### 4.4 CGT on Residential Property

**Priority: P1 — Common Scenario**

- PPR relief: Main home exempt from CGT
- Lettings relief: Very limited (only if shared occupation)
- Last 9 months of ownership always treated as PPR
- 60-day reporting requirement for UK residential property disposals
- Payment on account within 60 days

**Data inputs:** Property value, acquisition cost, periods of occupation vs letting, improvements

---

### 4.5 Business Asset Disposal Relief (BADR)

**Priority: P1 — Business Owners**

10%→14% (2025/26)→18% (2026/27) on qualifying business disposals up to £1m lifetime.

**Qualifying conditions:** 2+ years ownership, 5%+ shareholding, officer/employee of company, company is trading.

---

### 4.6 Gift Holdover Relief (s.165 and s.260)

**Priority: P2 — Trust/Gift Planning**

- s.165: Business assets gifted — CGT deferred; donee inherits donor's base cost
- s.260: Gifts into/out of certain trusts — same mechanism
- Joint claim by donor and donee required

---

### 4.7 Rollover Relief

**Priority: P2 — Business Assets**

Proceeds from qualifying business asset disposal reinvested in new qualifying asset — CGT deferred. Must reinvest within 1 year before to 3 years after disposal.

---

### 4.8 Incorporation Relief (s.162)

**Priority: P1 — Self-Employment to Company**

Transfer business as going concern to company. CGT rolled into share base cost. All assets (except cash) must transfer for shares.

**Key consideration:** s.162 is automatic but formal claim required from 2025/26. Goodwill transferred to related-party company: no CT amortisation deduction (from 2015).

---

### 4.9 EIS CGT Deferral

**Priority: P2 — Investment**

Unlimited CGT deferral by investing gains into qualifying EIS shares. Deferred gain crystallises when EIS shares disposed.

---

### 4.10 Losses — Carry Forward, Carry Back on Death, Negligible Value

**Priority: P1 — Core CGT**

- Losses carry forward indefinitely against future gains
- Losses cannot create a refund (only offset gains)
- On death: losses in year of death can be carried back 3 years
- Negligible value claims: crystallise loss without actual disposal

---

### 4.11 CGT on Crypto Assets

**Priority: P2 — Growing Relevance**

Treated as standard assets. Same CGT rates (18%/24%). Share pooling rules apply. DeFi staking/lending may create disposal events.

---

## 5. PHASE 4 — Property Taxation

### 5.1 Stamp Duty Land Tax (SDLT) Calculator — England & NI

**Priority: P1 — Common Transaction**

**Standard Residential Rates (from 1 April 2025):**

| Band | Rate |
|------|------|
| Up to £125,000 | 0% |
| £125,001-£250,000 | 2% |
| £250,001-£925,000 | 5% |
| £925,001-£1,500,000 | 10% |
| Over £1,500,000 | 12% |

**Surcharges:** Additional property +5%, Non-UK resident +2%, Company 17% flat (>£500k)

**First-time buyer:** 0% on first £300k, 5% on £300k-£500k (max price £500k)

---

### 5.2 LBTT Calculator — Scotland

**Priority: P2 — Regional**

0% to £145k, 2% to £250k, 5% to £325k, 10% to £750k, 12% above. ADS: **8%** flat rate on total price for additional properties.

---

### 5.3 LTT Calculator — Wales

**Priority: P2 — Regional**

0% to £225k, 6% to £400k, 7.5% to £750k, 10% to £1.5m, 12% above. Higher rates: main + 5pp.

---

### 5.4 Section 24 Mortgage Interest Restriction

**Priority: P0 — High Impact for Landlords**

Individual landlords cannot deduct mortgage interest. Instead get 20% basic rate tax credit.

**Modelling logic:**
1. Taxable rental profit = gross income - expenses (EXCLUDING finance costs)
2. Tax at client's marginal rate on full profit
3. Deduct 20% credit on finance costs
4. **Phantom income effect:** Can push client into higher band, affecting PA taper, HICBC

**Key comparison:** Personal ownership (s.24 restricted) vs Company ownership (full deduction, CT at 19-25%)

---

### 5.5 BTL Incorporation Breakeven Calculator

**Priority: P1 — Common Decision**

Model: personal s.24 position vs corporate position over 10-20 years.

Include: CGT on transfer (mitigated by s.162 if "business"), SDLT on market value, extraction costs (dividends), legal fees, ongoing accounting costs, ATED if applicable.

---

### 5.6 FHL Abolition Impact (from April 2025)

**Priority: P1 — Transitional**

Former FHLs now subject to s.24, lose capital allowances, lose BADR on disposal, lose pension earnings status.

---

### 5.7 Capital Allowances on Commercial Property

**Priority: P3 — Specialist**

SBA: 3% p.a. over 33.33 years. AIA: £1m for plant/machinery. Full expensing (100%) for companies.

---

## 6. PHASE 5 — Inheritance Tax & Estate Planning

### 6.1 IHT Estate Calculator

**Priority: P1 — Core Estate Planning**

**Thresholds (2025/26):**

| Allowance | Individual | Couple (transferable) |
|-----------|-----------|---------------------|
| NRB | £325,000 | £650,000 |
| RNRB | £175,000 | £350,000 |
| **Total tax-free** | **£500,000** | **£1,000,000** |

RNRB tapers: £1 lost per £2 of estate above £2m. Fully lost at £2.35m.

**Data inputs:** Estate assets (property, investments, pensions, cash, business interests), liabilities, gifts made in last 7 years, NRB/RNRB used by predeceased spouse, whether residence passes to direct descendants

---

### 6.2 PET / CLT Tracker

**Priority: P1 — Gift Planning**

- **PETs (Potentially Exempt Transfers):** Tax-free if donor survives 7 years. Taper relief: 3-4 yrs: 80%, 4-5: 60%, 5-6: 40%, 6-7: 20%
- **CLTs (Chargeable Lifetime Transfers):** Into trusts — 20% lifetime rate above available NRB

**Data inputs:** Gift history with dates, values, recipients, whether PET or CLT

---

### 6.3 BPR / APR Calculator

**Priority: P1 — Business Owners & Farmers**

**FROM APRIL 2026 — Major Changes:**
- First £1m of qualifying BPR/APR property: **100% relief** (unchanged)
- Above £1m: **50% relief only** (effective 20% IHT rate)
- Combined allowance across BPR + APR: £2.5m per estate
- Transferable between spouses: up to £5m for couples
- AIM shares: 50% relief only (previously 100%)

**Data inputs:** Business/agricultural property values, type of property (trading company shares, partnership interest, agricultural land), AIM holdings

---

### 6.4 Normal Expenditure Out of Income

**Priority: P2 — Powerful Exemption**

Gifts that are: (a) part of normal expenditure, (b) made out of income, (c) leave donor with enough to maintain normal standard of living.

**No monetary cap.** Can shelter very large amounts from IHT if documented properly.

**Data inputs:** Donor's income, expenditure, pattern of giving

---

### 6.5 IHT on Pensions (from April 2027)

**Priority: P1 — Seismic Change**

Unused pension funds will be included in the estate for IHT. Beneficiaries also pay income tax on inherited pension income. Potential **double taxation** of 64%+ (40% IHT + income tax on remainder).

**Impact on planning:** Completely changes pension vs ISA calculus. "Spend pension first, preserve ISA" becomes the new default.

---

### 6.6 Charity Exemption (36% Rate)

**Priority: P2**

If 10%+ of net estate left to charity, IHT rate drops from 40% to 36%.

---

### 6.7 Deed of Variation

**Priority: P3 — Post-Death Planning**

Within 2 years of death, beneficiaries can redirect inheritance. Treated as if the deceased made the new arrangement.

---

### 6.8 Trust Taxation

**Priority: P3 — Specialist**

| Tax | Trust Rate |
|-----|-----------|
| Income (non-dividend) | 45% |
| Dividends | 39.35% |
| CGT | 24% (flat) |
| CGT AEA | £1,500 (divided among settlor's trusts) |
| Standard rate band | £500 (divided among trusts, min £100) |
| IHT 10-year periodic | Up to 6% |

---

## 7. PHASE 6 — Business & Corporate Tax

### 7.1 Corporation Tax Calculator

**Priority: P1 — Needed for Director Optimiser**

| Profit Band | Rate |
|-------------|------|
| ≤ £50,000 | 19% |
| £50,001-£250,000 | Marginal relief (effective ~26.5%) |
| > £250,000 | 25% |

**Associated company rules:** Thresholds divided by number of associated companies.

---

### 7.2 Capital Allowances

**Priority: P2 — Business Owners**

- AIA: £1m (100% on qualifying plant/machinery)
- Full expensing: 100% for companies (permanent)
- WDA: 18% main pool, 6% special rate
- SBA: 3% for structures/buildings
- Zero-emission cars: 100% FYA

---

### 7.3 R&D Tax Relief

**Priority: P3 — Specialist**

Merged RDEC scheme from April 2024: 20% above-the-line credit. Enhanced R&D Intensive Support (ERIS): 27% for R&D-intensive SMEs.

---

### 7.4 Director's Loan Account / s.455

**Priority: P2 — Close Company Planning**

Loans from close company to participator: 33.75% s.455 tax charge. Refunded 9 months after period in which loan repaid. Bed & Breakfasting rules apply.

---

### 7.5 IR35 / Off-Payroll Assessment

**Priority: P2 — Contractor Planning**

Flag IR35 risk. Compare inside vs outside IR35 tax positions. Model deemed employment costs.

---

### 7.6 EMI Share Options

**Priority: P2 — Growth Companies**

No tax on grant. No IT on exercise (if exercise price ≥ MV at grant). CGT at BADR rate (14%→18%) on disposal after 2 years. Company must have gross assets < £30m, < 250 FTE.

---

### 7.7 Self-Employment Loss Relief

**Priority: P1 — Common Scenario**

| Section | Type | Direction |
|---------|------|-----------|
| s.64 | Sideways | Against general income current/prior year |
| s.72 | Early years | Against income of 3 prior years (first 4 years of trade) |
| s.83 | Carry forward | Against future same-trade profits (indefinite) |
| s.89 | Terminal | Against 3 prior years' trading profits |

**Cap:** Greater of £50,000 or 25% of adjusted total income.

---

### 7.8 Basis Period Reform (from 2024/25)

**Priority: P2 — Self-Employment**

Tax year basis now default. Transitional profit from 2023/24 spread over 5 years (1/5 per year through 2027/28). Election available to accelerate.

---

### 7.9 Cash Basis vs Accruals

**Priority: P3 — Self-Employment**

Cash basis now default from 2024/25 (no turnover cap). Interest deduction uncapped. Loss relief against other income now available.

---

### 7.10 Partnership Tax Planning

**Priority: P3 — Specialist**

LLP salaried member rules (conditions A/B/C). Mixed member partnership anti-avoidance. Profit allocation must reflect commercial reality.

---

### 7.11 Company Purchase of Own Shares

**Priority: P3 — Exit Planning**

Can achieve capital treatment (CGT at 14%/18% BADR) instead of income (dividend rates). Requires HMRC clearance.

---

### 7.12 VAT Advisory Flags

**Priority: P3 — Flagging Only**

- Registration threshold: £90k
- Flat Rate Scheme comparison
- Partial exemption flagging
- Option to tax on commercial property
- Reverse charge for construction

Not full modelling — just flag when relevant.

---

## 8. PHASE 7 — Cross-Border & International

### 8.1 Statutory Residence Test (SRT)

**Priority: P3 — Specialist**

Three-stage waterfall: automatic overseas tests → automatic UK tests → sufficient ties test. Five ties: family, accommodation, work, 90-day, country.

**Data inputs:** Days in UK (current + 3 prior years), UK homes, family member residence, work locations

---

### 8.2 FIG Regime (from April 2025)

**Priority: P3 — New Regime**

4-year exemption for new UK arrivals (10+ years non-resident prior). Foreign income/gains exempt. Loss of PA and CGT AEA.

**Break-even:** Only beneficial if foreign income/gains > £12,570 PA + £3,000 AEA.

---

### 8.3 Temporary Repatriation Facility (TRF)

**Priority: P3 — Time-Limited**

Former remittance basis users can bring pre-April 2025 FIG to UK at: 12% (2025-27), 15% (2027-28). Window closes April 2028.

---

### 8.4 Double Taxation Relief

**Priority: P3 — Flagging**

Credit relief for foreign tax paid. Must model on income-by-income basis. Cannot carry forward excess credits.

---

## 9. PHASE 8 — Compliance, Anti-Avoidance & Regulatory

### 9.1 Anti-Avoidance Warning Layer

**Priority: P1 — Safety Critical**

The system must NEVER suggest arrangements caught by:
- **GAAR:** General Anti-Abuse Rule — "double reasonableness" test
- **Transactions in securities (s.684-713):** Extracting profits as capital instead of dividends
- **Settlements legislation (s.619-648):** Income attributed back to settlor
- **Transfer of assets abroad (s.714-751):** Offshore structures
- **DOTAS hallmarks:** Confidentiality, premium fee, standardised products, loss schemes

**Implementation:** Risk flags in system prompt + observation engine rules that warn when suggested planning approaches border lines.

---

### 9.2 Claims & Elections Tracker

**Priority: P0 — High Adviser Value**

| Claim | Deadline | Value |
|-------|----------|-------|
| Marriage Allowance backdate | 4 years | Up to £1,008 |
| Pension carry forward | 3 years | Potentially £1,000s |
| Gift Aid carry-back | 31 January (SA deadline) | Variable |
| Trading loss sideways | Year of loss + prior year | Variable |
| Early years loss relief | 3 years before loss year | Variable |
| Capital loss carry-back on death | 3 years | Variable |
| Overpayment relief | 4 years | Variable |
| CGT AEA | Use-or-lose annually | £3,000 |
| ISA allowance | Use-or-lose annually | £20,000 |
| IHT annual gift exemption | 1-year carry forward only | £3,000 |

---

### 9.3 Tax Calendar & Year-End Checklist

**Priority: P0 — Immediate Value**

Auto-generate personalised year-end checklist per client:
1. Has pension AA been maximised? Check carry forward.
2. Has ISA allowance been used?
3. Can CGT losses be harvested? Check 30-day rule.
4. Has IHT annual gift exemption been used?
5. Would salary sacrifice before 6 April save tax?
6. Is Gift Aid carry-back available?
7. Is Marriage Allowance being claimed? Backdate available?
8. Would pension contributions eliminate HICBC?
9. Would pension contributions restore PA?
10. Are there trading losses to offset?

---

### 9.4 HMRC Enquiry Windows

**Priority: P3 — Informational**

- Normal: 12 months from filing
- Careless: 4 years
- Deliberate: 20 years
- Offshore: 12 years

---

### 9.5 Making Tax Digital (MTD)

**Priority: P3 — Future Integration**

- April 2026: Mandatory for sole traders/landlords >£50k income
- April 2027: >£30k
- April 2028: >£20k
- Quarterly updates + final declaration

**Opportunity:** MTD data could feed Helio's calculations quarterly, enabling proactive planning.

---

### 9.6 FCA Regulatory Boundaries

**Priority: P1 — Product Design**

- Pure tax calculations = NOT regulated
- Recommending specific financial products = potentially regulated
- Position: Analysis tool for professional advisers, not end-client advice
- Disclaimers: Helio provides analysis, not personal financial advice

---

### 9.7 Payment on Account Calculator

**Priority: P1 — Cash Flow Planning**

Each POA = 50% of prior year's SA liability (minus tax at source). Model whether POAs should be reduced (SA303 claim) based on current year projection. Warn about interest if reduction proves excessive.

---

## 10. PHASE 9 — Production Readiness

### 10.1 Multi-Year Modelling

**Priority: P0 — Fundamental**

Current engine is single-year only. Need 3-5 year projections accounting for:
- Frozen thresholds (to 2028)
- Known rate changes: BADR 14%→18% (Apr 2026), dividend rates increasing (Apr 2026), salary sacrifice NIC cap (Apr 2029), pension IHT (Apr 2027)
- Income growth assumptions
- Investment return assumptions
- State pension commencement

---

### 10.2 Tax Year Versioning

**Priority: P0 — Accuracy**

- Add 2024/25 constants (for carry-forward, backdating)
- Add 2026/27 known changes (BADR 18%, VCT 20%, salary sacrifice cap)
- Budget change incorporation process
- "Proposed" vs "Enacted" flag for constants

---

### 10.3 Marginal Rate Curve Visualisation

**Priority: P1 — Key Differentiator**

Full marginal rate curve from £0 to £200k+ showing all clawbacks stacked:
- Income tax bands
- NI
- PA taper (60% zone)
- HICBC
- Student loan repayments
- Childcare cliff-edge
- Pension taper

Combined marginal rate can exceed 70%.

---

### 10.4 What-If Scenario Library

**Priority: P1 — Adviser UX**

Pre-built scenario templates:
- "What if I sacrifice enough to get under £100k?"
- "What if we transfer the rental property to my spouse?"
- "What if I incorporate the business?"
- "What if I take my PCLS in stages over 3 years?"
- "What if I contribute the maximum to SEIS?"

---

### 10.5 Report Generation

**Priority: P1 — Adviser Requirement**

- Client-facing PDF: branded, jargon-free, charts
- Scenario comparison side-by-side
- File notes with compliance trail
- Annual review pack

---

### 10.6 Audit Trail

**Priority: P1 — Compliance**

- Every computation reproducible with date stamp
- Which constants version was used
- Which assumptions were applied
- Retraceable for FCA suitability requirements

---

### 10.7 Data Security

**Priority: P0 — Non-Negotiable**

- UK GDPR compliance
- Encryption at rest + in transit
- Data breach notification (72 hours to ICO)
- Retention policy aligned with HMRC requirements (5-7 years)
- Right to erasure (balanced with legal retention)
- SOC 2 Type II certification target

---

### 10.8 Integration Points

**Priority: P2 — Future**

- HMRC APIs (MTD, Self Assessment)
- Accounting software (Xero, QuickBooks, Sage)
- Adviser platforms (Intelliflo, Xplan)
- Cashflow tools (CashCalc, Voyant)
- Platform APIs (Transact, Quilter, Aegon)

---

## 11. Priority Matrix & Phased Roadmap

### P0 — Must Have (Core Value Proposition)

| # | Scenario | Complexity | Impact | Dependencies |
|---|----------|-----------|--------|-------------|
| 1 | Company Director Salary/Dividend Optimiser | HIGH | VERY HIGH | Corporation tax calculator |
| 2 | Student Loan Repayments | LOW | HIGH | None (stub exists) |
| 3 | Marriage Allowance | LOW | MEDIUM | None (stub exists) |
| 4 | Claims & Elections Tracker | MEDIUM | HIGH | Tax calendar data |
| 5 | Year-End Planning Checklist | LOW | HIGH | Existing observations engine |
| 6 | Childcare Cliff-Edge Calculator | LOW | HIGH | PA taper model |
| 7 | Multi-Year Modelling | HIGH | VERY HIGH | Tax year versioning |
| 8 | Tax Year Versioning (2024/25, 2026/27) | MEDIUM | HIGH | None |
| 9 | Constants Corrections | LOW | CRITICAL | None |
| 10 | Data Security Framework | MEDIUM | NON-NEGOTIABLE | Architecture decision |

### P1 — Should Have (Completeness)

| # | Scenario | Complexity | Impact |
|---|----------|-----------|--------|
| 11 | CGT Position Calculator | MEDIUM | HIGH |
| 12 | Bed & ISA (complete stub) | MEDIUM | HIGH |
| 13 | Starting Rate for Savings | LOW | MEDIUM |
| 14 | Section 24 / Property Rental Calculator | MEDIUM | HIGH |
| 15 | IHT Estate Calculator | HIGH | HIGH |
| 16 | BPR/APR (with 2026 rules) | MEDIUM | HIGH |
| 17 | Pension Drawdown Strategy | HIGH | HIGH |
| 18 | Spousal Income Splitting | MEDIUM | HIGH |
| 19 | Gift Aid Carry-Back | LOW | MEDIUM |
| 20 | Marginal Rate Curve | MEDIUM | HIGH |
| 21 | Report Generation Enhancement | MEDIUM | HIGH |
| 22 | Anti-Avoidance Warning Layer | MEDIUM | HIGH |
| 23 | Payment on Account Calculator | LOW | MEDIUM |
| 24 | Pension vs ISA Comparison | MEDIUM | MEDIUM |
| 25 | Self-Employment Loss Relief | MEDIUM | MEDIUM |
| 26 | Corporation Tax Calculator | MEDIUM | HIGH |
| 27 | PCLS/Drawdown Modelling | HIGH | HIGH |
| 28 | What-If Scenario Library | MEDIUM | HIGH |
| 29 | FCA Disclaimer Framework | LOW | HIGH |
| 30 | Audit Trail | MEDIUM | HIGH |
| 31 | Scottish Tax Enrichments | LOW | MEDIUM |
| 32 | IHT on Pensions (2027 rules) | MEDIUM | HIGH |
| 33 | BTL Incorporation Breakeven | HIGH | HIGH |
| 34 | Decumulation Sequencing | HIGH | HIGH |

### P2 — Nice to Have (Differentiation)

| # | Scenario | Complexity | Impact |
|---|----------|-----------|--------|
| 35 | SDLT/LBTT/LTT Calculator | MEDIUM | MEDIUM |
| 36 | EIS/SEIS/VCT Relief | MEDIUM | MEDIUM |
| 37 | Benefits in Kind / Company Car | MEDIUM | MEDIUM |
| 38 | EMI Share Options | MEDIUM | MEDIUM |
| 39 | Director NI (Annual Earnings Period) | LOW | LOW |
| 40 | Blind Person's Allowance | LOW | LOW |
| 41 | Small Pots Rule | LOW | LOW |
| 42 | Pension Recycling Check | LOW | MEDIUM |
| 43 | LSA/LSDBA Tracking | MEDIUM | MEDIUM |
| 44 | Tax Relief Method Comparison | LOW | MEDIUM |
| 45 | R&D Tax Relief | HIGH | MEDIUM |
| 46 | s.455 Director's Loan | MEDIUM | MEDIUM |
| 47 | IR35 Assessment | MEDIUM | MEDIUM |
| 48 | Normal Expenditure Out of Income | LOW | MEDIUM |
| 49 | Capital Allowances | MEDIUM | MEDIUM |
| 50 | PET/CLT Tracker | MEDIUM | MEDIUM |
| 51 | Charity IHT 36% Rate | LOW | LOW |
| 52 | Share Identification Rules | MEDIUM | LOW |
| 53 | CGT on Crypto | LOW | LOW |
| 54 | Basis Period Reform | MEDIUM | MEDIUM |
| 55 | Company Purchase of Own Shares | HIGH | MEDIUM |
| 56 | Voluntary Repayment vs Investing | MEDIUM | MEDIUM |
| 57 | NI Deferment (Multiple Employments) | LOW | LOW |
| 58 | Class 3 Voluntary NI | LOW | LOW |
| 59 | Premium Bond Comparison | LOW | LOW |
| 60 | FHL Abolition Impact | LOW | MEDIUM |

### P3 — Future Phases (Specialist / Niche)

| # | Scenario | Complexity |
|---|----------|-----------|
| 61 | SRT Residence Calculator | VERY HIGH |
| 62 | FIG Regime Modelling | HIGH |
| 63 | TRF Optimisation | HIGH |
| 64 | DTA Relief Calculator | HIGH |
| 65 | Trust Taxation (all types) | VERY HIGH |
| 66 | 10-Year Periodic Charges | HIGH |
| 67 | Vulnerable Beneficiary Trusts | MEDIUM |
| 68 | Transfer Pricing | VERY HIGH |
| 69 | Diverted Profits Tax | HIGH |
| 70 | Patent Box | HIGH |
| 71 | Corporate Interest Restriction | HIGH |
| 72 | VAT (all modules) | HIGH |
| 73 | Deed of Variation | MEDIUM |
| 74 | Offshore Trust Modelling | VERY HIGH |
| 75 | Partnership/LLP Structuring | HIGH |
| 76 | Growth Shares / Alphabet Shares | HIGH |
| 77 | HMRC API Integration | HIGH |
| 78 | MTD Filing Support | VERY HIGH |
| 79 | Accounting Software Integration | HIGH |
| 80 | Adviser Platform Integration | HIGH |

---

## 12. Data Model Extensions Required

### Client Model Additions

```
# Residence & Status
residence_status: enum (UK_resident, non_resident, split_year)
domicile_status: enum (UK_domiciled, non_dom, deemed_dom, FIG_eligible)
years_uk_resident: int
is_scottish_taxpayer: bool  # already exists via 'region'

# Student Loans
student_loan_plans: list[enum]  # Plan1, Plan2, Plan4, Plan5, Postgraduate
student_loan_balances: dict[plan, float]

# Childcare
number_of_children_under_5: int  # for childcare cliff-edge
uses_free_childcare: bool
uses_tax_free_childcare: bool

# Business
is_director: bool
company_id: str | None  # link to company entity
employment_allowance_available: bool

# Anti-Avoidance Flags
has_offshore_structures: bool
has_disclosed_tax_schemes: bool
has_disguised_remuneration_loans: bool

# IHT
gifts_made: list[Gift]  # date, value, recipient, type (PET/CLT)
will_leaves_to_charity: bool
charity_percentage: float
```

### New Entity: Company

```
company_id: str
name: str
household_id: str
profits_before_extraction: float
associated_companies: int
employment_allowance_used: float
corporation_tax_rate: float  # computed
shareholders: list[Shareholder]  # director_id, share_class, percentage
```

### Tax Profile Additions

```
# CGT
capital_gains: list[Gain]  # asset, proceeds, cost, date, type
cgt_losses_brought_forward: float
badr_lifetime_used: float

# IHT
estimated_estate_value: float
nrb_used_by_predeceased: float
rnrb_used_by_predeceased: float

# Pension
lsa_used: float  # Lump Sum Allowance consumed
lsdba_used: float
mpaa_triggered: bool
mpaa_trigger_date: date | None

# Student Loans
student_loan_repayments: dict[plan, float]

# Cross-border
foreign_tax_credits: float
fig_claimed: bool
trf_designation: float
```

---

## 13. Constants Corrections & Additions

### Immediate Corrections (2025/26)

```python
# In TAX_YEARS["2025/26"]["allowances"]
"blind_persons": 3_130,  # Currently 3,070 — WRONG

# In TAX_YEARS["2025/26"]["cgt"]
"badr_rate": 0.14,  # Currently 0.10 — WRONG (changed 6 Apr 2025)
"investors_relief_limit": 1_000_000,  # Currently 10,000,000 — WRONG (changed 30 Oct 2024)
"investors_relief_rate": 0.14,  # Currently 0.10 — WRONG

# In TAX_YEARS["2025/26"]["ni"]["class_2"]
"weekly_rate": 3.50,  # Currently 3.45 — WRONG
```

### New Constants to Add

```python
# Student Loans
"student_loans": {
    "plan_1": {"rate": 0.09, "threshold": 26_065},
    "plan_2": {"rate": 0.09, "threshold": 28_470},
    "plan_4": {"rate": 0.09, "threshold": 32_745},
    "plan_5": {"rate": 0.09, "threshold": 25_000},
    "postgraduate": {"rate": 0.06, "threshold": 21_000},
},

# Corporation Tax
"corporation_tax": {
    "small_profits_rate": 0.19,
    "small_profits_limit": 50_000,
    "main_rate": 0.25,
    "main_rate_limit": 250_000,
    "marginal_relief_fraction": 3/200,
    "employment_allowance": 10_500,
},

# SDLT (England & NI)
"sdlt": {
    "residential_bands": [
        {"threshold": 125_000, "rate": 0.00},
        {"threshold": 250_000, "rate": 0.02},
        {"threshold": 925_000, "rate": 0.05},
        {"threshold": 1_500_000, "rate": 0.10},
        {"threshold": None, "rate": 0.12},
    ],
    "additional_surcharge": 0.05,
    "non_resident_surcharge": 0.02,
    "company_rate": 0.17,
    "ftb_nil_band": 300_000,
    "ftb_max_price": 500_000,
},

# IHT Extensions
"iht": {
    # ... existing ...
    "reduced_rate": 0.36,
    "charity_threshold": 0.10,
    "rnrb_taper_threshold": 2_000_000,
    "lifetime_rate": 0.20,
    "annual_gift_exemption": 3_000,
    "small_gift_exemption": 250,
    "marriage_gift_parent": 5_000,
    "marriage_gift_grandparent": 2_500,
    "marriage_gift_other": 1_000,
    "pet_taper": {3: 1.0, 4: 0.80, 5: 0.60, 6: 0.40, 7: 0.20},
},

# BPR/APR (from April 2026)
"bpr_apr_2026": {
    "full_relief_limit": 1_000_000,
    "reduced_rate": 0.50,
    "combined_allowance": 2_500_000,
},

# Trusts
"trusts": {
    "income_rate": 0.45,
    "dividend_rate": 0.3935,
    "cgt_rate": 0.24,
    "cgt_aea": 1_500,
    "standard_rate_band": 500,
    "standard_rate_band_min": 100,
},

# Childcare
"childcare": {
    "free_hours_income_limit": 100_000,
    "tax_free_childcare_limit": 100_000,
    "tax_free_childcare_max_per_child": 2_000,
    "free_hours_value_per_child": 10_400,
},
```

### 2026/27 Known Changes to Pre-Populate

```python
TAX_YEARS["2026/27"] = {
    # ... copy 2025/26 then override:
    "cgt": {
        "badr_rate": 0.18,  # Increasing from 0.14
        "investors_relief_rate": 0.18,
        # ... other CGT rates unchanged
    },
    "salary_sacrifice_nic_cap": None,  # Not until 2029
    "bik": {
        "electric_car": 0.04,  # Rising from 0.03
    },
    # IHT pensions inclusion: flag for 2027/28
}
```

---

## Summary

This document catalogues **80 distinct tax planning scenarios** across 9 phases, from personal income tax through to cross-border and production readiness. The phased roadmap identifies:

- **10 P0 items** (must have for core value)
- **24 P1 items** (needed for completeness)
- **26 P2 items** (differentiation features)
- **20 P3 items** (future specialist phases)

The most impactful immediate wins are:
1. **Company Director Salary/Dividend Optimiser** — the #1 question advisers face
2. **Multi-year modelling** — single-year snapshots are insufficient for production
3. **Student loan + childcare cliff-edge** — combined marginal rates advisers miss
4. **Constants corrections** — BADR rate, Investors' Relief limit, BPA are currently wrong
5. **Year-end checklist generator** — immediate adviser value with minimal engineering

The existing deterministic engine architecture (two-call diff for scenarios) scales well to most of these features. The key architectural addition needed is the company-level tax model for director optimisation, which requires modelling personal + corporate tax simultaneously.
