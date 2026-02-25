# UK Hazel — Tool Definitions & Data Schemas

> Function signatures, docstrings, and data schemas for every tool UK Hazel can call. These define the API surface of the system.

---

## Table of Contents

1. [generate_dashboard (Core Tool)](#generate_dashboard)
2. [relevantTaxData Schema](#relevanttaxdata-schema)
3. [calculateANI](#calculateani)
4. [calculateHICBC](#calculatehicbc)
5. [calculatePensionAA](#calculatepensionaa)
6. [calculateScottishComparison](#calculatescottishcomparison)
7. [calculateSalarySacrifice](#calculatesalarysacrifice)
8. [calculateBedAndISA](#calculatebedandisa)
9. [CRM Tools (UK-adapted)](#crm-tools)
10. [Web Search Patterns](#web-search-patterns)
11. [CRM Search Patterns](#crm-search-patterns)
12. [Usage Examples](#usage-examples)

---

## generate_dashboard

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

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `mode` | string | Yes | `"reset"` = create from scratch; `"iterate"` = modify existing |
| `relevantTaxData` | dict | Yes | Structured data object that powers the dashboard |

---

## relevantTaxData Schema

The core data structure passed to `generate_dashboard`. Flexible — not all fields are required.

```python
relevantTaxData = {

    # === METADATA ===
    "dashboardType": "UK Tax Analysis",       # str
    "description": "Comprehensive UK tax analysis",  # str
    "taxYear": "2025/26",                     # UK fiscal year format

    # === 1. CLIENT INFO (required) ===
    "clientInfo": {
        "name": str,                          # "James & Sarah Mitchell"
        "taxYear": str,                       # "2025/26"
        "residence": str,                     # "England" | "Wales" | "Northern Ireland" | "Scotland"
        "filingStatus": str,                  # "Employed" | "Self-Employed" | "Director" | "Retired" | "Multiple"
        "ages": {"primary": int, "spouse": int},
        "hasChildren": bool,
        "claimsChildBenefit": bool
    },

    # === 2. INCOME SUMMARY (required) ===
    "incomeSummary": {
        "source": str,                        # "P60, SA100"
        "employment": {"gross": float, "taxDeducted": float, "niDeducted": float},
        "selfEmployment": {"turnover": float, "expenses": float, "profit": float},
        "dividends": {"total": float, "withinAllowance": float, "taxable": float},
        "savings": {"interest": float, "withinAllowance": float, "taxable": float},
        "rental": {"gross": float, "expenses": float, "profit": float},
        "pension": {"statePension": float, "privatePension": float},
        "other": {"description": str, "amount": float},
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
        "personalAllowanceStatus": str,       # "Full" | "Tapered" | "Lost"
        "personalAllowanceAmount": float,
        "taperCalculation": str               # show working if tapered
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
        "scottishBands": [],                  # if Scottish, use Scottish bands instead
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
        "class2": {"weeksLiable": int, "weeklyRate": float, "total": float},
        "class4": {"profitInMainBand": float, "profitAboveUPL": float, "total": float},
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
                "name": str,                  # "ISA Allowance", "Pension AA", "CGT AEA", etc.
                "annual": float,
                "used": float,
                "remaining": float,
                "status": str,                # "🟢 GREEN" | "⚠️ AMBER" | "🔴 RED"
                "canCarryForward": bool,
                "action": str
            }
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
                "inputs": {"pensionContribution": float, "salarySacrifice": float},
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
            "type": str,                      # "critical" | "warning" | "opportunity" | "info"
            "priority": str,                  # "🔴 URGENT" | "⚠️ HIGH" | "🟢 MEDIUM" | "🔵 LOW"
            "title": str,
            "detail": str,
            "potentialSaving": float,
            "deadline": str,
            "action": str
        }
    ],

    # === 11. SOURCE NOTES (required) ===
    "sourceNotes": [str],                     # e.g. "Income tax bands per HMRC 2025/26"

    # === 12. DATA CONFIDENCE (required) ===
    "dataConfidence": {
        "overall": str,                       # "high" | "medium" | "low"
        "notes": [str]
    }
}
```

---

## calculateANI

```python
async def calculateANI(params: dict) -> str:
    """Calculate Adjusted Net Income for Personal Allowance taper purposes.

    This is a critical UK tax calculation that determines:
    - Whether the Personal Allowance is tapered
    - The amount of Personal Allowance available
    - Whether the client is in the 60% tax trap zone

    Args:
        params:
            - totalIncome (number, required): Total income before deductions
            - pensionContributions (dict, required): {
                employee: number,   # gross personal contributions via payroll
                personal: number,   # gross personal contributions to SIPP etc
                employer: number    # employer contributions — NOT deducted from ANI
              }
            - giftAidDonations (number, required): Net Gift Aid donations (will be grossed up)
            - tradeUnionSubs (number, optional): Trade union or professional subscriptions

    Returns:
        - adjustedNetIncome: number
        - personalAllowance: number (after any taper)
        - personalAllowanceStatus: "Full" | "Tapered" | "Lost"
        - taperAmount: number (amount of PA lost)
        - inTaperZone: boolean (true if ANI between £100k-£125,140)
        - effectiveMarginalRate: string (62% if in taper zone)
        - calculation: string (show full working)

    Example:
        Input:  { totalIncome: 115000, pensionContributions: { employee: 5000, personal: 0, employer: 8000 }, giftAidDonations: 2000 }
        ANI:    £115,000 - £5,000 - £2,500 (Gift Aid grossed up) = £107,500
        Taper:  (£107,500 - £100,000) ÷ 2 = £3,750
        PA:     £12,570 - £3,750 = £8,820
        Status: "Tapered"
    """
```

---

## calculateHICBC

```python
async def calculateHICBC(params: dict) -> str:
    """Calculate High Income Child Benefit Charge.

    HICBC claws back Child Benefit when the higher earner has income over £60,000.

    Args:
        params:
            - higherEarnerANI (number, required): Adjusted Net Income of higher earning parent
            - numberOfChildren (int, required): Number of children claimed for
            - taxYear (string, optional): Tax year for rates

    Returns:
        - applies: boolean
        - childBenefitEntitlement: number (annual amount)
        - clawbackPercentage: number (0-100)
        - hicbcCharge: number
        - netChildBenefit: number (after clawback)
        - recommendation: string
        - breakEvenPoint: number (income where it's worth opting out)

    Rates (2025/26):
        - First child:  £25.60/week = £1,331.20/year
        - Additional:   £16.95/week = £881.40/year
        - Clawback:     1% per £200 over £60,000
        - Full clawback at £80,000
    """
```

---

## calculatePensionAA

```python
async def calculatePensionAA(params: dict) -> str:
    """Calculate available Pension Annual Allowance including carry forward.

    Args:
        params:
            - taxYear (string, required): e.g., "2025/26"
            - currentYearContributions (number, required): Total pension input (employee + employer)
            - priorYearContributions (dict, required): {
                year1: { year: string, contributions: number },
                year2: { year: string, contributions: number },
                year3: { year: string, contributions: number }
              }
            - thresholdIncome (number, optional): For taper calculation
            - adjustedIncome (number, optional): For taper calculation
            - hasAccessedFlexibly (boolean, optional): Whether MPAA applies

    Returns:
        - standardAA: number (£60,000 or tapered amount)
        - taperApplies: boolean
        - taperedAA: number
        - carryForward: { year1, year2, year3, total, expiringThisYear }
        - totalAvailable: number
        - used: number
        - remaining: number
        - mpaaApplies: boolean
        - warnings: string[]

    Taper Rules (2025/26):
        - Threshold Income > £200,000 AND Adjusted Income > £260,000
        - AA reduced by £1 per £2 over £260,000
        - Minimum: £10,000
    """
```

---

## calculateScottishComparison

```python
async def calculateScottishComparison(params: dict) -> str:
    """Compare Scottish income tax with rest of UK rates.

    Scottish residents pay different income tax on non-savings, non-dividend income.

    Args:
        params:
            - taxableIncome (number, required): Taxable non-savings, non-dividend income
            - taxYear (string, optional): Tax year for rates

    Returns:
        - scottishTax: number
        - scottishBreakdown: [{ band, amount, rate, tax }]
        - rukTax: number
        - rukBreakdown: [{ band, amount, rate, tax }]
        - difference: number (positive = Scottish higher)
        - percentageDifference: string
        - summary: string

    Scottish Rates 2025/26:
        - Starter:      £12,571 - £14,876  @ 19%
        - Basic:        £14,877 - £26,561  @ 20%
        - Intermediate: £26,562 - £43,662  @ 21%
        - Higher:       £43,663 - £75,000  @ 42%
        - Advanced:     £75,001 - £125,140 @ 45%
        - Top:          Over £125,140      @ 48%

    rUK Rates 2025/26:
        - Basic:        £12,571 - £50,270  @ 20%
        - Higher:       £50,271 - £125,140 @ 40%
        - Additional:   Over £125,140      @ 45%
    """
```

---

## calculateSalarySacrifice

```python
async def calculateSalarySacrifice(params: dict) -> str:
    """Calculate the tax and NI benefit of salary sacrifice for pension.

    Saves both income tax AND National Insurance.

    Args:
        params:
            - currentSalary (number, required): Current gross salary
            - sacrificeAmount (number, required): Amount to sacrifice
            - isScottish (boolean, optional): Scottish tax rates?
            - includeEmployerNISaving (boolean, optional): Employer shares NI saving?
            - employerNISharePercentage (number, optional): % of employer NI saving shared

    Returns:
        - grossSalaryBefore / After: number
        - incomeTaxSaving: number
        - employeeNISaving: number
        - employerNISaving: number
        - employerNIShared: number
        - totalBenefit: number
        - effectiveReliefRate: string
        - netPayBefore / After: number
        - netPayReduction: number
        - pensionContribution: number
        - impactOnANI: number
        - paRestored: number
        - hicbcAvoided: number
        - warnings: string[] (mortgage applications, life insurance impact)

    Savings:
        - Income Tax:   20% / 40% / 45%
        - Employee NI:  8% (£12,571-£50,270) or 2% (above)
        - Employer NI:  13.8%
        - Plus:         Reduces ANI (may restore PA or avoid HICBC)
    """
```

---

## calculateBedAndISA

```python
async def calculateBedAndISA(params: dict) -> str:
    """Calculate the benefit of a Bed & ISA strategy.

    Sell GIA holdings to crystallise gains within CGT AEA, rebuy in ISA.

    Args:
        params:
            - holdings (array, required): [{
                name: string, currentValue: number, costBasis: number, unrealisedGain: number
              }]
            - cgtAEAUsed (number, optional): CGT AEA already used this year
            - cgtAEAAvailable (number, optional): Total AEA (default: £3,000)
            - taxpayerStatus (string, required): "basic" | "higher" | "additional"
            - isaAllowanceRemaining (number, required): ISA allowance remaining

    Returns:
        - availableAEA: number
        - recommendedSales: [{ holding, sellValue, gainCrystallised, cgtAvoided }]
        - totalGainsCrystallised: number
        - totalCGTAvoided: number
        - isaContribution: number
        - futureGrowthSheltered: boolean
        - warnings: string[]
        - steps: string[]

    30-day "Bed and Breakfast" rule workarounds:
        - Buy similar but not identical fund
        - Spouse buys back
        - Wait 30 days
    """
```

---

## CRM Tools

### getContactsTool (UK-adapted)

```python
async def getContactsTool(params: dict) -> str:
    """Find contacts in the Hazel System by name.

    UK-specific fields returned:
    - National Insurance Number (if stored)
    - UTR (Unique Taxpayer Reference) for Self Assessment
    - Tax residence (England/Wales/NI/Scotland)
    - Employer details (for PAYE reference)

    Args:
        params:
            - contact_name (str | None, required): Name to search (partial matches)
            - sort_by (str | None, required): "first_name" | "last_name" | "email" | "birth_date"
            - sort_order (str | None, required): "asc" | "desc"
            - page (int, optional): Page number (1-indexed, 15 items/page)
    """
```

### Other CRM Tools (unchanged API)

- `getHouseholdsTool` — Individual filing focus (not joint)
- `getEmailsTool` — Standard email search
- `getEmailDetailTool` — Full email content
- `getNotesTool` — CRM notes search
- `getMeetingsTool` — Meeting list
- `getMeetingTranscriptTool` — Full meeting transcript
- `getAdvisorUserInfoTool` — Adviser profile and firm details

---

## Web Search Patterns

Typical searches for current UK tax information:

```python
await web_search({"query": "2025/26 UK income tax bands"})
await web_search({"query": "2025/26 Scottish income tax rates"})
await web_search({"query": "2025/26 personal allowance taper"})
await web_search({"query": "2025/26 pension annual allowance"})
await web_search({"query": "2025/26 ISA allowance limit"})
await web_search({"query": "2025/26 CGT annual exempt amount"})
await web_search({"query": "2025/26 HICBC threshold"})
await web_search({"query": "2025/26 National Insurance rates"})
```

---

## CRM Search Patterns

UK-specific search terms and date ranges:

```python
# Use UK tax year dates (6 April - 5 April)
emails = await getEmailsTool({
    "household_id": 456,
    "search_terms": ["tax", "pension", "salary sacrifice", "ISA"],
    "start_date": "2025-04-06T00:00:00",
    "end_date": "2026-04-05T23:59:59"
})

notes = await getNotesTool({
    "household_id": 456,
    "search_terms": ["pension", "ISA", "CGT", "annual allowance", "carry forward"]
})

meetings = await getMeetingsTool({
    "household_id": 456,
    "search_terms": ["annual review", "tax planning", "year end"]
})
```

---

## Usage Examples

### Reset Mode — Full Analysis

```python
result = await generate_dashboard({
    "mode": "reset",
    "relevantTaxData": {
        "dashboardType": "UK Tax Analysis",
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
            "personalAllowanceAmount": 0
        },
        "observations": [
            {
                "type": "critical",
                "priority": "🔴 URGENT",
                "title": "Personal Allowance Fully Lost",
                "detail": "ANI of £147,425 exceeds £125,140. Full PA lost.",
                "potentialSaving": 18812
            }
        ],
        "sourceNotes": ["Income tax bands per HMRC 2025/26"]
    }
})
```

### Iterate Mode — "What if" Scenario

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
                "detail": "Restores full PA, eliminates HICBC. Total benefit £24,024."
            }
        ]
    }
})
```
