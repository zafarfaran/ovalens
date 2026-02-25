t q2W2EWW2Q                                           # Helio — Integration Data Mapping

> How external platforms (Xero, Salesforce, Hargreaves Lansdown, HMRC, FreeAgent) feed data into the Helio prototype schema. For each integration: what you get, how it's structured, where it lands, and the sync flow.

---

## How Integrations Work in the Prototype

Every integration follows the same pattern:

```
┌──────────────┐     OAuth / API Key    ┌──────────────┐      Write       ┌──────────────┐
│   External   │ ─────────────────────▶ │    Helio     │ ──────────────▶ │   Helio DB   │
│   Platform   │ ◀──── API Calls ────── │   Backend    │                  │  (Supabase)  │
│              │                         │              │                  │              │
│  Xero        │   GET /invoices         │  Transform   │   clients        │              │
│  Salesforce  │   GET /contacts         │  + Map       │   tax_profiles   │              │
│  HL          │   GET /holdings         │  + Validate  │   documents      │              │
│  HMRC        │   GET /sa-return        │              │   observations   │              │
└──────────────┘                         └──────────────┘                  └──────────────┘
```

**Key principle:** The external platform is the source of truth for raw data. Helio transforms it into its own schema, stores it, and never modifies the external system. Helio is read-only from external platforms.

**Where the connection lives:** The prototype doesn't have an `integrations` table yet (that's Phase 4 in the production schema). For now, OAuth tokens / API keys live in environment variables or a simple key-value store. When you scale, you promote this to the `integrations` table from the full schema.

---

## 1. Xero — Accounting & Bookkeeping

> The primary integration for self-employed clients and company directors. Xero holds the financial reality — turnover, expenses, payroll, VAT, director's loan.

### What Xero Gives You

| Xero API Endpoint | Data | Helio Use |
|-------------------|------|-----------|
| `GET /api.xro/2.0/Organisation` | Company name, registration number, VAT number, financial year end | `clients.metadata`, `households.name` |
| `GET /api.xro/2.0/ProfitAndLoss` | Revenue, cost of sales, gross profit, expenses by category, net profit | `tax_profiles.income_sources` |
| `GET /api.xro/2.0/Invoices` | Sales invoices (turnover), purchase invoices (expenses) | `tax_profiles.income_sources[].details` |
| `GET /api.xro/2.0/Accounts` | Chart of accounts, account balances | Expense categorisation |
| `GET /api.xro/2.0/BankTransactions` | Bank feed — actual cash movements | Verify against invoices |
| `GET /api.xro/2.0/PayrollCalendars` + `PayRuns` | Director salary, PAYE, NI, pension deductions | `tax_profiles.income_sources`, `pension_data` |
| `GET /api.xro/2.0/TaxRates` | VAT rates applied | VAT status tracking |
| `GET /api.xro/2.0/Reports/BalanceSheet` | Assets, liabilities, equity, director's loan balance | IHT estimates, director planning |

### Xero → Helio Mapping

#### For a Self-Employed Client (Sole Trader)

Xero Profit & Loss response:
```json
{
  "Reports": [{
    "Rows": [
      { "RowType": "Section", "Title": "Revenue",
        "Rows": [{ "Cells": [{ "Value": "Sales" }, { "Value": "48000.00" }] }] },
      { "RowType": "Section", "Title": "Less Cost of Sales",
        "Rows": [{ "Cells": [{ "Value": "Direct Costs" }, { "Value": "3200.00" }] }] },
      { "RowType": "Section", "Title": "Less Operating Expenses",
        "Rows": [
          { "Cells": [{ "Value": "Software & Subscriptions" }, { "Value": "2400.00" }] },
          { "Cells": [{ "Value": "Office Expenses" }, { "Value": "1200.00" }] },
          { "Cells": [{ "Value": "Travel" }, { "Value": "800.00" }] },
          { "Cells": [{ "Value": "Marketing" }, { "Value": "1500.00" }] },
          { "Cells": [{ "Value": "Professional Fees" }, { "Value": "1500.00" }] },
          { "Cells": [{ "Value": "Insurance" }, { "Value": "400.00" }] },
          { "Cells": [{ "Value": "Telephone & Internet" }, { "Value": "600.00" }] }
        ]},
      { "RowType": "Row", "Title": "Net Profit",
        "Cells": [{ "Value": "36400.00" }] }
    ]
  }]
}
```

Maps to `tax_profiles.income_sources`:
```json
[
  {
    "id": "is-xero-se-001",
    "source_type": "self_employment",
    "label": "Aisha Patel Design (via Xero)",
    "gross_amount": 48000,
    "tax_deducted": 0,
    "ni_deducted": 0,
    "expenses": 11600,
    "details": {
      "source": "xero",
      "xero_org_id": "abc-123-def",
      "synced_at": "2026-02-17T10:00:00Z",
      "turnover": 48000,
      "cost_of_sales": 3200,
      "operating_expenses": 8400,
      "total_expenses": 11600,
      "net_profit": 36400,
      "expense_breakdown": {
        "software_subscriptions": 2400,
        "office_expenses": 1200,
        "travel": 800,
        "marketing": 1500,
        "professional_fees": 1500,
        "insurance": 400,
        "telephone_internet": 600
      },
      "vat_registered": false,
      "accounting_basis": "cash",
      "financial_year_end": "2026-04-05"
    }
  }
]
```

#### For a Company Director

Xero Payroll response:
```json
{
  "PayRuns": [{
    "PayRunID": "pr-001",
    "PayRunPeriodEndDate": "2026-01-31",
    "PaySlips": [{
      "EmployeeID": "emp-olivia-001",
      "FirstName": "Olivia",
      "LastName": "Harper",
      "GrossEarnings": 1047.50,
      "TaxDeducted": 0,
      "EmployeeNI": 0,
      "EmployerNI": 39.92,
      "EmployeePensionContribution": 0,
      "EmployerPensionContribution": 833.33,
      "NetPay": 1047.50
    }]
  }]
}
```

Annualised and mapped to `tax_profiles.income_sources` + `pension_data`:
```json
// income_sources entry
{
  "id": "is-xero-dir-001",
  "source_type": "employment",
  "label": "Harper Digital Ltd — Salary (via Xero Payroll)",
  "gross_amount": 12570,
  "tax_deducted": 0,
  "ni_deducted": 0,
  "expenses": 0,
  "details": {
    "source": "xero",
    "is_director_salary": true,
    "employer_name": "Harper Digital Ltd",
    "paye_ref": "475/HD00001",
    "employer_ni_annual": 479,
    "synced_at": "2026-02-17T10:00:00Z"
  }
}
```

```json
// pension_data.contributions entry
{
  "scheme_name": "SIPP — AJ Bell (via Xero Payroll)",
  "scheme_type": "sipp",
  "employee": 0,
  "employer": 10000,
  "personal": 0,
  "is_salary_sacrifice": false,
  "source": "xero"
}
```

#### Xero also gives Director's Loan Account (Balance Sheet):
```json
// Extracted from Balance Sheet report → stored in clients.metadata
{
  "directors_loan_account": {
    "balance": -15000,
    "direction": "company_owes_director",
    "as_at": "2026-01-31",
    "source": "xero"
  }
}
```

### Xero Sync Flow

```
1. ADVISER CONNECTS XERO (OAuth 2.0)
   ┌──────────┐   "Connect Xero"     ┌──────────┐     OAuth      ┌──────────┐
   │ Adviser  │ ────────────────────▶ │  Helio   │ ─────────────▶ │   Xero   │
   │ (settings│                       │ Backend  │ ◀── token ──── │          │
   │  page)   │                       │          │                │          │
   └──────────┘                       └──────────┘                └──────────┘
   ● OAuth flow: Helio redirects to Xero → adviser authorises → Xero returns token
   ● Token stored (env var for prototype, integrations table for production)
   ● Scopes requested: accounting.transactions.read, accounting.reports.read,
     payroll.employees.read, payroll.payruns.read

2. INITIAL SYNC
   ┌──────────┐                       ┌──────────┐
   │  Helio   │ ── GET /Organisation ─▶│   Xero   │
   │ Backend  │ ── GET /ProfitAndLoss ─▶│          │
   │          │ ── GET /PayRuns ───────▶│          │
   │          │ ── GET /BalanceSheet ──▶│          │
   └──────────┘                        └──────────┘
   ● Organisation → clients.metadata (company details)
   ● P&L → tax_profiles.income_sources (self-employment or dividends)
   ● PayRuns → tax_profiles.income_sources (director salary) + pension_data
   ● Balance Sheet → clients.metadata (director's loan)
   ● Source tagged: details.source = "xero", details.synced_at = now()

3. INCREMENTAL SYNC (daily or on-demand)
   ● Only fetch data modified since last sync
   ● Xero supports: GET /Invoices?ModifiedAfter={timestamp}
   ● Re-compute affected tax_profile cached summaries
   ● Generate new observations if thresholds crossed

4. CONFLICT HANDLING
   ● If adviser manually entered income AND Xero provides it:
     - Xero data flagged as "xero_synced" in details.source
     - Manual entry flagged as "manual"
     - AI highlights the discrepancy as an observation:
       "Xero shows turnover of £48,000 but manual entry shows £45,000 — please verify"
```

---

## 2. Salesforce — CRM

> Salesforce is where the adviser's client relationships live. Contact details, meeting notes, activities, tasks, and documents. Helio pulls client info and pushes analysis summaries back.

### What Salesforce Gives You

| Salesforce Object / API | Data | Helio Use |
|------------------------|------|-----------|
| `GET /services/data/v59.0/sobjects/Contact/{id}` | Name, email, phone, DOB, address, NI number (custom field) | `clients` row |
| `GET /services/data/v59.0/sobjects/Account/{id}` | Household/firm name, adviser assignment | `households` row |
| `GET /services/data/v59.0/query/?q=SELECT...FROM Task` | Tasks, follow-ups, reminders | `observations.action_required` |
| `GET /services/data/v59.0/query/?q=SELECT...FROM Note` | Meeting notes, file notes | `conversations` context |
| `GET /services/data/v59.0/query/?q=SELECT...FROM ContentDocument` | Uploaded documents (P60s, letters) | `documents` |
| `GET /services/data/v59.0/query/?q=SELECT...FROM Event` | Meetings, review dates | Deadline tracking |
| Custom Objects (e.g., `Financial_Summary__c`) | AUM, risk profile, fee schedule | `clients.metadata`, `households.metadata` |

### Salesforce → Helio Mapping

#### Contact → Client

Salesforce Contact response:
```json
{
  "Id": "003xx000004TmfFAAS",
  "FirstName": "Marcus",
  "LastName": "Chen",
  "Email": "marcus.chen@email.com",
  "Birthdate": "1983-07-14",
  "MailingAddress": {
    "street": "47 Riverside Drive",
    "city": "London",
    "postalCode": "SE1 7PB",
    "country": "United Kingdom"
  },
  "NI_Number__c": "QQ 12 34 56 A",
  "UTR__c": null,
  "Tax_Region__c": "England",
  "Employment_Status__c": "Employed",
  "AccountId": "001xx000003DGbAAAW"
}
```

Maps to `clients`:
```json
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
    "salesforce_contact_id": "003xx000004TmfFAAS",
    "salesforce_account_id": "001xx000003DGbAAAW",
    "address": {
      "street": "47 Riverside Drive",
      "city": "London",
      "postcode": "SE1 7PB"
    },
    "synced_at": "2026-02-17T10:00:00Z"
  }
}
```

#### Account → Household

Salesforce Account response:
```json
{
  "Id": "001xx000003DGbAAAW",
  "Name": "Chen Household",
  "OwnerId": "005xx000001Svf1AAC",
  "Type": "Household",
  "AUM__c": 450000,
  "Risk_Profile__c": "Balanced",
  "Fee_Schedule__c": "0.75%",
  "Annual_Review_Date__c": "2026-03-15",
  "Contacts": [
    { "Id": "003xx000004TmfFAAS", "Name": "Marcus Chen" },
    { "Id": "003xx000004TmfGBBS", "Name": "Priya Chen" }
  ]
}
```

Maps to `households`:
```json
{
  "id": "hh-chen-0001",
  "user_id": "a1b2c3d4-0000-0000-0000-000000000001",
  "name": "Chen Household",
  "notes": "AUM: £450K. Annual review: 15 March 2026. Fee: 0.75%.",
  "metadata": {
    "salesforce_account_id": "001xx000003DGbAAAW",
    "aum": 450000,
    "risk_profile": "Balanced",
    "fee_schedule": "0.75%",
    "annual_review_date": "2026-03-15",
    "synced_at": "2026-02-17T10:00:00Z"
  }
}
```

#### Salesforce Notes → Conversation Context

Salesforce notes don't become Helio conversations — they become **context injected into the AI prompt** when the adviser is chatting about that client. The AI can reference: "I see from your meeting notes on 12 December that Marcus mentioned a potential bonus of £15K..."

```json
// Fetched at chat time, not stored permanently (ephemeral context)
{
  "salesforce_notes": [
    {
      "id": "note-001",
      "title": "Annual Review — 15 Dec 2025",
      "body": "Discussed pension strategy. Marcus expecting £15K bonus in March. Priya considering going full-time next year. Both want to maximise ISA contributions before year end.",
      "created_date": "2025-12-15T14:30:00Z"
    },
    {
      "id": "note-002",
      "title": "Phone call — 3 Jan 2026",
      "body": "Marcus confirmed bonus will be £18K. Wants to know if salary sacrifice makes sense. Worried about impact on mortgage application.",
      "created_date": "2026-01-03T11:00:00Z"
    }
  ]
}
```

This context is passed to the AI as part of the system prompt, not stored in Helio's DB. The AI can then proactively say: "Given the £18K bonus Marcus mentioned in January, here's how salary sacrifice could work..."

#### Salesforce Documents → Helio Documents

When Salesforce has uploaded P60s or letters:

```json
// Salesforce ContentDocument
{
  "Id": "069xx00000BcYkSAAV",
  "Title": "Marcus_Chen_P60_2025-26",
  "FileExtension": "pdf",
  "ContentSize": 142800,
  "LatestPublishedVersionId": "068xx00000BcYkTAAV"
}
```

Helio downloads the file and creates a `documents` row:
```json
{
  "id": "doc-sf-chen-001",
  "client_id": "cl-chen-marcus",
  "uploaded_by": "a1b2c3d4-0000-0000-0000-000000000001",
  "document_type": "p60",
  "tax_year": "2025/26",
  "file_name": "Marcus_Chen_P60_2025-26.pdf",
  "file_path": "uploads/cl-chen-marcus/sf-069xx00000BcYkSAAV.pdf",
  "file_size": 142800,
  "mime_type": "application/pdf",
  "extraction_status": "pending",
  "extracted_data": {},
  "extraction_confidence": 0,
  "flagged_fields": [],
  "metadata": {
    "source": "salesforce",
    "salesforce_document_id": "069xx00000BcYkSAAV",
    "synced_at": "2026-02-17T10:00:00Z"
  }
}
```

Then the normal extraction pipeline runs on it — AI reads the PDF, populates `extracted_data`, updates confidence.

### Salesforce Sync Flow

```
1. ADVISER CONNECTS SALESFORCE (OAuth 2.0)
   ● OAuth flow with Salesforce Connected App
   ● Scopes: api, refresh_token
   ● Helio stores access_token + refresh_token

2. INITIAL SYNC — CONTACTS & ACCOUNTS
   ┌──────────┐                                   ┌────────────┐
   │  Helio   │ ── SOQL: SELECT FROM Account ────▶│ Salesforce │
   │ Backend  │ ── SOQL: SELECT FROM Contact ────▶│            │
   └──────────┘                                   └────────────┘
   ● Each Account → households row (with salesforce_account_id in metadata)
   ● Each Contact → clients row (with salesforce_contact_id in metadata)
   ● Matched by name/email if client already exists in Helio (merge, don't duplicate)

3. DOCUMENT PULL
   ● Query: SELECT FROM ContentDocumentLink WHERE LinkedEntityId = '{contact_id}'
   ● Download each document → store in Helio file storage
   ● Create documents row → trigger extraction pipeline

4. ON-DEMAND NOTE INJECTION
   ● When adviser opens a chat about a client:
     - Helio fetches recent Notes/Tasks from Salesforce for that contact
     - Injects them as AI context (NOT stored in Helio DB permanently)
     - AI can reference them in conversation

5. WRITE-BACK (Optional — Production)
   ● After analysis, Helio can push a summary back to Salesforce:
     - Create a Note on the Contact: "Helio Tax Summary 2025/26: ..."
     - Create a Task: "Review pension sacrifice options — potential saving £14,452"
     - Update custom fields: Tax_Summary__c, Last_Analysis_Date__c
   ● This is Phase 4+ — prototype is read-only
```

---

## 3. Hargreaves Lansdown — Investment Platform

> The UK's largest investment platform. Holdings data (ISA, SIPP, GIA) is critical for Bed & ISA analysis, CGT planning, and pension AA tracking. This data comes via the browser extension in Phase 2, or via API if HL opens one.

### What HL Gives You (via Extension Scraping)

The browser extension reads the DOM of the HL portfolio page. No official public API exists — the extension captures what the adviser sees.

| Page / Section | Data Captured | Helio Use |
|---------------|---------------|-----------|
| Portfolio Overview | Account type (ISA/SIPP/GIA), total value per account | `investment_holdings` (production) or `clients.metadata` (prototype) |
| Holdings Detail | Fund name, ISIN, units, current value, cost basis, unrealised gain/loss | `investment_holdings` rows |
| Income History | Dividends received, interest paid | `tax_profiles.income_sources` (dividends/savings) |
| Transactions | Buy/sell dates, amounts | CGT calculation (acquisition cost, disposal proceeds) |

### HL Extension Capture → Helio Mapping

What the extension captures from the page:
```json
{
  "platform": "hargreaves_lansdown",
  "captured_at": "2026-02-17T14:30:00Z",
  "client_detected": "Marcus Chen",
  "accounts": [
    {
      "account_type": "isa",
      "account_ref": "ISA-1234567",
      "total_value": 185000,
      "holdings": [
        {
          "name": "Vanguard FTSE Global All Cap Index Fund",
          "isin": "GB00BD3RZ582",
          "units": 1250.45,
          "current_value": 142000,
          "cost_basis": 118000,
          "unrealised_gain": 24000,
          "annual_income": 1420
        },
        {
          "name": "iShares UK Equity Index Fund",
          "isin": "GB00B7C44X99",
          "units": 890.22,
          "current_value": 43000,
          "cost_basis": 38000,
          "unrealised_gain": 5000,
          "annual_income": 1290
        }
      ]
    },
    {
      "account_type": "sipp",
      "account_ref": "SIPP-7654321",
      "total_value": 420000,
      "holdings": [
        {
          "name": "Vanguard LifeStrategy 80% Equity Fund",
          "isin": "GB00B4PQW151",
          "units": 2100.88,
          "current_value": 420000,
          "cost_basis": 340000,
          "unrealised_gain": 80000,
          "annual_income": 4200
        }
      ]
    },
    {
      "account_type": "gia",
      "account_ref": "GIA-9876543",
      "total_value": 65000,
      "holdings": [
        {
          "name": "Fundsmith Equity Fund",
          "isin": "GB00B41YBW71",
          "units": 145.30,
          "current_value": 65000,
          "cost_basis": 52600,
          "unrealised_gain": 12400,
          "annual_income": 520
        }
      ]
    }
  ]
}
```

**Prototype storage:** Since `investment_holdings` is a production table (not in the 8 prototype tables), this data lives in `clients.metadata` for now:

```json
// clients.metadata (merged with existing metadata)
{
  "employer_name": "Barclays Investment Bank",
  "salary_sacrifice_available": true,
  "investment_holdings": {
    "source": "extension_hl",
    "captured_at": "2026-02-17T14:30:00Z",
    "platform": "hargreaves_lansdown",
    "summary": {
      "total_isa": 185000,
      "total_sipp": 420000,
      "total_gia": 65000,
      "total_value": 670000
    },
    "accounts": [
      {
        "type": "isa",
        "ref": "ISA-1234567",
        "value": 185000,
        "holdings": [
          { "name": "Vanguard FTSE Global All Cap", "value": 142000, "gain": 24000 },
          { "name": "iShares UK Equity Index", "value": 43000, "gain": 5000 }
        ]
      },
      {
        "type": "sipp",
        "ref": "SIPP-7654321",
        "value": 420000,
        "holdings": [
          { "name": "Vanguard LifeStrategy 80%", "value": 420000, "gain": 80000 }
        ]
      },
      {
        "type": "gia",
        "ref": "GIA-9876543",
        "value": 65000,
        "holdings": [
          { "name": "Fundsmith Equity", "value": 65000, "cost": 52600, "gain": 12400 }
        ]
      }
    ]
  }
}
```

**And the GIA data feeds observations immediately:**

```json
// observations — auto-generated from extension capture
{
  "id": "obs-hl-chen-001",
  "client_id": "cl-chen-marcus",
  "tax_year": "2025/26",
  "title": "Bed & ISA Opportunity — £12,400 Unrealised Gain in GIA",
  "description": "Marcus holds £65,000 in Fundsmith Equity Fund in his GIA with £12,400 unrealised gain. His CGT AEA (£3,000) is unused. Selling £15,726 of the holding would crystallise exactly £3,000 gain (tax-free). Repurchase a similar global equity fund inside the ISA (if Priya has ISA allowance remaining, use hers).",
  "severity": "opportunity",
  "priority": "high",
  "category": "bed_and_isa",
  "potential_saving": 720.00,
  "deadline": "2026-04-05",
  "action_required": "Sell £15,726 of Fundsmith in GIA → rebuy similar fund in ISA",
  "is_dismissed": false
}
```

### Extension Sync Flow

```
1. ADVISER VIEWS CLIENT ON HL
   ┌─────────────────────────────────────────────────────────┐
   │  Hargreaves Lansdown — Marcus Chen Portfolio             │
   │                                                          │
   │  ISA:  £185,000    SIPP: £420,000    GIA: £65,000       │
   │                                                          │
   │  ┌──────────────────────────┐                           │
   │  │  HELIO EXTENSION         │                           │
   │  │  📋 Marcus Chen detected │                           │
   │  │  ISA: £185K              │                           │
   │  │  SIPP: £420K             │                           │
   │  │  GIA: £65K (£12.4K gain) │                           │
   │  │                          │                           │
   │  │  [Analyse in Helio →]    │                           │
   │  └──────────────────────────┘                           │
   └─────────────────────────────────────────────────────────┘

2. EXTENSION CAPTURES & SENDS
   ● Content script reads DOM → extracts holdings JSON
   ● Extension matches "Marcus Chen" to existing Helio client
   ● POST /api/extension/capture { client_id, platform: "hl", data: {...} }

3. BACKEND PROCESSES
   ● Stores holdings in clients.metadata.investment_holdings
   ● Checks GIA for unrealised gains > 0
   ● Checks if CGT AEA is unused (from tax_profiles.allowances)
   ● If GIA gain exists + AEA available → creates Bed & ISA observation

4. WEB APP OPENS WITH CONTEXT
   ● Extension opens Helio web app tab (or focuses existing)
   ● Deep link: /chat?client=cl-chen-marcus&context=holdings
   ● Dashboard immediately shows investment summary
   ● AI has holdings context ready for questions
```

---

## 4. HMRC — Tax Authority APIs

> The authoritative source. HMRC's Making Tax Digital (MTD) APIs provide Self Assessment data, PAYE records, NI history, and tax calculations. This is the gold standard data — highest confidence.

### What HMRC Gives You

| HMRC API | Data | Helio Use |
|----------|------|-----------|
| Self Assessment (MTD) | Full SA100 return + supplementary pages (SA102 employment, SA103 self-employment, SA105 property, SA108 CGT) | Populates entire `tax_profiles` — income_sources, tax_breakdown, all of it |
| Individual PAYE | Employment income, tax code, tax deducted, NI paid — **real-time** (not just year-end) | `tax_profiles.income_sources` (employment), mid-year projections |
| National Insurance | Full NI contributions history, qualifying years, state pension forecast | `pension_data`, `clients.metadata` |
| Individual Tax Account | Outstanding liabilities, payments on account, refunds due | Alerts, cash flow planning |

### HMRC Self Assessment → Helio Mapping

HMRC SA return response (simplified):
```json
{
  "taxYear": "2025-26",
  "submissionId": "SA-2025-26-001",
  "income": {
    "employments": [
      {
        "employerName": "Barclays Investment Bank",
        "payeReference": "120/BA98765",
        "grossPay": 118000.00,
        "taxDeducted": 33558.00,
        "employeeNICs": 4371.00
      }
    ],
    "selfEmployments": [],
    "ukProperty": [],
    "ukDividends": { "amount": 0 },
    "ukSavingsInterest": { "amount": 850 },
    "statePension": { "amount": 0 },
    "otherIncome": []
  },
  "deductions": {
    "personalPensionContributions": { "grossAmount": 6000 },
    "giftAidPayments": { "grossAmount": 0 }
  },
  "calculation": {
    "totalIncome": 118850,
    "adjustedNetIncome": 112850,
    "personalAllowance": 6145,
    "totalTaxableIncome": 106705,
    "incomeTaxCharged": 33650,
    "class1NIC": 4371,
    "class2NIC": 0,
    "class4NIC": 0,
    "totalNIC": 4371,
    "totalTaxDue": 38021,
    "taxPaid": 33558,
    "balancingPayment": 4463
  }
}
```

This is the **highest confidence data source**. Maps directly to `tax_profiles`:

```json
{
  "id": "tp-hmrc-chen-2526",
  "client_id": "cl-chen-marcus",
  "tax_year": "2025/26",

  "total_income": 118850.00,
  "adjusted_net_income": 112850.00,
  "taxable_income": 106705.00,
  "income_tax": 33650.00,
  "national_insurance": 4371.00,
  "total_tax": 38021.00,

  "income_sources": [
    {
      "id": "is-hmrc-001",
      "source_type": "employment",
      "label": "Barclays Investment Bank",
      "gross_amount": 118000,
      "tax_deducted": 33558,
      "ni_deducted": 4371,
      "expenses": 0,
      "details": {
        "source": "hmrc_sa",
        "hmrc_submission_id": "SA-2025-26-001",
        "paye_ref": "120/BA98765"
      }
    },
    {
      "id": "is-hmrc-002",
      "source_type": "savings_interest",
      "label": "UK Savings Interest (HMRC)",
      "gross_amount": 850,
      "tax_deducted": 0,
      "ni_deducted": 0,
      "expenses": 0,
      "details": { "source": "hmrc_sa", "within_psa": true }
    }
  ],

  "status": "finalised",
  "data_confidence": "high",
  "confidence_notes": ["Data from HMRC Self Assessment submission — authoritative"],
  "source_notes": ["HMRC SA 2025/26, submission SA-2025-26-001"]
}
```

### HMRC NI Record → Pension Planning Context

```json
// HMRC NI Record response
{
  "qualifyingYears": 28,
  "qualifyingYearsNeeded": 35,
  "yearsToContribute": 7,
  "statePensionForecast": {
    "weeklyAmount": 203.85,
    "annualAmount": 10600.20,
    "fullAmount": 221.20,
    "fullAnnualAmount": 11502.40
  }
}
```

Stored in `clients.metadata`:
```json
{
  "state_pension": {
    "source": "hmrc_ni_record",
    "qualifying_years": 28,
    "years_needed": 35,
    "gaps_remaining": 7,
    "current_forecast_weekly": 203.85,
    "full_forecast_weekly": 221.20,
    "synced_at": "2026-02-17T10:00:00Z"
  }
}
```

This generates an observation:
```json
{
  "title": "State Pension — 7 Qualifying Years Short",
  "description": "Marcus has 28 of the 35 qualifying years needed for the full state pension (£221.20/week). Current forecast: £203.85/week (£17.35/week shortfall = £902/year). Voluntary NI contributions can fill gaps at ~£825/year per missing year. 7 years × £825 = £5,775 to secure an extra £902/year for life — payback in ~6.4 years.",
  "severity": "opportunity",
  "priority": "medium",
  "category": "pension_aa"
}
```

### HMRC Sync Flow

```
1. ADVISER AUTHORISES HMRC ACCESS
   ● HMRC uses OAuth 2.0 via Government Gateway
   ● Adviser logs in with their agent credentials (not client's)
   ● Client must have authorised the adviser in their HMRC account
   ● Scopes: read:self-assessment, read:individual-paye, read:national-insurance

2. PULL SA RETURN
   ● GET /individuals/self-assessment/return/{nino}/{taxYear}
   ● Returns complete return data with HMRC's own calculation
   ● This is THE authoritative source — data_confidence = "high"

3. PULL PAYE (Mid-Year)
   ● GET /individuals/paye/{nino}/employments/{taxYear}
   ● Returns YTD income, tax, NI per employment
   ● Helio can project full-year position from partial data
   ● Useful for: "Marcus has earned £80K by October — what's his year-end position?"

4. PULL NI RECORD
   ● GET /individuals/national-insurance/{nino}/record
   ● Returns qualifying years, gaps, state pension forecast
   ● One-time pull (doesn't change often) → stored in clients.metadata

5. RECONCILIATION
   ● HMRC data overrides manual/Xero data where they overlap
   ● Source hierarchy: HMRC > Xero/Payroll > Manual entry
   ● Discrepancies flagged as observations: "HMRC shows £118,000 gross
     but Xero payroll totals £117,500 — investigate the £500 difference"
```

---

## 5. FreeAgent — Freelancer Accounting

> The go-to tool for UK freelancers and micro-businesses. Simpler than Xero, but tightly focused on Self Assessment. FreeAgent can even file the SA100 directly with HMRC.

### What FreeAgent Gives You

| FreeAgent API Endpoint | Data | Helio Use |
|----------------------|------|-----------|
| `GET /v2/company` | Company details, VAT registration, year end | `clients.metadata` |
| `GET /v2/accounting/trial_balance` | Full trial balance (revenue, expenses, profit) | `tax_profiles.income_sources` |
| `GET /v2/invoices` | Sales invoices (turnover) | Income verification |
| `GET /v2/bills` | Purchase invoices (expenses) | Expense verification |
| `GET /v2/bank_transactions` | Categorised bank transactions | Cross-reference |
| `GET /v2/tax_timeline` | SA deadlines, payments on account, estimated tax | Deadline observations |
| `GET /v2/payslips` | If using FreeAgent payroll (rare for sole traders) | Director salary |

### FreeAgent → Helio Mapping

FreeAgent Tax Timeline response:
```json
{
  "tax_timeline_items": [
    {
      "dated_on": "2026-01-31",
      "description": "Self Assessment filing deadline & balancing payment",
      "nature": "filing_deadline",
      "estimated_amount": 5870.40
    },
    {
      "dated_on": "2026-07-31",
      "description": "Second payment on account",
      "nature": "payment_on_account",
      "estimated_amount": 2935.20
    }
  ]
}
```

This generates time-sensitive observations:
```json
{
  "title": "SA Filing Deadline — 31 January 2027",
  "description": "FreeAgent estimates Aisha's total tax liability at £5,870 for 2025/26. Balancing payment of £2,935 due 31 January 2027. First payment on account for 2026/27 also due on the same date. Ensure adequate cash reserves.",
  "severity": "info",
  "priority": "medium",
  "category": "general",
  "deadline": "2027-01-31"
}
```

FreeAgent Trial Balance → income_sources:
```json
{
  "id": "is-fa-patel-001",
  "source_type": "self_employment",
  "label": "Aisha Patel Design (via FreeAgent)",
  "gross_amount": 48000,
  "tax_deducted": 0,
  "ni_deducted": 0,
  "expenses": 11600,
  "details": {
    "source": "freeagent",
    "freeagent_company_id": "fa-co-001",
    "synced_at": "2026-02-17T10:00:00Z",
    "turnover": 48000,
    "cost_of_sales": 3200,
    "administrative_expenses": 8400,
    "net_profit": 36400,
    "vat_registered": false,
    "sa_filing_status": "not_yet_filed"
  }
}
```

### FreeAgent Sync Flow

```
Same pattern as Xero:
1. OAuth 2.0 connection
2. Pull company details → clients.metadata
3. Pull trial balance → tax_profiles.income_sources
4. Pull tax timeline → observations (deadline alerts)
5. Incremental sync on demand
```

---

## Data Source Hierarchy

When multiple integrations provide overlapping data, Helio follows a confidence hierarchy:

```
┌─────────────────────────────────────────────────┐
│                                                   │
│   HMRC Self Assessment  ◄── Highest confidence   │
│   (Filed return = verified by HMRC)               │
│                                                   │
│   ─────────────────────────────────────────────  │
│                                                   │
│   HMRC PAYE  ◄── High confidence                 │
│   (Real-time employer submissions)                │
│                                                   │
│   ─────────────────────────────────────────────  │
│                                                   │
│   Xero / FreeAgent  ◄── Medium-high confidence   │
│   (Accounting records, may not match HMRC exactly)│
│                                                   │
│   ─────────────────────────────────────────────  │
│                                                   │
│   Platform Data (HL, AJ Bell)  ◄── Medium        │
│   (Point-in-time snapshot, values change daily)   │
│                                                   │
│   ─────────────────────────────────────────────  │
│                                                   │
│   Salesforce / CRM  ◄── Low (for financial data) │
│   (Contact info is reliable, financial data       │
│    may be stale custom fields)                    │
│                                                   │
│   ─────────────────────────────────────────────  │
│                                                   │
│   Document Extraction (AI/OCR)  ◄── Variable     │
│   (Depends on document quality, flagged fields)   │
│                                                   │
│   ─────────────────────────────────────────────  │
│                                                   │
│   Manual Entry  ◄── Lowest confidence            │
│   (Adviser-entered, may have typos)               │
│                                                   │
└─────────────────────────────────────────────────┘
```

Every income_source entry has `details.source` indicating its origin. When sources conflict:

```json
// Example: Xero says turnover is £48,000 but manual entry was £45,000
// → Observation generated automatically

{
  "title": "Income Discrepancy — Xero vs Manual Entry",
  "description": "Xero reports self-employment turnover of £48,000 but the manually entered figure is £45,000. Difference: £3,000. Tax impact: ~£600 income tax + £180 NI. Please verify which figure is correct.",
  "severity": "warning",
  "priority": "high",
  "category": "general",
  "action_required": "Confirm correct turnover figure — Xero or manual entry"
}
```

---

## Integration Summary by Client Type

| Client Type | Primary Integration | Secondary | What Flows In |
|-------------|-------------------|-----------|---------------|
| **Employed (Marcus)** | HMRC PAYE + SA | Salesforce (CRM), HL (extension) | Income, tax paid, NI, holdings |
| **Director (Olivia)** | Xero (payroll + P&L) | HMRC SA | Salary, dividends, company pension, Corp Tax |
| **Scottish (Ewan)** | HMRC PAYE | Salesforce | Income + Scottish tax code (prefix "S") |
| **Freelancer (Aisha)** | FreeAgent | HMRC SA | Turnover, expenses, profit, tax timeline |
| **Retiree (George)** | HMRC NI Record | Salesforce, HL (extension) | State pension forecast, DB pension, holdings for IHT |

---

## What Each Integration Writes To

| Helio Table | Xero | Salesforce | HL Extension | HMRC | FreeAgent |
|-------------|------|------------|-------------|------|-----------|
| `clients` | metadata (company details) | **All fields** (name, DOB, NI, email, region) | metadata (holdings summary) | metadata (NI record, state pension) | metadata (company details) |
| `clients.metadata` | directors_loan, vat_status | address, aum, risk_profile, salesforce_ids | investment_holdings | state_pension forecast | sa_filing_status |
| `tax_profiles.income_sources` | Self-employment P&L, director salary, dividends | — | — | **All income** (employment, self-emp, property, dividends, savings) | Self-employment P&L |
| `tax_profiles.pension_data` | Payroll pension deductions | — | SIPP valuation | — | — |
| `tax_profiles` (cached summaries) | Triggers recalculation | — | — | **Direct write** (HMRC's own calculation) | Triggers recalculation |
| `documents` | — | Pull attached P60s/letters | — | — | — |
| `observations` | Discrepancy alerts, director's loan warnings | Meeting-based context for AI | Bed & ISA opportunities, CGT alerts | Authoritative corrections | SA deadline alerts, tax timeline |
| `conversations` (context) | — | Notes injected as AI context | — | — | — |

---

## Prototype vs Production Integration Approach

| Aspect | Prototype (Now) | Production (Later) |
|--------|----------------|-------------------|
| **Connection storage** | Env vars / adviser's API keys | `integrations` table with encrypted credentials per firm/user |
| **Sync schedule** | Manual trigger ("Sync now" button) | Scheduled (daily/weekly) + webhook-driven |
| **Investment holdings** | Stored in `clients.metadata` JSONB | Own `investment_holdings` table with full schema |
| **Conflict resolution** | AI flags discrepancies as observations | Automated merge with confidence weighting + manual override UI |
| **Salesforce write-back** | Read-only | Push analysis summaries, create tasks, update custom fields |
| **HMRC auth** | Adviser enters data from HMRC printout | Full OAuth with Government Gateway agent credentials |
| **Platform coverage** | 1-2 integrations (Xero + HL extension) | All platforms in the research doc |
