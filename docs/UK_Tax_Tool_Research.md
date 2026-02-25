# UK Hazel — Tax Planning Tool Research

> Comprehensive technical reference for redesigning Hazel as a UK-specific tax planning assistant for financial advisers.

---

## Table of Contents

1. [UK System Prompt](#uk-system-prompt)
2. [UK Tax System Fundamentals](#uk-tax-system-fundamentals)
3. [UK Tax Rates & Allowances (2025/26)](#uk-tax-rates--allowances-202526)
4. [Critical UK Tax Planning Points](#critical-uk-tax-planning-points)
5. [UK Tax Analysis Process](#uk-tax-analysis-process)
6. [UK Dashboard Sections](#uk-dashboard-sections)
7. [Common UK Planning Scenarios](#common-uk-planning-scenarios)
8. [Guardrails](#guardrails)
9. [UK Tax Calendar](#uk-tax-calendar)
10. [UK Tool Calling — `generate_dashboard`](#uk-tool-calling--generate_dashboard)
11. [UK-Specific Tool Definitions](#uk-specific-tool-definitions)
12. [UK Data Ingestion Layer](#uk-data-ingestion-layer)
13. [UK Calculation Engine](#uk-calculation-engine)
14. [UK Dashboard Artifacts](#uk-dashboard-artifacts)
15. [UK Planning Opportunities (Detailed)](#uk-planning-opportunities-detailed)
16. [UK-Specific Dashboard Prototypes](#uk-specific-dashboard-prototypes)
17. [UK Hazel Architecture Summary](#uk-hazel-architecture-summary)

---

## UK System Prompt

### Your Role

You are Hazel, a UK tax planning assistant for financial advisers.

You have the capability to help advisers analyse client tax returns and financial situations to:
1. Explain the client's current tax position clearly
2. Identify optimisation opportunities
3. Generate professional, client-ready deliverables

While you are not directly a tax preparer/filer, you have Chartered Tax Adviser (CTA) level sophistication and understanding of UK accounting and tax subjects.
You help advisers understand and present tax information — you do not provide tax advice directly to end clients.

---

## UK Tax System Fundamentals

### Tax Year
- UK tax year runs **6 April to 5 April** (e.g., 2025/26 = 6 April 2025 to 5 April 2026)
- This is different from the calendar year — always confirm which tax year is being discussed
- Tax year end (5 April) is critical — many allowances are "use it or lose it"

### Tax Authority
- **HMRC** (His Majesty's Revenue and Customs) is the sole tax authority
- No regional income tax except **Scotland** (different rates) and **Wales** (currently aligned with England)
- Single system — simpler than multi-jurisdiction complexity

### Filing & Collection
- **PAYE** (Pay As You Earn): Real-time tax deduction for employees — most taxpayers never file a return
- **Self Assessment**: Annual return required for:
  - Self-employed individuals
  - Higher earners (£150k+ income)
  - Those with complex tax affairs (rental income, capital gains, etc.)
  - Company directors
- Self Assessment deadline: **31 January** following the tax year end

### Individual Taxation (CRITICAL)
- **No joint filing** — each individual is taxed completely separately
- Married couples cannot file jointly
- This creates significant planning opportunities:
  - Income can be split between spouses
  - Each spouse has their own allowances (ISA, CGT AEA, pension AA)
  - Transfers between spouses are tax-free (CGT and IHT)

---

## UK Tax Rates & Allowances (2025/26)

Always verify rates for the specific tax year. Below are 2025/26 rates:

### Income Tax Bands (England, Wales, Northern Ireland)

| Band | Taxable Income | Rate |
|------|----------------|------|
| Personal Allowance | £0 - £12,570 | 0% |
| Basic Rate | £12,571 - £50,270 | 20% |
| Higher Rate | £50,271 - £125,140 | 40% |
| Additional Rate | Over £125,140 | 45% |

### Scottish Income Tax Bands (DIFFERENT — Must Check Residence)

| Band | Taxable Income | Rate |
|------|----------------|------|
| Personal Allowance | £0 - £12,570 | 0% |
| Starter Rate | £12,571 - £14,876 | 19% |
| Basic Rate | £14,877 - £26,561 | 20% |
| Intermediate Rate | £26,562 - £43,662 | 21% |
| Higher Rate | £43,663 - £75,000 | 42% |
| Advanced Rate | £75,001 - £125,140 | 45% |
| Top Rate | Over £125,140 | 48% |

**Always ask:** "Is the client resident in Scotland?" — this changes the entire calculation.

### National Insurance Contributions (NICs)

**Class 1 — Employees:**

| Threshold | Rate |
|-----------|------|
| Below Primary Threshold (£12,570) | 0% |
| Primary Threshold to Upper Earnings Limit (£12,571 - £50,270) | 8% |
| Above Upper Earnings Limit (over £50,270) | 2% |

**Employer's NI:** 13.8% on earnings above £9,100 (Secondary Threshold)
- Important for salary sacrifice calculations — employer saves this too

**Class 2 — Self-Employed:** £3.45/week (if profits > £12,570)

**Class 4 — Self-Employed:** 6% on profits £12,570-£50,270, then 2% above

### Dividend Tax Rates

| Band | Rate |
|------|------|
| Dividend Allowance (first £500) | 0% |
| Basic Rate Band | 8.75% |
| Higher Rate Band | 33.75% |
| Additional Rate Band | 39.35% |

Note: Dividends "stack on top" of other income when determining which band applies.

### Capital Gains Tax Rates

| Taxpayer Status | Standard Assets | Residential Property |
|-----------------|-----------------|---------------------|
| Basic Rate | 18% | 18% |
| Higher/Additional Rate | 24% | 24% |

**Annual Exempt Amount:** £3,000 per person (use it or lose it each tax year)

**No holding period distinction** — no separate short/long-term rates.

**Business Asset Disposal Relief (BADR):** 10% on qualifying gains up to £1m lifetime limit.

**Investors' Relief:** 10% on qualifying gains up to £10m lifetime limit.

Note: Rate depends on total taxable income INCLUDING the gain.

### Key Annual Allowances (Use It or Lose It)

| Allowance | 2025/26 Amount | Carry Forward? |
|-----------|----------------|----------------|
| Personal Allowance | £12,570 | No |
| ISA Allowance | £20,000 | No |
| LISA Allowance | £4,000 (within ISA) | No |
| Junior ISA | £9,000 | No |
| Pension Annual Allowance | £60,000 | Yes (3 years) |
| CGT Annual Exempt Amount | £3,000 | No |
| Dividend Allowance | £500 | No |
| Personal Savings Allowance | £1,000 / £500 / £0 | No |
| IHT Annual Gift Exemption | £3,000 | 1 year only |
| Marriage Allowance Transfer | £1,260 | No |
| Trading Allowance | £1,000 | No |
| Property Allowance | £1,000 | No |
| Blind Person's Allowance | £3,070 | No |
| Rent-a-Room Relief | £7,500 | No |

### Pension Details

**Annual Allowance:** £60,000

- Can carry forward unused from 3 prior years
- Tapered for high earners (£260k+ adjusted income)
- Minimum tapered AA: £10,000

**Lifetime Allowance:** ABOLISHED from April 2024
- But new Lump Sum Allowance (LSA): £268,275
- Lump Sum & Death Benefit Allowance: £1,073,100

**Tax Relief:**

| Taxpayer Band | Relief Rate |
|---------------|-------------|
| Basic Rate | 20% relief at source (automatic) |
| Higher Rate | Additional 20% via Self Assessment |
| Additional Rate | Additional 25% via Self Assessment |
| Scottish | Varies by band (19%-48% relief) |

**Pension Types:**
- Workplace DC (Defined Contribution)
- Workplace DB (Defined Benefit / Final Salary)
- SIPP (Self-Invested Personal Pension)
- SSAS (Small Self-Administered Scheme) — for business owners

**At Retirement (from age 55, rising to 57 in 2028):**
- 25% tax-free lump sum (Pension Commencement Lump Sum — PCLS)
- Remaining taxed as income when drawn
- Flexible drawdown OR annuity purchase
- No Required Minimum Distributions (unlike US)

**Money Purchase Annual Allowance (MPAA):** £10,000
- Applies if you've flexibly accessed pension benefits
- Cannot use carry forward

### ISA (Individual Savings Account)

**Annual Limit:** £20,000 (2025/26)

| Type | Description |
|------|-------------|
| Cash ISA | Interest earned tax-free |
| Stocks & Shares ISA | Dividends & gains tax-free |
| Innovative Finance ISA | P2P lending interest tax-free |
| Lifetime ISA (LISA) | 25% govt bonus, £4k limit, age 18-39. For first home or retirement (age 60+) |
| Junior ISA | £9,000 limit, for under 18s |

Can split £20k across types, but LISA counts within the £20k total.

### Inheritance Tax (IHT)

| Threshold | Rate |
|-----------|------|
| Nil Rate Band (NRB) | £325,000 at 0% |
| Residence Nil Rate Band (RNRB) | £175,000 at 0% |
| Above thresholds | 40% |

**Transferable allowances:** Unused NRB/RNRB transfers to surviving spouse.

**Maximum tax-free estate (couple, leaving home to children):** £1,000,000

**Key exemptions:**
- Annual gift exemption: £3,000 per person (1 year carry forward)
- Small gifts: £250 per recipient (unlimited recipients)
- Wedding gifts: £5,000 (child), £2,500 (grandchild), £1,000 (other)
- Normal expenditure out of income: Unlimited if regular and affordable
- PETs (Potentially Exempt Transfers): Gifts become exempt if donor survives 7 years
- Business Property Relief: 100% on qualifying businesses
- Agricultural Property Relief: 100% on farmland

---

## Critical UK Tax Planning Points

### 1. THE 60% TAX TRAP (Personal Allowance Taper) — HIGHEST PRIORITY

**This is the single most important UK tax planning consideration.**

How it works:
- Personal Allowance (£12,570) is reduced by £1 for every £2 of income over £100,000
- Fully lost when income reaches £125,140
- This creates an **effective 62% marginal rate** in the taper zone:
  - 40% income tax
  - 2% National Insurance
  - 20% effective rate from losing £1 of PA for every £2 earned (40% × 50%)

**Always check:** Is the client's Adjusted Net Income between £100,000 and £125,140?

**Adjusted Net Income (ANI) calculation:**

```
Total Income
MINUS: Gross pension contributions (personal, not employer)
MINUS: Gross Gift Aid donations (donation ÷ 0.8)
= Adjusted Net Income
```

**Mitigation strategies (in order of effectiveness):**
1. Pension contributions (salary sacrifice is best — saves NI too)
2. Employer pension contributions (don't count as income at all)
3. Gift Aid donations (extend basic rate band)
4. Timing income across tax years

**Example calculation:**

```
Client earns £120,000
PA reduced by: (£120,000 - £100,000) ÷ 2 = £10,000
Remaining PA: £12,570 - £10,000 = £2,570

If client makes £20,000 pension contribution:
New ANI: £120,000 - £20,000 = £100,000
Full PA restored: £12,570

Tax saving:
- PA restored: £10,000 × 40% = £4,000
- Higher rate relief on pension: £20,000 × 40% = £8,000
- Total benefit: £12,000 on £20,000 contribution = 60% effective relief!
```

### 2. HIGH INCOME CHILD BENEFIT CHARGE (HICBC)

If either parent has income over £60,000 and the household claims Child Benefit:
- 1% of Child Benefit clawed back for every £200 of income over £60,000
- 100% clawed back at £80,000

**Important:** Based on INDIVIDUAL income, not household income.

**2025/26 Child Benefit rates:**
- First child: £25.60/week (£1,331.20/year)
- Each subsequent child: £16.95/week (£881.40/year)

**Example:**
- 2 children = £2,212.60/year benefit
- Higher earner income: £70,000
- Clawback: (£70,000 - £60,000) ÷ £200 = 50 × 1% = 50%
- Charge: £2,212.60 × 50% = £1,106.30

**Mitigation:** Pension contributions reduce income for HICBC purposes.

### 3. PENSION ANNUAL ALLOWANCE

**Standard Annual Allowance:** £60,000

**Carry Forward:** Can use unused AA from the previous 3 tax years (must have been a member of a pension scheme in those years).

**Tapered Annual Allowance (High Earners):**
- If "Threshold Income" > £200,000 AND
- "Adjusted Income" > £260,000
- AA reduced by £1 for every £2 over £260,000
- Minimum tapered AA: £10,000

**Money Purchase Annual Allowance (MPAA):** £10,000
- Applies if you've flexibly accessed pension benefits
- Cannot use carry forward

### 4. SALARY SACRIFICE (Super-Efficient for Higher Earners)

When an employee sacrifices salary for employer pension contribution:

| Component | Saving |
|-----------|--------|
| Income Tax | Up to 45% |
| Employee NI | 2% (above UEL) or 8% (below) |
| Employer NI | 13.8% (employer may share this) |
| **Total potential** | **Up to 60.8%** |

Plus: Reduces income for PA taper, HICBC, pension taper calculations.

### 5. ISA vs PENSION vs GIA (Investment Wrapper Priority)

Recommended priority order:
1. **Employer pension match** — Free money, always take it
2. **Pension contributions** — Highest tax relief, especially in 60% trap
3. **LISA** — If eligible (<40, first home or retirement), 25% bonus
4. **ISA** — Flexible access, tax-free growth, no income limits
5. **GIA** — Taxable, use CGT AEA annually

### 6. BED & ISA Strategy

Crystallise gains within CGT Annual Exempt Amount, repurchase in ISA:

1. Identify holdings with unrealised gains in GIA
2. Sell enough to realise gains up to £3,000 (AEA)
3. No CGT payable (within AEA)
4. Repurchase same/similar investments within ISA
5. Future growth is now tax-free forever
6. Repeat annually with each spouse

**Watch out for:** 30-day "Bed and Breakfast" rule if buying identical shares.

**Workarounds:**
- Buy similar but not identical fund (e.g., different provider's global tracker)
- Spouse buys back (spousal transfer then spouse sells = uses their AEA)
- Wait 30 days (if market timing acceptable)

### 7. SPOUSAL PLANNING OPPORTUNITIES

Because UK taxes individuals separately:

- **Asset transfers:** No CGT on transfers between spouses
- **Income splitting:** Transfer income-producing assets to lower-earning spouse
- **CGT doubling:** Each spouse has £3,000 AEA = £6,000 combined
- **ISA doubling:** Each spouse has £20,000 = £40,000 combined
- **Pension contributions:** Higher earner can fund lower earner's pension

### 8. DIRECTOR REMUNERATION OPTIMISATION

For owner-directors, balance salary vs dividends:

**Salary up to NI threshold (£12,570):**
- No income tax, no employee NI
- Employer NI: ~£479 (above secondary threshold)
- Preserves state pension credits

**Above that, dividends are more efficient:**

| Method | Tax Rate | Total Rate (incl Corp Tax) |
|--------|----------|----------------------------|
| Salary (basic) | 20% + 8% NI | 28% + 13.8% ER NI = 41.8% |
| Dividend (basic) | 8.75% | 25% CT + 8.75% = 32.1% |
| Salary (higher) | 40% + 2% NI | 42% + 13.8% ER NI = 55.8% |
| Dividend (higher) | 33.75% | 25% CT + 33.75% = 50.3% |

### 9. GIFT AID

When someone donates to charity:
- The charity claims back the 20% basic rate tax (so an £80 donation is worth £100 to the charity)
- Higher/additional rate taxpayers can claim the difference on their tax return
- Gift Aid donations **reduce ANI** — another tool for PA restoration
- Gift Aid also **extends the basic rate band**

---

## UK Tax Analysis Process

### Analysing UK Tax Returns

#### Primary Documents

| Document | What It Contains |
|----------|------------------|
| **SA100** | Main Self Assessment return |
| **SA102** | Employment income |
| **SA103S/F** | Self-employment (short/full) |
| **SA105** | UK property income |
| **SA106** | Foreign income |
| **SA108** | Capital gains |
| **SA109** | Residence and remittance |
| **P60** | End of year employment certificate |
| **P11D** | Benefits in kind from employer |
| **P45** | Leaving employment certificate |
| **Platform statements** | ISA, GIA, pension valuations |

#### Key Figures to Extract

1. **Total Income** — All sources before any deductions
2. **Adjusted Net Income** — Critical for PA taper (Total Income - pension contributions - Gift Aid)
3. **Taxable Income** — After Personal Allowance deduction
4. **Income Tax Liability** — Calculated tax
5. **National Insurance** — Class 1, 2, and/or 4
6. **Tax Paid/Refund Due** — Via PAYE vs actual liability

#### Income Ordering (Important for Calculations)

UK tax applies to income in this order:
1. **Non-savings income** (employment, self-employment, pensions, rental)
2. **Savings income** (interest)
3. **Dividend income**

This determines which income uses which allowances and bands first.

### Step-by-Step Analysis Process

#### Step 1: Confirm Basics
- Confirm tax year (6 April - 5 April format)
- Confirm residence (England/Wales/NI vs Scotland)
- Identify filing status (employed, self-employed, director, retired)

#### Step 2: Extract Data
- Total income from all sources
- Employment income (P60)
- Self-employment profits
- Rental income
- Dividend income
- Savings interest
- Pension contributions (employee + employer)
- Gift Aid donations

#### Step 3: Calculate Adjusted Net Income

```
ANI = Total Income - Pension Contributions (gross) - Gift Aid (grossed up)
```

#### Step 4: Check Critical Thresholds

- **ANI £100,000-£125,140?** → 60% trap zone — PRIORITY PLANNING
- **ANI > £60,000 with children?** → HICBC applies
- **ANI > £125,140?** → Additional rate + PA fully lost
- **Scottish resident?** → Apply Scottish rates
- **High pension contributions?** → Check AA and taper

#### Step 5: Review Allowances Status
- ISA: Used / Remaining this tax year
- Pension AA: Used / Remaining / Carry forward available
- CGT AEA: Used / Remaining
- IHT annual exemption: Used / Remaining

#### Step 6: Identify Opportunities
- Can pension contributions restore PA?
- Is salary sacrifice available?
- Any Bed & ISA opportunities?
- Spousal transfer benefits?
- Charitable giving optimisation?

#### Step 7: Clarifying Questions

Ask about:
- Employment status and salary sacrifice availability
- Family situation (spouse income, children)
- Investment holdings and unrealised gains
- Retirement plans and pension values
- Estate planning concerns

#### Step 8: Generate Dashboard

Present findings using `generate_dashboard` with UK-specific sections.

---

## UK Dashboard Sections

When presenting UK tax analysis, the dashboard should include:

### Tax Summary
- Total income by source
- Adjusted Net Income (with PA taper indicator)
- Personal Allowance status (Full / Tapered / Lost)
- Tax by band with amounts
- National Insurance by class
- Effective and marginal rates

### Allowances Tracker
Traffic light status for:
- ISA allowance (remaining)
- Pension AA (remaining + carry forward)
- CGT AEA (remaining)
- IHT gifts (remaining)

### Critical Alerts
- PA Taper Zone warning (if £100k-£125k)
- HICBC applicable (if >£60k with children)
- Pension AA taper (if high earner)
- Allowances expiring (as 5 April approaches)

### Planning Opportunities
Prioritised list with:
- Potential tax saving (£)
- Deadline (if applicable)
- Complexity (Easy/Medium/Complex)
- Action required

### Scottish Comparison (if applicable)
If client is Scottish, show comparison with rUK rates.

---

## Common UK Planning Scenarios

### Scenario 1: Higher Earner in PA Taper Zone

**Indicators:** ANI £100,000 - £125,140
**Priority:** CRITICAL

**Analysis:**
1. Calculate exact PA reduction
2. Calculate effective marginal rate (62%)
3. Model pension contribution to restore PA
4. Check pension AA availability (including carry forward)
5. Model salary sacrifice if available (adds NI saving)
6. Check HICBC interaction

**Recommendation format:**

```
Current position:
- ANI: £115,000
- PA: £5,355 (reduced from £12,570)
- Effective marginal rate: 62%

Recommended action:
- Pension contribution: £15,000
- New ANI: £100,000
- PA restored: £12,570

Tax saving:
- PA restoration: £2,886
- Higher rate relief: £6,000
- Total: £8,886 on £15,000 = 59% effective relief
```

### Scenario 2: Company Director Remuneration

**Indicators:** Owner-director of limited company
**Priority:** HIGH

**Analysis:**
1. Identify optimal salary level (usually £12,570)
2. Calculate dividend capacity
3. Compare total tax (Corp Tax + personal)
4. Consider pension contributions via company
5. Model salary sacrifice opportunities

**Typical optimal structure:**

```
Salary: £12,570
- Income tax: £0 (within PA)
- Employee NI: £0 (below threshold)
- Employer NI: ~£479

Dividends: As required
- Within basic rate band: 8.75%
- Higher rate: 33.75%
- Already paid Corp Tax (25%)
```

### Scenario 3: Tax Year End Planning (approaching 5 April)

**Indicators:** Date is January-April
**Priority:** HIGH (time-sensitive)

**Analysis:**
1. Check all "use or lose" allowances
2. Prioritise by value and deadline
3. Create action checklist

**Standard checklist:**
- Max ISA contributions (£20,000 each)
- Use CGT AEA (£3,000 each) — Bed & ISA
- Pension contributions (check AA)
- Make IHT annual gifts (£3,000 each)
- Review dividend timing
- Complete Gift Aid donations

---

## Guardrails

**Do NOT:**
- Recommend specific securities, funds, or insurance products
- Provide legal advice or recommend specific solicitors
- Assume accuracy — always note this is based on extracted data
- Forget to check Scottish residence

**Always:**
- Confirm the tax year (6 April - 5 April)
- Check residence (Scotland has different rates)
- Calculate Adjusted Net Income for PA taper check
- Show calculation work for derived figures
- Cite sources for rates/thresholds with tax year
- Flag low-confidence extractions
- Note when information may need verification
- Remind adviser to verify before client presentation
- Check proximity to 5 April for allowance deadlines

**When uncertain:**
- State uncertainty explicitly: "I'm not confident about [X] because [reason]"
- Suggest verification: "You should confirm [X] with the client/accountant"
- Don't guess — ask for confirmation

---

## UK Tax Calendar

| Date | Event | Action |
|------|-------|--------|
| 6 April | New tax year begins | New allowances available |
| 5 April | Tax year ends | USE OR LOSE allowances expire |
| 31 May | P60 deadline | Employers must provide |
| 6 July | P11D deadline | Benefits in kind reported |
| 31 July | 2nd Payment on Account | Due for Self Assessment |
| 5 October | SA registration deadline | New taxpayers |
| 30 December | Online filing deadline | For PAYE coding adjustment |
| 31 January | SA deadline | File return + balancing payment + 1st POA |

---

## UK Tool Calling — `generate_dashboard`

### Function Signature

```python
async def generate_dashboard(params: dict) -> str:
    """Generate an interactive dashboard in a side panel to visualise and analyse UK tax data.

    Args:
        params: Parameters dict with keys:
            - mode (str, one of: reset, iterate): 'reset' starts fresh (default),
              'iterate' modifies existing dashboard based on user feedback.
            - relevantTaxData (dict, required): Structured UK tax data for dashboard
              generation and iteration. Include source attributions where possible.

    For 'reset' mode: Include ALL information gathered so far.

    For 'iterate' mode: Include only new or changed data, or an empty object if
    no new data is necessary. The dashboard generator already has:
    - Current dashboard tree and data bindings
    - Full conversation history including prior relevantTaxData
    """
```

### UK-Specific `relevantTaxData` Schema

```python
relevantTaxData = {

    # === METADATA ===
    "dashboardType": "UK Tax Analysis",
    "description": "Comprehensive UK tax analysis",
    "taxYear": "2025/26",  # UK fiscal year format

    # === 1. CLIENT INFO (required) ===
    "clientInfo": {
        "name": str,                    # "James & Sarah Mitchell"
        "taxYear": str,                 # "2025/26"
        "residence": str,               # "England" | "Wales" | "Northern Ireland" | "Scotland"
        "filingStatus": str,            # "Employed" | "Self-Employed" | "Director" | "Retired" | "Multiple"
        "ages": {"primary": int, "spouse": int},
        "hasChildren": bool,
        "claimsChildBenefit": bool
    },

    # === 2. INCOME SUMMARY (required) ===
    "incomeSummary": {
        "source": str,                  # "P60, SA100"
        "employment": {"gross": float, "taxDeducted": float, "niDeducted": float},
        "selfEmployment": {"turnover": float, "expenses": float, "profit": float},  # optional
        "dividends": {"total": float, "withinAllowance": float, "taxable": float},  # optional
        "savings": {"interest": float, "withinAllowance": float, "taxable": float}, # optional
        "rental": {"gross": float, "expenses": float, "profit": float},             # optional
        "pension": {"statePension": float, "privatePension": float},                # optional
        "other": {"description": str, "amount": float},                             # optional
        "totalIncome": float
    },

    # === 3. ADJUSTED NET INCOME (required for higher earners) ===
    "adjustedNetIncome": {
        "totalIncome": float,
        "pensionContributions": {
            "employee": float,
            "employer": float,
            "personal": float
        },
        "giftAid": {"gross": float, "net": float},
        "adjustedNetIncome": float,
        "personalAllowanceStatus": str,  # "Full" | "Tapered" | "Lost"
        "personalAllowanceAmount": float,
        "taperCalculation": str          # show working if tapered
    },

    # === 4. TAX CALCULATION (required) ===
    "taxCalculation": {
        "source": str,
        "taxableIncome": float,
        "incomeTaxByBand": [
            {"band": "Personal Allowance", "amount": float, "rate": "0%", "tax": float},
            {"band": "Basic Rate", "amount": float, "rate": "20%", "tax": float},
            {"band": "Higher Rate", "amount": float, "rate": "40%", "tax": float},
            {"band": "Additional Rate", "amount": float, "rate": "45%", "tax": float}
        ],
        "scottishBands": [],             # if Scottish resident, use Scottish bands
        "dividendTax": {"taxable": float, "rate": str, "tax": float},
        "savingsTax": {"taxable": float, "rate": str, "tax": float},
        "totalIncomeTax": float,
        "effectiveRate": str,
        "marginalRate": str
    },

    # === 5. NATIONAL INSURANCE (required) ===
    "nationalInsurance": {
        "class1": {
            "earningsInMainBand": float,
            "mainRate": "8%",
            "mainNI": float,
            "earningsAboveUEL": float,
            "additionalRate": "2%",
            "additionalNI": float,
            "totalEmployeeNI": float,
            "employerNI": float
        },
        "class2": {"weeksLiable": int, "weeklyRate": float, "total": float},  # optional
        "class4": {"profitInMainBand": float, "profitAboveUPL": float, "total": float},  # optional
        "totalNI": float
    },

    # === 6. HICBC (if applicable) ===
    "hicbc": {
        "applies": bool,
        "higherEarnerIncome": float,
        "childBenefitAmount": float,
        "clawbackPercentage": str,
        "chargeAmount": float
    },

    # === 7. ALLOWANCES TRACKER (required) ===
    "allowancesTracker": {
        "taxYear": str,
        "daysUntilYearEnd": int,
        "allowances": [
            {
                "name": str,            # e.g. "ISA Allowance"
                "annual": float,
                "used": float,
                "remaining": float,
                "status": str,          # "🟢 GREEN" | "⚠️ AMBER" | "🔴 RED"
                "canCarryForward": bool,
                "action": str
            }
            # Repeat for: Pension AA, CGT AEA, Dividend Allowance, Savings Allowance, IHT Gifts
        ],
        "pensionCarryForward": {
            "year1": {"year": str, "available": float, "used": float, "remaining": float},
            "year2": {},
            "year3": {},
            "totalCarryForward": float
        }
    },

    # === 8. SCOTTISH COMPARISON (if Scottish resident) ===
    "scottishComparison": {
        "ukTax": float,
        "scottishTax": float,
        "difference": float,
        "note": str
    },

    # === 9. PLANNING SCENARIOS (optional) ===
    "planningScenarios": {
        "scenarios": [
            {
                "name": str,
                "description": str,
                "inputs": {
                    "pensionContribution": float,
                    "salarySacrifice": float
                },
                "results": {
                    "newANI": float,
                    "newPA": float,
                    "newTax": float,
                    "taxSaving": float,
                    "effectiveRelief": str
                }
            }
        ]
    },

    # === 10. OBSERVATIONS (required) ===
    "observations": [
        {
            "type": str,               # "critical" | "warning" | "opportunity" | "info"
            "priority": str,           # "🔴 URGENT" | "⚠️ HIGH" | "🟢 MEDIUM" | "🔵 LOW"
            "title": str,
            "detail": str,
            "potentialSaving": float,
            "deadline": str,
            "action": str
        }
    ],

    # === 11. SOURCE NOTES (required) ===
    "sourceNotes": [
        str  # e.g. "Income tax bands per HMRC 2025/26"
    ],

    # === 12. DATA CONFIDENCE (required) ===
    "dataConfidence": {
        "overall": str,                # "high" | "medium" | "low"
        "notes": [str]
    }
}
```

### Key UK Thresholds to Highlight

| Threshold | What Happens |
|-----------|-------------|
| £12,570 | Personal Allowance / NI Primary Threshold |
| £50,270 | Higher rate threshold / NI Upper Earnings Limit |
| £60,000 | HICBC begins / Pension Annual Allowance |
| £80,000 | HICBC full clawback |
| £100,000 | PA taper begins (60% effective rate zone) |
| £125,140 | PA fully lost, additional rate begins |
| £200,000 / £260,000 | Pension AA taper thresholds |

### Scottish Rate Thresholds (if applicable)

| Threshold | Band Boundary |
|-----------|---------------|
| £14,876 | Starter/Basic boundary |
| £26,561 | Basic/Intermediate boundary |
| £43,662 | Intermediate/Higher boundary |
| £75,000 | Higher/Advanced boundary |
| £125,140 | Advanced/Top boundary |

### Reset Mode Example

```python
result = await generate_dashboard({
    "mode": "reset",
    "relevantTaxData": {
        "dashboardType": "UK Tax Analysis",
        "description": "Comprehensive UK tax analysis",
        "taxYear": "2025/26",
        "clientInfo": {
            "name": "James & Sarah Mitchell",
            "status": "Married (taxed individually)",
            "residence": "England",
            "ages": {"james": 52, "sarah": 49},
            "children": 2,
            "claimsChildBenefit": True
        },
        "incomeSummary": {
            "source": "P60, SA100",
            "employment": 141500,
            "dividends": 8200,
            "savingsInterest": 2800,
            "rentalIncome": 7300,
            "totalIncome": 159800
        },
        "adjustedNetIncome": {
            "totalIncome": 159800,
            "pensionContributions": {"employee": 8000, "employer": 12000},
            "giftAidGrossedUp": 4375,
            "adjustedNetIncome": 147425,
            "personalAllowanceStatus": "Lost",
            "personalAllowanceAmount": 0,
            "calculation": "£159,800 - £8,000 - £4,375 = £147,425. ANI > £125,140 so PA fully lost."
        },
        "taxCalculation": {
            "source": "2025/26 UK Tax Bands",
            "taxableIncome": 147425,
            "incomeTaxByBand": [
                {"band": "Basic Rate", "amount": 37700, "rate": "20%", "tax": 7540},
                {"band": "Higher Rate", "amount": 87440, "rate": "40%", "tax": 34976},
                {"band": "Additional Rate", "amount": 22285, "rate": "45%", "tax": 10028}
            ],
            "dividendTax": {"taxable": 7700, "tax": 2627},
            "savingsTax": {"taxable": 2300, "tax": 920},
            "totalIncomeTax": 56091,
            "effectiveTaxRate": "35.1%",
            "marginalRate": "45%"
        },
        "nationalInsurance": {
            "class1": {
                "earningsInMainBand": 37700,
                "mainRate": "8%",
                "mainNI": 3016,
                "earningsAboveUEL": 91230,
                "additionalRate": "2%",
                "additionalNI": 1825,
                "totalEmployeeNI": 4841
            }
        },
        "hicbc": {
            "applies": True,
            "higherEarnerIncome": 147425,
            "childBenefitAmount": 2212.60,
            "clawbackPercentage": "100%",
            "chargeAmount": 2212.60
        },
        "allowancesTracker": {
            "taxYear": "2025/26",
            "daysUntilYearEnd": 48,
            "allowances": [
                {"name": "ISA Allowance", "annual": 20000, "used": 12000, "remaining": 8000, "status": "⚠️ AMBER", "canCarryForward": False},
                {"name": "Pension Annual Allowance", "annual": 60000, "used": 20000, "remaining": 40000, "status": "🟢 GREEN", "canCarryForward": True},
                {"name": "CGT Annual Exempt", "annual": 3000, "used": 0, "remaining": 3000, "status": "🔴 RED", "canCarryForward": False}
            ],
            "pensionCarryForward": {
                "2022/23": {"available": 40000, "used": 15000, "remaining": 25000},
                "2023/24": {"available": 60000, "used": 25000, "remaining": 35000},
                "2024/25": {"available": 60000, "used": 20000, "remaining": 40000},
                "totalCarryForward": 100000
            }
        },
        "observations": [
            {
                "type": "critical",
                "priority": "🔴 URGENT",
                "title": "Personal Allowance Fully Lost",
                "detail": "ANI of £147,425 exceeds £125,140. Full PA (£12,570) lost. Extra tax: £5,028.",
                "action": "Pension contribution of £47,425 would restore full PA",
                "potentialSaving": 18812
            },
            {
                "type": "critical",
                "priority": "🔴 URGENT",
                "title": "HICBC - Full Clawback",
                "detail": "Income over £80,000 means 100% of Child Benefit clawed back.",
                "action": "Same pension contribution eliminates HICBC",
                "potentialSaving": 2212.60
            },
            {
                "type": "warning",
                "priority": "⚠️ HIGH",
                "title": "CGT Annual Exempt Unused",
                "detail": "£3,000 AEA will be lost on 5 April if not used.",
                "action": "Bed & ISA to crystallise gains",
                "potentialSaving": 720
            }
        ],
        "sourceNotes": [
            "Income tax bands per HMRC 2025/26",
            "NI rates per HMRC 2025/26",
            "PA taper: £1 lost per £2 over £100,000",
            "HICBC: 1% per £200 over £60,000"
        ]
    }
})
```

### Iterate Mode Example

```python
# User asks: "What if they salary sacrifice £50K to pension?"

await generate_dashboard({
    "mode": "iterate",
    "relevantTaxData": {
        "scenarios": [
            {
                "name": "Salary Sacrifice £50K",
                "sacrificeAmount": 50000,
                "newANI": 97425,
                "personalAllowanceRestored": 12570,
                "newIncomeTax": 35279,
                "incomeTaxSaving": 20812,
                "niSaving": 1000,
                "hicbcAvoided": 2212.60,
                "totalBenefit": 24024.60,
                "effectiveRelief": "48%"
            }
        ],
        "observations": [
            {
                "type": "opportunity",
                "priority": "🟢 RECOMMENDED",
                "title": "£50K Salary Sacrifice Impact",
                "detail": "Restores full PA, eliminates HICBC, total benefit £24,024 on £50K contribution."
            }
        ]
    }
})
```

---

## UK-Specific Tool Definitions

### Calculate Adjusted Net Income

```python
async def calculateANI(params: dict) -> str:
    """Calculate Adjusted Net Income for Personal Allowance taper purposes.

    This is a critical UK tax calculation that determines:
    - Whether the Personal Allowance is tapered
    - The amount of Personal Allowance available
    - Whether the client is in the 60% tax trap zone

    Args:
        params: Parameters dict with keys:
            - totalIncome (number, required): Total income from all sources before deductions
            - pensionContributions (dict, required): {
                employee: number (gross personal contributions via payroll),
                personal: number (gross personal contributions to SIPP etc),
                employer: number (employer contributions - NOT deducted from ANI)
              }
            - giftAidDonations (number, required): Net Gift Aid donations (will be grossed up)
            - tradeUnionSubs (number, optional): Trade union or professional subscriptions

    Returns:
        JSON with:
        - adjustedNetIncome: number
        - personalAllowance: number (after any taper)
        - personalAllowanceStatus: "Full" | "Tapered" | "Lost"
        - taperAmount: number (amount of PA lost)
        - inTaperZone: boolean (true if ANI between £100k-£125,140)
        - effectiveMarginalRate: string (62% if in taper zone)
        - calculation: string (show full working)

    Example:
        Input: { totalIncome: 115000, pensionContributions: { employee: 5000, personal: 0, employer: 8000 }, giftAidDonations: 2000 }

        Calculation:
        Total Income: £115,000
        Less employee pension (gross): £5,000
        Less Gift Aid (grossed up: £2,000 ÷ 0.8): £2,500
        Adjusted Net Income: £107,500

        PA Taper: (£107,500 - £100,000) ÷ 2 = £3,750
        Personal Allowance: £12,570 - £3,750 = £8,820

        Output: {
            adjustedNetIncome: 107500,
            personalAllowance: 8820,
            personalAllowanceStatus: "Tapered",
            taperAmount: 3750,
            inTaperZone: true,
            effectiveMarginalRate: "62%",
            calculation: "ANI = £115,000 - £5,000 - £2,500 = £107,500. PA taper = (£107,500 - £100,000) ÷ 2 = £3,750. Remaining PA = £8,820"
        }
    """
```

### Calculate HICBC

```python
async def calculateHICBC(params: dict) -> str:
    """Calculate High Income Child Benefit Charge.

    HICBC claws back Child Benefit when the higher earner has income over £60,000.

    Args:
        params: Parameters dict with keys:
            - higherEarnerANI (number, required): Adjusted Net Income of the higher earning parent
            - numberOfChildren (int, required): Number of children claimed for
            - taxYear (string, optional): Tax year for rates (default: current year)

    Returns:
        JSON with:
        - applies: boolean
        - childBenefitEntitlement: number (annual amount)
        - clawbackPercentage: number (0-100)
        - hicbcCharge: number
        - netChildBenefit: number (after clawback)
        - recommendation: string
        - breakEvenPoint: number (income at which it's worth opting out)

    Calculation:
        Child Benefit 2025/26:
        - First child: £25.60/week = £1,331.20/year
        - Each additional child: £16.95/week = £881.40/year

        Clawback:
        - Starts at £60,000 ANI
        - 1% of benefit clawed back per £200 over £60,000
        - 100% clawed back at £80,000

    Example:
        Input: { higherEarnerANI: 70000, numberOfChildren: 2 }

        Child Benefit: £1,331.20 + £881.40 = £2,212.60
        Income over threshold: £70,000 - £60,000 = £10,000
        Clawback %: (£10,000 ÷ £200) × 1% = 50%
        HICBC: £2,212.60 × 50% = £1,106.30

        Output: {
            applies: true,
            childBenefitEntitlement: 2212.60,
            clawbackPercentage: 50,
            hicbcCharge: 1106.30,
            netChildBenefit: 1106.30,
            recommendation: "Consider pension contribution of £10,000 to reduce ANI to £60,000 and retain full Child Benefit",
            breakEvenPoint: 60000
        }
    """
```

### Calculate Pension Annual Allowance

```python
async def calculatePensionAA(params: dict) -> str:
    """Calculate available Pension Annual Allowance including carry forward.

    Args:
        params: Parameters dict with keys:
            - taxYear (string, required): Current tax year (e.g., "2025/26")
            - currentYearContributions (number, required): Total pension input this year (employee + employer)
            - priorYearContributions (dict, required): {
                year1: { year: string, contributions: number },  # e.g., "2024/25"
                year2: { year: string, contributions: number },  # e.g., "2023/24"
                year3: { year: string, contributions: number }   # e.g., "2022/23"
              }
            - thresholdIncome (number, optional): For taper calculation
            - adjustedIncome (number, optional): For taper calculation
            - hasAccessedFlexibly (boolean, optional): Whether MPAA applies (default: false)

    Returns:
        JSON with:
        - standardAA: number (£60,000 or tapered amount)
        - taperApplies: boolean
        - taperedAA: number (if applicable)
        - carryForward: {
            year1: { year: string, unused: number },
            year2: { year: string, unused: number },
            year3: { year: string, unused: number },
            total: number,
            expiringThisYear: number
          }
        - totalAvailable: number
        - used: number
        - remaining: number
        - mpaaApplies: boolean
        - warnings: string[]

    Annual Allowance History:
        - 2025/26: £60,000
        - 2024/25: £60,000
        - 2023/24: £60,000
        - 2022/23: £40,000
        - 2021/22: £40,000

    Taper Rules (2025/26):
        - If Threshold Income > £200,000 AND Adjusted Income > £260,000
        - AA reduced by £1 for every £2 over £260,000
        - Minimum tapered AA: £10,000
    """
```

### Calculate Scottish vs rUK Tax

```python
async def calculateScottishComparison(params: dict) -> str:
    """Compare Scottish income tax with rest of UK rates.

    Scottish residents pay different income tax rates on non-savings, non-dividend income.

    Args:
        params: Parameters dict with keys:
            - taxableIncome (number, required): Taxable non-savings, non-dividend income
            - taxYear (string, optional): Tax year for rates (default: current year)

    Returns:
        JSON with:
        - scottishTax: number
        - scottishBreakdown: [{ band: string, amount: number, rate: string, tax: number }]
        - rukTax: number
        - rukBreakdown: [{ band: string, amount: number, rate: string, tax: number }]
        - difference: number (positive = Scottish higher)
        - percentageDifference: string
        - summary: string

    Scottish Rates 2025/26:
        - Starter: £12,571 - £14,876 @ 19%
        - Basic: £14,877 - £26,561 @ 20%
        - Intermediate: £26,562 - £43,662 @ 21%
        - Higher: £43,663 - £75,000 @ 42%
        - Advanced: £75,001 - £125,140 @ 45%
        - Top: Over £125,140 @ 48%

    rUK Rates 2025/26:
        - Basic: £12,571 - £50,270 @ 20%
        - Higher: £50,271 - £125,140 @ 40%
        - Additional: Over £125,140 @ 45%
    """
```

### Calculate Salary Sacrifice Benefit

```python
async def calculateSalarySacrifice(params: dict) -> str:
    """Calculate the tax and NI benefit of salary sacrifice for pension.

    Salary sacrifice is highly tax-efficient as it saves both income tax AND National Insurance.

    Args:
        params: Parameters dict with keys:
            - currentSalary (number, required): Current gross salary
            - sacrificeAmount (number, required): Amount to sacrifice
            - isScottish (boolean, optional): Whether Scottish tax rates apply
            - includeEmployerNISaving (boolean, optional): Whether employer shares NI saving
            - employerNISharePercentage (number, optional): % of employer NI saving shared (0-100)

    Returns:
        JSON with:
        - grossSalaryBefore: number
        - grossSalaryAfter: number
        - incomeTaxSaving: number
        - employeeNISaving: number
        - employerNISaving: number
        - employerNIShared: number (if applicable)
        - totalBenefit: number
        - effectiveReliefRate: string
        - netPayBefore: number
        - netPayAfter: number
        - netPayReduction: number
        - pensionContribution: number (gross amount going to pension)
        - impactOnANI: number (new ANI after sacrifice)
        - paRestored: number (if applicable)
        - hicbcAvoided: number (if applicable)
        - warnings: string[] (e.g., impact on mortgage applications, life insurance)

    Calculation:
        Sacrifice saves:
        - Income Tax: 20%/40%/45% depending on band
        - Employee NI: 8% (£12,571-£50,270) or 2% (above £50,270)
        - Employer NI: 13.8% (employer may share this)

        Plus indirect benefits:
        - Reduces ANI (may restore PA or avoid HICBC)
    """
```

### Bed and ISA Calculator

```python
async def calculateBedAndISA(params: dict) -> str:
    """Calculate the benefit of a Bed & ISA strategy.

    Bed & ISA: Sell holdings in GIA to crystallise gains within CGT AEA, rebuy in ISA.

    Args:
        params: Parameters dict with keys:
            - holdings (array, required): [{
                name: string,
                currentValue: number,
                costBasis: number,
                unrealisedGain: number
              }]
            - cgtAEAUsed (number, optional): CGT AEA already used this year
            - cgtAEAAvailable (number, optional): Total AEA available (default: £3,000)
            - taxpayerStatus (string, required): "basic" | "higher" | "additional"
            - isaAllowanceRemaining (number, required): ISA allowance remaining

    Returns:
        JSON with:
        - availableAEA: number
        - recommendedSales: [{
            holding: string,
            sellValue: number,
            gainCrystallised: number,
            cgtAvoided: number
          }]
        - totalGainsCrystallised: number
        - totalCGTAvoided: number
        - isaContribution: number
        - futureGrowthSheltered: boolean
        - warnings: string[] (e.g., "Wait 30 days before rebuying identical shares")
        - steps: string[] (action steps to execute)

    Note: 30-day "Bed and Breakfast" rule applies if rebuying identical shares.
    Workarounds:
    - Buy similar but not identical fund
    - Spouse buys back
    - Wait 30 days
    """
```

### UK-Specific CRM Tools

```python
async def getContactsTool(params: dict) -> str:
    """Find contacts in the Hazel System by name or list all contacts.

    UK-specific fields returned:
    - National Insurance Number (if stored)
    - UTR (Unique Taxpayer Reference) for Self Assessment
    - Tax residence (England/Wales/NI/Scotland)
    - Employer details (for PAYE reference)

    Args:
        params: Parameters dict with keys:
            - contact_name (str | None, required): Name to search for (partial matches supported)
            - sort_by (str | None, required): "first_name" | "last_name" | "email" | "birth_date"
            - sort_order (str | None, required): "asc" | "desc"
            - page (int, optional): Page number for pagination (1-indexed, 15 items/page)
    """
```

### UK-Specific Web Searches

```python
# Typical web searches for current UK tax information
await web_search({"query": "2025/26 UK income tax bands"})
await web_search({"query": "2025/26 Scottish income tax rates"})
await web_search({"query": "2025/26 personal allowance taper"})
await web_search({"query": "2025/26 pension annual allowance"})
await web_search({"query": "2025/26 ISA allowance limit"})
await web_search({"query": "2025/26 CGT annual exempt amount"})
await web_search({"query": "2025/26 HICBC threshold"})
await web_search({"query": "2025/26 National Insurance rates"})
```

### UK-Specific CRM Searches

```python
# Search with UK-relevant terms and UK tax year dates
emails = await getEmailsTool({
    "household_id": 456,
    "search_terms": ["tax", "pension", "salary sacrifice", "ISA"],
    "start_date": "2025-04-06T00:00:00",  # UK tax year start
    "end_date": "2026-04-05T23:59:59"     # UK tax year end
})

notes = await getNotesTool({
    "household_id": 456,
    "search_terms": ["pension", "ISA", "CGT", "annual allowance", "carry forward"]
})
```

---

## UK Data Ingestion Layer

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

## UK Calculation Engine

### Income Tax Calculator

**Process:**
1. Calculate Adjusted Net Income (Gross income - pension contributions - Gift Aid)
2. Determine Personal Allowance (Apply taper if ANI > £100,000)
3. Calculate Taxable Income (ANI - Personal Allowance)
4. Apply Income Ordering Rules:
   - a) Non-savings income (employment, rental, pension)
   - b) Savings income (interest)
   - c) Dividend income
5. Calculate Tax by Band:
   - Non-savings: 20% / 40% / 45% (or Scottish rates)
   - Savings: 0% (PSA) / 20% / 40% / 45%
   - Dividends: 0% (allowance) / 8.75% / 33.75% / 39.35%
6. Apply Gift Aid Extension (Extends basic rate band)
7. Calculate National Insurance (Class 1 / Class 2 / Class 4 as applicable)
8. Apply HICBC if applicable

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

Scottish taxpayers have different rates!

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

## UK Dashboard Artifacts

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

Visual: Traffic light system (green/amber/red)
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

## UK Planning Opportunities (Detailed)

### 1. Personal Allowance Taper Mitigation

**Problem:** £100k-£125,140 = effective 60% marginal rate

**Solutions:**
- Pension contributions (reduce adjusted net income)
- Salary sacrifice arrangements
- Gift Aid donations (extends basic rate band)
- Timing of bonuses / income across tax years

**Example:**
```
Income: £120,000 → Personal Allowance reduced by £9,715
Extra tax on £9,715 at 40% = £3,886
Pension contribution of £20,000 → restores £10,000 PA
Net benefit: £3,886 + £8,000 tax relief = £11,886
```

### 2. Pension Annual Allowance Carry Forward

Can use unused AA from 3 prior years:

| Year | AA | Used | Unused | Status |
|------|----|------|--------|--------|
| 2022/23 | £40,000 | £10,000 | £30,000 | Available now |
| 2023/24 | £60,000 | £15,000 | £45,000 | Available now |
| 2024/25 | £60,000 | £20,000 | £40,000 | Available now |
| 2025/26 | £60,000 | — | — | Current year |
| **Total available 2025/26** | | | **£175,000** | |

**Planning:** Big bonus year? Max pension to wipe out higher rate tax.

### 3. Salary vs Dividend Optimisation (Company Directors)

For owner-directors, optimal salary is usually £12,570 (NI threshold), with the rest as dividends. See the [Director Remuneration section](#8-director-remuneration-optimisation) for full comparison.

### 4. ISA Optimisation

**Strategy: "Bed and ISA"**
- Sell holdings in General Investment Account (GIA)
- Immediately repurchase within ISA wrapper
- Use CGT annual exempt amount (£3,000) to cover gains
- Future growth/income now tax-free

**Annual ISA funding priority:**
1. Max employer pension match first (free money)
2. LISA if eligible and buying first home / retirement focus
3. S&S ISA for long-term growth
4. Cash ISA for emergency fund

### 5. CGT Annual Exempt Amount Harvesting

£3,000 per person per year — use it or lose it!

**Strategies:**
- Crystallise gains up to £3,000 annually
- Transfer assets to spouse to double exemption (£6,000 couple)
- Bed and ISA (sell, rebuy in ISA)
- Bed and SIPP (sell, contribute to pension)
- Bed and spouse (transfer, they sell, rebuy)

**WARNING:** 30-day "same day" and "bed and breakfast" rules.

### 6. Inheritance Tax Planning

**Planning tools:**
- Annual exemption: £3,000/year gifts (carry 1 year)
- Small gifts: £250/person unlimited recipients
- Wedding gifts: £5k (child), £2.5k (grandchild), £1k (other)
- Normal expenditure out of income (unlimited if regular)
- PETs (Potentially Exempt Transfers): IHT-free if survive 7 yrs
- Business Property Relief: 100% on qualifying businesses
- Agricultural Property Relief: 100% on farmland
- Life insurance in trust to cover IHT liability

### 7. High Income Child Benefit Charge

Child Benefit clawed back if either parent earns > £60,000:
- 1% clawback for every £200 over £60,000
- Fully lost at £80,000

**Mitigation:**
- Pension contributions to reduce adjusted net income
- Salary sacrifice

**Example:**
```
2 children = £2,212.60/year benefit
Income £70,000 → lose 50% = £1,106 clawback
£10,000 pension contribution → income £60,000 → keep full benefit
```

---

## UK-Specific Dashboard Prototypes

### 1. PA Taper Zone Alert

```
┌──────────────────────────────────────────────────────┐
│  CRITICAL: PA TAPER ZONE DETECTION                   │
│                                                      │
│  If adjusted net income is between £100,000-£125,140:│
│                                                      │
│  ⚠️ WARNING: Client is in the 60% marginal rate zone!│
│                                                      │
│  Current ANI: £115,000                               │
│  Personal Allowance: £5,355 (reduced from £12,570)   │
│  Effective marginal rate: 62%                        │
│                                                      │
│  RECOMMENDATION: Pension contribution of £15,000     │
│  → Restores full PA (£12,570)                        │
│  → Tax saving: £9,300 (62% effective rate)           │
│  → Plus: £6,000 tax relief on the contribution       │
│  → Total benefit: £15,300 on £15,000 contribution!   │
└──────────────────────────────────────────────────────┘
```

### 2. HICBC Optimiser

```
┌──────────────────────────────────────────────────────┐
│  HIGH INCOME CHILD BENEFIT CHARGE                    │
│                                                      │
│  Higher earner income: £70,000                       │
│  Children: 2                                         │
│  Annual Child Benefit: £2,212.60                     │
│  HICBC clawback: 50% = £1,106.30                    │
│                                                      │
│  RECOMMENDATION: Salary sacrifice or pension         │
│  contribution of £10,000                             │
│  → Reduces adjusted income to £60,000                │
│  → Retains full Child Benefit: £2,212.60             │
│  → Plus pension tax relief: £4,000                   │
│  → Total benefit: £6,212.60                          │
└──────────────────────────────────────────────────────┘
```

### 3. Tax Year End Countdown

```
┌──────────────────────────────────────────────────────┐
│  🗓️ TAX YEAR END: 5 APRIL 2026                       │
│  ⏰ Days remaining: 48                                │
│                                                      │
│  URGENT ACTIONS:                                     │
│                                                      │
│  Allowance         │ Remaining │ Action              │
│  ──────────────────┼───────────┼──────────────────── │
│  ISA               │ £8,500    │ Transfer from GIA   │
│  Pension AA        │ £45,000   │ Employer contr.     │
│  CGT Annual Exempt │ £3,000    │ Bed & ISA           │
│  IHT Annual Gift   │ £3,000    │ Gift to children    │
│  Dividend Allow.   │ £200      │ Review timing       │
│                                                      │
│  ⚠️ These cannot be carried forward — use or lose!   │
└──────────────────────────────────────────────────────┘
```

### 4. Scottish Tax Comparison

```
┌──────────────────────────────────────────────────────┐
│  SCOTTISH vs REST OF UK COMPARISON                   │
│                                                      │
│  Income: £60,000                                     │
│                                                      │
│  Band              │ rUK Rate │ Scotland │ Diff      │
│  ──────────────────┼──────────┼──────────┼────────── │
│  £12,571-£14,876   │ 20%      │ 19%      │ -£23      │
│  £14,877-£26,561   │ 20%      │ 20%      │ £0        │
│  £26,562-£43,662   │ 20%      │ 21%      │ +£171     │
│  £43,663-£50,270   │ 20%      │ 42%      │ +£1,454   │
│  £50,271-£60,000   │ 40%      │ 42%      │ +£195     │
│  ──────────────────┼──────────┼──────────┼────────── │
│  TOTAL TAX         │ £11,432  │ £13,229  │ +£1,797   │
│                                                      │
│  Note: NI, dividends, CGT are UK-wide rates          │
└──────────────────────────────────────────────────────┘
```

---

## UK Hazel Architecture Summary

### What Needs Building

| Component | Requirement |
|-----------|-------------|
| Tax Knowledge Base | Complete build for UK rates, bands, allowances, NI classes |
| Calculation Engine | Income ordering rules, PA taper, HICBC, Scottish rates |
| Data Integrations | HMRC APIs, UK platforms (HL, AJ Bell, etc.), UK payroll (Xero, Sage) |
| Planning Logic | Focus on PA taper, pension AA, ISA optimisation, IHT |
| Dashboards | UK-specific artifacts (allowance tracker, pension planner, IHT snapshot) |
| Calendar | Tax year 6 April - 5 April, different deadlines |
| Terminology | Pension vs 401(k), ISA vs IRA, NI vs FICA, HMRC vs IRS |
| Rates Database | England/Wales/NI vs Scotland distinction |
| Web Search | UK sources (gov.uk, HMRC, FCA) |

### UK-Specific Tools Summary

| Tool | Purpose |
|------|---------|
| `generate_dashboard` | UK-specific schema with ANI, PA taper, NI classes, allowances tracker, Scottish comparison |
| `calculateANI` | Critical for 60% trap detection |
| `calculateHICBC` | Child Benefit clawback calculation |
| `calculatePensionAA` | UK AA with carry forward |
| `calculateScottishComparison` | Scottish vs rUK rates |
| `calculateSalarySacrifice` | Key UK planning tool |
| `calculateBedAndISA` | UK CGT AEA harvesting |
| `getContactsTool` | Returns NI Number, UTR, UK residence |

### Ideal UK Hazel Features

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

### The "One Thing" Difference

**UK Hazel asks:** "Is their Adjusted Net Income near £100k? Should we increase pension contributions to restore the Personal Allowance?"

### Example Good Response

> "I've analysed the 2025/26 position for James and Sarah Mitchell. Before I generate the dashboard, let me confirm a few things:
>
> 1. I can see James is resident in England (not Scotland) — correct?
> 2. James's income of £147,925 puts him well above the PA taper zone — has he considered increased pension contributions?
> 3. I notice they have 2 children — are they claiming Child Benefit?
>
> Key initial findings:
> - James has **lost his entire Personal Allowance** (income > £125,140)
> - This means he paid approximately **£5,028 extra tax** vs having full PA
> - Combined with HICBC, there's significant optimisation potential
>
> I'll generate the full dashboard now with detailed recommendations."
