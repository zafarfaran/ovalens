Ah, I understand now! You want to see how I actually call the tools in code. Here's the before and after:

BEFORE: US Tool Calling

import asyncio

async def main():
    # US Tax Analysis - How I call generate_dashboard
    
    us_tax_data = {
        "dashboardType": "Tax Return Analysis",
        "description": "Comprehensive tax analysis for US client",
        
        "clientInfo": {
            "name": "Marcus & Elena Richardson",
            "filingStatus": "Married Filing Jointly",
            "taxYear": 2024,
            "state": "California",
            "ages": {"primary": 58, "spouse": 55},
            "dependents": 1
        },
        
        "incomeSummary": {
            "source": "Form 1040, Lines 1-9",
            "wages": 185000,
            "interestIncome": 4200,
            "qualifiedDividends": 12500,
            "ordinaryDividends": 15800,
            "shortTermCapitalGains": 3200,
            "longTermCapitalGains": 45000,
            "iraDistributions": 0,
            "socialSecurity": 0,
            "otherIncome": 8500,
            "totalIncome": 261700,
            "adjustments": 12000,
            "agi": 249700
        },
        
        "deductions": {
            "source": "Schedule A / Standard Deduction comparison",
            "standardDeduction": 29200,
            "itemizedTotal": 42800,
            "itemizedBreakdown": {
                "saltCapped": 10000,
                "mortgageInterest": 18500,
                "charitableCash": 8300,
                "charitableNonCash": 6000,
                "medicalAboveThreshold": 0
            },
            "deductionUsed": "Itemized",
            "benefitOverStandard": 13600
        },
        
        "taxCalculation": {
            "source": "Form 1040, derived calculations",
            "taxableIncome": 206900,
            "ordinaryIncomeTax": 32842,
            "capitalGainsTax": 8625,
            "niit": 0,
            "totalFederalTax": 41467,
            "effectiveTaxRate": "15.8%",
            "marginalOrdinaryRate": "24%",
            "marginalCapGainsRate": "15%"
        },
        
        "bracketAnalysis": {
            "source": "2024 Tax Brackets (MFJ)",
            "currentBracket": "24%",
            "incomeInCurrentBracket": 16850,
            "roomToTopOfBracket": 184150,
            "nextBracketStartsAt": 383900,
            "bracketFillOpportunity": "Significant room for Roth conversions before hitting 32% bracket"
        },
        
        "stateTaxSummary": {
            "state": "California",
            "stateTaxableIncome": 214500,
            "stateTaxLiability": 17842,
            "effectiveStateRate": "8.3%",
            "marginalStateRate": "9.3%"
        },
        
        "irmaaAnalysis": {
            "source": "2024 IRMAA Thresholds",
            "magi": 249700,
            "currentTier": "Tier 1",
            "nextTierThreshold": 258000,
            "monthlyPartBSurcharge": 69.90,
            "monthlyPartDSurcharge": 12.90,
            "annualIrmaaCost": 993.60
        },
        
        "observations": [
            {
                "type": "opportunity",
                "title": "Roth Conversion Opportunity",
                "detail": "With $184,150 of room before the 32% bracket, consider systematic Roth conversions.",
                "potentialBenefit": "Tax diversification, reduced future RMDs"
            },
            {
                "type": "warning",
                "title": "IRMAA Planning Needed",
                "detail": "Currently in Tier 1 IRMAA. Large Roth conversions will impact Medicare premiums.",
                "potentialBenefit": "Avoid $1,000+/year IRMAA surcharges"
            }
        ],
        
        "sourceNotes": [
            "All figures extracted from 2024 Form 1040 and supporting schedules",
            "Federal brackets per IRS Rev. Proc. 2023-34",
            "California rates per 2024 FTB tables",
            "IRMAA thresholds per CMS 2024 announcement"
        ]
    }
    
    result = await generate_dashboard({
        "mode": "reset",
        "relevantTaxData": us_tax_data
    })
    
    print(result)

asyncio.run(main())
AFTER: UK Tool Calling

import asyncio

async def main():
    # UK Tax Analysis - How I call generate_dashboard
    
    uk_tax_data = {
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
            "pensionContributions": {
                "employee": 8000,
                "employer": 12000
            },
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
                {
                    "name": "ISA Allowance",
                    "annual": 20000,
                    "used": 12000,
                    "remaining": 8000,
                    "status": "⚠️ AMBER",
                    "canCarryForward": False
                },
                {
                    "name": "Pension Annual Allowance",
                    "annual": 60000,
                    "used": 20000,
                    "remaining": 40000,
                    "status": "🟢 GREEN",
                    "canCarryForward": True
                },
                {
                    "name": "CGT Annual Exempt",
                    "annual": 3000,
                    "used": 0,
                    "remaining": 3000,
                    "status": "🔴 RED",
                    "canCarryForward": False
                }
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
    
    result = await generate_dashboard({
        "mode": "reset",
        "relevantTaxData": uk_tax_data
    })
    
    print(result)

asyncio.run(main())
KEY DIFFERENCES IN TOOL CALLING

Aspect	US Tool Call	UK Tool Call
Tax Year Format	"taxYear": 2024 (calendar year integer)	"taxYear": "2025/26" (fiscal year string)
Filing Status	"filingStatus": "Married Filing Jointly"	"status": "Married (taxed individually)"
Location	"state": "California"	"residence": "England"
Key Income Calc	"agi": 249700	"adjustedNetIncome": 147425
Deductions	"standardDeduction" vs "itemizedTotal"	"personalAllowanceAmount" (with taper status)
Tax Bands	"bracketAnalysis" with federal brackets	"incomeTaxByBand" with UK bands
State/Regional	"stateTaxSummary" (California rates)	"scottishComparison" (if applicable)
Healthcare	"irmaaAnalysis" (Medicare surcharges)	Not applicable (NHS is free)
Social Tax	Included in payroll, not shown	"nationalInsurance" (Class 1/2/4)
Child Benefits	Not applicable	"hicbc" (clawback calculation)
Allowances	Limited tracking	"allowancesTracker" with traffic lights
Pension	Part of retirement planning	"pensionCarryForward" (3-year tracking)
Key Threshold	IRMAA tiers ($206k, $258k, etc.)	PA taper (£100k, £125,140)
Primary Strategy	Roth conversions	Pension contributions to restore PA
Observations Focus	IRMAA, Roth, state tax	PA taper, HICBC, allowances expiring
ITERATION MODE COMPARISON

US Iteration Call

# User asks: "What if they convert $50K to Roth?"

await generate_dashboard({
    "mode": "iterate",
    "relevantTaxData": {
        "scenarios": [
            {
                "name": "Convert $50K to Roth",
                "conversionAmount": 50000,
                "newAGI": 299700,
                "newFederalTax": 53467,
                "additionalTax": 12000,
                "newIrmaaTier": "Tier 2",
                "irmaaIncrease": 1200
            }
        ],
        "observations": [
            {
                "type": "info",
                "title": "$50K Roth Conversion Impact",
                "detail": "Would push into Tier 2 IRMAA, adding $1,200/year Medicare cost."
            }
        ]
    }
})
UK Iteration Call

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
CRM TOOL CALLING COMPARISON

US - Searching for Client Data

# Get household info
household = await getHouseholdsTool({
    "household_name": "Richardson"
})

# Get recent emails about tax planning
emails = await getEmailsTool({
    "household_id": 123,
    "search_terms": ["tax", "Roth", "conversion"],
    "start_date": "2024-01-01T00:00:00",
    "end_date": "2024-12-31T23:59:59"
})

# Get meeting notes
meetings = await getMeetingsTool({
    "household_id": 123,
    "search_terms": ["annual review", "tax planning"]
})
UK - Searching for Client Data

# Get household info
household = await getHouseholdsTool({
    "household_name": "Mitchell"
})

# Get recent emails about tax planning
emails = await getEmailsTool({
    "household_id": 456,
    "search_terms": ["tax", "pension", "salary sacrifice", "ISA"],
    "start_date": "2025-04-06T00:00:00",  # UK tax year start
    "end_date": "2026-04-05T23:59:59"     # UK tax year end
})

# Get meeting notes
meetings = await getMeetingsTool({
    "household_id": 456,
    "search_terms": ["annual review", "tax planning", "year end"]
})

# Get notes about allowances
notes = await getNotesTool({
    "household_id": 456,
    "search_terms": ["pension", "ISA", "CGT", "annual allowance", "carry forward"]
})
PARALLEL TOOL CALLING

US - Gathering Data in Parallel

import asyncio

async def gather_us_client_data(household_id):
    results = await asyncio.gather(
        getHouseholdsTool({"household_name": "Richardson"}),
        getEmailsTool({"household_id": household_id, "search_terms": ["tax"]}),
        getMeetingsTool({"household_id": household_id}),
        getNotesTool({"household_id": household_id, "search_terms": ["Roth", "IRMAA"]})
    )
    return results
UK - Gathering Data in Parallel

import asyncio

async def gather_uk_client_data(household_id):
    results = await asyncio.gather(
        getHouseholdsTool({"household_name": "Mitchell"}),
        getEmailsTool({"household_id": household_id, "search_terms": ["tax", "pension"]}),
        getMeetingsTool({"household_id": household_id}),
        getNotesTool({"household_id": household_id, "search_terms": ["pension", "ISA", "salary sacrifice", "HICBC"]})
    )
    return results
WEB SEARCH COMPARISON

US Web Searches

# Searching for current US tax information
await web_search({"query": "2024 federal tax brackets MFJ"})
await web_search({"query": "2024 IRMAA thresholds Medicare"})
await web_search({"query": "2024 California income tax rates"})
await web_search({"query": "2024 Roth IRA contribution limits"})
await web_search({"query": "2024 NIIT threshold"})
UK Web Searches

# Searching for current UK tax information
await web_search({"query": "2025/26 UK income tax bands"})
await web_search({"query": "2025/26 Scottish income tax rates"})
await web_search({"query": "2025/26 personal allowance taper"})
await web_search({"query": "2025/26 pension annual allowance"})
await web_search({"query": "2025/26 ISA allowance limit"})
await web_search({"query": "2025/26 CGT annual exempt amount"})
await web_search({"query": "2025/26 HICBC threshold"})
await web_search({"query": "2025/26 National Insurance rates"})
That's the complete comparison of how I actually call the tools - the data structures, search terms, date formats, and focus areas are all different between US and UK versions.

Great question! The tool calling prompts would also need to change significantly for the UK version. Let me show you the before and after:

BEFORE: US TOOL CALLING PROMPT (generate_dashboard)

async def generate_dashboard(params: dict) -> str:
    """Generate an interactive dashboard in a side panel to visualize and analyze data.

    Args:
        params: Parameters dict with keys:
            - mode (str (one of: reset, iterate), optional): Generation mode: 'reset' starts fresh (default), 'iterate' modifies existing dashboard based on user feedback. The current state and conversation history are automatically available. (default: 'reset')
            - relevantTaxData (dict, required): Structured tax data for dashboard generation and iteration. Include source attributions where possible for each attribute, and if they are derived, include the formula or method of determination.

For 'reset' mode: Include ALL information gathered so far

For 'iterate' mode: Include only new or changed data, or an empty object if no new data is necessary. The dashboard generator already has:
- Current dashboard tree and data bindings
- Full conversation history including prior relevantTaxData
    """
AFTER: UK TOOL CALLING PROMPT (generate_dashboard)

async def generate_dashboard(params: dict) -> str:
    """Generate an interactive dashboard in a side panel to visualise and analyse UK tax data.

    Args:
        params: Parameters dict with keys:
            - mode (str (one of: reset, iterate), optional): Generation mode: 'reset' starts fresh (default), 'iterate' modifies existing dashboard based on user feedback. The current state and conversation history are automatically available. (default: 'reset')
            - relevantTaxData (dict, required): Structured UK tax data for dashboard generation and iteration. Include source attributions where possible for each attribute, and if they are derived, include the formula or method of determination.

For 'reset' mode: Include ALL information gathered so far

For 'iterate' mode: Include only new or changed data, or an empty object if no new data is necessary. The dashboard generator already has:
- Current dashboard tree and data bindings
- Full conversation history including prior relevantTaxData

UK-SPECIFIC DATA STRUCTURE:

The relevantTaxData object should follow this UK-specific schema:

1. clientInfo (required):
   - name: Client/household name
   - taxYear: UK tax year format (e.g., "2025/26")
   - residence: "England" | "Wales" | "Northern Ireland" | "Scotland"
   - filingStatus: "Employed" | "Self-Employed" | "Director" | "Retired" | "Multiple"
   - ages: { primary: number, spouse?: number }
   - hasChildren: boolean
   - claimsChildBenefit: boolean

2. incomeSummary (required):
   - source: Attribution (e.g., "P60, SA100")
   - employment: { gross: number, taxDeducted: number, niDeducted: number }
   - selfEmployment?: { turnover: number, expenses: number, profit: number }
   - dividends?: { total: number, withinAllowance: number, taxable: number }
   - savings?: { interest: number, withinAllowance: number, taxable: number }
   - rental?: { gross: number, expenses: number, profit: number }
   - pension?: { statePension: number, privatePension: number }
   - other?: { description: string, amount: number }
   - totalIncome: number

3. adjustedNetIncome (required for higher earners):
   - totalIncome: number
   - pensionContributions: { employee: number, employer: number, personal: number }
   - giftAid: { gross: number, net: number }
   - adjustedNetIncome: number
   - personalAllowanceStatus: "Full" | "Tapered" | "Lost"
   - personalAllowanceAmount: number
   - taperCalculation?: string (show working if tapered)

4. taxCalculation (required):
   - source: Attribution
   - taxableIncome: number
   - incomeTaxByBand: [
       { band: "Personal Allowance", amount: number, rate: "0%", tax: number },
       { band: "Basic Rate", amount: number, rate: "20%", tax: number },
       { band: "Higher Rate", amount: number, rate: "40%", tax: number },
       { band: "Additional Rate", amount: number, rate: "45%", tax: number }
     ]
   - scottishBands?: [ ... ] (if Scottish resident, use Scottish bands)
   - dividendTax: { taxable: number, rate: string, tax: number }
   - savingsTax: { taxable: number, rate: string, tax: number }
   - totalIncomeTax: number
   - effectiveRate: string
   - marginalRate: string

5. nationalInsurance (required):
   - class1?: { 
       earningsInMainBand: number, 
       mainRate: "8%", 
       mainNI: number,
       earningsAboveUEL: number,
       additionalRate: "2%",
       additionalNI: number,
       totalEmployeeNI: number,
       employerNI?: number
     }
   - class2?: { weeksLiable: number, weeklyRate: number, total: number }
   - class4?: { profitInMainBand: number, profitAboveUPL: number, total: number }
   - totalNI: number

6. hicbc (if applicable):
   - applies: boolean
   - higherEarnerIncome: number
   - childBenefitAmount: number
   - clawbackPercentage: string
   - chargeAmount: number

7. allowancesTracker (required):
   - taxYear: string
   - daysUntilYearEnd: number
   - allowances: [
       {
         name: "ISA Allowance",
         annual: number,
         used: number,
         remaining: number,
         status: "🟢 GREEN" | "⚠️ AMBER" | "🔴 RED",
         canCarryForward: boolean,
         action?: string
       },
       // Repeat for: Pension AA, CGT AEA, Dividend Allowance, Savings Allowance, IHT Gifts
     ]
   - pensionCarryForward?: {
       year1: { year: string, available: number, used: number, remaining: number },
       year2: { ... },
       year3: { ... },
       totalCarryForward: number
     }

8. scottishComparison (if Scottish resident):
   - ukTax: number
   - scottishTax: number
   - difference: number
   - note: string

9. planningScenarios (optional):
   - scenarios: [
       {
         name: string,
         description: string,
         inputs: { pensionContribution?: number, salarySacrifice?: number, ... },
         results: {
           newANI: number,
           newPA: number,
           newTax: number,
           taxSaving: number,
           effectiveRelief: string
         }
       }
     ]

10. observations (required):
    - Array of:
      {
        type: "critical" | "warning" | "opportunity" | "info",
        priority: "🔴 URGENT" | "⚠️ HIGH" | "🟢 MEDIUM" | "🔵 LOW",
        title: string,
        detail: string,
        potentialSaving?: number,
        deadline?: string,
        action?: string
      }

11. sourceNotes (required):
    - Array of strings citing sources for rates, thresholds, and extracted data
    - Always include tax year for rate references
    - Flag any estimated or uncertain figures

12. dataConfidence (required):
    - overall: "high" | "medium" | "low"
    - notes: Array of strings explaining any uncertainties

KEY UK THRESHOLDS TO HIGHLIGHT:
- £100,000: PA taper begins (60% effective rate zone)
- £125,140: PA fully lost, additional rate begins
- £60,000: HICBC begins
- £80,000: HICBC full clawback
- £50,270: Higher rate threshold / NI Upper Earnings Limit
- £12,570: Personal Allowance / NI Primary Threshold
- £200,000 / £260,000: Pension AA taper thresholds

SCOTTISH RATE THRESHOLDS (if applicable):
- £14,876: Starter/Basic boundary
- £26,561: Basic/Intermediate boundary
- £43,662: Intermediate/Higher boundary
- £75,000: Higher/Advanced boundary
- £125,140: Advanced/Top boundary
    """
ADDITIONAL UK-SPECIFIC TOOLS NEEDED

NEW TOOL: Calculate Adjusted Net Income

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
            - giftAidDonations (number, required): Net Gift Aid donations made (will be grossed up)
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
NEW TOOL: Calculate HICBC

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
NEW TOOL: Calculate Pension Annual Allowance

async def calculatePensionAA(params: dict) -> str:
    """Calculate available Pension Annual Allowance including carry forward.
    
    Args:
        params: Parameters dict with keys:
            - taxYear (string, required): Current tax year (e.g., "2025/26")
            - currentYearContributions (number, required): Total pension input this year (employee + employer)
            - priorYearContributions (dict, required): {
                year1: { year: string, contributions: number },  // e.g., "2024/25"
                year2: { year: string, contributions: number },  // e.g., "2023/24"
                year3: { year: string, contributions: number }   // e.g., "2022/23"
              }
            - thresholdIncome (number, optional): For taper calculation (total income + employer pension - personal pension)
            - adjustedIncome (number, optional): For taper calculation (threshold income + pension contributions)
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
            expiringThisYear: number (amount from 3 years ago)
          }
        - totalAvailable: number
        - used: number
        - remaining: number
        - mpaaApplies: boolean
        - warnings: string[] (e.g., "£25,000 carry forward from 2022/23 expires 5 April 2026")
    
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
NEW TOOL: Calculate Scottish vs rUK Tax

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
NEW TOOL: Calculate Salary Sacrifice Benefit

async def calculateSalarySacrifice(params: dict) -> str:
    """Calculate the tax and NI benefit of salary sacrifice for pension.
    
    Salary sacrifice is highly tax-efficient as it saves both income tax AND National Insurance.
    
    Args:
        params: Parameters dict with keys:
            - currentSalary (number, required): Current gross salary
            - sacrificeAmount (number, required): Amount to sacrifice
            - isScottish (boolean, optional): Whether Scottish tax rates apply
            - includeEmployerNISaving (boolean, optional): Whether employer shares their NI saving
            - employerNISharePercentage (number, optional): Percentage of employer NI saving shared (0-100)
    
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
NEW TOOL: Bed and ISA Calculator

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
            - cgtAEAUsed (number, optional): CGT Annual Exempt Amount already used this year
            - cgtAEAAvailable (number, optional): Total AEA available (default: £3,000)
            - taxpayerStatus (string, required): "basic" | "higher" | "additional"
            - isaAllowanceRemaining (number, required): ISA allowance remaining
    
    Returns:
        JSON with:
        - aavailableAEA: number
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
    - Buy similar but not identical fund (e.g., different provider's global tracker)
    - Spouse buys back (spousal transfer then spouse sells = uses their AEA)
    - Wait 30 days (if market timing acceptable)
    """
MODIFIED TOOL: UK-Specific getContactsTool

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
            - sort_by (str (one of: first_name, last_name, email, birth_date) | None, required): Field to sort by
            - sort_order (str (one of: asc, desc) | None, required): Sort order
            - page (int, optional): Page number for pagination (1-indexed, 15 items per page) (default: 1)
    """
SUMMARY: TOOL CHANGES

Tool	US Version	UK Version
generate_dashboard	Generic tax data structure	UK-specific schema with ANI, PA taper, NI classes, allowances tracker, Scottish comparison
calculateANI	Not needed (no PA taper)	NEW - Critical for 60% trap
calculateHICBC	Not needed	NEW - Child Benefit clawback
calculatePensionAA	Different limits/rules	NEW - UK AA with carry forward
calculateScottishComparison	Not needed (50 states instead)	NEW - Scottish vs rUK rates
calculateSalarySacrifice	Not common strategy	NEW - Key UK planning tool
calculateBedAndISA	Similar concept but different rules	NEW - UK CGT AEA harvesting
getContactsTool	SSN, State residence	NI Number, UTR, UK residence
getHouseholdsTool	Joint filing relevant	Individual filing focus
That's the complete before and after for the tool calling prompts. The key differences are:

New UK-specific calculation tools for ANI, HICBC, Pension AA, Scottish comparison, Salary Sacrifice, Bed & ISA
Restructured data schema for generate_dashboard with UK fields
UK thresholds embedded in tool documentation
Different terminology throughout (NI instead of FICA, PA instead of Standard Deduction, etc.)

Of course. Here is the exact text:

BEFORE: US SYSTEM PROMPT

## Your Role
You are Hazel, a tax planning assistant for financial advisors.

You have the capability to help advisors analyze client tax returns to:
1. Explain the client's current tax situation clearly
2. Identify optimization opportunities
3. Generate professional, client-ready deliverables

While you are not directly a tax preparer/filer, you have CPA level sophistication and understanding of accounting and tax subjects.
You help advisors understand and present tax information—you do not provide tax advice directly to end clients.

---

## Analyzing Tax Returns

If asked to analyze a tax return, or generate a tax plan, you should follow the following steps:

1. Make sure the user has provided you with a tax return ( this is preferred ), or otherwise as much supporting documentation or detail as needed to generate a tax plan.
2. Review the detail in the documents provided, some detail may be immediately available for you to understand, and other details may need to be extracted using tools and code_execution.
3. Once you have a good understanding of the client's tax situation, you should ask the user any clarifying questions you might want clarity on prior to generating a tax plan or otherwise analysis. This is the opportunity to get a majority of the assumptions you might have out of the way.
4. Search the web to gather the most up-to-date information on tax code or any other applicable knowledge you might need in order to accurately provide the tax plan or analysis to the user for the applicable tax year in question.
5. If possibly valuable, use the tools available to search for communication between the advisor and client ( CRM notes, meetings, emails etc ) or relevant brokerage account data from Altruist, feel free to include these details in the tax plan or analysis IF there is value to do so.
6. Present findings using the generate_dashboard tool. The dashboard will visualize the tax analysis - don't duplicate that content in your text response.

## Using the Dashboard

When presenting tax analysis, **always use the generate_dashboard tool** to create visual summaries. The dashboard handles:
- Tax summary with key figures and rates
- Federal ordinary income bracket analysis
- Capital gains analysis
- State/local tax breakdowns
- Itemized deductions
- IRMAA analysis
- Observations and opportunities

**Your text response should be brief** - just introduce the dashboard or highlight key insights. Don't repeat numbers or tables that are shown in the dashboard.

Good example:
"I've analyzed the 2023 return for Marcus & Elena. The dashboard shows they're in the 24% bracket with room for Roth conversions. A few opportunities stood out that I've highlighted."

Bad example:
"Here's the analysis: Total income is $287,340, AGI is $271,890..." [repeating all the numbers the dashboard already shows]

---

## Guardrails

**Do NOT:**
- Recommend specific securities, funds, or insurance products
- Provide legal advice or recommend specific attorneys
- Assume accuracy, always note this is based on extracted data

**Always:**
- Show calculation work, if calculations were performed or numbers were derived from other numbers, show the work.
- Cite sources for rates/thresholds with dates
- Flag low-confidence extractions
- Note when information may be stale
- Remind advisor to verify before client presentation

**When uncertain:**
- State uncertainty explicitly: "I'm not confident about [X] because [reason]"
- Suggest verification: "You should confirm [X] with the client/CPA"
- Don't guess, ask for confirmation
AFTER: UK SYSTEM PROMPT

## Your Role
You are Hazel, a UK tax planning assistant for financial advisers.

You have the capability to help advisers analyse client tax returns and financial situations to:
1. Explain the client's current tax position clearly
2. Identify optimisation opportunities
3. Generate professional, client-ready deliverables

While you are not directly a tax preparer/filer, you have Chartered Tax Adviser (CTA) level sophistication and understanding of UK accounting and tax subjects.
You help advisers understand and present tax information—you do not provide tax advice directly to end clients.

---

## UK Tax System Fundamentals

### Tax Year
- UK tax year runs **6 April to 5 April** (e.g., 2025/26 = 6 April 2025 to 5 April 2026)
- This is different from the calendar year - always confirm which tax year is being discussed
- Tax year end (5 April) is critical - many allowances are "use it or lose it"

### Tax Authority
- **HMRC** (His Majesty's Revenue and Customs) is the sole tax authority
- No regional income tax except **Scotland** (different rates) and **Wales** (currently aligned with England)
- Single system is simpler than US multi-state complexity

### Filing & Collection
- **PAYE** (Pay As You Earn): Real-time tax deduction for employees - most taxpayers never file a return
- **Self Assessment**: Annual return required for:
  - Self-employed individuals
  - Higher earners (£150k+ income)
  - Those with complex tax affairs (rental income, capital gains, etc.)
  - Company directors
- Self Assessment deadline: **31 January** following the tax year end

### Individual Taxation (CRITICAL DIFFERENCE)
- **No joint filing** - each individual is taxed completely separately
- Married couples cannot file jointly
- This creates significant planning opportunities:
  - Income can be split between spouses
  - Each spouse has their own allowances (ISA, CGT AEA, pension AA)
  - Transfers between spouses are tax-free (CGT and IHT)

---

## Key UK Tax Rates & Allowances

Always verify rates for the specific tax year. Below are 2025/26 rates:

### Income Tax Bands (England, Wales, Northern Ireland)

| Band | Taxable Income | Rate |
|------|----------------|------|
| Personal Allowance | £0 - £12,570 | 0% |
| Basic Rate | £12,571 - £50,270 | 20% |
| Higher Rate | £50,271 - £125,140 | 40% |
| Additional Rate | Over £125,140 | 45% |

### Scottish Income Tax Bands (DIFFERENT - Must Check Residence)

| Band | Taxable Income | Rate |
|------|----------------|------|
| Personal Allowance | £0 - £12,570 | 0% |
| Starter Rate | £12,571 - £14,876 | 19% |
| Basic Rate | £14,877 - £26,561 | 20% |
| Intermediate Rate | £26,562 - £43,662 | 21% |
| Higher Rate | £43,663 - £75,000 | 42% |
| Advanced Rate | £75,001 - £125,140 | 45% |
| Top Rate | Over £125,140 | 48% |

**Always ask:** "Is the client resident in Scotland?" - this changes the entire calculation.

### National Insurance Contributions (NICs)

**Class 1 - Employees:**
| Threshold | Rate |
|-----------|------|
| Below Primary Threshold (£12,570) | 0% |
| Primary Threshold to Upper Earnings Limit (£12,571 - £50,270) | 8% |
| Above Upper Earnings Limit (over £50,270) | 2% |

**Employer's NI:** 13.8% on earnings above £9,100 (Secondary Threshold)
- Important for salary sacrifice calculations - employer saves this too

**Class 2 - Self-Employed:** £3.45/week (if profits > £12,570)
**Class 4 - Self-Employed:** 6% on profits £12,570-£50,270, then 2% above

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
**No holding period distinction** - unlike US, no separate short/long-term rates.

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

---

## Critical UK Tax Planning Points

### 1. THE 60% TAX TRAP (Personal Allowance Taper) - HIGHEST PRIORITY

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

Total Income
MINUS: Gross pension contributions (personal, not employer)
MINUS: Gross Gift Aid donations (donation ÷ 0.8)
= Adjusted Net Income

**Mitigation strategies (in order of effectiveness):**
1. Pension contributions (salary sacrifice is best - saves NI too)
2. Employer pension contributions (don't count as income at all)
3. Gift Aid donations (extend basic rate band)
4. Timing income across tax years

**Example calculation:**

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
1. **Employer pension match** - Free money, always take it
2. **Pension contributions** - Highest tax relief, especially in 60% trap
3. **LISA** - If eligible (<40, first home or retirement), 25% bonus
4. **ISA** - Flexible access, tax-free growth, no income limits
5. **GIA** - Taxable, use CGT AEA annually

### 6. BED & ISA Strategy

Crystallise gains within CGT Annual Exempt Amount, repurchase in ISA:

1. Identify holdings with unrealised gains in GIA
2. Sell enough to realise gains up to £3,000 (AEA)
3. No CGT payable (within AEA)
4. Repurchase same/similar investments within ISA
5. Future growth is now tax-free forever
6. Repeat annually with each spouse

**Watch out for:** 30-day "Bed and Breakfast" rule if buying identical shares.

### 7. SPOUSAL PLANNING OPPORTUNITIES

Because UK taxes individuals separately:

- **Asset transfers:** No CGT on transfers between spouses
- **Income splitting:** Transfer income-producing assets to lower-earning spouse
- **CGT doubling:** Each spouse has £3,000 AEA = £6,000 combined
- **ISA doubling:** Each spouse has £20,000 = £40,000 combined
- **Pension contributions:** Higher earner can fund lower earner's pension

### 8. INHERITANCE TAX (IHT)

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
- PETs: Gifts become exempt if donor survives 7 years

---

## Analysing UK Tax Returns

### Primary Documents

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

### Key Figures to Extract

1. **Total Income** - All sources before any deductions
2. **Adjusted Net Income** - Critical for PA taper (Total Income - pension contributions - Gift Aid)
3. **Taxable Income** - After Personal Allowance deduction
4. **Income Tax Liability** - Calculated tax
5. **National Insurance** - Class 1, 2, and/or 4
6. **Tax Paid/Refund Due** - Via PAYE vs actual liability

### Income Ordering (Important for Calculations)

UK tax applies to income in this order:
1. **Non-savings income** (employment, self-employment, pensions, rental)
2. **Savings income** (interest)
3. **Dividend income**

This determines which income uses which allowances and bands first.

---

## UK Tax Analysis Process

When asked to analyse a tax return or generate a tax plan:

### Step 1: Confirm Basics
- Confirm tax year (6 April - 5 April format)
- Confirm residence (England/Wales/NI vs Scotland)
- Identify filing status (employed, self-employed, director, retired)

### Step 2: Extract Data
- Total income from all sources
- Employment income (P60)
- Self-employment profits
- Rental income
- Dividend income
- Savings interest
- Pension contributions (employee + employer)
- Gift Aid donations

### Step 3: Calculate Adjusted Net Income

ANI = Total Income - Pension Contributions (gross) - Gift Aid (grossed up)

### Step 4: Check Critical Thresholds
- **ANI £100,000-£125,140?** → 60% trap zone - PRIORITY PLANNING
- **ANI > £60,000 with children?** → HICBC applies
- **ANI > £125,140?** → Additional rate + PA fully lost
- **Scottish resident?** → Apply Scottish rates
- **High pension contributions?** → Check AA and taper

### Step 5: Review Allowances Status
- ISA: Used / Remaining this tax year
- Pension AA: Used / Remaining / Carry forward available
- CGT AEA: Used / Remaining
- IHT annual exemption: Used / Remaining

### Step 6: Identify Opportunities
- Can pension contributions restore PA?
- Is salary sacrifice available?
- Any Bed & ISA opportunities?
- Spousal transfer benefits?
- Charitable giving optimisation?

### Step 7: Clarifying Questions
Ask about:
- Employment status and salary sacrifice availability
- Family situation (spouse income, children)
- Investment holdings and unrealised gains
- Retirement plans and pension values
- Estate planning concerns

### Step 8: Generate Dashboard
Present findings using generate_dashboard with UK-specific sections.

---

## Using the Dashboard (UK Sections)

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

Salary: £12,570
- Income tax: £0 (within PA)
- Employee NI: £0 (below threshold)
- Employer NI: ~£479

Dividends: As required
- Within basic rate band: 8.75%
- Higher rate: 33.75%
- Already paid Corp Tax (25%)

### Scenario 3: Tax Year End Planning (approaching 5 April)

**Indicators:** Date is January-April
**Priority:** HIGH (time-sensitive)

**Analysis:**
1. Check all "use or lose" allowances
2. Prioritise by value and deadline
3. Create action checklist

**Standard checklist:**
- Max ISA contributions (£20,000 each)
- Use CGT AEA (£3,000 each) - Bed & ISA
- Pension contributions (check AA)
- Make IHT annual gifts (£3,000 each)
- Review dividend timing
- Complete Gift Aid donations

---

## Guardrails

**Do NOT:**
- Recommend specific securities, funds, or insurance products
- Provide legal advice or recommend specific solicitors
- Assume accuracy - always note this is based on extracted data
- Forget to check Scottish residence
- Apply US tax concepts (IRMAA, Roth, state tax, joint filing)

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
- Don't guess - ask for confirmation

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

## UK vs US Terminology Reference

| UK Term | US Equivalent | Notes |
|---------|---------------|-------|
| HMRC | IRS | Single authority (no states) |
| Self Assessment | Tax Return / 1040 | SA100 is main form |
| PAYE | Withholding | Real-time collection |
| National Insurance | FICA / Social Security | More complex (classes) |
| Personal Allowance | Standard Deduction | Tapers above £100k |
| ISA | Roth IRA | More flexible, higher limits |
| Pension / SIPP | 401(k) / IRA | No RMDs in UK |
| Gift Aid | Charitable Deduction | Extends basic rate band |
| CGT AEA | No equivalent | £3,000 tax-free gains |
| IHT | Estate Tax | Lower thresholds |
| Stamp Duty | Transfer Tax | On property purchases |
| Limited Company | Corporation | |
| Sole Trader | Sole Proprietor | |
| Chartered Accountant | CPA | |
| Solicitor | Attorney | |
| Tax Year | Fiscal Year | 6 Apr - 5 Apr |
| Higher Rate | Top Bracket | 40% (or 42% Scotland) |
| Additional Rate | Top Bracket | 45% (or 48% Scotland) |

---

## Example Analysis Output

**User:** "Can you analyse this tax return for the Mitchells?"

**Good Response:**

"I've analysed the 2025/26 position for James and Sarah Mitchell. Before I generate the dashboard, let me confirm a few things:

1. I can see James is resident in England (not Scotland) - correct?
2. James's income of £147,925 puts him well above the PA taper zone - has he considered increased pension contributions?
3. I notice they have 2 children - are they claiming Child Benefit?

Key initial findings:
- James has **lost his entire Personal Allowance** (income > £125,140)
- This means he paid approximately **£5,028 extra tax** vs having full PA
- Combined with HICBC, there's significant optimisation potential

I'll generate the full dashboard now with detailed recommendations."

**Bad Response:**

"Total income is £159,800, taxable income is £147,925, tax paid is £62,854..." [Just repeating numbers without insight or UK-specific analysis]
That's the complete before and after. The US prompt is approximately 60 lines, the UK prompt is approximately 450 lines.

I've created both a detailed UK system prompt document and a comparison dashboard. Let me give you a summary of the key restructuring required:

Summary: Restructuring System Prompt for UK

🔴 Critical Changes Required

Area	US Current	UK Required
Tax Year	Calendar (Jan-Dec)	Fiscal (6 Apr - 5 Apr) - MUST confirm every time
Primary Threshold	IRMAA ($206k MFJ)	PA Taper (£100k individual)
Central Strategy	Roth conversions	Pension contributions to restore PA
Filing	Joint options (MFJ, etc.)	Individual only
Healthcare Link	IRMAA impacts Medicare	None (NHS is free)
State Complexity	50 states	Scotland only
📋 Prompt Structure Comparison

US SYSTEM PROMPT                          UK SYSTEM PROMPT
─────────────────────────────────────────────────────────────────────
Role: CPA-level                     →     Role: CTA-level
Tax Year: Calendar                  →     Tax Year: 6 April - 5 April
Authority: IRS + States             →     Authority: HMRC only
Filing: 5 status types              →     Filing: Individual only

THRESHOLDS:                               THRESHOLDS:
├─ IRMAA Tiers                      →     ├─ PA Taper (£100k-£125k) ⭐
├─ NIIT ($250k)                     →     ├─ HICBC (£60k-£80k)
├─ RMD Ages                         →     ├─ Pension AA Taper (£260k)
└─ State brackets                   →     └─ Scottish rates

STRATEGIES:                               STRATEGIES:
├─ Roth conversions                 →     ├─ PA restoration via pension
├─ Tax-loss harvesting              →     ├─ Salary sacrifice
├─ IRMAA management                 →     ├─ Bed & ISA
├─ State optimisation               →     ├─ Spousal transfers
└─ Bracket filling                  →     └─ Director remuneration

DOCUMENTS:                                DOCUMENTS:
├─ Form 1040                        →     ├─ SA100
├─ W-2                              →     ├─ P60
├─ Schedules A-E                    →     ├─ SA102-108
└─ 1099s                            →     └─ P11D, dividend vouchers

WRAPPERS:                                 WRAPPERS:
├─ Roth IRA/401(k)                  →     ├─ ISA (Cash, S&S, LISA)
├─ Traditional IRA                  →     ├─ Pension (SIPP, Workplace)
└─ 529 Plans                        →     └─ Junior ISA

REMOVE ENTIRELY:                          ADD NEW:
├─ IRMAA analysis                   →     ├─ NI Classes (1, 2, 4)
├─ 50-state engine                  →     ├─ PA Taper Calculator
├─ RMD calculations                 →     ├─ HICBC Calculator
├─ AMT                              →     ├─ Scottish Rate Detector
├─ NIIT                             →     ├─ Director Remuneration
└─ Filing status logic              →     └─ IHT Planning
🎯 The "One Thing" Difference

US Hazel asks: "Are they near an IRMAA threshold? Should we do Roth conversions?"

UK Hazel asks: "Is their Adjusted Net Income near £100k? Should we increase pension contributions to restore the Personal Allowance?"

📄 I've Created

Full UK System Prompt - Saved at /tmp/uk_hazel_system_prompt.md

Complete rewrite with UK tax fundamentals
UK rate tables and thresholds
UK-specific planning strategies
UK terminology
UK document types
UK calendar and deadlines
Comparison Dashboard - Visual side-by-side showing:

Structural differences
Threshold comparisons
Strategy mapping
Terminology translation
Sections to add/remove/modify
💡 Key Implementation Insight

The UK system prompt is actually simpler in some ways (no 50-state complexity, no joint filing) but more nuanced in others (PA taper creates complex marginal rates, NI has multiple classes, Scotland has different rates).

The 60% tax trap (PA taper zone) should be as prominent in the UK prompt as IRMAA is in the US prompt - it's the single most impactful planning opportunity for most higher earners.

Would you like me to:

Show the full UK system prompt I created?
Create additional UK-specific planning scenarios?
Demonstrate how the UK prompt would handle a specific client situation?

Fantastic question, Faran! Let me redesign myself specifically for the UK tax system. This is a fundamentally different architecture because the UK system has different structures, terminology, and planning opportunities.

UK vs US Tax System: Key Structural Differences

┌─────────────────────────────────────────────────────────────────────────────┐
│                     FUNDAMENTAL DIFFERENCES                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CONCEPT              │  US SYSTEM              │  UK SYSTEM                │
│  ─────────────────────┼─────────────────────────┼─────────────────────────  │
│                       │                         │                           │
│  Tax Authority        │  IRS (federal)          │  HMRC                     │
│                       │  + 50 state agencies    │  (single authority)       │
│                       │                         │                           │
│  Tax Year             │  Calendar year          │  6 April - 5 April        │
│                       │  (Jan 1 - Dec 31)       │  (e.g., 2025/26)          │
│                       │                         │                           │
│  Filing Status        │  Single, MFJ, MFS,      │  Individual only          │
│                       │  HOH, QSS               │  (no joint filing)        │
│                       │                         │                           │
│  State/Local Tax      │  50 different systems   │  None (unified national)  │
│                       │  Complex interactions   │  Scotland has variations  │
│                       │                         │                           │
│  Primary Return       │  Form 1040 + Schedules  │  Self Assessment          │
│                       │                         │  (SA100 + supplementary)  │
│                       │                         │                           │
│  Withholding System   │  W-4 elections          │  PAYE (automatic)         │
│                       │  Employer withholds     │  Real-time deduction      │
│                       │                         │                           │
│  Retirement Accounts  │  401(k), IRA, Roth      │  Pension (DC/DB),         │
│                       │                         │  ISA, SIPP, LISA          │
│                       │                         │                           │
│  Capital Gains        │  STCG/LTCG rates        │  Single CGT rate          │
│                       │  Based on holding       │  Based on income band     │
│                       │  + income level         │  (10%/18% or 20%/24%)     │
│                       │                         │                           │
│  Dividend Tax         │  Qualified vs ordinary  │  Separate dividend rates  │
│                       │  (0%, 15%, 20%)         │  (8.75%, 33.75%, 39.35%)  │
│                       │                         │                           │
│  Healthcare Link      │  IRMAA (Medicare)       │  NHS (no tax link)        │
│                       │                         │                           │
│  Social Insurance     │  FICA (SS + Medicare)   │  National Insurance       │
│                       │  6.2% + 1.45%           │  (NICs) - complex bands   │
│                       │                         │                           │
└─────────────────────────────────────────────────────────────────────────────┘
UK-Specific Tax Architecture

1. UK Tax Knowledge Base

┌─────────────────────────────────────────────────────────────────────────────┐
│                     UK TAX KNOWLEDGE BASE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     INCOME TAX BANDS (England/Wales/NI)               │   │
│  │                                                                       │   │
│  │   2025/26 Tax Year (example):                                        │   │
│  │                                                                       │   │
│  │   ┌─────────────────┬────────────┬────────────┐                     │   │
│  │   │  Band           │  Range     │  Rate      │                     │   │
│  │   ├─────────────────┼────────────┼────────────┤                     │   │
│  │   │  Personal       │  £0 -      │  0%        │                     │   │
│  │   │  Allowance      │  £12,570   │            │                     │   │
│  │   ├─────────────────┼────────────┼────────────┤                     │   │
│  │   │  Basic Rate     │  £12,571 - │  20%       │                     │   │
│  │   │                 │  £50,270   │            │                     │   │
│  │   ├─────────────────┼────────────┼────────────┤                     │   │
│  │   │  Higher Rate    │  £50,271 - │  40%       │                     │   │
│  │   │                 │  £125,140  │            │                     │   │
│  │   ├─────────────────┼────────────┼────────────┤                     │   │
│  │   │  Additional     │  Over      │  45%       │                     │   │
│  │   │  Rate           │  £125,140  │            │                     │   │
│  │   └─────────────────┴────────────┴────────────┘                     │   │
│  │                                                                       │   │
│  │   CRITICAL: Personal Allowance Taper                                 │   │
│  │   • Reduced by £1 for every £2 over £100,000                        │   │
│  │   • Fully lost at £125,140                                          │   │
│  │   • Creates effective 60% marginal rate in taper zone!              │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     SCOTTISH INCOME TAX BANDS                         │   │
│  │                                                                       │   │
│  │   Scotland has its OWN rates (different from rUK):                   │   │
│  │                                                                       │   │
│  │   ┌─────────────────┬────────────┬────────────┐                     │   │
│  │   │  Band           │  Range     │  Rate      │                     │   │
│  │   ├─────────────────┼────────────┼────────────┤                     │   │
│  │   │  Personal       │  £0 -      │  0%        │                     │   │
│  │   │  Allowance      │  £12,570   │            │                     │   │
│  │   ├─────────────────┼────────────┼────────────┤                     │   │
│  │   │  Starter Rate   │  £12,571 - │  19%       │                     │   │
│  │   │                 │  £14,876   │            │                     │   │
│  │   ├─────────────────┼────────────┼────────────┤                     │   │
│  │   │  Basic Rate     │  £14,877 - │  20%       │                     │   │
│  │   │                 │  £26,561   │            │                     │   │
│  │   ├─────────────────┼────────────┼────────────┤                     │   │
│  │   │  Intermediate   │  £26,562 - │  21%       │                     │   │
│  │   │                 │  £43,662   │            │                     │   │
│  │   ├─────────────────┼────────────┼────────────┤                     │   │
│  │   │  Higher Rate    │  £43,663 - │  42%       │                     │   │
│  │   │                 │  £75,000   │            │                     │   │
│  │   ├─────────────────┼────────────┼────────────┤                     │   │
│  │   │  Advanced Rate  │  £75,001 - │  45%       │                     │   │
│  │   │                 │  £125,140  │            │                     │   │
│  │   ├─────────────────┼────────────┼────────────┤                     │   │
│  │   │  Top Rate       │  Over      │  48%       │                     │   │
│  │   │                 │  £125,140  │            │                     │   │
│  │   └─────────────────┴────────────┴────────────┘                     │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     NATIONAL INSURANCE CONTRIBUTIONS                  │   │
│  │                                                                       │   │
│  │   Class 1 (Employees):                                               │   │
│  │   ┌─────────────────┬────────────┬────────────┐                     │   │
│  │   │  Threshold      │  Range     │  Rate      │                     │   │
│  │   ├─────────────────┼────────────┼────────────┤                     │   │
│  │   │  Below Primary  │  £0 -      │  0%        │                     │   │
│  │   │  Threshold      │  £12,570   │            │                     │   │
│  │   ├─────────────────┼────────────┼────────────┤                     │   │
│  │   │  Primary to     │  £12,571 - │  8%        │                     │   │
│  │   │  Upper Earnings │  £50,270   │            │                     │   │
│  │   ├─────────────────┼────────────┼────────────┤                     │   │
│  │   │  Above Upper    │  Over      │  2%        │                     │   │
│  │   │  Earnings       │  £50,270   │            │                     │   │
│  │   └─────────────────┴────────────┴────────────┘                     │   │
│  │                                                                       │   │
│  │   Class 2 (Self-Employed): Flat rate £3.45/week if profits > £12,570│   │
│  │   Class 4 (Self-Employed): 6% on £12,570-£50,270, 2% above          │   │
│  │                                                                       │   │
│  │   Employer's NI: 13.8% on earnings above £9,100 (secondary thresh)  │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     DIVIDEND TAX                                      │   │
│  │                                                                       │   │
│  │   Dividend Allowance: £500 (2025/26) - tax free                     │   │
│  │                                                                       │   │
│  │   Rates (on dividends ABOVE allowance):                              │   │
│  │   ┌─────────────────┬────────────┐                                  │   │
│  │   │  Band           │  Rate      │                                  │   │
│  │   ├─────────────────┼────────────┤                                  │   │
│  │   │  Basic Rate     │  8.75%     │                                  │   │
│  │   │  Higher Rate    │  33.75%    │                                  │   │
│  │   │  Additional     │  39.35%    │                                  │   │
│  │   └─────────────────┴────────────┘                                  │   │
│  │                                                                       │   │
│  │   NOTE: Dividends use up band space but taxed at different rates    │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     CAPITAL GAINS TAX                                 │   │
│  │                                                                       │   │
│  │   Annual Exempt Amount: £3,000 (2025/26)                            │   │
│  │                                                                       │   │
│  │   Rates (gains ABOVE exemption):                                     │   │
│  │   ┌─────────────────┬────────────┬────────────┐                     │   │
│  │   │  Asset Type     │  Basic     │  Higher/   │                     │   │
│  │   │                 │  Rate      │  Additional│                     │   │
│  │   ├─────────────────┼────────────┼────────────┤                     │   │
│  │   │  Most Assets    │  18%       │  24%       │                     │   │
│  │   │  (from Oct '24) │            │            │                     │   │
│  │   ├─────────────────┼────────────┼────────────┤                     │   │
│  │   │  Residential    │  18%       │  24%       │                     │   │
│  │   │  Property       │            │            │                     │   │
│  │   ├─────────────────┼────────────┼────────────┤                     │   │
│  │   │  Business Asset │  10%       │  10%       │                     │   │
│  │   │  Disposal Relief│  (up to    │  (up to    │                     │   │
│  │   │  (BADR)         │  £1m)      │  £1m)      │                     │   │
│  │   ├─────────────────┼────────────┼────────────┤                     │   │
│  │   │  Investors'     │  10%       │  10%       │                     │   │
│  │   │  Relief         │  (up to    │  (up to    │                     │   │
│  │   │                 │  £10m)     │  £10m)     │                     │   │
│  │   └─────────────────┴────────────┴────────────┘                     │   │
│  │                                                                       │   │
│  │   NOTE: Rate depends on total taxable income INCLUDING the gain     │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
2. UK-Specific Tax Wrappers & Allowances

┌─────────────────────────────────────────────────────────────────────────────┐
│                     UK TAX WRAPPERS & ALLOWANCES                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     ISA (Individual Savings Account)                  │   │
│  │                                                                       │   │
│  │   Annual Limit: £20,000 (2025/26)                                   │   │
│  │                                                                       │   │
│  │   Types:                                                             │   │
│  │   ┌─────────────────┬────────────────────────────────────────────┐  │   │
│  │   │  Cash ISA       │  Interest earned tax-free                  │  │   │
│  │   │  Stocks & Shares│  Dividends & gains tax-free                │  │   │
│  │   │  Innovative     │  P2P lending interest tax-free             │  │   │
│  │   │  Finance ISA    │                                            │  │   │
│  │   │  Lifetime ISA   │  25% govt bonus, £4k limit, age 18-39     │  │   │
│  │   │  (LISA)         │  For first home or retirement (age 60+)   │  │   │
│  │   │  Junior ISA     │  £9,000 limit, for under 18s              │  │   │
│  │   └─────────────────┴────────────────────────────────────────────┘  │   │
│  │                                                                       │   │
│  │   KEY PLANNING: Can split £20k across types, but LISA counts        │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     PENSIONS                                          │   │
│  │                                                                       │   │
│  │   Annual Allowance: £60,000 (2025/26)                               │   │
│  │   • Can carry forward unused from 3 prior years                     │   │
│  │   • Tapered for high earners (£260k+ threshold income)              │   │
│  │   • Minimum tapered AA: £10,000                                     │   │
│  │                                                                       │   │
│  │   Lifetime Allowance: ABOLISHED from April 2024                     │   │
│  │   • But new Lump Sum Allowance (LSA): £268,275                      │   │
│  │   • Lump Sum & Death Benefit Allowance: £1,073,100                  │   │
│  │                                                                       │   │
│  │   Tax Relief:                                                        │   │
│  │   ┌─────────────────┬────────────────────────────────────────────┐  │   │
│  │   │  Basic Rate     │  20% relief at source (auto)               │  │   │
│  │   │  Higher Rate    │  Additional 20% via Self Assessment        │  │   │
│  │   │  Additional     │  Additional 25% via Self Assessment        │  │   │
│  │   │  Scottish       │  Varies by band (19%-48% relief)           │  │   │
│  │   └─────────────────┴────────────────────────────────────────────┘  │   │
│  │                                                                       │   │
│  │   Pension Types:                                                     │   │
│  │   • Workplace DC (Defined Contribution)                             │   │
│  │   • Workplace DB (Defined Benefit / Final Salary)                   │   │
│  │   • SIPP (Self-Invested Personal Pension)                           │   │
│  │   • SSAS (Small Self-Administered Scheme) - for business owners     │   │
│  │                                                                       │   │
│  │   At Retirement (from age 55, rising to 57 in 2028):               │   │
│  │   • 25% tax-free lump sum (Pension Commencement Lump Sum - PCLS)   │   │
│  │   • Remaining taxed as income when drawn                            │   │
│  │   • Flexible drawdown OR annuity purchase                           │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     OTHER KEY ALLOWANCES                              │   │
│  │                                                                       │   │
│  │   ┌─────────────────────────┬───────────────────────────────────┐   │   │
│  │   │  Allowance              │  2025/26 Amount                   │   │   │
│  │   ├─────────────────────────┼───────────────────────────────────┤   │   │
│  │   │  Personal Allowance     │  £12,570                          │   │   │
│  │   │  Marriage Allowance     │  £1,260 transferable to spouse    │   │   │
│  │   │  Blind Person's         │  £3,070                           │   │   │
│  │   │  Trading Allowance      │  £1,000 (self-employment)         │   │   │
│  │   │  Property Allowance     │  £1,000 (rental income)           │   │   │
│  │   │  Savings Allowance      │  £1,000 (basic) / £500 (higher)   │   │   │
│  │   │                         │  £0 (additional rate)             │   │   │
│  │   │  Dividend Allowance     │  £500                             │   │   │
│  │   │  CGT Annual Exempt      │  £3,000                           │   │   │
│  │   │  ISA Allowance          │  £20,000                          │   │   │
│  │   │  LISA Allowance         │  £4,000 (within ISA)              │   │   │
│  │   │  Junior ISA             │  £9,000                           │   │   │
│  │   │  Pension Annual Allow.  │  £60,000                          │   │   │
│  │   │  Rent-a-Room Relief     │  £7,500                           │   │   │
│  │   └─────────────────────────┴───────────────────────────────────┘   │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
3. UK-Specific Planning Opportunities

┌─────────────────────────────────────────────────────────────────────────────┐
│                     UK TAX PLANNING OPPORTUNITIES                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  1. PERSONAL ALLOWANCE TAPER MITIGATION                              │   │
│  │                                                                       │   │
│  │  Problem: £100k-£125,140 = effective 60% marginal rate               │   │
│  │                                                                       │   │
│  │  Solutions:                                                          │   │
│  │  • Pension contributions (reduce adjusted net income)                │   │
│  │  • Salary sacrifice arrangements                                     │   │
│  │  • Gift Aid donations (extends basic rate band)                      │   │
│  │  • Timing of bonuses / income across tax years                       │   │
│  │                                                                       │   │
│  │  Example:                                                            │   │
│  │  Income: £120,000 → Personal Allowance reduced by £9,715            │   │
│  │  Extra tax on £9,715 at 40% = £3,886                                │   │
│  │  Pension contribution of £20,000 → restores £10,000 PA              │   │
│  │  Net benefit: £3,886 + £8,000 tax relief = £11,886                  │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  2. PENSION ANNUAL ALLOWANCE CARRY FORWARD                           │   │
│  │                                                                       │   │
│  │  Can use unused AA from 3 prior years:                               │   │
│  │                                                                       │   │
│  │  Year       │  AA      │  Used    │  Unused  │  Carry Forward       │   │
│  │  ───────────┼──────────┼──────────┼──────────┼────────────────       │   │
│  │  2022/23    │  £40,000 │  £10,000 │  £30,000 │  Available now       │   │
│  │  2023/24    │  £60,000 │  £15,000 │  £45,000 │  Available now       │   │
│  │  2024/25    │  £60,000 │  £20,000 │  £40,000 │  Available now       │   │
│  │  2025/26    │  £60,000 │     -    │     -    │  Current year        │   │
│  │  ───────────┴──────────┴──────────┴──────────┴────────────────       │   │
│  │  Total available 2025/26: £60,000 + £115,000 = £175,000             │   │
│  │                                                                       │   │
│  │  PLANNING: Big bonus year? Max pension to wipe out higher rate tax  │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  3. SALARY vs DIVIDEND OPTIMISATION (Company Directors)              │   │
│  │                                                                       │   │
│  │  For owner-directors, balance salary vs dividends:                   │   │
│  │                                                                       │   │
│  │  Salary up to NI threshold (£12,570):                               │   │
│  │  • No income tax, no employee NI                                    │   │
│  │  • Employer NI: £479 (above secondary threshold)                    │   │
│  │  • Preserves state pension credits                                  │   │
│  │                                                                       │   │
│  │  Above that, dividends more efficient:                              │   │
│  │                                                                       │   │
│  │  Method           │  Tax Rate    │  Total Rate (incl Corp Tax)      │   │
│  │  ─────────────────┼──────────────┼──────────────────────────         │   │
│  │  Salary (basic)   │  20% + 8% NI │  28% + 13.8% ER NI = 41.8%       │   │
│  │  Dividend (basic) │  8.75%       │  25% CT + 8.75% = 32.1%          │   │
│  │  Salary (higher)  │  40% + 2% NI │  42% + 13.8% ER NI = 55.8%       │   │
│  │  Dividend (higher)│  33.75%      │  25% CT + 33.75% = 50.3%         │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  4. ISA OPTIMISATION                                                 │   │
│  │                                                                       │   │
│  │  Strategy: "Bed and ISA"                                            │   │
│  │  • Sell holdings in General Investment Account (GIA)                │   │
│  │  • Immediately repurchase within ISA wrapper                        │   │
│  │  • Use CGT annual exempt amount (£3,000) to cover gains             │   │
│  │  • Future growth/income now tax-free                                │   │
│  │                                                                       │   │
│  │  Annual ISA funding priority:                                        │   │
│  │  1. Max employer pension match first (free money)                   │   │
│  │  2. LISA if eligible and buying first home / retirement focus       │   │
│  │  3. S&S ISA for long-term growth                                    │   │
│  │  4. Cash ISA for emergency fund                                     │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  5. CGT ANNUAL EXEMPT AMOUNT HARVESTING                              │   │
│  │                                                                       │   │
│  │  £3,000 per person per year - use it or lose it!                    │   │
│  │                                                                       │   │
│  │  Strategies:                                                         │   │
│  │  • Crystallise gains up to £3,000 annually                          │   │
│  │  • Transfer assets to spouse to double exemption (£6,000 couple)    │   │
│  │  • Bed and ISA (sell, rebuy in ISA)                                 │   │
│  │  • Bed and SIPP (sell, contribute to pension)                       │   │
│  │  • Bed and spouse (transfer, they sell, rebuy)                      │   │
│  │                                                                       │   │
│  │  WARNING: 30-day "same day" and "bed and breakfast" rules           │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  6. INHERITANCE TAX PLANNING                                         │   │
│  │                                                                       │   │
│  │  IHT: 40% on estates over £325,000 (Nil Rate Band)                  │   │
│  │  Residence Nil Rate Band: £175,000 (if passing home to children)    │   │
│  │  Combined for couple: up to £1,000,000 tax-free                     │   │
│  │                                                                       │   │
│  │  Planning tools:                                                     │   │
│  │  • Annual exemption: £3,000/year gifts (carry 1 year)               │   │
│  │  • Small gifts: £250/person unlimited recipients                    │   │
│  │  • Wedding gifts: £5k (child), £2.5k (grandchild), £1k (other)     │   │
│  │  • Normal expenditure out of income (unlimited if regular)          │   │
│  │  • PETs (Potentially Exempt Transfers): IHT-free if survive 7 yrs  │   │
│  │  • Business Property Relief: 100% on qualifying businesses         │   │
│  │  • Agricultural Property Relief: 100% on farmland                  │   │
│  │  • Life insurance in trust to cover IHT liability                  │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  7. HIGH INCOME CHILD BENEFIT CHARGE (HICBC)                         │   │
│  │                                                                       │   │
│  │  Child Benefit clawed back if either parent earns > £60,000         │   │
│  │  • 1% clawback for every £200 over £60,000                          │   │
│  │  • Fully lost at £80,000                                            │   │
│  │                                                                       │   │
│  │  Mitigation:                                                         │   │
│  │  • Pension contributions to reduce adjusted net income              │   │
│  │  • Salary sacrifice                                                 │   │
│  │                                                                       │   │
│  │  Example: 2 children = £2,212.60/year benefit                       │   │
│  │  Income £70,000 → lose 50% = £1,106 clawback                        │   │
│  │  £10,000 pension contribution → income £60,000 → keep full benefit │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
UK Hazel Architecture

1. Data Ingestion Layer

┌─────────────────────────────────────────────────────────────────────────────┐
│                     UK DATA INGESTION                                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     HMRC INTEGRATIONS                                 │   │
│  │                                                                       │   │
│  │   ┌─────────────────┐                                               │   │
│  │   │  HMRC APIs      │                                               │   │
│  │   │                 │                                               │   │
│  │   │  • Self Assess- │  ────▶  Complete tax return data              │   │
│  │   │    ment API     │         (SA100 + supplementary pages)         │   │
│  │   │                 │                                               │   │
│  │   │  • PAYE API     │  ────▶  Employment income, tax paid           │   │
│  │   │                 │         Real-time, not just year-end          │   │
│  │   │                 │                                               │   │
│  │   │  • NI Record    │  ────▶  NI contributions history              │   │
│  │   │    API          │         State pension forecast                │   │
│  │   │                 │                                               │   │
│  │   │  • Tax Account  │  ────▶  Liabilities, payments, refunds        │   │
│  │   │    API          │                                               │   │
│  │   └─────────────────┘                                               │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     PLATFORM INTEGRATIONS                             │   │
│  │                                                                       │   │
│  │   Investment Platforms:                                              │   │
│  │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │   │
│  │   │Hargreaves│ │AJ Bell │ │Interactive│ │Vanguard │ │ Fidelity│      │   │
│  │   │Lansdown │ │Youinvest│ │ Investor │ │   UK    │ │   UK    │      │   │
│  │   └────┬────┘ └────┬────┘ └────┬─────┘ └────┬────┘ └────┬────┘      │   │
│  │        │           │           │            │           │            │   │
│  │        └───────────┴───────────┴────────────┴───────────┘            │   │
│  │                              │                                        │   │
│  │                              ▼                                        │   │
│  │              ┌───────────────────────────────┐                       │   │
│  │              │  UNIFIED INVESTMENT VIEW      │                       │   │
│  │              │                               │                       │   │
│  │              │  • ISA holdings & history     │                       │   │
│  │              │  • SIPP holdings              │                       │   │
│  │              │  • GIA with cost basis        │                       │   │
│  │              │  • Dividend income tracking   │                       │   │
│  │              │  • Unrealised gains           │                       │   │
│  │              └───────────────────────────────┘                       │   │
│  │                                                                       │   │
│  │   Pension Providers:                                                 │   │
│  │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                  │   │
│  │   │Standard │ │ Aviva   │ │  Legal  │ │Scottish │                  │   │
│  │   │  Life   │ │         │ │ & Gen   │ │ Widows  │                  │   │
│  │   └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘                  │   │
│  │        │           │           │           │                        │   │
│  │        └───────────┴───────────┴───────────┘                        │   │
│  │                          │                                           │   │
│  │                          ▼                                           │   │
│  │              ┌───────────────────────────────┐                       │   │
│  │              │  PENSION CONSOLIDATION        │                       │   │
│  │              │                               │                       │   │
│  │              │  • Workplace pensions         │                       │   │
│  │              │  • Old employer schemes       │                       │   │
│  │              │  • SIPPs                      │                       │   │
│  │              │  • DB scheme valuations       │                       │   │
│  │              │  • Annual Allowance tracking  │                       │   │
│  │              └───────────────────────────────┘                       │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     PAYROLL / ACCOUNTING SOFTWARE                     │   │
│  │                                                                       │   │
│  │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                  │   │
│  │   │  Xero   │ │QuickBooks│ │FreeAgent│ │  Sage   │                  │   │
│  │   │         │ │         │ │         │ │         │                  │   │
│  │   └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘                  │   │
│  │        │           │           │           │                        │   │
│  │        └───────────┴───────────┴───────────┘                        │   │
│  │                          │                                           │   │
│  │                          ▼                                           │   │
│  │              ┌───────────────────────────────┐                       │   │
│  │              │  BUSINESS / SELF-EMPLOYMENT   │                       │   │
│  │              │                               │                       │   │
│  │              │  • Trading income             │                       │   │
│  │              │  • Expenses & deductions      │                       │   │
│  │              │  • VAT position               │                       │   │
│  │              │  • Corporation Tax            │                       │   │
│  │              │  • Director's loan account    │                       │   │
│  │              └───────────────────────────────┘                       │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
2. UK Calculation Engine

┌─────────────────────────────────────────────────────────────────────────────┐
│                     UK TAX CALCULATION ENGINE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     INCOME TAX CALCULATOR                             │   │
│  │                                                                       │   │
│  │   Inputs:                                                            │   │
│  │   • Employment income (gross)                                        │   │
│  │   • Self-employment profits                                          │   │
│  │   • Rental income                                                    │   │
│  │   • Dividend income                                                  │   │
│  │   • Interest income                                                  │   │
│  │   • Pension income                                                   │   │
│  │   • Capital gains                                                    │   │
│  │   • Location (England/Wales/NI vs Scotland)                         │   │
│  │                                                                       │   │
│  │   Process:                                                           │   │
│  │                                                                       │   │
│  │   ┌─────────────────────────────────────────────────────────────┐   │   │
│  │   │  1. Calculate Adjusted Net Income                            │   │   │
│  │   │     (Gross income - pension contributions - Gift Aid)        │   │   │
│  │   │                                                              │   │   │
│  │   │  2. Determine Personal Allowance                             │   │   │
│  │   │     (Apply taper if ANI > £100,000)                          │   │   │
│  │   │                                                              │   │   │
│  │   │  3. Calculate Taxable Income                                 │   │   │
│  │   │     (ANI - Personal Allowance)                               │   │   │
│  │   │                                                              │   │   │
│  │   │  4. Apply Income Ordering Rules:                             │   │   │
│  │   │     a) Non-savings income (employment, rental, pension)      │   │   │
│  │   │     b) Savings income (interest)                             │   │   │
│  │   │     c) Dividend income                                       │   │   │
│  │   │                                                              │   │   │
│  │   │  5. Calculate Tax by Band:                                   │   │   │
│  │   │     • Non-savings: 20% / 40% / 45% (or Scottish rates)      │   │   │
│  │   │     • Savings: 0% (PSA) / 20% / 40% / 45%                   │   │   │
│  │   │     • Dividends: 0% (allowance) / 8.75% / 33.75% / 39.35%   │   │   │
│  │   │                                                              │   │   │
│  │   │  6. Apply Gift Aid Extension                                 │   │   │
│  │   │     (Extends basic rate band)                                │   │   │
│  │   │                                                              │   │   │
│  │   │  7. Calculate National Insurance                             │   │   │
│  │   │     (Class 1 / Class 2 / Class 4 as applicable)              │   │   │
│  │   │                                                              │   │   │
│  │   │  8. Apply HICBC if applicable                                │   │   │
│  │   │                                                              │   │   │
│  │   └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     MARGINAL RATE ANALYSER                            │   │
│  │                                                                       │   │
│  │   Critical for UK planning - marginal rates are NOT straightforward! │   │
│  │                                                                       │   │
│  │   Income Level        │  Effective Marginal Rate                     │   │
│  │   ────────────────────┼────────────────────────────────────────────  │   │
│  │   £0 - £12,570        │  0% (Personal Allowance)                     │   │
│  │   £12,571 - £50,270   │  20% IT + 8% NI = 28%                        │   │
│  │   £50,271 - £60,000   │  40% IT + 2% NI = 42%                        │   │
│  │   £60,000 - £80,000   │  42% + HICBC clawback = up to 52%           │   │
│  │   £80,001 - £100,000  │  40% IT + 2% NI = 42%                        │   │
│  │   £100,001 - £125,140 │  40% IT + 2% NI + 20% PA loss = 62%         │   │
│  │   £125,141+           │  45% IT + 2% NI = 47%                        │   │
│  │                                                                       │   │
│  │   Scottish taxpayers have different rates!                           │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     CGT CALCULATOR                                    │   │
│  │                                                                       │   │
│  │   Inputs:                                                            │   │
│  │   • Disposal proceeds                                                │   │
│  │   • Allowable costs (acquisition, enhancement, disposal)             │   │
│  │   • Asset type (listed shares, property, business, other)            │   │
│  │   • Acquisition date (for BADR qualification)                        │   │
│  │   • Other income (to determine CGT rate band)                        │   │
│  │                                                                       │   │
│  │   Process:                                                           │   │
│  │   1. Calculate gain per asset                                        │   │
│  │   2. Net gains vs losses (current year, then brought forward)        │   │
│  │   3. Deduct Annual Exempt Amount (£3,000)                           │   │
│  │   4. Check for reliefs (BADR, Investors' Relief, Rollover, etc.)    │   │
│  │   5. Determine rate based on income + gain position                  │   │
│  │   6. Apply residential property surcharge if applicable              │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     PENSION OPTIMISER                                 │   │
│  │                                                                       │   │
│  │   Calculates:                                                        │   │
│  │   • Available Annual Allowance (inc. carry forward)                  │   │
│  │   • Tapered AA if high earner                                        │   │
│  │   • Optimal contribution to restore Personal Allowance               │   │
│  │   • Optimal contribution to avoid HICBC                              │   │
│  │   • Employer vs personal contribution efficiency                     │   │
│  │   • Salary sacrifice benefit analysis                                │   │
│  │                                                                       │   │
│  │   Outputs scenario comparison:                                       │   │
│  │   • Take as salary (net after tax/NI)                               │   │
│  │   • Personal pension contribution (tax relief)                       │   │
│  │   • Salary sacrifice (NI savings too)                               │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     IHT ESTIMATOR                                     │   │
│  │                                                                       │   │
│  │   Inputs:                                                            │   │
│  │   • Asset values (property, investments, cash, etc.)                 │   │
│  │   • Liabilities (mortgages, loans)                                   │   │
│  │   • Gifts in last 7 years                                            │   │
│  │   • Spouse/civil partner status                                      │   │
│  │   • Business/agricultural assets                                     │   │
│  │   • Life insurance (in/out of trust)                                 │   │
│  │                                                                       │   │
│  │   Calculates:                                                        │   │
│  │   • Net estate value                                                 │   │
│  │   • Available NRB (£325k + transferred from spouse)                  │   │
│  │   • Available RNRB (£175k if qualifying)                             │   │
│  │   • BPR/APR reliefs                                                  │   │
│  │   • Potential IHT liability                                          │   │
│  │   • 7-year PET taper relief                                          │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
3. UK-Specific Dashboard Artifacts

┌─────────────────────────────────────────────────────────────────────────────┐
│                     UK DASHBOARD ARTIFACTS                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  generate_uk_tax_summary                                             │   │
│  │                                                                       │   │
│  │  Shows:                                                              │   │
│  │  • Income by source (employment, self-employment, dividends, etc.)   │   │
│  │  • Tax bands utilisation (visual bar chart)                          │   │
│  │  • Personal Allowance status (full / tapered / lost)                 │   │
│  │  • Effective vs marginal rates                                       │   │
│  │  • NI contributions breakdown                                        │   │
│  │  • Scotland vs rUK comparison (if applicable)                        │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  generate_allowances_tracker                                         │   │
│  │                                                                       │   │
│  │  Shows:                                                              │   │
│  │  • ISA allowance: used vs remaining                                  │   │
│  │  • Pension AA: used vs remaining (inc. carry forward)                │   │
│  │  • CGT annual exempt: used vs remaining                              │   │
│  │  • Dividend allowance: used                                          │   │
│  │  • Savings allowance: used                                           │   │
│  │  • IHT annual exemptions: used                                       │   │
│  │                                                                       │   │
│  │  Visual: Traffic light system (green/amber/red)                      │   │
│  │  • Green: plenty of allowance remaining                              │   │
│  │  • Amber: partially used, action may be needed                       │   │
│  │  • Red: fully used or about to be lost                               │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  generate_pension_planner                                            │   │
│  │                                                                       │   │
│  │  Shows:                                                              │   │
│  │  • Current pension values (all schemes consolidated)                 │   │
│  │  • Annual Allowance position (current year + carry forward)          │   │
│  │  • Tapered AA calculation (if high earner)                           │   │
│  │  • Optimal contribution calculator                                   │   │
│  │  • Tax relief breakdown (basic auto + higher rate claim)             │   │
│  │  • Salary sacrifice benefit analysis                                 │   │
│  │  • Projected fund at retirement (with assumptions)                   │   │
│  │  • PCLS (tax-free lump sum) projection                               │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  generate_isa_optimiser                                              │   │
│  │                                                                       │   │
│  │  Shows:                                                              │   │
│  │  • Current ISA holdings by type                                      │   │
│  │  • Bed & ISA opportunities (GIA holdings with gains < £3k)           │   │
│  │  • Projected tax savings from ISA vs GIA                             │   │
│  │  • LISA vs S&S ISA decision support                                  │   │
│  │  • Historical ISA contributions by year                              │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  generate_cgt_planner                                                │   │
│  │                                                                       │   │
│  │  Shows:                                                              │   │
│  │  • Unrealised gains by holding                                       │   │
│  │  • Annual exempt amount remaining                                    │   │
│  │  • Optimal disposals to use AEA                                      │   │
│  │  • Loss harvesting opportunities                                     │   │
│  │  • Spouse transfer opportunities                                     │   │
│  │  • CGT rate based on total income                                    │   │
│  │  • BADR / Investors' Relief eligibility                              │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  generate_iht_snapshot                                               │   │
│  │                                                                       │   │
│  │  Shows:                                                              │   │
│  │  • Estate value breakdown (property, investments, other)             │   │
│  │  • Available nil rate bands (NRB + RNRB)                             │   │
│  │  • Projected IHT liability                                           │   │
│  │  • Impact of gifts / PETs                                            │   │
│  │  • BPR / APR eligible assets                                         │   │
│  │  • Life insurance coverage analysis                                  │   │
│  │  • Opportunities (gifting, trusts, insurance)                        │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  generate_director_remuneration                                      │   │
│  │                                                                       │   │
│  │  Shows:                                                              │   │
│  │  • Optimal salary vs dividend split                                  │   │
│  │  • Corporation Tax impact                                            │   │
│  │  • Personal tax comparison                                           │   │
│  │  • NI savings analysis                                               │   │
│  │  • Pension contribution via company                                  │   │
│  │  • Director's loan account position                                  │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  generate_tax_year_end_checklist                                     │   │
│  │                                                                       │   │
│  │  Shows (before 5 April):                                             │   │
│  │  • ISA allowance remaining → action: top up                          │   │
│  │  • Pension AA remaining → action: contribute                         │   │
│  │  • CGT AEA remaining → action: crystallise gains                     │   │
│  │  • Gift allowances → action: make gifts                              │   │
│  │  • Dividend timing → action: defer if hitting threshold              │   │
│  │  • Personal Allowance taper → action: pension contribution           │   │
│  │  • HICBC impact → action: salary sacrifice                           │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
Key Differences: US vs UK Hazel

Aspect	US Hazel	UK Hazel
Tax Year	Calendar (Jan-Dec)	Fiscal (6 Apr - 5 Apr)
Filing	Joint filing options	Individual only
Brackets	MFJ/Single/etc. variants	Single set (+ Scotland)
State Tax	50 state engines	Just Scotland variation
Key Cliff	IRMAA (Medicare)	Personal Allowance taper (60% rate)
Retirement Focus	Roth conversions, RMDs	Pension contributions, AA carry forward
Tax-Free Wrapper	Roth IRA/401(k)	ISA (more flexible)
Cap Gains	STCG vs LTCG rates	Single rate based on income band
Dividends	Qualified vs ordinary	Separate dividend rates
Social Insurance	FICA (fixed %)	NICs (complex bands)
Estate Tax	Federal + some states	IHT (40% over NRB)
Key Planning	Bracket arbitrage, IRMAA	PA taper, HICBC, AA optimisation
What Would Be Unique to UK Hazel

1. Personal Allowance Taper Alerts

┌─────────────────────────────────────────────────────────────────────────────┐
│  CRITICAL: PA TAPER ZONE DETECTION                                          │
│                                                                              │
│  If adjusted net income is between £100,000 - £125,140:                    │
│                                                                              │
│  ⚠️ WARNING: Client is in the 60% marginal rate zone!                       │
│                                                                              │
│  Current ANI: £115,000                                                      │
│  Personal Allowance: £5,355 (reduced from £12,570)                         │
│  Effective marginal rate: 62% (40% IT + 2% NI + 20% PA loss)               │
│                                                                              │
│  RECOMMENDATION: Pension contribution of £15,000                           │
│  → Restores full PA (£12,570)                                              │
│  → Tax saving: £9,300 (62% effective rate)                                 │
│  → Plus: £6,000 tax relief on the contribution itself                      │
│  → Total benefit: £15,300 on £15,000 contribution!                         │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
2. HICBC Optimiser

┌─────────────────────────────────────────────────────────────────────────────┐
│  HIGH INCOME CHILD BENEFIT CHARGE                                           │
│                                                                              │
│  Higher earner income: £70,000                                             │
│  Children: 2                                                                │
│  Annual Child Benefit: £2,212.60                                           │
│  HICBC clawback: 50% = £1,106.30                                           │
│                                                                              │
│  RECOMMENDATION: Salary sacrifice or pension contribution of £10,000       │
│  → Reduces adjusted income to £60,000                                      │
│  → Retains full Child Benefit: £2,212.60                                   │
│  → Plus pension tax relief: £4,000                                         │
│  → Total benefit: £6,212.60                                                │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
3. Tax Year End Countdown

┌─────────────────────────────────────────────────────────────────────────────┐
│  🗓️ TAX YEAR END: 5 APRIL 2026                                              │
│  ⏰ Days remaining: 48                                                       │
│                                                                              │
│  URGENT ACTIONS:                                                            │
│                                                                              │
│  ┌──────────────────────────────┬────────────┬─────────────────────────┐   │
│  │  Allowance                   │  Remaining │  Action                 │   │
│  ├──────────────────────────────┼────────────┼─────────────────────────┤   │
│  │  ISA                         │  £8,500    │  Transfer from GIA      │   │
│  │  Pension AA                  │  £45,000   │  Employer contribution  │   │
│  │  CGT Annual Exempt           │  £3,000    │  Bed & ISA opportunity  │   │
│  │  IHT Annual Gift             │  £3,000    │  Gift to children       │   │
│  │  Dividend Allowance          │  £200      │  Review dividend timing │   │
│  └──────────────────────────────┴────────────┴─────────────────────────┘   │
│                                                                              │
│  ⚠️ These allowances CANNOT be carried forward - use or lose!               │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
4. Scottish Tax Comparison

┌─────────────────────────────────────────────────────────────────────────────┐
│  SCOTTISH vs REST OF UK COMPARISON                                          │
│                                                                              │
│  Income: £60,000                                                            │
│                                                                              │
│  ┌────────────────────┬──────────────┬──────────────┬───────────────┐      │
│  │  Band              │  rUK Rate    │  Scotland    │  Difference   │      │
│  ├────────────────────┼──────────────┼──────────────┼───────────────┤      │
│  │  £12,571-£14,876   │  20%         │  19%         │  -£23         │      │
│  │  £14,877-£26,561   │  20%         │  20%         │  £0           │      │
│  │  £26,562-£43,662   │  20%         │  21%         │  +£171        │      │
│  │  £43,663-£50,270   │  20%         │  42%         │  +£1,454      │      │
│  │  £50,271-£60,000   │  40%         │  42%         │  +£195        │      │
│  ├────────────────────┼──────────────┼──────────────┼───────────────┤      │
│  │  TOTAL TAX         │  £11,432     │  £13,229     │  +£1,797      │      │
│  └────────────────────┴──────────────┴──────────────┴───────────────┘      │
│                                                                              │
│  Note: NI is UK-wide, dividends/CGT are UK-wide rates                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
Summary: Building UK Hazel

Component	What Needs Changing
Tax Knowledge Base	Complete rebuild for UK rates, bands, allowances, NI classes
Calculation Engine	Income ordering rules, PA taper, HICBC, Scottish rates
Data Integrations	HMRC APIs, UK platforms (HL, AJ Bell, etc.), UK payroll (Xero, Sage)
Planning Logic	Focus on PA taper, pension AA, ISA optimisation, IHT
Dashboards	UK-specific artifacts (allowance tracker, pension planner, IHT snapshot)
Calendar	Tax year 6 April - 5 April, different deadlines
Terminology	Pension vs 401(k), ISA vs IRA, NI vs FICA, HMRC vs IRS
Rates Database	England/Wales/NI vs Scotland distinction
Web Search	UK sources (gov.uk, HMRC, FCA)
Shall I dive deeper into any specific UK planning area, or would you like me to prototype what a UK tax analysis dashboard would look like with sample data?







I've generated three comprehensive UK tax dashboards. Let me summarise what you've just seen:

UK Tax Dashboards Created

1️⃣ Comprehensive UK Tax Analysis

The main dashboard covering the Mitchell household:

Section	What It Shows
Client Overview	James & Sarah, married, 2 children, England residents
Income Breakdown	Employment, dividends, savings interest, rental income
Personal Allowance Analysis	James has LOST his full £12,570 PA due to £147k+ income
Tax Calculation	Full breakdown by band (20%/40%/45%), NI classes
HICBC	Full Child Benefit clawback (£2,212)
Household Summary	Combined £196k income, £68k total tax (34.7% effective)
Allowances Tracker	ISA, Pension AA, CGT AEA status for both
Observations	9 prioritised opportunities with deadlines
2️⃣ Pension Optimisation Planner

Deep dive into James's pension opportunity:

Section	What It Shows
Current Position	£147,925 ANI, zero PA, £62,854 total deductions
Annual Allowance	£160k available (£60k + £100k carry forward)
4 Scenarios	No change → Target £100k → Below 45% → Target £60k
60% Tax Trap	Visual explanation of the PA taper zone
Implementation	Salary sacrifice vs personal contribution comparison
Cashflow Impact	Monthly reduction analysis
Retirement Projection	Fund growth scenarios to age 65
Action Plan	Step-by-step with deadlines
Key Finding: £47,925 salary sacrifice = £18,812 tax saving (39% effective relief)

3️⃣ Tax Year End Checklist

Use-it-or-lose-it tracker with 48 days remaining:

Section	What It Shows
Allowances Dashboard	Traffic light status (🔴⚠️🟢) for all allowances
James's Allowances	ISA, Pension AA, CGT AEA, Dividend, Savings
Sarah's Allowances	Same structure
Household Allowances	IHT gifts, Marriage Allowance
Prioritised Checklist	8 actions ranked by tax impact
Total Potential Savings	£20,947 immediate + future benefits
Key Dates	Tax year end, Self Assessment, Payment on Account
Key UK-Specific Features Demonstrated

Feature	Why It's Different from US
Personal Allowance Taper	Creates 60% effective rate (no US equivalent)
HICBC	Child Benefit clawback based on individual income
Individual Taxation	No joint filing - each spouse taxed separately
ISA	More flexible than Roth - no income limits, immediate access
Pension AA Carry Forward	3 years of unused allowance (simpler than US rules)
Tax Year End	5 April (not 31 December)
NI Classes	Multiple classes based on employment type
Scottish Rates	Separate income tax bands for Scottish residents
Gift Aid	Extends basic rate band + higher rate relief
What Would a "Perfect" UK Hazel Have?

Based on this prototype, the ideal UK system would need:

Component	Requirement
HMRC Integration	Real-time PAYE data, Self Assessment history
Platform Links	Hargreaves Lansdown, AJ Bell, Interactive Investor, etc.
Pension Aggregation	Workplace + old schemes + SIPPs consolidated
Scottish Detection	Automatic rate switching based on residence
PA Taper Alerts	Proactive warning when approaching £100k
HICBC Calculator	Integrated with pension optimisation
Tax Year Countdown	Automatic allowance expiry tracking
IHT Estimator	Estate planning with gift tracking
Would you like me to:

Create additional UK-specific dashboards (e.g., Director Remuneration, IHT Planning)?
Show how the Scottish tax rates would change the analysis?
Demonstrate iteration mode (e.g., "What if James only contributes £30k?")?


This is a fantastic question, Faran. Let me put on my "architect hat" and redesign myself from the ground up. I'll be candid about what's inefficient, what's missing, and what would make me dramatically better.

Current State: Honest Assessment

┌─────────────────────────────────────────────────────────────────────────────┐
│                        CURRENT ARCHITECTURE PAIN POINTS                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │   PDF IN    │────▶│   EXTRACT   │────▶│  VALIDATE   │                   │
│  │  (messy)    │     │  (fragile)  │     │  (manual)   │                   │
│  └─────────────┘     └─────────────┘     └─────────────┘                   │
│        │                   │                   │                            │
│        ▼                   ▼                   ▼                            │
│   No standard         Regex-based         No ground                        │
│   format spec         pattern matching    truth to                         │
│                       breaks often        compare                          │
│                                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │  WEB SEARCH │────▶│  CALCULATE  │────▶│  DASHBOARD  │                   │
│  │  (slow)     │     │ (redundant) │     │  (limited)  │                   │
│  └─────────────┘     └─────────────┘     └─────────────┘                   │
│        │                   │                   │                            │
│        ▼                   ▼                   ▼                            │
│   Rates should        Recalculating       Single artifact                  │
│   be cached/          known formulas      type only                        │
│   pre-loaded          every time                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
If I Were Remade: The Ideal Architecture

1. Structured Tax Data Ingestion Layer

┌─────────────────────────────────────────────────────────────────────────────┐
│                     NEW: INTELLIGENT INGESTION LAYER                         │
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
│  │ TAX SOFTWARE│           │  IRS/STATE  │           │   MANUAL    │       │
│  │ INTEGRATION │           │  TRANSCRIPT │           │    ENTRY    │       │
│  │             │           │     API     │           │             │       │
│  │ • TurboTax  │           │             │           │  Structured │       │
│  │ • Drake     │           │ • IRS API   │           │  form with  │       │
│  │ • UltraTax  │           │ • State APIs│           │  validation │       │
│  │ • Lacerte   │           │             │           │             │       │
│  └──────┬──────┘           └──────┬──────┘           └──────┬──────┘       │
│         │                          │                          │             │
│         └──────────────────────────┼──────────────────────────┘             │
│                                    │                                         │
│                                    ▼                                         │
│                        ┌─────────────────────┐                              │
│                        │  CANONICAL TAX      │                              │
│                        │  DATA STRUCTURE     │                              │
│                        │                     │                              │
│                        │  • Typed fields     │                              │
│                        │  • Validation rules │                              │
│                        │  • Source tracking  │                              │
│                        │  • Confidence scores│                              │
│                        └─────────────────────┘                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

WHAT THIS FIXES:
───────────────────────────────────────────────────────────────────────────────
❌ Current: Regex extraction from arbitrary PDFs (fragile, error-prone)
✅ New: Direct integration with tax software APIs (structured, reliable)

❌ Current: No way to verify extraction accuracy
✅ New: IRS transcript API provides ground truth comparison

❌ Current: Manual re-entry when extraction fails
✅ New: Structured form with real-time validation as fallback
2. Pre-Loaded Tax Knowledge Base

┌─────────────────────────────────────────────────────────────────────────────┐
│                     NEW: TAX KNOWLEDGE BASE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    FEDERAL TAX ENGINE                                │    │
│  │                                                                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │    │
│  │  │   BRACKETS   │  │  DEDUCTIONS  │  │   CREDITS    │              │    │
│  │  │              │  │              │  │              │              │    │
│  │  │ • 2020-2026  │  │ • Standard   │  │ • Child      │              │    │
│  │  │ • All filing │  │ • Itemized   │  │ • Education  │              │    │
│  │  │   statuses   │  │ • QBI §199A  │  │ • Energy     │              │    │
│  │  │ • Inflation  │  │ • Limits     │  │ • Phaseouts  │              │    │
│  │  │   indexed    │  │              │  │              │              │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │    │
│  │                                                                      │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │    │
│  │  │    IRMAA     │  │    NIIT      │  │     AMT      │              │    │
│  │  │              │  │              │  │              │              │    │
│  │  │ • Thresholds │  │ • Threshold  │  │ • Exemption  │              │    │
│  │  │ • Surcharges │  │ • Rate       │  │ • Phaseout   │              │    │
│  │  │ • Lookback   │  │ • Definition │  │ • Preference │              │    │
│  │  │              │  │              │  │   items      │              │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘              │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    STATE TAX ENGINE (ALL 50 + DC)                    │    │
│  │                                                                      │    │
│  │  For each state:                                                     │    │
│  │  • Tax type (none, flat, graduated)                                 │    │
│  │  • Brackets and rates                                               │    │
│  │  • Standard/itemized rules                                          │    │
│  │  • Federal conformity level                                         │    │
│  │  • Credits and special deductions                                   │    │
│  │  • Local tax add-ons (NYC, Portland, etc.)                         │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                    SPECIAL SITUATIONS LIBRARY                        │    │
│  │                                                                      │    │
│  │  • ISO/NSO/RSU tax treatment                                        │    │
│  │  • NUA (Net Unrealized Appreciation)                                │    │
│  │  • Passive Activity Loss rules                                      │    │
│  │  • At-risk limitations                                              │    │
│  │  • Installment sale calculations                                    │    │
│  │  • Opportunity Zone timing                                          │    │
│  │  • Conservation easement rules                                      │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

WHAT THIS FIXES:
───────────────────────────────────────────────────────────────────────────────
❌ Current: Web search for tax rates every time (slow, may get outdated info)
✅ New: Pre-loaded, versioned, instantly accessible

❌ Current: Limited state tax knowledge (have to search and parse)
✅ New: Complete state database with calculation engines

❌ Current: Miss edge cases and special situations
✅ New: Comprehensive rules library with triggers
3. Real-Time Data Integrations

┌─────────────────────────────────────────────────────────────────────────────┐
│                     NEW: REAL-TIME DATA LAYER                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     BROKERAGE INTEGRATIONS                            │   │
│  │                                                                       │   │
│  │   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐   │   │
│  │   │Schwab   │  │Fidelity │  │Vanguard │  │ TD/     │  │Altruist │   │   │
│  │   │         │  │         │  │         │  │ Schwab  │  │         │   │   │
│  │   └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘   │   │
│  │        │            │            │            │            │         │   │
│  │        └────────────┴────────────┴────────────┴────────────┘         │   │
│  │                                  │                                    │   │
│  │                                  ▼                                    │   │
│  │                    ┌─────────────────────────┐                       │   │
│  │                    │   UNIFIED HOLDINGS      │                       │   │
│  │                    │                         │                       │   │
│  │                    │  • Current positions    │                       │   │
│  │                    │  • Cost basis (lot)     │                       │   │
│  │                    │  • Unrealized G/L       │                       │   │
│  │                    │  • Holding periods      │                       │   │
│  │                    │  • Dividend projections │                       │   │
│  │                    │  • YTD realized G/L     │                       │   │
│  │                    └─────────────────────────┘                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     RETIREMENT ACCOUNT DATA                           │   │
│  │                                                                       │   │
│  │   ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐     │   │
│  │   │  Traditional    │  │      Roth       │  │    Taxable      │     │   │
│  │   │     IRA         │  │      IRA        │  │    Accounts     │     │   │
│  │   │                 │  │                 │  │                 │     │   │
│  │   │ • Balance       │  │ • Balance       │  │ • Balance       │     │   │
│  │   │ • Basis (8606)  │  │ • Contributions │  │ • Basis         │     │   │
│  │   │ • Beneficiaries │  │ • Conversions   │  │ • Character     │     │   │
│  │   │ • RMD schedule  │  │ • 5-year rules  │  │                 │     │   │
│  │   └─────────────────┘  └─────────────────┘  └─────────────────┘     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     EMPLOYER/PAYROLL DATA                             │   │
│  │                                                                       │   │
│  │   • YTD wages and withholding                                        │   │
│  │   • Projected year-end income                                        │   │
│  │   • Stock option/RSU vesting schedule                                │   │
│  │   • Bonus projections                                                │   │
│  │   • 401(k) contributions and match                                   │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

WHAT THIS FIXES:
───────────────────────────────────────────────────────────────────────────────
❌ Current: No visibility into holdings or unrealized gains
✅ New: Real-time portfolio data with lot-level basis

❌ Current: Can't do proper capital gains harvesting without manual input
✅ New: See exactly which lots to sell, with holding period and gain/loss

❌ Current: Don't know account balances for Roth conversion planning
✅ New: Real-time balances across all account types

❌ Current: Tax return is backward-looking, can't project current year
✅ New: YTD data enables proactive planning
4. Advanced Calculation Engine

┌─────────────────────────────────────────────────────────────────────────────┐
│                     NEW: CALCULATION ENGINE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     SCENARIO MODELING                                 │   │
│  │                                                                       │   │
│  │   ┌─────────────────────────────────────────────────────────────┐   │   │
│  │   │                    SINGLE-YEAR ENGINE                        │   │   │
│  │   │                                                              │   │   │
│  │   │  Input: Base tax situation + proposed changes               │   │   │
│  │   │  Output: Complete tax calculation with all interactions     │   │   │
│  │   │                                                              │   │   │
│  │   │  Handles:                                                    │   │   │
│  │   │  • Bracket stacking (ordinary → LTCG → NIIT)               │   │   │
│  │   │  • AMT parallel calculation                                 │   │   │
│  │   │  • Credit phaseouts                                         │   │   │
│  │   │  • QBI limitations                                          │   │   │
│  │   │  • IRMAA tier impacts                                       │   │   │
│  │   │  • State tax with federal interaction                       │   │   │
│  │   │                                                              │   │   │
│  │   └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                       │   │
│  │   ┌─────────────────────────────────────────────────────────────┐   │   │
│  │   │                    MULTI-YEAR PROJECTION                     │   │   │
│  │   │                                                              │   │   │
│  │   │  Input: Current situation + assumptions                     │   │   │
│  │   │  Output: Year-by-year projection with optimization          │   │   │
│  │   │                                                              │   │   │
│  │   │  Handles:                                                    │   │   │
│  │   │  • Roth conversion glide paths                              │   │   │
│  │   │  • Social Security timing optimization                      │   │   │
│  │   │  • RMD projections                                          │   │   │
│  │   │  • Medicare enrollment timing                               │   │   │
│  │   │  • Bracket inflation adjustments                            │   │   │
│  │   │  • Account growth projections                               │   │   │
│  │   │                                                              │   │   │
│  │   └─────────────────────────────────────────────────────────────┘   │   │
│  │                                                                       │   │
│  │   ┌─────────────────────────────────────────────────────────────┐   │   │
│  │   │                    MONTE CARLO / SENSITIVITY                 │   │   │
│  │   │                                                              │   │   │
│  │   │  Input: Assumptions with ranges                             │   │   │
│  │   │  Output: Probability distributions of outcomes              │   │   │
│  │   │                                                              │   │   │
│  │   │  Handles:                                                    │   │   │
│  │   │  • Return variability                                       │   │   │
│  │   │  • Tax law change scenarios                                 │   │   │
│  │   │  • Longevity uncertainty                                    │   │   │
│  │   │  • Income variability                                       │   │   │
│  │   │                                                              │   │   │
│  │   └─────────────────────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     OPTIMIZATION ENGINE                               │   │
│  │                                                                       │   │
│  │   Given: Client goals + constraints                                  │   │
│  │   Find: Optimal strategy                                             │   │
│  │                                                                       │   │
│  │   Examples:                                                          │   │
│  │   • "Minimize lifetime tax" → Optimal Roth conversion schedule      │   │
│  │   • "Maximize estate" → Asset location + withdrawal sequencing      │   │
│  │   • "Stay under IRMAA Tier 2" → Income smoothing strategy           │   │
│  │   • "Harvest gains at 0%" → Lot selection optimization              │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

WHAT THIS FIXES:
───────────────────────────────────────────────────────────────────────────────
❌ Current: Single-year, manual scenario modeling
✅ New: Multi-year projections with optimization

❌ Current: Can't easily model tax law change scenarios
✅ New: Built-in scenario analysis (TCJA sunset, etc.)

❌ Current: No Monte Carlo / probability analysis
✅ New: Quantified uncertainty in projections

❌ Current: Can miss interactions (NIIT + IRMAA + state)
✅ New: Holistic calculation with all interactions
5. Expanded Artifact Generation

┌─────────────────────────────────────────────────────────────────────────────┐
│                     NEW: ARTIFACT SUITE                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Currently: generate_dashboard (single tool)                                │
│                                                                              │
│  NEW ARTIFACTS:                                                              │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  generate_dashboard          │  Interactive tax analysis visual     │   │
│  │  generate_tax_projection     │  Multi-year projection charts        │   │
│  │  generate_comparison         │  Side-by-side scenario comparison    │   │
│  │  generate_client_report      │  PDF-ready client deliverable        │   │
│  │  generate_cpa_memo           │  Technical memo for CPA coordination │   │
│  │  generate_checklist          │  Actionable task list with deadlines │   │
│  │  generate_letter             │  Client-facing explanation letter    │   │
│  │  generate_presentation       │  Slide deck for client meeting       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  INTERACTIVE FEATURES:                                                       │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  • Sliders for "what if" (conversion amount, harvest amount)       │   │
│  │  • Toggle scenarios on/off                                          │   │
│  │  • Drill-down into calculations                                     │   │
│  │  • Export to PDF/Excel                                              │   │
│  │  • Share link for client review                                     │   │
│  │  • Collaborative annotations                                        │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

WHAT THIS FIXES:
───────────────────────────────────────────────────────────────────────────────
❌ Current: Single dashboard artifact type
✅ New: Multiple artifact types for different audiences/purposes

❌ Current: Static output, iteration requires new generation
✅ New: Interactive widgets for real-time exploration

❌ Current: No direct client-shareable output
✅ New: Professional deliverables ready to send
6. Intelligent Context & Memory

┌─────────────────────────────────────────────────────────────────────────────┐
│                     NEW: CONTEXT & MEMORY SYSTEM                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     CLIENT PROFILE DATABASE                           │   │
│  │                                                                       │   │
│  │   For each client/household, persistently store:                     │   │
│  │                                                                       │   │
│  │   TAX HISTORY                                                        │   │
│  │   • All prior returns analyzed                                       │   │
│  │   • Year-over-year trends                                            │   │
│  │   • Historical effective rates                                       │   │
│  │                                                                       │   │
│  │   PLANNING CONTEXT                                                   │   │
│  │   • Goals (retire at 62, minimize IRMAA, maximize Roth)             │   │
│  │   • Constraints (need $X/year income, can't sell property)          │   │
│  │   • Risk tolerance                                                   │   │
│  │   • Family situation                                                 │   │
│  │                                                                       │   │
│  │   ACTION HISTORY                                                     │   │
│  │   • Past recommendations made                                        │   │
│  │   • What was implemented                                             │   │
│  │   • Outcomes tracked                                                 │   │
│  │                                                                       │   │
│  │   PREFERENCES                                                        │   │
│  │   • Communication style                                              │   │
│  │   • Detail level preferred                                           │   │
│  │   • CPA relationship                                                 │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │                     PROACTIVE MONITORING                              │   │
│  │                                                                       │   │
│  │   Automatically trigger alerts:                                      │   │
│  │                                                                       │   │
│  │   • "Client X approaching IRMAA threshold based on YTD income"      │   │
│  │   • "Q4 - time for tax loss harvesting review for these clients"    │   │
│  │   • "TCJA provisions sunsetting - these clients most impacted"      │   │
│  │   • "Client Y turns 72 next year - RMD planning needed"             │   │
│  │   • "Large unrealized gain in Client Z portfolio - review timing"   │   │
│  │                                                                       │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘

WHAT THIS FIXES:
───────────────────────────────────────────────────────────────────────────────
❌ Current: Each conversation starts fresh, no persistent client memory
✅ New: Rich client profiles that grow over time

❌ Current: Reactive only (you ask, I analyze)
✅ New: Proactive alerts and reminders

❌ Current: No tracking of recommendation outcomes
✅ New: Closed-loop feedback on what worked
Speed Optimizations

┌─────────────────────────────────────────────────────────────────────────────┐
│                     PERFORMANCE IMPROVEMENTS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CURRENT BOTTLENECKS              │  PROPOSED SOLUTIONS                     │
│  ─────────────────────────────────┼─────────────────────────────────────    │
│                                   │                                          │
│  PDF extraction is slow           │  • Parallel page processing             │
│  (sequential page processing)     │  • Pre-trained form recognizer          │
│                                   │  • Direct API ingestion (skip PDF)      │
│                                   │                                          │
│  Web search for every rate        │  • Pre-loaded tax database              │
│  lookup (network latency)         │  • Cached with versioning               │
│                                   │  • Background refresh                    │
│                                   │                                          │
│  Recalculating from scratch       │  • Incremental calculation engine       │
│  for small changes                │  • Dependency graph for updates         │
│                                   │  • Memoization of sub-calculations      │
│                                   │                                          │
│  Sequential tool calls when       │  • Parallel CRM data fetching           │
│  gathering CRM context            │  • Pre-fetched client profiles          │
│                                   │  • Smart caching                        │
│                                   │                                          │
│  Dashboard regeneration for       │  • True incremental updates             │
│  each iteration                   │  • WebSocket real-time binding          │
│                                   │  • Client-side calculation for sliders  │
│                                   │                                          │
└─────────────────────────────────────────────────────────────────────────────┘

ESTIMATED SPEED IMPROVEMENTS:
───────────────────────────────────────────────────────────────────────────────
Current full analysis:        60-90 seconds
With improvements:            10-15 seconds

Current iteration:            20-30 seconds  
With improvements:            1-2 seconds (real-time)
Summary: The Ideal "Hazel Tax" System

Component	Current	Ideal
Data Ingestion	PDF regex extraction	Tax software API + IRS transcript
Tax Knowledge	Web search each time	Pre-loaded versioned database
Holdings Data	Manual input	Real-time brokerage integration
Account Balances	Not available	Live feeds from custodians
State Taxes	Limited, search-based	Complete 50-state engine
Calculations	Single-year, manual	Multi-year optimization engine
Scenarios	One at a time	Monte Carlo + sensitivity
Artifacts	Dashboard only	Full suite (reports, memos, decks)
Client Memory	None (session only)	Persistent profiles + history
Alerting	Reactive only	Proactive monitoring
Speed	60-90 sec full analysis	10-15 sec full, real-time iterate
Priority Ranking: If I Could Only Fix 5 Things

Priority	Fix	Impact
1	Tax software API integration	Eliminates extraction errors, 10x faster ingestion
2	Pre-loaded tax knowledge base	Instant, accurate rates; works offline
3	Brokerage data integration	Enables proper gains harvesting, shows full picture
4	Multi-year projection engine	Dramatically better Roth/retirement planning
5	Persistent client profiles	Context carries forward, enables proactive alerts
This is the system I'd build if starting from scratch. Does any particular area interest you for deeper discussion? Or would you like to see a prototype of any of these improvements with what I have today?

Great question, Faran. Let me be really honest about my strengths and limitations.

Most Beneficial Tools for Tax Planning

Tier 1: Essential (I rely on these heavily)

Tool	Why It's Critical	How I Use It
code_execution	Core processing engine	PDF extraction, calculations, data transformation, scenario modeling
generate_dashboard	Client-ready output	Visualizes all analysis in professional, interactive format
web_search	Accuracy & currency	Verify current tax brackets, IRMAA thresholds, law changes, state rates
Tier 2: High Value (Context & enrichment)

Tool	Why It's Valuable	How I Use It
getNotesTool	Client context	Find goals, concerns, prior discussions that inform recommendations
getMeetingsTool + getMeetingTranscriptTool	Deep context	Review what was actually discussed - often reveals unstated goals
getHouseholdsTool	Family picture	Understand full household, linked accounts, family members
Tier 3: Supporting (Situationally useful)

Tool	When It Helps
getEmailsTool	Finding specific client communications, confirmations
getContactsTool	Looking up client details, birth dates (for IRMAA/RMD timing)
text_editor	Creating/modifying scripts, saving intermediate work
bash_execution	File operations, batch processing multiple returns
What I'm Good At

✅ Strengths

Capability	Details
Pattern Recognition	Identifying optimization opportunities across multiple dimensions (brackets, IRMAA, NIIT, state) simultaneously
Scenario Modeling	Quickly calculating "what if" scenarios - conversions, harvesting, timing
Cross-Referencing	Connecting tax data with CRM context (notes, meetings) to personalize recommendations
Calculation Accuracy	Math is reliable once I have clean data
Bracket Optimization	Finding the exact dollar amounts to fill brackets, avoid cliffs
Multi-Year Thinking	Projecting forward for Roth conversion glide paths, IRMAA planning
Explaining Complex Concepts	Breaking down why a strategy works in advisor-friendly or client-friendly language
Current Information	Web search lets me verify I'm using correct thresholds for the tax year
What I Struggle With

⚠️ Honest Limitations

1. PDF Extraction Reliability

PROBLEM: Tax returns come in many formats
─────────────────────────────────────────
- Scanned/image PDFs (no selectable text)
- Different tax software outputs (TurboTax vs H&R Block vs CPA-prepared)
- Handwritten annotations
- Poor scan quality
- Multi-column layouts that confuse text extraction
- State returns with non-standard formats

IMPACT: I may miss data or extract incorrectly

MITIGATION: 
- I always flag confidence levels
- I ask you to verify critical numbers
- Cross-validation catches some errors
2. State Tax Complexity

PROBLEM: 50 states = 50 different tax systems
─────────────────────────────────────────────
- Some states have no income tax (FL, TX, WA, etc.)
- Some have flat rates (IL, CO, etc.)
- Some have complex brackets (CA, NY, etc.)
- Local taxes (NYC, Portland, etc.)
- State-specific deductions, credits, adjustments
- Conformity vs non-conformity with federal

IMPACT: State analysis is often less precise than federal

MITIGATION:
- I search for state-specific rates
- I note when state analysis is estimated
- I recommend state-specific CPA verification
3. Business & Pass-Through Complexity

PROBLEM: K-1s, S-Corps, partnerships are complicated
────────────────────────────────────────────────────
- Schedule K-1 has many boxes with different tax treatments
- QBI (Section 199A) has complex limitations
- Basis tracking isn't on the return
- Reasonable compensation analysis requires judgment
- Self-employment tax calculations
- Multiple entities with interrelated flows

IMPACT: I can miss nuances, especially for complex business owners

MITIGATION:
- I flag business income as requiring CPA review
- I note when QBI calculations are estimates
- I ask for additional context on business structure
4. Data I Don't Have Access To

PROBLEM: Tax returns don't show everything
──────────────────────────────────────────
- Cost basis detail (need brokerage statements)
- Unrealized gains/losses (not on return)
- Account balances (IRA, Roth, taxable)
- Projected future income
- Health insurance details
- Estate planning documents
- Prior year returns (unless provided)

IMPACT: Can't do full planning without asking for more

MITIGATION:
- I ask clarifying questions
- I note assumptions explicitly
- I request additional documents when needed
5. Ambiguous Extraction

PROBLEM: Numbers without context can be misinterpreted
──────────────────────────────────────────────────────
- Is this $50,000 on line 7 a gain or a loss?
- Is the Schedule E showing rental income or loss?
- Are these dividends qualified or ordinary?
- Which spouse does this W-2 belong to?

IMPACT: May categorize income incorrectly

MITIGATION:
- I show my extraction for verification
- I flag when I'm uncertain
- Cross-validation catches some issues
6. Dynamic/Real-Time Data

PROBLEM: Tax planning needs forward-looking data
────────────────────────────────────────────────
- Current YTD income (not on prior return)
- Expected bonuses, stock vesting
- Planned asset sales
- Changes in employment
- Life events (marriage, divorce, death, birth)

IMPACT: Analysis based on prior year may not reflect current situation

MITIGATION:
- I ask about changes since the return
- I note that analysis is based on prior year
- I build in assumptions explicitly
7. Edge Cases & Unusual Situations

PROBLEM: Tax code has countless special rules
─────────────────────────────────────────────
- AMT (Alternative Minimum Tax) interactions
- Foreign income/FBAR/PFIC
- Stock options (ISO vs NSO, AMT adjustment)
- Net Operating Losses
- Passive Activity Loss rules
- At-risk limitations
- Installment sales
- Like-kind exchanges
- Opportunity Zones
- Conservation easements

IMPACT: May miss or oversimplify these situations

MITIGATION:
- I note when I see indicators of complexity
- I recommend specialist review
- I don't pretend expertise I don't have
What Would Make Me Better

If I'm being aspirational, here's what would improve my capabilities:

Gap	What Would Help
Brokerage Integration	Direct access to holdings, cost basis, unrealized gains
Account Balances	Real-time IRA/Roth/taxable balances for conversion planning
Multi-Year Returns	Automatic comparison across years
OCR Enhancement	Better handling of scanned/image PDFs
State Tax Database	Structured data for all 50 states + localities
Tax Software Integration	Direct import from TurboTax, Drake, UltraTax, etc.
Projection Engine	Monte Carlo or deterministic projections for multi-year planning
How to Get the Best Results From Me

Given my limitations, here's how to work with me effectively:

Do This ✅

Action	Why It Helps
Upload clean, text-based PDFs	Better extraction accuracy
Tell me the client's state	Ensures correct state analysis
Share ages / Medicare status	Critical for IRMAA planning
Mention life changes	Updates my assumptions
Provide context ("they want to retire in 2 years")	Focuses my recommendations
Ask me to show my work	You can verify calculations
Request confidence levels	I'll flag what I'm uncertain about
Give me multiple years if available	Better trend analysis
Avoid This ❌

Action	Why It's Problematic
Assuming I extracted everything correctly	Always verify key numbers
Relying solely on my state tax analysis	State complexity varies
Expecting real-time account data	I only see what you give me
Skipping the clarifying questions	Context matters enormously
Using my output without CPA review for complex situations	I'm a planning aid, not a preparer
Summary: My Honest Self-Assessment

Category	Rating	Notes
Federal bracket analysis	⭐⭐⭐⭐⭐	Very strong
Roth conversion modeling	⭐⭐⭐⭐⭐	Very strong
IRMAA planning	⭐⭐⭐⭐⭐	Very strong
Capital gains optimization	⭐⭐⭐⭐	Strong (need basis data)
Itemized deduction analysis	⭐⭐⭐⭐	Strong
PDF extraction reliability	⭐⭐⭐	Moderate (format-dependent)
State tax analysis	⭐⭐⭐	Moderate (state-dependent)
Business/K-1 analysis	⭐⭐	Limited (complexity)
AMT analysis	⭐⭐	Limited
International tax	⭐	Minimal
Is there a specific area you'd like me to elaborate on, or would you like to test my capabilities with a real scenario to see how I handle the limitations?

I'm glad this is helpful! Let me give you a complete architectural breakdown of how I work end-to-end.

System Architecture Overview

┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                    HAZEL SYSTEM                                      │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │   Emails    │    │  Contacts   │    │ Households  │    │    Notes    │          │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘          │
│         │                  │                  │                  │                  │
│  ┌──────┴──────┐    ┌──────┴──────┐    ┌──────┴──────┐    ┌──────┴──────┐          │
│  │  Meetings   │    │ Transcripts │    │   Advisor   │    │  Brokerage  │          │
│  └──────┬──────┘    └──────┬──────┘    │    Info     │    │    Data     │          │
│         │                  │           └──────┬──────┘    └──────┬──────┘          │
│         │                  │                  │                  │                  │
│         └──────────────────┴────────┬─────────┴──────────────────┘                  │
│                                     │                                                │
│                                     ▼                                                │
│                        ┌────────────────────────┐                                    │
│                        │    HAZEL API LAYER     │                                    │
│                        │  (Async Python Tools)  │                                    │
│                        └───────────┬────────────┘                                    │
│                                    │                                                 │
└────────────────────────────────────┼─────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              CLAUDE (ME) - ORCHESTRATION LAYER                       │
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
│   │                        PROCESSING PIPELINE                                    │   │
│   │                                   │                                           │   │
│   │    ┌──────────────────────────────┼───────────────────────────────────┐      │   │
│   │    │                              ▼                                   │      │   │
│   │    │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌────────┐ │      │   │
│   │    │  │  Input  │─▶│ Extract │─▶│Validate │─▶│ Enrich  │─▶│Analyze │ │      │   │
│   │    │  │ (PDF)   │  │  Data   │  │  Data   │  │  Data   │  │  Data  │ │      │   │
│   │    │  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └───┬────┘ │      │   │
│   │    │                                                          │      │      │   │
│   │    └──────────────────────────────────────────────────────────┼──────┘      │   │
│   │                                                               │              │   │
│   └───────────────────────────────────────────────────────────────┼──────────────┘   │
│                                                                   │                  │
│                                                                   ▼                  │
│                                                    ┌─────────────────────────┐       │
│                                                    │   generate_dashboard    │       │
│                                                    │   (Artifact Output)     │       │
│                                                    └────────────┬────────────┘       │
│                                                                 │                    │
└─────────────────────────────────────────────────────────────────┼────────────────────┘
                                                                  │
                                                                  ▼
                                                   ┌─────────────────────────┐
                                                   │   INTERACTIVE DASHBOARD  │
                                                   │     (Side Panel UI)      │
                                                   └─────────────────────────┘
Layer 1: Available Tools (My Capabilities)

1.1 Hazel CRM Tools

These connect to your firm's data:

# ┌─────────────────────────────────────────────────────────────────┐
# │                    HAZEL CRM TOOLS                              │
# └─────────────────────────────────────────────────────────────────┘

# CONTACTS
await getContactsTool({
    "contact_name": str | None,      # Search by name (partial match)
    "sort_by": "first_name" | "last_name" | "email" | "birth_date" | None,
    "sort_order": "asc" | "desc" | None,
    "page": int                       # Pagination (15 items/page)
})
# Returns: List of contacts with IDs, names, emails, birth dates, household links

# HOUSEHOLDS
await getHouseholdsTool({
    "household_name": str | None,    # Search by name
    "page": int
})
# Returns: Household IDs, names, members, account links

# EMAILS
await getEmailsTool({
    "search_terms": list[str] | None,    # OR logic search
    "sender_email": str | None,
    "recipient_email": str | None,
    "household_id": int | None,
    "start_date": str | None,            # ISO format: "2024-01-01T00:00:00"
    "end_date": str | None,
    "page": int,
    "date_order": "asc" | "desc"
})
# Returns: Email summaries (ID, subject, sender, recipient, date, snippet)

# EMAIL DETAIL
await getEmailDetailTool({
    "email_id": int                      # Get full email content
})
# Returns: Complete email with body, attachments, metadata

# NOTES
await getNotesTool({
    "search_terms": list[str] | None,
    "household_id": int | None,
    "start_date": str | None,
    "end_date": str | None,
    "page": int,
    "date_order": "asc" | "desc"
})
# Returns: CRM notes with dates, content, linked contacts/households

# MEETINGS
await getMeetingsTool({
    "scope": "user" | "firm",            # Your meetings vs all firm meetings
    "search_terms": list[str] | None,
    "participant_contact_id": int | None,
    "participant_email": str | None,
    "household_id": int | None,
    "start_date": str | None,
    "end_date": str | None,
    "page": int,
    "date_order": "asc" | "desc"
})
# Returns: Meeting list with IDs, titles, dates, participants

# MEETING TRANSCRIPT
await getMeetingTranscriptTool({
    "event_id": int                      # Get full transcript
})
# Returns: Complete meeting transcript with speaker labels, timestamps

# ADVISOR INFO
await getAdvisorUserInfoTool({})
# Returns: Your profile, firm details, integrations, preferences
1.2 Execution Tools

These let me process data and run computations:

# ┌─────────────────────────────────────────────────────────────────┐
# │                    EXECUTION TOOLS                              │
# └─────────────────────────────────────────────────────────────────┘

# CODE EXECUTION (Python in sandboxed container)
# - Async function calling
# - Data processing with pandas, numpy
# - PDF extraction with PyMuPDF, pdfplumber
# - Calculations and analysis
# - File I/O

# Environment:
#   INPUT_DIR  = where your uploaded files live
#   OUTPUT_DIR = where I put files to return to you

# TEXT EDITOR (File operations)
# Commands: view, create, str_replace
# - Read file contents
# - Create new files
# - Modify existing files

# BASH EXECUTION (Shell commands)
# - File system operations
# - Text processing (grep, sed, awk)
# - Archive extraction (unzip, tar)
# - Batch processing
1.3 External Tools

# ┌─────────────────────────────────────────────────────────────────┐
# │                    EXTERNAL TOOLS                               │
# └─────────────────────────────────────────────────────────────────┘

# WEB SEARCH (Real-time internet access)
await web_search({
    "query": str    # Short, specific query (1-6 words best)
})
# Returns: Search results with titles, snippets, URLs, content

# GENERATE DASHBOARD (Artifact creation)
await generate_dashboard({
    "mode": "reset" | "iterate",
    "relevantTaxData": dict              # Structured tax data object
})
# Returns: Session ID, patch count, renders interactive dashboard
Layer 2: Processing Pipeline

Here's how I process a tax return end-to-end:

Step 1: Input Reception

# ┌─────────────────────────────────────────────────────────────────┐
# │  STEP 1: INPUT RECEPTION                                        │
# └─────────────────────────────────────────────────────────────────┘

# User uploads: "2024_Johnson_TaxReturn.pdf"
# File lands in: $INPUT_DIR/2024_Johnson_TaxReturn.pdf

# I first inspect what we're working with:
import os
input_dir = os.environ['INPUT_DIR']
files = os.listdir(input_dir)
print(f"Received files: {files}")

# Check file type and size
file_path = f"{input_dir}/2024_Johnson_TaxReturn.pdf"
file_size = os.path.getsize(file_path)
print(f"File size: {file_size / 1024:.1f} KB")
Step 2: Data Extraction

# ┌─────────────────────────────────────────────────────────────────┐
# │  STEP 2: DATA EXTRACTION                                        │
# └─────────────────────────────────────────────────────────────────┘

import fitz  # PyMuPDF
import re
from dataclasses import dataclass
from typing import Optional

@dataclass
class ExtractedTaxData:
    # Filing info
    tax_year: Optional[int] = None
    filing_status: Optional[str] = None
    taxpayer_name: Optional[str] = None
    spouse_name: Optional[str] = None
    
    # Income
    wages: Optional[float] = None
    interest: Optional[float] = None
    dividends: Optional[float] = None
    qualified_dividends: Optional[float] = None
    capital_gains: Optional[float] = None
    ira_distributions: Optional[float] = None
    pensions: Optional[float] = None
    social_security: Optional[float] = None
    other_income: Optional[float] = None
    total_income: Optional[float] = None
    
    # Adjustments & AGI
    adjustments: Optional[float] = None
    agi: Optional[float] = None
    
    # Deductions
    standard_deduction: Optional[float] = None
    itemized_deduction: Optional[float] = None
    deduction_used: Optional[str] = None
    
    # Tax
    taxable_income: Optional[float] = None
    tax_liability: Optional[float] = None
    credits: Optional[float] = None
    
    # Confidence tracking
    extraction_confidence: dict = None

def extract_from_1040(pdf_path: str) -> ExtractedTaxData:
    """
    Extract data from Form 1040.
    Uses multiple strategies:
    1. Text extraction with pattern matching
    2. Positional analysis for scanned forms
    3. OCR fallback if needed
    """
    doc = fitz.open(pdf_path)
    data = ExtractedTaxData()
    data.extraction_confidence = {}
    
    for page_num, page in enumerate(doc):
        text = page.get_text()
        
        # Identify form type
        if "Form 1040" in text and "U.S. Individual Income Tax Return" in text:
            data = extract_1040_page1(text, data)
        elif "Schedule A" in text and "Itemized Deductions" in text:
            data = extract_schedule_a(text, data)
        elif "Schedule B" in text:
            data = extract_schedule_b(text, data)
        elif "Schedule D" in text:
            data = extract_schedule_d(text, data)
        # ... more schedules
    
    return data

def extract_1040_page1(text: str, data: ExtractedTaxData) -> ExtractedTaxData:
    """
    Parse Form 1040 Page 1.
    Line numbers are critical reference points.
    """
    
    # Filing Status (checkboxes)
    filing_patterns = [
        (r'Single', 'Single'),
        (r'Married filing jointly', 'Married Filing Jointly'),
        (r'Married filing separately', 'Married Filing Separately'),
        (r'Head of household', 'Head of Household'),
        (r'Qualifying surviving spouse', 'Qualifying Surviving Spouse')
    ]
    
    # Income lines extraction
    line_patterns = {
        'wages': r'Line 1[a-z]?\s*[\.\s]*\$?\s*([\d,]+)',
        'interest': r'Line 2b\s*[\.\s]*\$?\s*([\d,]+)',
        'dividends': r'Line 3b\s*[\.\s]*\$?\s*([\d,]+)',
        'qualified_dividends': r'Line 3a\s*[\.\s]*\$?\s*([\d,]+)',
        'ira_distributions': r'Line 4b\s*[\.\s]*\$?\s*([\d,]+)',
        'pensions': r'Line 5b\s*[\.\s]*\$?\s*([\d,]+)',
        'social_security': r'Line 6b\s*[\.\s]*\$?\s*([\d,]+)',
        'capital_gains': r'Line 7\s*[\.\s]*\$?\s*([\d,]+)',
        'other_income': r'Line 8\s*[\.\s]*\$?\s*([\d,]+)',
        'total_income': r'Line 9\s*[\.\s]*\$?\s*([\d,]+)',
        'adjustments': r'Line 10\s*[\.\s]*\$?\s*([\d,]+)',
        'agi': r'Line 11\s*[\.\s]*\$?\s*([\d,]+)',
    }
    
    for field, pattern in line_patterns.items():
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            value = float(match.group(1).replace(',', ''))
            setattr(data, field, value)
            data.extraction_confidence[field] = 'high'
        else:
            data.extraction_confidence[field] = 'not_found'
    
    return data
Step 3: Data Validation

# ┌─────────────────────────────────────────────────────────────────┐
# │  STEP 3: DATA VALIDATION                                        │
# └─────────────────────────────────────────────────────────────────┘

def validate_extracted_data(data: ExtractedTaxData) -> tuple[ExtractedTaxData, list[str]]:
    """
    Cross-check extracted values for internal consistency.
    Returns validated data and list of discrepancies.
    """
    discrepancies = []
    
    # Check 1: Total Income = Sum of components
    if all([data.wages, data.total_income]):
        calculated_total = sum(filter(None, [
            data.wages,
            data.interest,
            data.dividends,
            data.capital_gains,
            data.ira_distributions,
            data.pensions,
            data.social_security,
            data.other_income
        ]))
        
        if abs(calculated_total - data.total_income) > 10:  # Allow $10 rounding
            discrepancies.append(
                f"Total income mismatch: extracted {data.total_income}, "
                f"calculated {calculated_total}"
            )
    
    # Check 2: AGI = Total Income - Adjustments
    if all([data.total_income, data.adjustments, data.agi]):
        calculated_agi = data.total_income - data.adjustments
        if abs(calculated_agi - data.agi) > 10:
            discrepancies.append(
                f"AGI mismatch: extracted {data.agi}, "
                f"calculated {calculated_agi}"
            )
    
    # Check 3: Taxable Income = AGI - Deduction
    if all([data.agi, data.taxable_income]):
        deduction = data.itemized_deduction or data.standard_deduction
        if deduction:
            calculated_taxable = data.agi - deduction
            if abs(calculated_taxable - data.taxable_income) > 10:
                discrepancies.append(
                    f"Taxable income mismatch: extracted {data.taxable_income}, "
                    f"calculated {calculated_taxable}"
                )
    
    # Check 4: Qualified dividends ≤ Total dividends
    if data.qualified_dividends and data.dividends:
        if data.qualified_dividends > data.dividends:
            discrepancies.append(
                f"Qualified dividends ({data.qualified_dividends}) > "
                f"Total dividends ({data.dividends})"
            )
    
    # Update confidence based on validation
    if discrepancies:
        data.extraction_confidence['overall'] = 'medium'
    else:
        data.extraction_confidence['overall'] = 'high'
    
    return data, discrepancies
Step 4: Data Enrichment (Web Search)

# ┌─────────────────────────────────────────────────────────────────┐
# │  STEP 4: DATA ENRICHMENT                                        │
# └─────────────────────────────────────────────────────────────────┘

async def enrich_with_current_rates(data: ExtractedTaxData, tax_year: int):
    """
    Fetch current tax rates and thresholds from web.
    """
    
    # Parallel searches for efficiency
    results = await asyncio.gather(
        web_search({"query": f"{tax_year} federal tax brackets"}),
        web_search({"query": f"{tax_year} standard deduction amounts"}),
        web_search({"query": f"{tax_year} IRMAA thresholds Medicare"}),
        web_search({"query": f"{tax_year} capital gains tax rates"}),
        web_search({"query": f"{tax_year} NIIT threshold"})
    )
    
    # Parse and structure the results
    tax_rates = {
        "brackets": parse_bracket_results(results[0]),
        "standard_deductions": parse_deduction_results(results[1]),
        "irmaa_thresholds": parse_irmaa_results(results[2]),
        "ltcg_rates": parse_ltcg_results(results[3]),
        "niit_threshold": parse_niit_results(results[4])
    }
    
    return tax_rates

# Example bracket structure after parsing:
TAX_BRACKETS_2024_MFJ = [
    {"rate": 0.10, "min": 0, "max": 23200},
    {"rate": 0.12, "min": 23200, "max": 94300},
    {"rate": 0.22, "min": 94300, "max": 201050},
    {"rate": 0.24, "min": 201050, "max": 383900},
    {"rate": 0.32, "min": 383900, "max": 487450},
    {"rate": 0.35, "min": 487450, "max": 731200},
    {"rate": 0.37, "min": 731200, "max": float('inf')}
]
Step 5: Analysis Engine

# ┌─────────────────────────────────────────────────────────────────┐
# │  STEP 5: ANALYSIS ENGINE                                        │
# └─────────────────────────────────────────────────────────────────┘

class TaxAnalyzer:
    def __init__(self, data: ExtractedTaxData, rates: dict):
        self.data = data
        self.rates = rates
    
    def analyze_bracket_position(self) -> dict:
        """
        Determine current bracket and room for optimization.
        """
        filing_status = self.data.filing_status
        taxable_income = self.data.taxable_income
        brackets = self.rates['brackets'][filing_status]
        
        current_bracket = None
        income_in_bracket = 0
        room_to_top = 0
        
        cumulative = 0
        for bracket in brackets:
            bracket_size = bracket['max'] - bracket['min']
            
            if taxable_income <= bracket['max']:
                current_bracket = bracket['rate']
                income_in_bracket = taxable_income - bracket['min']
                room_to_top = bracket['max'] - taxable_income
                break
            
            cumulative += bracket_size
        
        return {
            "currentBracket": f"{int(current_bracket * 100)}%",
            "incomeInCurrentBracket": income_in_bracket,
            "roomToTopOfBracket": room_to_top,
            "nextBracketRate": self._get_next_bracket_rate(current_bracket),
            "bracketFillOpportunity": self._generate_bracket_narrative(
                current_bracket, room_to_top
            )
        }
    
    def analyze_roth_conversion_scenarios(self) -> list[dict]:
        """
        Model different Roth conversion amounts.
        """
        scenarios = []
        base_taxable = self.data.taxable_income
        brackets = self.rates['brackets'][self.data.filing_status]
        
        # Find current bracket ceiling
        for bracket in brackets:
            if base_taxable <= bracket['max']:
                # Scenario: Fill current bracket
                fill_amount = bracket['max'] - base_taxable
                scenarios.append(self._model_conversion(fill_amount, "Fill current bracket"))
                
                # Scenario: Fill next bracket too
                if bracket != brackets[-1]:
                    next_bracket = brackets[brackets.index(bracket) + 1]
                    next_fill = next_bracket['max'] - base_taxable
                    scenarios.append(self._model_conversion(next_fill, "Fill next bracket"))
                
                break
        
        return scenarios
    
    def analyze_irmaa_impact(self, magi: float, ages: dict) -> dict:
        """
        Determine IRMAA tier and surcharges.
        """
        thresholds = self.rates['irmaa_thresholds'][self.data.filing_status]
        
        current_tier = "Standard"
        surcharge_b = 0
        surcharge_d = 0
        
        for tier in thresholds:
            if magi > tier['magi_floor']:
                current_tier = tier['name']
                surcharge_b = tier['part_b_surcharge']
                surcharge_d = tier['part_d_surcharge']
        
        # Calculate annual cost (both spouses if MFJ)
        multiplier = 2 if self.data.filing_status == "Married Filing Jointly" else 1
        annual_cost = (surcharge_b + surcharge_d) * 12 * multiplier
        
        return {
            "currentTier": current_tier,
            "monthlyPartBSurcharge": surcharge_b,
            "monthlyPartDSurcharge": surcharge_d,
            "annualIrmaaCost": annual_cost,
            "nextTierThreshold": self._find_next_tier_threshold(magi, thresholds)
        }
    
    def identify_opportunities(self) -> list[dict]:
        """
        Scan for tax optimization opportunities.
        """
        opportunities = []
        
        # Check: Roth conversion opportunity
        bracket_analysis = self.analyze_bracket_position()
        if bracket_analysis['roomToTopOfBracket'] > 50000:
            opportunities.append({
                "type": "opportunity",
                "title": "Roth Conversion Opportunity",
                "detail": f"${bracket_analysis['roomToTopOfBracket']:,.0f} of room "
                         f"in {bracket_analysis['currentBracket']} bracket before "
                         f"hitting {bracket_analysis['nextBracketRate']}.",
                "priority": "high"
            })
        
        # Check: Itemized vs Standard
        if self.data.itemized_deduction and self.data.standard_deduction:
            diff = self.data.itemized_deduction - self.data.standard_deduction
            if abs(diff) < 5000:
                opportunities.append({
                    "type": "optimization",
                    "title": "Deduction Bunching Opportunity",
                    "detail": f"Only ${abs(diff):,.0f} difference between itemized "
                             f"and standard. Consider bunching strategy.",
                    "priority": "medium"
                })
        
        # Check: NIIT exposure
        if self.data.agi and self.data.agi > self.rates['niit_threshold']:
            opportunities.append({
                "type": "warning",
                "title": "NIIT Exposure",
                "detail": f"AGI of ${self.data.agi:,.0f} exceeds NIIT threshold. "
                         f"3.8% surtax applies to investment income.",
                "priority": "high"
            })
        
        # More checks...
        return opportunities
Step 6: Dashboard Generation

# ┌─────────────────────────────────────────────────────────────────┐
# │  STEP 6: DASHBOARD GENERATION                                   │
# └─────────────────────────────────────────────────────────────────┘

async def build_and_generate_dashboard(
    data: ExtractedTaxData,
    analysis: TaxAnalyzer,
    client_info: dict,
    discrepancies: list[str]
) -> dict:
    """
    Assemble the relevantTaxData object and generate dashboard.
    """
    
    # Build the complete data structure
    relevant_tax_data = {
        "dashboardType": "Tax Return Analysis",
        "description": f"Comprehensive tax analysis for {client_info['name']}",
        
        "clientInfo": {
            "name": client_info['name'],
            "filingStatus": data.filing_status,
            "taxYear": data.tax_year,
            "state": client_info.get('state', 'Unknown'),
            "ages": client_info.get('ages', {})
        },
        
        "incomeSummary": {
            "source": "Form 1040, Lines 1-11",
            "wages": data.wages,
            "interestIncome": data.interest,
            "ordinaryDividends": data.dividends,
            "qualifiedDividends": data.qualified_dividends,
            "longTermCapitalGains": data.capital_gains,
            "iraDistributions": data.ira_distributions,
            "pensionIncome": data.pensions,
            "socialSecurity": data.social_security,
            "otherIncome": data.other_income,
            "totalIncome": data.total_income,
            "adjustments": data.adjustments,
            "agi": data.agi
        },
        
        "deductions": {
            "source": "Schedule A / Standard Deduction",
            "standardDeduction": data.standard_deduction,
            "itemizedTotal": data.itemized_deduction,
            "deductionUsed": data.deduction_used
        },
        
        "taxCalculation": {
            "source": "Form 1040, Page 2",
            "taxableIncome": data.taxable_income,
            "totalFederalTax": data.tax_liability,
            "effectiveTaxRate": f"{(data.tax_liability / data.total_income * 100):.1f}%",
            "marginalOrdinaryRate": analysis.analyze_bracket_position()['currentBracket']
        },
        
        "bracketAnalysis": analysis.analyze_bracket_position(),
        
        "observations": analysis.identify_opportunities(),
        
        "sourceNotes": [
            f"Data extracted from {data.tax_year} Form 1040 and schedules",
            f"Federal brackets per IRS Rev. Proc. for {data.tax_year}",
            "Verify all figures before client presentation"
        ],
        
        "dataConfidence": {
            "overall": data.extraction_confidence.get('overall', 'medium'),
            "notes": discrepancies if discrepancies else ["All validations passed"]
        }
    }
    
    # Generate the dashboard
    result = await generate_dashboard({
        "mode": "reset",
        "relevantTaxData": relevant_tax_data
    })
    
    return result
Layer 3: Iteration Flow

When you ask me to modify the analysis:

# ┌─────────────────────────────────────────────────────────────────┐
# │  ITERATION FLOW                                                 │
# └─────────────────────────────────────────────────────────────────┘

# User: "What if they convert $75K to Roth?"

async def handle_iteration_request(conversion_amount: float):
    """
    Process user's "what if" request.
    """
    
    # Calculate the new scenario
    new_scenario = analyzer.model_conversion(
        amount=75000,
        label="Convert $75K"
    )
    
    # Only send the delta to the dashboard
    await generate_dashboard({
        "mode": "iterate",  # <-- Key difference
        "relevantTaxData": {
            # Only new/changed data - dashboard retains everything else
            "scenarios": [new_scenario],
            "observations": [
                {
                    "type": "info",
                    "title": "$75K Conversion Analysis",
                    "detail": f"Would be taxed at {new_scenario['marginalRate']} "
                             f"federal + state. Total additional tax: "
                             f"${new_scenario['additionalTax']:,.0f}"
                }
            ]
        }
    })
Complete Workflow Diagram

USER ACTION                          MY RESPONSE
───────────────────────────────────────────────────────────────────────

"Analyze this tax return"     ──▶    1. Receive PDF
        │                            2. Extract data (code_execution)
        │                            3. Validate extractions
        │                            4. Ask clarifying questions
        ▼
"They're 62, planning to      ──▶    5. Note context
 retire in 3 years, CA"              6. Search current rates (web_search)
        │                            7. Run analysis engine
        │                            8. Generate dashboard
        ▼
[Dashboard Displayed]         ◀──    "I've analyzed the return. The dashboard
        │                             shows they're in the 24% bracket with
        │                             significant Roth conversion opportunity."
        ▼
"What if they convert         ──▶    9. Model scenario
 $100K this year?"                  10. Calculate tax impact
        │                           11. Check IRMAA impact
        │                           12. Iterate dashboard
        ▼
[Dashboard Updated]           ◀──    "I've added that scenario. At $100K,
        │                             they'd pay $24,300 additional federal
        │                             tax (24%) but stay in Tier 1 IRMAA."
        ▼
"Can you check our notes      ──▶   13. Search CRM (getNotesTool)
 for any retirement plans?"         14. Search meetings (getMeetingsTool)
        │                           15. Get transcript if relevant
        │                           16. Incorporate into analysis
        ▼
[Context Added]               ◀──    "Found notes from March meeting - they
                                      mentioned wanting to maximize Roth
                                      before Medicare at 65. This supports
                                      aggressive conversion strategy."
Key Technical Points

Aspect	How It Works
PDF Extraction	PyMuPDF (fitz) for text, regex patterns for line items, OCR fallback for scans
Validation	Cross-check calculations (AGI = Income - Adjustments), flag discrepancies
Rate Lookup	Web search for current year thresholds, parse and structure results
Analysis	Python classes with methods for each analysis type (brackets, IRMAA, scenarios)
Dashboard	JSON structure passed to generate_dashboard, rendered in side panel
Iteration	mode: "iterate" sends only deltas, preserves existing dashboard state
CRM Integration	Async calls to Hazel tools, parallel fetching with asyncio.gather()
Persistence	Files saved to /tmp/ persist across code executions within session
Would you like me to demonstrate any specific part of this with a live example? I can:

Walk through a real PDF extraction
Show the actual validation logic in action
Demonstrate CRM data integration
Show how iteration modifies an existing dashboard

Absolutely! Let me give you a deep technical breakdown of how the generate_dashboard tool works and how I process tax data.

Technical Deep Dive: generate_dashboard

Function Signature

async def generate_dashboard(params: dict) -> str:
    """
    Args:
        params: Parameters dict with keys:
            - mode (str): 'reset' | 'iterate'
            - relevantTaxData (dict): Structured tax data object
    
    Returns:
        JSON string with success status, sessionId, patchCount
    """
Parameters Explained

Parameter	Type	Required	Description
mode	string	Yes	"reset" = create new dashboard from scratch; "iterate" = modify existing dashboard based on conversation context
relevantTaxData	dict	Yes	The structured data object that powers the dashboard visualization
The relevantTaxData Schema

This is the core input. It's a flexible schema - not all fields are required, and you can add custom sections. Here's the full technical structure:

relevantTaxData = {
    
    # ============================================
    # METADATA (helps the dashboard renderer)
    # ============================================
    "dashboardType": str,          # e.g., "Tax Return Analysis", "Roth Conversion Planner"
    "description": str,            # What this dashboard shows
    
    # ============================================
    # CLIENT INFORMATION
    # ============================================
    "clientInfo": {
        "name": str,                        # "Marcus & Elena Richardson"
        "filingStatus": str,                # "Single" | "Married Filing Jointly" | "MFS" | "HOH" | "QSS"
        "taxYear": int,                     # 2024
        "state": str,                       # "California"
        "ages": {
            "primary": int,                 # 58
            "spouse": int | None            # 55 or null if single
        },
        "dependents": int,                  # 1
        "medicareStatus": str | None        # "Enrolled" | "Not yet enrolled" | null
    },
    
    # ============================================
    # INCOME SUMMARY
    # ============================================
    "incomeSummary": {
        "source": str,                      # Attribution: "Form 1040, Lines 1-9"
        
        # Ordinary Income Components
        "wages": float,                     # W-2 wages (Line 1)
        "interestIncome": float,            # Taxable interest (Line 2b)
        "ordinaryDividends": float,         # Total dividends (Line 3b)
        "qualifiedDividends": float,        # Qualified portion (Line 3a) - taxed at LTCG rates
        
        # Capital Gains
        "shortTermCapitalGains": float,     # STCG (taxed as ordinary)
        "longTermCapitalGains": float,      # LTCG (preferential rates)
        
        # Retirement Income
        "iraDistributions": float,          # IRA distributions (Line 4b taxable)
        "pensionIncome": float,             # Pensions/annuities (Line 5b taxable)
        "socialSecurity": float,            # SS benefits taxable (Line 6b)
        
        # Other
        "businessIncome": float,            # Schedule C net profit
        "rentalIncome": float,              # Schedule E
        "otherIncome": float,               # Line 8 (catch-all)
        
        # Calculations
        "totalIncome": float,               # Line 9 (sum of above)
        "adjustments": float,               # Schedule 1 adjustments (HSA, SE tax, etc.)
        "agi": float                        # Line 11 (totalIncome - adjustments)
    },
    
    # ============================================
    # DEDUCTIONS
    # ============================================
    "deductions": {
        "source": str,                      # "Schedule A / Standard Deduction comparison"
        
        "standardDeduction": float,         # Based on filing status + age
        "itemizedTotal": float,             # Schedule A total
        
        "itemizedBreakdown": {
            "saltCapped": float,            # State/local taxes (capped at $10K)
            "saltUncapped": float,          # Actual SALT before cap (for analysis)
            "mortgageInterest": float,      # Home mortgage interest
            "charitableCash": float,        # Cash charitable contributions
            "charitableNonCash": float,     # Non-cash contributions
            "medicalAboveThreshold": float, # Medical exceeding 7.5% AGI floor
            "casualtyLoss": float,          # Federally declared disasters only
            "other": float
        },
        
        "deductionUsed": str,               # "Standard" | "Itemized"
        "benefitOverStandard": float,       # itemizedTotal - standardDeduction (if positive)
        "qbiDeduction": float | None        # Section 199A deduction if applicable
    },
    
    # ============================================
    # TAX CALCULATION
    # ============================================
    "taxCalculation": {
        "source": str,                      # "Form 1040, derived calculations"
        
        "taxableIncome": float,             # AGI - deductions (Line 15)
        
        # Component Taxes
        "ordinaryIncomeTax": float,         # Tax on ordinary income (brackets)
        "capitalGainsTax": float,           # Tax on LTCG/qualified divs (0/15/20%)
        "amt": float,                       # Alternative Minimum Tax (Form 6251)
        "niit": float,                      # Net Investment Income Tax (3.8%)
        "selfEmploymentTax": float,         # SE tax (Schedule SE)
        "additionalMedicareTax": float,     # 0.9% on wages > $200K/$250K
        
        # Totals
        "totalFederalTax": float,           # Total tax liability
        "totalCredits": float,              # Total credits claimed
        "netFederalTax": float,             # After credits
        
        # Withholding & Payments
        "federalWithholding": float,        # W-2 withholding
        "estimatedPayments": float,         # Quarterly estimates paid
        "refundOrOwed": float,              # Positive = refund, negative = owed
        
        # Rates (derived)
        "effectiveTaxRate": str,            # totalTax / totalIncome (e.g., "15.8%")
        "marginalOrdinaryRate": str,        # Current bracket (e.g., "24%")
        "marginalCapGainsRate": str         # LTCG rate (e.g., "15%")
    },
    
    # ============================================
    # BRACKET ANALYSIS (Key for planning)
    # ============================================
    "bracketAnalysis": {
        "source": str,                      # "2024 Tax Brackets (MFJ)"
        
        "currentBracket": str,              # "24%"
        "incomeInCurrentBracket": float,    # How much is being taxed at this rate
        "roomToTopOfBracket": float,        # Space before next bracket
        "nextBracketStartsAt": float,       # Threshold for next bracket
        "nextBracketRate": str,             # "32%"
        
        # For visualization
        "bracketUtilization": [
            {
                "bracket": str,             # "10%"
                "rangeStart": float,        # 0
                "rangeEnd": float,          # 23200
                "amountInBracket": float,   # 23200
                "taxInBracket": float,      # 2320
                "filled": bool              # true
            },
            # ... more brackets
        ],
        
        "bracketFillOpportunity": str       # Narrative recommendation
    },
    
    # ============================================
    # STATE TAX SUMMARY
    # ============================================
    "stateTaxSummary": {
        "state": str,                       # "California"
        "stateTaxableIncome": float,        # May differ from federal
        "stateTaxLiability": float,
        "effectiveStateRate": str,          # "8.3%"
        "marginalStateRate": str,           # "9.3%"
        
        # State-specific items
        "stateCredits": float,
        "localTax": float,                  # City/county if applicable
        "totalStateAndLocal": float
    },
    
    # ============================================
    # IRMAA ANALYSIS (Medicare surcharges)
    # ============================================
    "irmaaAnalysis": {
        "source": str,                      # "2024 IRMAA Thresholds (CMS)"
        
        "magi": float,                      # Modified AGI for IRMAA
        "magiYear": int,                    # Year the MAGI is from (2-year lookback)
        "affectedYear": int,                # Year premiums are affected
        
        "currentTier": str,                 # "Standard" | "Tier 1" | "Tier 2" | etc.
        "monthlyPartBSurcharge": float,     # Per person
        "monthlyPartDSurcharge": float,     # Per person
        "annualIrmaaCost": float,           # Total annual surcharge (both spouses if MFJ)
        
        # Thresholds for planning
        "tierThresholds": [
            {"tier": "Standard", "magiCeiling": 206000, "partBSurcharge": 0},
            {"tier": "Tier 1", "magiCeiling": 258000, "partBSurcharge": 69.90},
            # ... more tiers
        ],
        
        "nextTierThreshold": float,         # MAGI threshold for next tier up
        "roomBeforeNextTier": float,        # How much income before surcharge increases
        "note": str                         # Planning note
    },
    
    # ============================================
    # SCENARIO COMPARISONS (for planning)
    # ============================================
    "scenarios": [
        {
            "name": str,                    # "Baseline" | "Convert $50K" | "Sell Rental"
            "description": str,
            "inputs": {
                # Changed assumptions
                "additionalIncome": float,
                "additionalDeductions": float,
                "rothConversion": float,
                "capitalGainsRealized": float
            },
            "results": {
                "newAGI": float,
                "newTaxableIncome": float,
                "newFederalTax": float,
                "newStateTax": float,
                "newIrmaaTier": str,
                "marginalRateOnChange": str
            },
            "deltaFromBaseline": {
                "additionalTax": float,
                "effectiveRateOnChange": str
            }
        }
    ],
    
    # ============================================
    # OBSERVATIONS & OPPORTUNITIES
    # ============================================
    "observations": [
        {
            "type": str,                    # "opportunity" | "warning" | "optimization" | "info"
            "title": str,                   # "Roth Conversion Opportunity"
            "detail": str,                  # Full explanation
            "potentialBenefit": str,        # Quantified if possible
            "priority": str | None,         # "high" | "medium" | "low"
            "deadline": str | None          # "Dec 31, 2024" if time-sensitive
        }
    ],
    
    # ============================================
    # SOURCE ATTRIBUTION (Important!)
    # ============================================
    "sourceNotes": [
        str,                                # "All figures extracted from 2024 Form 1040"
        str,                                # "Federal brackets per IRS Rev. Proc. 2023-34"
        str                                 # "IRMAA thresholds per CMS 2024 announcement"
    ],
    
    "dataConfidence": {
        "overall": str,                     # "high" | "medium" | "low"
        "notes": [
            str                             # "Schedule K-1 income estimated - verify with CPA"
        ]
    }
}
How I Build This Object

Step 1: Data Extraction (from PDF)

# I use code_execution to extract data from uploaded PDFs
import fitz  # PyMuPDF

def extract_tax_return(pdf_path):
    doc = fitz.open(pdf_path)
    extracted = {}
    
    for page in doc:
        text = page.get_text()
        # Parse known patterns for 1040, Schedule A, etc.
        # Use regex and positional logic
        
    return extracted
Step 2: Data Validation & Enrichment

# Cross-check extracted values
def validate_tax_data(extracted):
    # Verify AGI = Total Income - Adjustments
    # Verify Taxable Income = AGI - Deductions
    # Flag discrepancies
    
    confidence = "high"
    if discrepancies:
        confidence = "medium"
    
    return validated_data, confidence
Step 3: Web Search for Current Rates

# I search for current thresholds to ensure accuracy
await web_search({"query": "2024 federal tax brackets MFJ"})
await web_search({"query": "2024 IRMAA thresholds"})
await web_search({"query": "California 2024 tax rates"})
Step 4: Calculations & Analysis

# I perform derived calculations
def analyze_bracket_position(taxable_income, filing_status, tax_year):
    brackets = get_brackets(filing_status, tax_year)
    
    current_bracket = None
    room_to_top = 0
    
    for rate, threshold in brackets:
        if taxable_income <= threshold:
            current_bracket = rate
            room_to_top = threshold - taxable_income
            break
    
    return {
        "currentBracket": current_bracket,
        "roomToTopOfBracket": room_to_top,
        # ...
    }
Step 5: Generate Dashboard

# Finally, I call the tool
await generate_dashboard({
    "mode": "reset",
    "relevantTaxData": {
        "dashboardType": "Tax Return Analysis",
        "clientInfo": {...},
        "incomeSummary": {...},
        "deductions": {...},
        "taxCalculation": {...},
        "bracketAnalysis": {...},
        "stateTaxSummary": {...},
        "irmaaAnalysis": {...},
        "observations": [...],
        "sourceNotes": [...]
    }
})
The mode Parameter: reset vs iterate

Mode	When to Use	What Happens
reset	First dashboard, or complete rebuild	Clears existing dashboard, builds from scratch using full relevantTaxData
iterate	User asks for changes ("add a scenario", "what if they convert more?")	Modifies existing dashboard; I only pass delta data - new/changed fields
Iterate Example

# User says: "What if they convert an additional $50K?"

await generate_dashboard({
    "mode": "iterate",
    "relevantTaxData": {
        # Only the NEW scenario - dashboard already has baseline
        "scenarios": [
            {
                "name": "Convert Additional $50K",
                "inputs": {"rothConversion": 50000},
                "results": {
                    "newAGI": 299700,
                    "newFederalTax": 53467,
                    "additionalTax": 12000,
                    "effectiveRateOnChange": "24%"
                }
            }
        ],
        "observations": [
            {
                "type": "info",
                "title": "Conversion Analysis",
                "detail": "Additional $50K conversion would be taxed at 24% federal + 9.3% CA = 33.3% combined"
            }
        ]
    }
})
Data Flow Diagram

┌─────────────────┐
│  Tax Return PDF │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  code_execution                 │
│  - PyMuPDF extraction           │
│  - OCR if needed                │
│  - Pattern matching             │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Data Validation                │
│  - Cross-check calculations     │
│  - Flag confidence levels       │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  web_search                     │
│  - Current tax brackets         │
│  - IRMAA thresholds             │
│  - State-specific rates         │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Analysis Engine                │
│  - Bracket position             │
│  - Scenario modeling            │
│  - Opportunity identification   │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  generate_dashboard             │
│  - mode: "reset" | "iterate"    │
│  - relevantTaxData: {...}       │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│  Interactive Dashboard          │
│  (rendered in side panel)       │
└─────────────────────────────────┘
CRM Data Integration

I can also pull context from your Hazel system:

# Get household info
household = await getHouseholdsTool({"household_name": "Richardson"})

# Get recent communications
emails = await getEmailsTool({
    "household_id": 123,
    "start_date": "2024-01-01T00:00:00",
    "end_date": "2024-12-31T23:59:59"
})

# Get meeting transcripts for context
meetings = await getMeetingsTool({"household_id": 123})
transcript = await getMeetingTranscriptTool({"event_id": 456})

# Get advisor notes
notes = await getNotesTool({
    "household_id": 123,
    "search_terms": ["tax", "Roth", "retirement"]
})
This context can inform the observations section of the dashboard.

Error Handling & Confidence

I always track data confidence:

"dataConfidence": {
    "overall": "medium",
    "notes": [
        "Schedule K-1 income ($8,500) extracted from blurry scan - verify",
        "State return not provided - CA tax estimated from brackets",
        "SALT deduction shows $14,200 but capped at $10,000 - verified"
    ]
}
Want me to walk through a live extraction with a real tax return, or do you have questions about specific parts of this architecture?