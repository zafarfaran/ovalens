# Helio — Synthetic Client Data & Data Flows

> Five realistic UK clients showing exactly how their data lives in the prototype schema, and the step-by-step flow from the adviser opening the app to Helio generating insights.

---

## The Adviser

All five clients belong to the same adviser. This is the single `users` row that owns everything.

```json
// ─── users ───
{
  "id": "a1b2c3d4-0000-0000-0000-000000000001",
  "email": "james.thornton@wealthwise.co.uk",
  "full_name": "James Thornton",
  "role": "adviser",
  "preferences": {
    "theme": "dark",
    "default_tax_year": "2025/26",
    "notifications": {
      "year_end_reminders": true,
      "observation_alerts": true
    }
  }
}
```

---

## Client 1: The 60% Trap — Marcus & Priya Chen

> Higher earner trapped in the PA taper zone with HICBC. The single most valuable client type for Helio — every calculation matters here.

**Profile:** Marcus is a senior engineer at a bank earning £118,000. Priya works part-time earning £28,000. Two children, claiming child benefit. Lives in London (England).

### Stored Data

```json
// ─── households ───
{
  "id": "hh-chen-0001",
  "user_id": "a1b2c3d4-0000-0000-0000-000000000001",
  "name": "Chen Household",
  "notes": "Annual review due March. Discussed pension strategy Dec 2025."
}
```

```json
// ─── clients (Marcus) ───
{
  "id": "cl-chen-marcus",
  "household_id": "hh-chen-0001",
  "user_id": "a1b2c3d4-0000-0000-0000-000000000001",
  "first_name": "Marcus",
  "last_name": "Chen",
  "email": "marcus.chen@email.com",
  "date_of_birth": "1983-07-14",
  "ni_number": "QQ 12 34 56 A",
  "utr": null,
  "region": "england",
  "employment_status": "employed",
  "metadata": {
    "employer_name": "Barclays Investment Bank",
    "salary_sacrifice_available": true,
    "has_children": true,
    "number_of_children": 2,
    "claims_child_benefit": true
  }
}
```

```json
// ─── clients (Priya) ───
{
  "id": "cl-chen-priya",
  "household_id": "hh-chen-0001",
  "user_id": "a1b2c3d4-0000-0000-0000-000000000001",
  "first_name": "Priya",
  "last_name": "Chen",
  "email": "priya.chen@email.com",
  "date_of_birth": "1985-11-02",
  "ni_number": "QQ 65 43 21 B",
  "utr": null,
  "region": "england",
  "employment_status": "employed",
  "metadata": {
    "employer_name": "Local GP Surgery",
    "salary_sacrifice_available": false
  }
}
```

```json
// ─── tax_profiles (Marcus, 2025/26) ───
{
  "id": "tp-chen-marcus-2526",
  "client_id": "cl-chen-marcus",
  "tax_year": "2025/26",

  "total_income": 118000.00,
  "adjusted_net_income": 112000.00,
  "taxable_income": 106645.00,
  "income_tax": 33558.00,
  "national_insurance": 4241.00,
  "dividend_tax": 0,
  "total_tax": 39905.90,
  "effective_rate": 33.82,
  "marginal_rate": 62.00,
  "personal_allowance": 6570.00,
  "pa_status": "tapered",

  "in_pa_taper_zone": true,
  "hicbc_applies": true,
  "pension_taper_applies": false,

  "tax_breakdown": [
    { "band": "Basic Rate", "amount": 37700, "rate": 0.20, "tax": 7540 },
    { "band": "Higher Rate", "amount": 68945, "rate": 0.40, "tax": 27578 }
  ],

  "ni_breakdown": {
    "class1": {
      "earnings_in_main_band": 37700,
      "main_rate": 0.08,
      "main_ni": 3016,
      "earnings_above_uel": 67730,
      "additional_rate": 0.02,
      "additional_ni": 1355,
      "total_employee_ni": 4371
    }
  },

  "income_sources": [
    {
      "id": "is-chen-001",
      "source_type": "employment",
      "label": "Barclays Investment Bank",
      "gross_amount": 118000,
      "tax_deducted": 33558,
      "ni_deducted": 4371,
      "expenses": 0,
      "details": {
        "employer_name": "Barclays Investment Bank",
        "paye_ref": "120/BA98765",
        "salary_sacrifice_available": true,
        "current_pension_sacrifice": 6000
      }
    }
  ],

  "pension_data": {
    "contributions": [
      {
        "scheme_name": "Barclays Workplace DC",
        "scheme_type": "workplace_dc",
        "employee": 6000,
        "employer": 9000,
        "personal": 0,
        "is_salary_sacrifice": true
      }
    ],
    "annual_allowance": 60000,
    "total_contributions": 15000,
    "aa_remaining": 45000,
    "carry_forward": {
      "2022/23": { "available": 40000, "used": 12000, "remaining": 28000 },
      "2023/24": { "available": 60000, "used": 14000, "remaining": 46000 },
      "2024/25": { "available": 60000, "used": 15000, "remaining": 45000 }
    },
    "total_carry_forward": 119000,
    "is_tapered": false,
    "mpaa_triggered": false
  },

  "allowances": [
    { "type": "isa", "label": "ISA Allowance", "annual_limit": 20000, "used": 20000, "remaining": 0, "can_carry_forward": false },
    { "type": "pension_aa", "label": "Pension Annual Allowance", "annual_limit": 60000, "used": 15000, "remaining": 45000, "can_carry_forward": true },
    { "type": "cgt_aea", "label": "CGT Annual Exempt", "annual_limit": 3000, "used": 0, "remaining": 3000, "can_carry_forward": false },
    { "type": "dividend", "label": "Dividend Allowance", "annual_limit": 500, "used": 0, "remaining": 500, "can_carry_forward": false }
  ],

  "hicbc": {
    "number_of_children": 2,
    "claims_child_benefit": true,
    "child_benefit_amount": 2212.60,
    "higher_earner_ani": 112000,
    "clawback_percentage": 100,
    "hicbc_charge": 2212.60,
    "net_benefit": 0
  },

  "scenarios": [
    {
      "id": "sc-chen-001",
      "name": "Increase salary sacrifice to £18K",
      "scenario_type": "salary_sacrifice",
      "inputs": { "sacrifice_amount": 18000, "employer_ni_shared": false },
      "results": {
        "new_ani": 100000,
        "new_pa": 12570,
        "new_income_tax": 24558,
        "ni_saving": 240,
        "hicbc_avoided": 2212.60,
        "pa_restored": 12570,
        "total_saving": 14452.60,
        "effective_relief": "80%"
      },
      "baseline_total_tax": 39905.90,
      "projected_total_tax": 25453.30,
      "total_saving": 14452.60,
      "is_recommended": true,
      "created_at": "2026-02-17T10:00:00Z"
    }
  ],

  "status": "in_progress",
  "data_confidence": "high",
  "confidence_notes": ["Income from P60 — verified"],
  "source_notes": ["Income tax bands per HMRC 2025/26", "NI rates per HMRC 2025/26"]
}
```

```json
// ─── documents ───
{
  "id": "doc-chen-001",
  "client_id": "cl-chen-marcus",
  "uploaded_by": "a1b2c3d4-0000-0000-0000-000000000001",
  "document_type": "p60",
  "tax_year": "2025/26",
  "file_name": "Marcus_Chen_P60_2025-26.pdf",
  "file_path": "uploads/cl-chen-marcus/p60_2025-26.pdf",
  "file_size": 142800,
  "mime_type": "application/pdf",
  "extraction_status": "completed",
  "extracted_data": {
    "employer": "Barclays Investment Bank",
    "paye_ref": "120/BA98765",
    "gross_pay": 118000,
    "tax_deducted": 33558,
    "ni_deducted": 4371,
    "pension_contributions": 6000
  },
  "extraction_confidence": 0.95,
  "flagged_fields": []
}
```

```json
// ─── observations (Marcus) ───
[
  {
    "id": "obs-chen-001",
    "client_id": "cl-chen-marcus",
    "tax_year": "2025/26",
    "title": "Personal Allowance Tapered — 60% Trap Zone",
    "description": "Marcus's ANI of £112,000 is between £100,000 and £125,140. His PA is reduced to £6,570 (lost £6,000). Effective marginal rate on the next £1 earned is 62%. An additional £12,000 salary sacrifice would restore the full PA and drop ANI to £100,000.",
    "severity": "critical",
    "priority": "urgent",
    "category": "pa_taper",
    "potential_saving": 9000.00,
    "deadline": "2026-04-05",
    "action_required": "Increase salary sacrifice from £6,000 to £18,000 to bring ANI to £100,000",
    "is_dismissed": false
  },
  {
    "id": "obs-chen-002",
    "client_id": "cl-chen-marcus",
    "tax_year": "2025/26",
    "title": "HICBC — Full Child Benefit Clawback",
    "description": "With ANI of £112,000, 100% of Child Benefit (£2,212.60 for 2 children) is clawed back. The same salary sacrifice that restores the PA would also eliminate HICBC entirely.",
    "severity": "critical",
    "priority": "urgent",
    "category": "hicbc",
    "potential_saving": 2212.60,
    "deadline": "2026-04-05",
    "action_required": "Covered by PA taper fix — salary sacrifice to bring ANI below £60,000 or at least below £80,000",
    "is_dismissed": false
  },
  {
    "id": "obs-chen-003",
    "client_id": "cl-chen-marcus",
    "tax_year": "2025/26",
    "title": "CGT Annual Exempt Amount Unused",
    "description": "Marcus has not used any of his £3,000 CGT AEA this year. If he holds investments in a GIA, crystallising up to £3,000 in gains would be tax-free. Consider Bed & ISA if Priya has ISA allowance remaining.",
    "severity": "opportunity",
    "priority": "medium",
    "category": "cgt_planning",
    "potential_saving": 720.00,
    "deadline": "2026-04-05",
    "action_required": "Review GIA holdings for Bed & ISA opportunity",
    "is_dismissed": false
  }
]
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│  FLOW: Marcus Chen — PA Taper Detection & Pension Optimisation     │
└─────────────────────────────────────────────────────────────────────┘

1. ADVISER UPLOADS P60
   ┌──────────┐     POST /api/extract         ┌──────────┐
   │  Adviser │ ──── Marcus_P60.pdf ──────────▶│ Backend  │
   │  (chat)  │                                │          │
   └──────────┘                                └────┬─────┘
                                                    │
   ● documents row created (extraction_status: "processing")
   ● AI extracts: gross £118,000, tax £33,558, NI £4,371, pension £6,000
   ● documents.extracted_data populated, confidence: 0.95
   ● documents.extraction_status → "completed"

2. TAX PROFILE BUILT
   ┌──────────┐                                ┌──────────┐
   │ Backend  │ ── extracted_data ────────────▶│Tax Engine│
   └──────────┘                                └────┬─────┘
                                                    │
   ● Engine computes:
     - Total income: £118,000
     - Salary sacrifice £6K reduces gross to £112K for ANI
     - ANI = £118,000 − £6,000 = £112,000
     - PA taper: (£112,000 − £100,000) ÷ 2 = £6,000 lost
     - Remaining PA: £12,570 − £6,000 = £6,570
     - ✅ in_pa_taper_zone = true
     - ✅ hicbc_applies = true (ANI > £80K, has children)
   ● tax_profiles row created with all cached summaries
   ● income_sources JSONB populated from extraction
   ● pension_data JSONB populated

3. OBSERVATIONS GENERATED
   ┌──────────┐                                ┌──────────┐
   │Tax Engine│ ── flags + thresholds ────────▶│ AI Layer │
   └──────────┘                                └────┬─────┘
                                                    │
   ● AI sees: in_pa_taper_zone=true, hicbc=true, cgt_aea unused
   ● Creates 3 observation rows:
     - "PA Tapered — 60% Trap Zone" (critical/urgent, saving: £9,000)
     - "HICBC — Full Clawback" (critical/urgent, saving: £2,212)
     - "CGT AEA Unused" (opportunity/medium, saving: £720)

4. DASHBOARD RENDERED
   ┌──────────┐   GET /clients/{id}/tax-summary  ┌──────────┐
   │ Frontend │ ◀──────────────────────────────── │ Backend  │
   │          │                                   │          │
   │ Context  │   1 query: tax_profiles row       │          │
   │ Ribbon:  │   1 query: observations list      │          │
   │ £118K    │                                   │          │
   │ £39.9K   │   → RelevantTaxData assembled    │          │
   │ 33.8%    │                                   │          │
   │ 62% ⚠️    │                                   │          │
   └──────────┘                                   └──────────┘

5. ADVISER ASKS "WHAT IF" IN CHAT
   ┌──────────┐   "What if Marcus increases        ┌──────────┐
   │ Adviser  │    salary sacrifice to £18K?"      │ Backend  │
   │  (chat)  │ ──────────────────────────────────▶│          │
   └──────────┘                                    └────┬─────┘
                                                       │
   ● message row: role=user, content="What if..."
   ● AI calls calculateSalarySacrifice tool:
     - New sacrifice: £18,000 (extra £12,000)
     - New ANI: £118,000 − £18,000 = £100,000
     - Full PA restored: £12,570
     - HICBC eliminated: £0
     - IT saving: £9,000, NI saving: £240, HICBC avoided: £2,212
     - Total saving: £14,452 on £12K extra sacrifice = 120% effective relief!
   ● message row: role=assistant, content="Increasing salary sacrifice...",
     insights=[{title: "PA fully restored", saving: 9000}, ...],
     dashboard_data={updated RelevantTaxData}
   ● scenario appended to tax_profiles.scenarios JSONB
   ● Intelligence panel updates in real-time
```

---

## Client 2: The Company Director — Olivia Harper

> Owner-director of a small consultancy. The classic salary-vs-dividend optimisation case.

**Profile:** Olivia runs Harper Digital Ltd, a web consultancy. Company profits ~£95,000/year. Single, no children. Lives in Bristol (England). Pays herself a small salary + dividends.

### Stored Data

```json
// ─── households ───
{
  "id": "hh-harper-0001",
  "user_id": "a1b2c3d4-0000-0000-0000-000000000001",
  "name": "Harper Household",
  "notes": "Solo director. Considering bringing on a business partner next year."
}
```

```json
// ─── clients (Olivia) ───
{
  "id": "cl-harper-olivia",
  "household_id": "hh-harper-0001",
  "user_id": "a1b2c3d4-0000-0000-0000-000000000001",
  "first_name": "Olivia",
  "last_name": "Harper",
  "email": "olivia@harperdigital.co.uk",
  "date_of_birth": "1990-03-22",
  "ni_number": "AB 12 34 56 C",
  "utr": "1234567890",
  "region": "england",
  "employment_status": "director",
  "metadata": {
    "company_name": "Harper Digital Ltd",
    "company_number": "12345678",
    "vat_registered": true,
    "accounting_year_end": "2026-03-31"
  }
}
```

```json
// ─── tax_profiles (Olivia, 2025/26) ───
{
  "id": "tp-harper-olivia-2526",
  "client_id": "cl-harper-olivia",
  "tax_year": "2025/26",

  "total_income": 62570.00,
  "adjusted_net_income": 62570.00,
  "taxable_income": 50000.00,
  "income_tax": 7540.00,
  "national_insurance": 0,
  "dividend_tax": 3281.25,
  "total_tax": 10821.25,
  "effective_rate": 17.30,
  "marginal_rate": 33.75,
  "personal_allowance": 12570.00,
  "pa_status": "full",

  "in_pa_taper_zone": false,
  "hicbc_applies": false,
  "pension_taper_applies": false,

  "tax_breakdown": [
    { "band": "Basic Rate (salary)", "amount": 0, "rate": 0.20, "tax": 0 },
    { "band": "Dividend Allowance", "amount": 500, "rate": 0, "tax": 0 },
    { "band": "Dividend Basic Rate", "amount": 37200, "rate": 0.0875, "tax": 3255 },
    { "band": "Dividend Higher Rate", "amount": 12300, "rate": 0.3375, "tax": 4151.25 }
  ],

  "ni_breakdown": {
    "class1": {
      "earnings_in_main_band": 0,
      "main_ni": 0,
      "total_employee_ni": 0,
      "employer_ni": 479
    }
  },

  "income_sources": [
    {
      "id": "is-harper-001",
      "source_type": "employment",
      "label": "Harper Digital Ltd — Salary",
      "gross_amount": 12570,
      "tax_deducted": 0,
      "ni_deducted": 0,
      "expenses": 0,
      "details": {
        "employer_name": "Harper Digital Ltd",
        "paye_ref": "475/HD00001",
        "is_director_salary": true
      }
    },
    {
      "id": "is-harper-002",
      "source_type": "dividends",
      "label": "Harper Digital Ltd — Dividends",
      "gross_amount": 50000,
      "tax_deducted": 0,
      "ni_deducted": 0,
      "expenses": 0,
      "details": {
        "company_name": "Harper Digital Ltd",
        "within_allowance": 500
      }
    }
  ],

  "pension_data": {
    "contributions": [
      {
        "scheme_name": "SIPP — AJ Bell",
        "scheme_type": "sipp",
        "employee": 0,
        "employer": 10000,
        "personal": 0,
        "is_salary_sacrifice": false
      }
    ],
    "annual_allowance": 60000,
    "total_contributions": 10000,
    "aa_remaining": 50000,
    "carry_forward": {
      "2022/23": { "available": 40000, "used": 5000, "remaining": 35000 },
      "2023/24": { "available": 60000, "used": 8000, "remaining": 52000 },
      "2024/25": { "available": 60000, "used": 10000, "remaining": 50000 }
    },
    "total_carry_forward": 137000,
    "is_tapered": false,
    "mpaa_triggered": false
  },

  "allowances": [
    { "type": "isa", "label": "ISA Allowance", "annual_limit": 20000, "used": 15000, "remaining": 5000, "can_carry_forward": false },
    { "type": "pension_aa", "label": "Pension Annual Allowance", "annual_limit": 60000, "used": 10000, "remaining": 50000, "can_carry_forward": true },
    { "type": "cgt_aea", "label": "CGT Annual Exempt", "annual_limit": 3000, "used": 0, "remaining": 3000, "can_carry_forward": false },
    { "type": "dividend", "label": "Dividend Allowance", "annual_limit": 500, "used": 500, "remaining": 0, "can_carry_forward": false }
  ],

  "hicbc": {},

  "scenarios": [
    {
      "id": "sc-harper-001",
      "name": "Company pension contribution £30K",
      "scenario_type": "pension_contribution",
      "inputs": { "amount": 30000, "type": "employer" },
      "results": {
        "corporation_tax_saving": 7500,
        "reduced_dividend_needed": 30000,
        "dividend_tax_saved": 10125,
        "total_benefit": 17625,
        "effective_relief": "59%"
      },
      "baseline_total_tax": 10821.25,
      "projected_total_tax": 3196.25,
      "total_saving": 7625.00,
      "is_recommended": true,
      "created_at": "2026-02-17T11:00:00Z"
    }
  ],

  "status": "reviewed",
  "data_confidence": "high",
  "confidence_notes": ["Figures from company accounts (Xero export)"],
  "source_notes": ["Dividend rates per HMRC 2025/26", "Corp Tax at 25%"]
}
```

```json
// ─── observations (Olivia) ───
[
  {
    "id": "obs-harper-001",
    "client_id": "cl-harper-olivia",
    "tax_year": "2025/26",
    "title": "Substantial Pension AA Unused — Company Contribution Opportunity",
    "description": "Olivia has £50,000 unused pension AA this year plus £137,000 carry forward. A £30,000 employer contribution from Harper Digital would save £7,500 in Corporation Tax and reduce the dividend needed by £30,000 (saving £10,125 in dividend tax).",
    "severity": "opportunity",
    "priority": "high",
    "category": "pension_aa",
    "potential_saving": 17625.00,
    "deadline": "2026-03-31",
    "action_required": "Company pension contribution before accounting year end (31 March)",
    "is_dismissed": false
  },
  {
    "id": "obs-harper-002",
    "client_id": "cl-harper-olivia",
    "tax_year": "2025/26",
    "title": "ISA Not Maxed — £5K Remaining",
    "description": "Olivia has £5,000 of ISA allowance remaining. Transferring GIA holdings to the ISA would shelter future growth from CGT and dividend tax.",
    "severity": "warning",
    "priority": "medium",
    "category": "isa_optimisation",
    "potential_saving": null,
    "deadline": "2026-04-05",
    "action_required": "Top up ISA before 5 April",
    "is_dismissed": false
  }
]
```

### Data Flow

```
1. ADVISER ENTERS CLIENT MANUALLY (no document upload)
   Adviser types Olivia's details into the client form
   ● household created → client created
   ● Adviser enters: salary £12,570, dividends £50,000, employer pension £10K
   ● income_sources JSONB populated from form input

2. TAX ENGINE COMPUTES
   ● Salary within PA → £0 income tax, £0 employee NI
   ● Dividends: £500 within allowance, £37,200 at 8.75%, £12,300 at 33.75%
   ● Employer pension: not the client's income, no personal tax
   ● BUT it reduces company profits → saves Corp Tax at 25%
   ● tax_profiles row created with all summaries

3. AI GENERATES OBSERVATIONS
   ● Spots: £50K unused pension AA + £137K carry forward = massive opportunity
   ● Spots: ISA not maxed with 48 days to year end
   ● Creates 2 observation rows

4. ADVISER ASKS "What if the company makes a £30K pension contribution?"
   ● AI models: Corp Tax saving + dividend reduction + personal tax saving
   ● Scenario appended to tax_profiles.scenarios
   ● Dashboard shows side-by-side comparison
```

---

## Client 3: The Scottish Taxpayer — Ewan & Fiona MacLeod

> Employed couple in Edinburgh. Scottish income tax rates apply — completely different bands. Shows how `region: "scotland"` changes everything.

**Profile:** Ewan is a NHS consultant earning £92,000. Fiona is a teacher earning £42,000. One child. Both Scottish taxpayers.

### Stored Data

```json
// ─── households ───
{
  "id": "hh-macleod-0001",
  "user_id": "a1b2c3d4-0000-0000-0000-000000000001",
  "name": "MacLeod Household",
  "notes": "Both Scottish taxpayers. NHS pension (DB scheme) for Ewan."
}
```

```json
// ─── clients (Ewan) ───
{
  "id": "cl-macleod-ewan",
  "household_id": "hh-macleod-0001",
  "user_id": "a1b2c3d4-0000-0000-0000-000000000001",
  "first_name": "Ewan",
  "last_name": "MacLeod",
  "email": "ewan.macleod@nhs.net",
  "date_of_birth": "1975-09-08",
  "ni_number": "SC 11 22 33 D",
  "utr": null,
  "region": "scotland",
  "employment_status": "employed",
  "metadata": {
    "employer_name": "NHS Scotland",
    "salary_sacrifice_available": false,
    "pension_scheme": "NHS Pension (Defined Benefit)"
  }
}
```

```json
// ─── tax_profiles (Ewan, 2025/26) ───
{
  "id": "tp-macleod-ewan-2526",
  "client_id": "cl-macleod-ewan",
  "tax_year": "2025/26",

  "total_income": 92000.00,
  "adjusted_net_income": 78800.00,
  "taxable_income": 66230.00,
  "income_tax": 21009.48,
  "national_insurance": 3850.00,
  "dividend_tax": 0,
  "total_tax": 24859.48,
  "effective_rate": 27.02,
  "marginal_rate": 45.00,
  "personal_allowance": 12570.00,
  "pa_status": "full",

  "in_pa_taper_zone": false,
  "hicbc_applies": true,
  "pension_taper_applies": false,

  "tax_breakdown": [
    { "band": "Starter Rate", "amount": 2306, "rate": 0.19, "tax": 438.14 },
    { "band": "Basic Rate", "amount": 11685, "rate": 0.20, "tax": 2337.00 },
    { "band": "Intermediate Rate", "amount": 17101, "rate": 0.21, "tax": 3591.21 },
    { "band": "Higher Rate", "amount": 31338, "rate": 0.42, "tax": 13161.96 },
    { "band": "Advanced Rate", "amount": 3800, "rate": 0.45, "tax": 1710.00 }
  ],

  "ni_breakdown": {
    "class1": {
      "earnings_in_main_band": 37700,
      "main_rate": 0.08,
      "main_ni": 3016,
      "earnings_above_uel": 41730,
      "additional_rate": 0.02,
      "additional_ni": 835,
      "total_employee_ni": 3851
    }
  },

  "income_sources": [
    {
      "id": "is-macleod-001",
      "source_type": "employment",
      "label": "NHS Scotland — Consultant",
      "gross_amount": 92000,
      "tax_deducted": 21009,
      "ni_deducted": 3851,
      "expenses": 0,
      "details": {
        "employer_name": "NHS Scotland",
        "paye_ref": "S940/NHS001",
        "pension_scheme_type": "defined_benefit",
        "employee_pension_rate": 0.1434
      }
    }
  ],

  "pension_data": {
    "contributions": [
      {
        "scheme_name": "NHS Pension Scheme (2015)",
        "scheme_type": "workplace_db",
        "employee": 13200,
        "employer": 0,
        "personal": 0,
        "is_salary_sacrifice": false
      }
    ],
    "annual_allowance": 60000,
    "total_contributions": 13200,
    "aa_remaining": 46800,
    "carry_forward": {
      "2022/23": { "available": 40000, "used": 12000, "remaining": 28000 },
      "2023/24": { "available": 60000, "used": 12500, "remaining": 47500 },
      "2024/25": { "available": 60000, "used": 13000, "remaining": 47000 }
    },
    "total_carry_forward": 122500,
    "is_tapered": false,
    "mpaa_triggered": false
  },

  "allowances": [
    { "type": "isa", "label": "ISA Allowance", "annual_limit": 20000, "used": 10000, "remaining": 10000, "can_carry_forward": false },
    { "type": "pension_aa", "label": "Pension Annual Allowance", "annual_limit": 60000, "used": 13200, "remaining": 46800, "can_carry_forward": true },
    { "type": "cgt_aea", "label": "CGT Annual Exempt", "annual_limit": 3000, "used": 0, "remaining": 3000, "can_carry_forward": false }
  ],

  "hicbc": {
    "number_of_children": 1,
    "claims_child_benefit": true,
    "child_benefit_amount": 1331.20,
    "higher_earner_ani": 78800,
    "clawback_percentage": 94,
    "hicbc_charge": 1251.33,
    "net_benefit": 79.87
  },

  "scenarios": [],

  "status": "in_progress",
  "data_confidence": "medium",
  "confidence_notes": ["DB pension contribution rate estimated at 14.34% — verify with payslip"],
  "source_notes": ["Scottish income tax bands per Revenue Scotland 2025/26", "NI rates UK-wide"]
}
```

```json
// ─── observations (Ewan) ───
[
  {
    "id": "obs-macleod-001",
    "client_id": "cl-macleod-ewan",
    "tax_year": "2025/26",
    "title": "Scottish Tax Premium — £1,870 More Than rUK",
    "description": "As a Scottish taxpayer earning £92,000, Ewan pays approximately £1,870 more in income tax than an equivalent English taxpayer. This is due to the higher Scottish rates at the Intermediate (21%), Higher (42%), and Advanced (45%) bands. NI, dividends, and CGT are unaffected.",
    "severity": "info",
    "priority": "low",
    "category": "scottish_rates",
    "potential_saving": null,
    "deadline": null,
    "action_required": "For information — no action possible on residence-based rates",
    "is_dismissed": false
  },
  {
    "id": "obs-macleod-002",
    "client_id": "cl-macleod-ewan",
    "tax_year": "2025/26",
    "title": "HICBC — Near Full Clawback",
    "description": "Ewan's ANI of £78,800 means 94% of the £1,331.20 Child Benefit is clawed back (charge: £1,251.33). A personal pension contribution of just £1,200 to a SIPP would bring ANI to £77,600 and reduce the clawback. At current ANI, the net benefit of £79.87 barely justifies the admin.",
    "severity": "warning",
    "priority": "high",
    "category": "hicbc",
    "potential_saving": 1251.33,
    "deadline": "2026-04-05",
    "action_required": "Either opt out of Child Benefit or make small SIPP contribution to reduce HICBC",
    "is_dismissed": false
  }
]
```

### Data Flow

```
1. ADVISER UPLOADS PAYSLIP (not P60 — mid-year analysis)
   ● document created: type="payslip", extraction runs
   ● AI extracts: gross £92K, Scottish tax code (S1257L), NHS pension 14.34%
   ● Region detected from tax code prefix "S" → confirms client.region = "scotland"

2. TAX ENGINE — SCOTTISH BRANCH
   ● Engine checks client.region → "scotland" → uses SCOTTISH_INCOME_TAX_BANDS
   ● Applies 6 Scottish bands instead of 3 English bands
   ● Computes ANI: £92,000 − £13,200 (NHS pension) = £78,800
   ● NI calculated at UK-wide rates (NI is not devolved)
   ● HICBC: (£78,800 − £60,000) ÷ £200 = 94 → 94% clawback

3. SCOTTISH COMPARISON GENERATED
   ● Engine also computes what Ewan WOULD pay under rUK rates
   ● Difference: £1,870 more under Scottish rates
   ● Stored as an info-level observation (informational, no action possible)

4. DASHBOARD SHOWS SCOTTISH-SPECIFIC VIEW
   ● Tax breakdown shows 6 bands (Starter → Advanced) not 3
   ● Context ribbon shows marginal rate: 45% (Scottish Advanced)
   ● Observation panel: Scottish premium callout + HICBC warning
```

---

## Client 4: The Freelancer — Aisha Patel

> Self-employed graphic designer. Simpler tax situation, basic rate. Shows Class 2 + Class 4 NI and trading allowance consideration.

**Profile:** Aisha is a freelance graphic designer. Turnover £48,000, expenses £12,000, net profit £36,000. Single, no children. Lives in Manchester (England).

### Stored Data

```json
// ─── households ───
{
  "id": "hh-patel-0001",
  "user_id": "a1b2c3d4-0000-0000-0000-000000000001",
  "name": "Patel Household",
  "notes": "Sole trader. Considering incorporation if revenue grows."
}
```

```json
// ─── clients (Aisha) ───
{
  "id": "cl-patel-aisha",
  "household_id": "hh-patel-0001",
  "user_id": "a1b2c3d4-0000-0000-0000-000000000001",
  "first_name": "Aisha",
  "last_name": "Patel",
  "email": "aisha@aishapateldesign.com",
  "date_of_birth": "1994-01-19",
  "ni_number": "CD 44 55 66 E",
  "utr": "9876543210",
  "region": "england",
  "employment_status": "self_employed",
  "metadata": {
    "trading_name": "Aisha Patel Design",
    "vat_registered": false,
    "registered_for_self_assessment": true,
    "accounting_basis": "cash"
  }
}
```

```json
// ─── tax_profiles (Aisha, 2025/26) ───
{
  "id": "tp-patel-aisha-2526",
  "client_id": "cl-patel-aisha",
  "tax_year": "2025/26",

  "total_income": 36000.00,
  "adjusted_net_income": 34000.00,
  "taxable_income": 21430.00,
  "income_tax": 4286.00,
  "national_insurance": 1584.40,
  "dividend_tax": 0,
  "total_tax": 5870.40,
  "effective_rate": 16.31,
  "marginal_rate": 28.00,
  "personal_allowance": 12570.00,
  "pa_status": "full",

  "in_pa_taper_zone": false,
  "hicbc_applies": false,
  "pension_taper_applies": false,

  "tax_breakdown": [
    { "band": "Basic Rate", "amount": 21430, "rate": 0.20, "tax": 4286 }
  ],

  "ni_breakdown": {
    "class2": {
      "weeks_liable": 52,
      "weekly_rate": 3.45,
      "total": 179.40
    },
    "class4": {
      "profit_in_main_band": 23430,
      "main_rate": 0.06,
      "main_ni": 1405.80,
      "profit_above_upl": 0,
      "upper_rate": 0.02,
      "upper_ni": 0,
      "total": 1405.80
    }
  },

  "income_sources": [
    {
      "id": "is-patel-001",
      "source_type": "self_employment",
      "label": "Aisha Patel Design",
      "gross_amount": 48000,
      "tax_deducted": 0,
      "ni_deducted": 0,
      "expenses": 12000,
      "details": {
        "turnover": 48000,
        "allowable_expenses": 12000,
        "net_profit": 36000,
        "expense_breakdown": {
          "software_subscriptions": 2400,
          "equipment": 3200,
          "home_office": 1200,
          "travel": 800,
          "marketing": 1500,
          "professional_development": 900,
          "accountancy_fees": 600,
          "insurance": 400,
          "phone_broadband": 600,
          "misc": 400
        },
        "vat_registered": false,
        "trading_allowance_used": false
      }
    },
    {
      "id": "is-patel-002",
      "source_type": "savings_interest",
      "label": "Chase Savings Account",
      "gross_amount": 850,
      "tax_deducted": 0,
      "ni_deducted": 0,
      "expenses": 0,
      "details": {
        "provider": "Chase UK",
        "within_psa": true
      }
    }
  ],

  "pension_data": {
    "contributions": [
      {
        "scheme_name": "Vanguard SIPP",
        "scheme_type": "sipp",
        "employee": 0,
        "employer": 0,
        "personal": 2000,
        "is_salary_sacrifice": false
      }
    ],
    "annual_allowance": 60000,
    "total_contributions": 2000,
    "aa_remaining": 58000,
    "carry_forward": {
      "2022/23": { "available": 40000, "used": 0, "remaining": 40000 },
      "2023/24": { "available": 60000, "used": 1000, "remaining": 59000 },
      "2024/25": { "available": 60000, "used": 1500, "remaining": 58500 }
    },
    "total_carry_forward": 157500,
    "is_tapered": false,
    "mpaa_triggered": false
  },

  "allowances": [
    { "type": "isa", "label": "ISA Allowance", "annual_limit": 20000, "used": 4000, "remaining": 16000, "can_carry_forward": false },
    { "type": "pension_aa", "label": "Pension Annual Allowance", "annual_limit": 60000, "used": 2000, "remaining": 58000, "can_carry_forward": true },
    { "type": "cgt_aea", "label": "CGT Annual Exempt", "annual_limit": 3000, "used": 0, "remaining": 3000, "can_carry_forward": false },
    { "type": "trading", "label": "Trading Allowance", "annual_limit": 1000, "used": 0, "remaining": 1000, "can_carry_forward": false }
  ],

  "hicbc": {},

  "scenarios": [
    {
      "id": "sc-patel-001",
      "name": "Incorporation vs Sole Trader",
      "scenario_type": "director_remuneration",
      "inputs": {
        "company_profits": 36000,
        "salary": 12570,
        "dividends": 23430
      },
      "results": {
        "sole_trader_total_tax": 5870.40,
        "ltd_total_tax": 4967.39,
        "annual_saving": 903.01,
        "notes": "Marginal benefit. Incorporation costs (accountant, Companies House, admin) may outweigh at this profit level. Revisit if profits exceed £50K."
      },
      "baseline_total_tax": 5870.40,
      "projected_total_tax": 4967.39,
      "total_saving": 903.01,
      "is_recommended": false,
      "created_at": "2026-02-17T14:00:00Z"
    }
  ],

  "status": "reviewed",
  "data_confidence": "medium",
  "confidence_notes": ["Expenses estimated from bank statements — verify with FreeAgent export"],
  "source_notes": ["Class 2 NI: £3.45/week", "Class 4 NI: 6% on £12,570-£50,270"]
}
```

```json
// ─── documents ───
{
  "id": "doc-patel-001",
  "client_id": "cl-patel-aisha",
  "uploaded_by": "a1b2c3d4-0000-0000-0000-000000000001",
  "document_type": "sa103",
  "tax_year": "2025/26",
  "file_name": "Aisha_Self_Employment_2025-26.pdf",
  "file_path": "uploads/cl-patel-aisha/sa103_2025-26.pdf",
  "file_size": 98500,
  "mime_type": "application/pdf",
  "extraction_status": "completed",
  "extracted_data": {
    "turnover": 48000,
    "total_expenses": 12000,
    "net_profit": 36000,
    "accounting_basis": "cash"
  },
  "extraction_confidence": 0.88,
  "flagged_fields": ["total_expenses"]
}
```

```json
// ─── observations (Aisha) ───
[
  {
    "id": "obs-patel-001",
    "client_id": "cl-patel-aisha",
    "tax_year": "2025/26",
    "title": "LISA Eligible — 25% Government Bonus",
    "description": "Aisha is 32 and has not used a Lifetime ISA. She's eligible for up to £4,000/year in a LISA with a 25% government bonus (£1,000 free). This can be used for a first home purchase or retirement at 60. Counts within the £20,000 ISA limit.",
    "severity": "opportunity",
    "priority": "medium",
    "category": "isa_optimisation",
    "potential_saving": 1000.00,
    "deadline": "2026-04-05",
    "action_required": "Open a LISA and contribute up to £4,000 before 5 April",
    "is_dismissed": false
  },
  {
    "id": "obs-patel-002",
    "client_id": "cl-patel-aisha",
    "tax_year": "2025/26",
    "title": "Pension Contribution — Basic Rate Relief",
    "description": "Aisha contributes only £2,000 to her SIPP. Every £1 contributed costs only 80p (20% relief at source). She has £58,000 of unused AA this year. Even a modest increase to £5,000 would save £600 in income tax.",
    "severity": "opportunity",
    "priority": "medium",
    "category": "pension_aa",
    "potential_saving": 600.00,
    "deadline": "2026-04-05",
    "action_required": "Increase SIPP contribution",
    "is_dismissed": false
  },
  {
    "id": "obs-patel-003",
    "client_id": "cl-patel-aisha",
    "tax_year": "2025/26",
    "title": "VAT Registration Threshold Approaching",
    "description": "Turnover of £48,000 is approaching the VAT registration threshold (£90,000). Not an immediate concern, but if revenue grows significantly, monitor this. Voluntary registration could benefit if clients are VAT-registered businesses (they reclaim input VAT).",
    "severity": "info",
    "priority": "low",
    "category": "general",
    "potential_saving": null,
    "deadline": null,
    "action_required": "Monitor turnover — register if approaching £90K",
    "is_dismissed": false
  }
]
```

### Data Flow

```
1. ADVISER UPLOADS SA103 (Self-Employment Supplementary Page)
   ● document created: type="sa103"
   ● AI extracts: turnover £48K, expenses £12K, profit £36K
   ● Flags "total_expenses" as medium confidence (round number, verify)

2. TAX ENGINE — SELF-EMPLOYMENT BRANCH
   ● No PAYE — all tax computed for Self Assessment
   ● Class 2 NI: 52 weeks × £3.45 = £179.40
   ● Class 4 NI: 6% on (£36,000 − £12,570) = £1,405.80
   ● Income tax: 20% on (£36,000 − £12,570) = £4,286
   ● Savings interest £850 within £1,000 PSA — £0 tax

3. AI SPOTS AGE-BASED OPPORTUNITIES
   ● Reads date_of_birth: 1994 → age 32 → LISA eligible
   ● Creates LISA observation (25% government bonus)
   ● Spots low pension contribution → creates observation
   ● Notes turnover trajectory → VAT info observation

4. ADVISER ASKS: "Should Aisha incorporate?"
   ● AI models Ltd company: salary £12,570 + dividends
   ● Saving only £903/year — not worth the admin overhead at £36K profit
   ● Scenario stored with is_recommended: false
   ● AI tells adviser: "Revisit if profits exceed £50K"
```

---

## Client 5: The Retiree — George & Margaret Williams

> Retired couple drawing pensions. No NI to pay. State pension + private pension + savings interest. IHT is the main concern.

**Profile:** George (72) receives state pension + a DB pension. Margaret (69) receives state pension only. Combined estate estimated at £1.2M including their home. Live in Cardiff (Wales — same tax rates as England).

### Stored Data

```json
// ─── households ───
{
  "id": "hh-williams-0001",
  "user_id": "a1b2c3d4-0000-0000-0000-000000000001",
  "name": "Williams Household",
  "notes": "Estate planning is the priority. George's DB pension is generous. Want to maximise what passes to the grandchildren."
}
```

```json
// ─── clients (George) ───
{
  "id": "cl-williams-george",
  "household_id": "hh-williams-0001",
  "user_id": "a1b2c3d4-0000-0000-0000-000000000001",
  "first_name": "George",
  "last_name": "Williams",
  "email": "g.williams@btinternet.com",
  "date_of_birth": "1953-12-01",
  "ni_number": "EF 77 88 99 F",
  "utr": "5678901234",
  "region": "wales",
  "employment_status": "retired",
  "metadata": {
    "state_pension_age_reached": true,
    "has_will": true,
    "power_of_attorney": true
  }
}
```

```json
// ─── clients (Margaret) ───
{
  "id": "cl-williams-margaret",
  "household_id": "hh-williams-0001",
  "user_id": "a1b2c3d4-0000-0000-0000-000000000001",
  "first_name": "Margaret",
  "last_name": "Williams",
  "email": "m.williams@btinternet.com",
  "date_of_birth": "1956-06-15",
  "ni_number": "EF 11 22 33 G",
  "utr": null,
  "region": "wales",
  "employment_status": "retired",
  "metadata": {
    "state_pension_age_reached": true
  }
}
```

```json
// ─── tax_profiles (George, 2025/26) ───
{
  "id": "tp-williams-george-2526",
  "client_id": "cl-williams-george",
  "tax_year": "2025/26",

  "total_income": 41780.00,
  "adjusted_net_income": 41780.00,
  "taxable_income": 29210.00,
  "income_tax": 5842.00,
  "national_insurance": 0,
  "dividend_tax": 0,
  "total_tax": 5842.00,
  "effective_rate": 13.98,
  "marginal_rate": 20.00,
  "personal_allowance": 12570.00,
  "pa_status": "full",

  "in_pa_taper_zone": false,
  "hicbc_applies": false,
  "pension_taper_applies": false,

  "tax_breakdown": [
    { "band": "Basic Rate", "amount": 29210, "rate": 0.20, "tax": 5842 }
  ],

  "ni_breakdown": {},

  "income_sources": [
    {
      "id": "is-williams-001",
      "source_type": "state_pension",
      "label": "State Pension",
      "gross_amount": 11502.40,
      "tax_deducted": 0,
      "ni_deducted": 0,
      "expenses": 0,
      "details": {
        "weekly_amount": 221.20,
        "new_state_pension": true
      }
    },
    {
      "id": "is-williams-002",
      "source_type": "private_pension",
      "label": "BT Final Salary Pension",
      "gross_amount": 28000,
      "tax_deducted": 3086,
      "ni_deducted": 0,
      "expenses": 0,
      "details": {
        "scheme_name": "BT Pension Scheme",
        "scheme_type": "defined_benefit",
        "annual_increase": "CPI capped at 5%"
      }
    },
    {
      "id": "is-williams-003",
      "source_type": "savings_interest",
      "label": "NS&I + Building Society",
      "gross_amount": 2278,
      "tax_deducted": 0,
      "ni_deducted": 0,
      "expenses": 0,
      "details": {
        "providers": ["NS&I Premium Bonds", "Nationwide BS"],
        "within_psa": 1000,
        "taxable": 1278
      }
    }
  ],

  "pension_data": {
    "contributions": [],
    "annual_allowance": 60000,
    "total_contributions": 0,
    "aa_remaining": 60000,
    "carry_forward": {},
    "total_carry_forward": 0,
    "is_tapered": false,
    "mpaa_triggered": false
  },

  "allowances": [
    { "type": "isa", "label": "ISA Allowance", "annual_limit": 20000, "used": 20000, "remaining": 0, "can_carry_forward": false },
    { "type": "pension_aa", "label": "Pension Annual Allowance", "annual_limit": 60000, "used": 0, "remaining": 60000, "can_carry_forward": true },
    { "type": "cgt_aea", "label": "CGT Annual Exempt", "annual_limit": 3000, "used": 1200, "remaining": 1800, "can_carry_forward": false },
    { "type": "iht_annual_gift", "label": "IHT Annual Gift Exemption", "annual_limit": 3000, "used": 3000, "remaining": 0, "can_carry_forward": false },
    { "type": "personal_savings", "label": "Personal Savings Allowance", "annual_limit": 1000, "used": 1000, "remaining": 0, "can_carry_forward": false }
  ],

  "hicbc": {},

  "scenarios": [],

  "status": "reviewed",
  "data_confidence": "high",
  "confidence_notes": ["State pension verified via DWP letter", "BT pension from annual statement"],
  "source_notes": ["State pension £221.20/week (new state pension rate 2025/26)"]
}
```

```json
// ─── observations (George & Margaret — household-level IHT concerns) ───
[
  {
    "id": "obs-williams-001",
    "client_id": "cl-williams-george",
    "tax_year": "2025/26",
    "title": "Potential IHT Liability — Estate Exceeds Nil Rate Bands",
    "description": "Estimated combined estate: £1,200,000. Available reliefs: NRB £325K + RNRB £175K = £500K per person, £1M for the couple (if leaving home to direct descendants). The estate is £200K over the combined threshold. Estimated IHT on second death: £80,000 (40% of £200K excess). Gifting strategy and life insurance in trust should be considered.",
    "severity": "warning",
    "priority": "high",
    "category": "iht_planning",
    "potential_saving": 80000.00,
    "deadline": null,
    "action_required": "Review gifting strategy. Both have used 2025/26 annual exemptions (£3K each). Consider regular gifts from surplus income (unlimited if affordable). Life insurance in trust to cover IHT.",
    "is_dismissed": false
  },
  {
    "id": "obs-williams-002",
    "client_id": "cl-williams-george",
    "tax_year": "2025/26",
    "title": "CGT AEA Partially Used — £1,800 Remaining",
    "description": "George has used £1,200 of his £3,000 CGT AEA. With £1,800 remaining, there may be an opportunity to crystallise further gains before 5 April. Margaret's full £3,000 AEA is likely unused — consider spousal transfer for tax-free gain crystallisation.",
    "severity": "opportunity",
    "priority": "medium",
    "category": "cgt_planning",
    "potential_saving": 1152.00,
    "deadline": "2026-04-05",
    "action_required": "Transfer assets to Margaret to use her £3K AEA, then crystallise gains",
    "is_dismissed": false
  },
  {
    "id": "obs-williams-003",
    "client_id": "cl-williams-george",
    "tax_year": "2025/26",
    "title": "Savings Interest Exceeds Personal Savings Allowance",
    "description": "George earned £2,278 in savings interest. As a basic rate taxpayer, his PSA is £1,000. The £1,278 above the PSA is taxable at 20% (£255.60). Consider moving some cash to NS&I Premium Bonds (prizes are tax-free) or Margaret's accounts (she may have unused PSA).",
    "severity": "info",
    "priority": "low",
    "category": "general",
    "potential_saving": 255.60,
    "deadline": null,
    "action_required": "Redistribute savings between spouses to use both PSAs",
    "is_dismissed": false
  }
]
```

```json
// ─── conversations (Williams analysis thread) ───
{
  "id": "conv-williams-001",
  "user_id": "a1b2c3d4-0000-0000-0000-000000000001",
  "client_id": "cl-williams-george",
  "title": "Williams — IHT & Estate Review",
  "status": "active",
  "last_message_preview": "Based on the estate value of £1.2M, here are three strategies...",
  "last_message_at": "2026-02-17T15:30:00Z",
  "message_count": 6,
  "unread": false,
  "tags": ["iht", "estate-planning", "year-end"],
  "tax_plan_mode": true
}
```

```json
// ─── messages (sample conversation) ───
[
  {
    "id": "msg-williams-001",
    "conversation_id": "conv-williams-001",
    "role": "user",
    "content": "I need to review the Williams estate. George and Margaret's home is worth about £650K, they have around £400K in ISAs and investments, and about £150K in cash. What's the IHT exposure?",
    "insights": [],
    "tool_calls": [],
    "dashboard_data": null,
    "attachments": [],
    "model": null,
    "input_tokens": null,
    "output_tokens": null,
    "created_at": "2026-02-17T15:00:00Z"
  },
  {
    "id": "msg-williams-002",
    "conversation_id": "conv-williams-001",
    "role": "assistant",
    "content": "I've analysed the Williams estate. Here's the position:\n\n**Total estate: £1,200,000**\n- Property: £650,000\n- Investments/ISAs: £400,000\n- Cash: £150,000\n\n**Available reliefs (on second death):**\n- 2× Nil Rate Band: £650,000\n- 2× Residence Nil Rate Band: £350,000 (as home passes to children)\n- **Total tax-free: £1,000,000**\n\n**Taxable estate: £200,000**\n**Estimated IHT: £80,000** (at 40%)\n\nThis assumes both NRBs and RNRBs are fully available and the home passes to direct descendants. Three strategies to reduce this...",
    "insights": [
      { "title": "IHT exposure: £80,000", "description": "Estate £200K over combined thresholds", "severity": "warning" },
      { "title": "Annual gifts used", "description": "Both £3K exemptions used for 2025/26", "severity": "info" },
      { "title": "Regular gifts possible", "description": "Surplus pension income could fund IHT-free gifts", "severity": "opportunity" }
    ],
    "tool_calls": [],
    "dashboard_data": {
      "dashboardType": "IHT Estimate",
      "estate": {
        "property": 650000,
        "investments": 400000,
        "cash": 150000,
        "total": 1200000
      },
      "reliefs": {
        "nrb": 650000,
        "rnrb": 350000,
        "total_relief": 1000000
      },
      "taxable": 200000,
      "iht_rate": 0.40,
      "estimated_iht": 80000
    },
    "attachments": [],
    "model": "claude-sonnet-4-20250514",
    "input_tokens": 2840,
    "output_tokens": 1620,
    "created_at": "2026-02-17T15:01:00Z"
  },
  {
    "id": "msg-williams-003",
    "conversation_id": "conv-williams-001",
    "role": "user",
    "content": "George's DB pension pays him £28K a year and he only spends about £18K. Could he use that surplus income for gifting?",
    "insights": [],
    "tool_calls": [],
    "dashboard_data": null,
    "attachments": [],
    "model": null,
    "input_tokens": null,
    "output_tokens": null,
    "created_at": "2026-02-17T15:15:00Z"
  },
  {
    "id": "msg-williams-004",
    "conversation_id": "conv-williams-001",
    "role": "assistant",
    "content": "Yes — this is the **Normal Expenditure Out of Income** exemption, and it's one of the most powerful IHT tools available.\n\nIf George can demonstrate that his gifts:\n1. Are made from income (not capital)\n2. Form a regular pattern\n3. Don't reduce his standard of living\n\nThen the gifts are **immediately exempt from IHT** — no 7-year waiting period.\n\n**George's surplus:**\n- Pension income: £28,000 + State Pension: £11,502 = £39,502\n- Annual expenditure: ~£18,000\n- **Surplus: ~£21,500/year**\n\nIf George gifts £21,500/year to the children/grandchildren from this surplus:\n- Over 5 years: £107,500 removed from the estate\n- IHT saved: £43,000 (at 40%)\n- **Immediate exemption — no 7-year clock**\n\nThe key is documenting the pattern. I'd recommend setting up a standing order to make it clearly \"regular\" and keeping records of his normal expenditure.",
    "insights": [
      { "title": "Normal expenditure: £21.5K/year", "description": "Surplus pension income available for IHT-free gifting", "severity": "opportunity" },
      { "title": "5-year projection: £43K IHT saved", "description": "£107,500 removed from estate at no tax cost", "severity": "opportunity" }
    ],
    "tool_calls": [],
    "dashboard_data": null,
    "attachments": [],
    "model": "claude-sonnet-4-20250514",
    "input_tokens": 3200,
    "output_tokens": 1850,
    "created_at": "2026-02-17T15:16:00Z"
  }
]
```

### Data Flow

```
1. ADVISER ENTERS ESTATE VALUES IN CHAT (no document upload)
   ● Conversation created with tax_plan_mode: true
   ● message row: user describes estate (£650K home, £400K ISAs, £150K cash)

2. AI COMPUTES IHT ESTIMATE ON THE FLY
   ● No tax engine call needed — IHT is computed by the AI from constants
   ● NRB: £325K × 2 = £650K (both spouses)
   ● RNRB: £175K × 2 = £350K (home to direct descendants)
   ● Taxable: £1.2M − £1M = £200K → IHT: £80K
   ● Stored in message.dashboard_data for dashboard rendering
   ● Observation created: IHT liability £80K

3. CONVERSATIONAL PLANNING
   ● Adviser asks about surplus income gifting
   ● AI identifies "Normal Expenditure Out of Income" strategy
   ● Calculates: £39.5K income − £18K spend = £21.5K surplus/year
   ● 5-year projection: £107.5K removed, £43K IHT saved
   ● No scenario stored (this is advisory, not a tax_profile change)
   ● Insights attached to the message for display

4. MULTIPLE TAX PROFILES IN PLAY
   ● George has his own tax_profile (income tax on pensions)
   ● Margaret has hers (simpler — just state pension, within PA)
   ● IHT observations link to George but concern the household
   ● Dashboard shows both profiles when household is selected

5. YEAR-END ACTIONS
   ● CGT AEA observation: spousal transfer opportunity
   ● Savings interest: redistribute between spouses
   ● Both are time-sensitive (5 April deadline)
```

---

## Summary: Five Client Types at a Glance

| # | Client | Type | Key Tax Issue | Primary Observation | Where Data Lives |
|---|--------|------|---------------|--------------------|--------------------|
| 1 | Marcus Chen | Employed, £118K | 60% PA taper trap + HICBC | Salary sacrifice £18K to restore PA | P60 → extraction → tax_profile → 3 observations |
| 2 | Olivia Harper | Director, £62.5K | Salary vs dividends | Company pension contribution £30K | Manual entry → tax_profile → 2 observations |
| 3 | Ewan MacLeod | Scottish employed, £92K | Scottish rates + HICBC | Scottish premium + HICBC near-full | Payslip → 6-band Scottish breakdown → 2 observations |
| 4 | Aisha Patel | Self-employed, £36K | Class 2/4 NI, basic rate | LISA eligibility + pension opportunity | SA103 → Class 2+4 NI → 3 observations |
| 5 | George Williams | Retired, £41.7K | IHT on £1.2M estate | Normal expenditure gifting (£43K IHT saved) | Chat conversation → IHT estimate → 3 observations |

### Query Pattern for Each

Every client's dashboard is powered by **the same two queries**:

```sql
-- 1. Tax profile (single row — all JSONB included)
SELECT * FROM tax_profiles
WHERE client_id = $1 AND tax_year = '2025/26';

-- 2. Observations (handful of rows)
SELECT * FROM observations
WHERE client_id = $1 AND tax_year = '2025/26' AND is_dismissed = false
ORDER BY
  CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END;
```

The API assembles `RelevantTaxData` from these two results. The frontend renders the context ribbon, tax breakdown, allowance tracker, and observation panel from a single response. Same schema, same queries — five completely different client stories.
