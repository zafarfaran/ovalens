# Helio Database Schema Design

> Entity-relationship model for the UK tax planning assistant. Designed for Supabase (PostgreSQL) with scalability, auditability, and future-proofing as core principles.

---

## Design Principles

| Principle | How It's Applied |
|-----------|-----------------|
| **UK individual taxation** | Clients are individuals, never joint-filed. Each person has their own tax profiles, allowances, and income — but they belong to a household for joint planning |
| **Tax year scoping** | Every financial data point lives under a `tax_year` (e.g., "2025/26"). This keeps years cleanly separated and lets you compare across years |
| **Versioned rates** | Tax rates live in the database (not just constants). When 2026/27 rates are announced, insert new rows — no code changes needed |
| **JSONB for flexibility** | Structured-but-variable data (income source details, scenario inputs, extraction results) uses JSONB so the schema doesn't break when edge cases appear |
| **Computed caching** | Expensive calculations (ANI, effective rate, total tax) are cached on `tax_profiles`. Recalculated when inputs change |
| **Multi-tenant** | Firms are the isolation boundary. Every entity traces back to a firm via its parent chain |
| **Audit-ready** | An `audit_log` captures who changed what, when. Important for compliance with FCA regulations |
| **RLS from day one** | Row Level Security policies ensure advisers only see their firm's data, even if application logic has bugs |

---

## Entity Relationship Diagram

```
                                ┌──────────┐
                                │  firms   │
                                └────┬─────┘
                                     │ 1
                      ┌──────────────┼──────────────┐
                      │              │              │
                      ▼ *            ▼ *            ▼ *
                ┌──────────┐  ┌────────────┐  ┌──────────────┐
                │  users   │  │ households │  │ integrations │
                │(advisers)│  │            │  │              │
                └──────────┘  └─────┬──────┘  └──────────────┘
                      │             │ 1
                      │             ├──────────────┐
                      │             ▼ *            ▼ *
                      │       ┌──────────┐   ┌──────────────┐
                      │       │ clients  │   │ iht_estimates │
                      │       │(individ.)│   └──────────────┘
                      │       └────┬─────┘
                      │            │ 1
            ┌─────────┤   ┌────────┼─────────┬─────────────┬───────────────┐
            │         │   │        │         │             │               │
            ▼ *       │   ▼ *      ▼ *       ▼ *           ▼ *             ▼ *
     ┌─────────────┐  │ ┌────────────┐ ┌──────────┐ ┌───────────────┐ ┌──────────────┐
     │conversations│  │ │tax_profiles│ │allowance │ │  investment   │ │  documents   │
     │  (threads)  │  │ │(per year)  │ │  _usage  │ │  _holdings   │ │              │
     └──────┬──────┘  │ └─────┬──────┘ └──────────┘ └───────────────┘ └──────┬───────┘
            │         │       │ 1                                            │
            ▼ *       │  ┌────┼──────────┬──────────┬──────────┐             ▼ *
     ┌──────────┐     │  │    │          │          │          │      ┌──────────────┐
     │ messages │     │  ▼ *  ▼ *        ▼ *        ▼ *        ▼ *    │  document    │
     └──────────┘     │ ┌────┐┌────────┐┌────────┐┌────────┐┌──────┐ │ _extractions │
                      │ │inc.││pension ││hicbc   ││observ- ││scen- │ └──────────────┘
                      │ │src.││contrib.││records ││ations  ││arios │
                      │ └────┘└────────┘└────────┘└────────┘└──────┘
                      │
                      │  ┌──────────────┐          ┌──────────────┐
                      │  │ pension_aa   │          │  tax_rates   │
                      │  │  _tracking   │          │ (versioned)  │
                      │  └──────────────┘          └──────────────┘
                      │
                      │  ┌──────────────┐
                      └─▶│  audit_log   │
                         └──────────────┘
```

---

## Entities

### 1. `firms` — Multi-Tenant Root

The top-level isolation boundary. Every advisory practice is a firm.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `name` | TEXT NOT NULL | Firm display name |
| `fca_number` | TEXT | FCA registration (UK compliance) |
| `address` | JSONB | `{line1, line2, city, postcode, country}` |
| `settings` | JSONB | Firm-level preferences (default region, branding, etc.) |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Why separate from users?** Firms have multiple advisers. Firm-level settings, billing, and integrations attach here. When you add firm-level access control (Phase 5 of the MVP plan), this is already in place.

---

### 2. `users` — Advisers

Authenticated users of the system. References `auth.users` from Supabase Auth.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | References `auth.users(id)` — Supabase Auth |
| `firm_id` | UUID FK → firms | Which firm they belong to |
| `email` | TEXT NOT NULL UNIQUE | |
| `full_name` | TEXT NOT NULL | |
| `role` | TEXT NOT NULL | `'owner'`, `'admin'`, `'adviser'`, `'viewer'` |
| `preferences` | JSONB | `{theme, default_tax_year, notification_settings, quiet_hours}` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Roles:**
- `owner` — Firm owner (billing, user management)
- `admin` — Can manage users, see all clients
- `adviser` — Standard user, sees only assigned clients
- `viewer` — Read-only (for compliance officers, etc.)

---

### 3. `households` — Planning Unit

A household groups individuals who plan together (couple, family). This is the unit an adviser thinks in — "the Mitchell household" — even though UK tax is calculated per individual.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `firm_id` | UUID FK → firms | Tenant isolation |
| `name` | TEXT NOT NULL | e.g., "Mitchell Household" |
| `adviser_id` | UUID FK → users | Primary adviser assigned |
| `notes` | TEXT | Free-form adviser notes |
| `metadata` | JSONB | `{tags, risk_profile, fee_structure}` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Why households?** The research doc repeatedly shows planning for "James & Sarah Mitchell" together — spousal transfers, doubled allowances (£40k ISA combined), estate planning. The household gives you a container for joint concerns (IHT, child benefit, spousal income splitting) while keeping individual tax separate.

---

### 4. `clients` — Individuals

The core entity. One person = one tax calculation = one set of allowances. UK taxes individuals, never couples.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `household_id` | UUID FK → households | Which household they belong to |
| `firm_id` | UUID FK → firms | Denormalized for query efficiency + RLS |
| `first_name` | TEXT NOT NULL | |
| `last_name` | TEXT NOT NULL | |
| `email` | TEXT | |
| `date_of_birth` | DATE | Needed for: LISA eligibility (18-39), pension access age (55/57), state pension age |
| `ni_number` | TEXT | National Insurance number — sensitive, consider encryption |
| `utr` | TEXT | Unique Taxpayer Reference for Self Assessment |
| `region` | TEXT NOT NULL | `'england'`, `'wales'`, `'northern_ireland'`, `'scotland'` — **determines tax rates** |
| `employment_status` | TEXT | `'employed'`, `'self_employed'`, `'director'`, `'retired'`, `'multiple'` |
| `relationship_to_head` | TEXT | `'primary'`, `'spouse'`, `'partner'`, `'dependent'` — clarifies household structure |
| `metadata` | JSONB | `{employer_name, paye_ref, salary_sacrifice_available, state_pension_forecast}` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Key design decision — `region`:** Scotland has completely different income tax rates (6 bands vs 3). The research doc says "Always ask: Is the client resident in Scotland?" This field drives which tax bands are used in every calculation. It's a first-class column, not buried in JSONB.

**Key design decision — `firm_id` denormalization:** You could derive firm from `household → firm`. But every RLS policy and every client list query would need a join. Denormalizing `firm_id` onto clients makes RLS policies simple and client queries fast.

---

### 5. `tax_profiles` — Per Client, Per Tax Year

This is the central analytical entity. One row per client per tax year. It holds the cached/computed tax summary and links to all the detailed data below it.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `client_id` | UUID FK → clients | |
| `tax_year` | TEXT NOT NULL | `"2025/26"` format |
| `total_income` | DECIMAL(12,2) | Sum of all income sources |
| `adjusted_net_income` | DECIMAL(12,2) | **Critical** — determines PA taper, HICBC |
| `taxable_income` | DECIMAL(12,2) | ANI minus Personal Allowance |
| `income_tax` | DECIMAL(12,2) | Total income tax liability |
| `national_insurance` | DECIMAL(12,2) | Total NI (all classes) |
| `dividend_tax` | DECIMAL(12,2) | Dividend tax component |
| `savings_tax` | DECIMAL(12,2) | Savings income tax component |
| `total_tax` | DECIMAL(12,2) | IT + NI + HICBC |
| `effective_rate` | DECIMAL(5,2) | `total_tax / total_income × 100` |
| `marginal_rate` | DECIMAL(5,2) | Rate on the next £1 earned |
| `personal_allowance` | DECIMAL(12,2) | After taper (0 to £12,570) |
| `pa_status` | TEXT | `'full'`, `'tapered'`, `'lost'` |
| `in_pa_taper_zone` | BOOLEAN | ANI between £100k and £125,140 |
| `hicbc_applies` | BOOLEAN | Quick flag for alerts |
| `pension_taper_applies` | BOOLEAN | Adjusted income > £260k |
| `tax_breakdown` | JSONB | Band-by-band detail: `[{band, amount, rate, tax}]` |
| `ni_breakdown` | JSONB | `{class1: {main, upper, total}, class2: {...}, class4: {...}}` |
| `status` | TEXT | `'draft'`, `'in_progress'`, `'reviewed'`, `'finalised'` |
| `data_confidence` | TEXT | `'low'`, `'medium'`, `'high'` |
| `confidence_notes` | TEXT[] | Array of confidence caveats |
| `source_notes` | TEXT[] | `["Income from P60", "Rates per HMRC 2025/26"]` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |
| **UNIQUE** | `(client_id, tax_year)` | One profile per person per year |

**Why cache computed values here?** The research doc's `relevantTaxData` schema shows tax summaries being sent to the frontend constantly — for the context ribbon, the intelligence panel, the chat responses. Computing this on every request from raw income sources would be expensive. Cache it here, recompute when inputs change.

**Why JSONB for breakdowns?** Tax band structures differ between England and Scotland (3 vs 6 bands). JSONB accommodates both without schema changes. Future rate changes won't require migrations.

---

### 6. `income_sources` — Detailed Income Items

Granular income data feeding into a tax profile. Supports multiple sources of the same type (two employments, three rental properties).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `tax_profile_id` | UUID FK → tax_profiles | |
| `source_type` | TEXT NOT NULL | `'employment'`, `'self_employment'`, `'dividends'`, `'savings_interest'`, `'rental'`, `'state_pension'`, `'private_pension'`, `'other'` |
| `label` | TEXT | e.g., "ACME Corp salary", "42 High Street rental" |
| `gross_amount` | DECIMAL(12,2) | |
| `tax_deducted` | DECIMAL(12,2) | PAYE already deducted |
| `ni_deducted` | DECIMAL(12,2) | NI already deducted |
| `expenses` | DECIMAL(12,2) | Allowable expenses (self-employment, rental) |
| `net_amount` | DECIMAL(12,2) | `gross - expenses` (can be computed column) |
| `details` | JSONB | Type-specific fields (see below) |
| `source_document_id` | UUID FK → documents | Which uploaded doc this came from |
| `extraction_confidence` | TEXT | `'low'`, `'medium'`, `'high'` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**`details` JSONB by type:**
- **employment:** `{employer_name, paye_ref, benefits_in_kind, company_car_value, salary_sacrifice_available, salary_sacrifice_amount}`
- **self_employment:** `{turnover, allowable_expenses, capital_allowances, trading_allowance_used, vat_registered}`
- **rental:** `{property_address, mortgage_interest, repairs, agent_fees, furnished_holiday_let}`
- **dividends:** `{company_name, within_allowance_amount}`
- **savings_interest:** `{provider, account_type, within_psa_amount}`

**Why JSONB for details?** Employment details are very different from rental details. A rigid column approach would mean 30+ nullable columns. JSONB keeps the core columns (amount, tax, expenses) strongly typed while letting type-specific data flex.

---

### 7. `pension_contributions` — Per Tax Profile

Tracks all pension inputs for a tax year. Separate from income sources because pension contributions *reduce* ANI rather than being income.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `tax_profile_id` | UUID FK → tax_profiles | |
| `scheme_name` | TEXT | e.g., "Workplace DC — Aviva", "SIPP — HL" |
| `scheme_type` | TEXT | `'workplace_dc'`, `'workplace_db'`, `'sipp'`, `'ssas'` |
| `employee_contribution` | DECIMAL(12,2) | |
| `employer_contribution` | DECIMAL(12,2) | |
| `personal_contribution` | DECIMAL(12,2) | Direct to SIPP, etc. |
| `total_contribution` | DECIMAL(12,2) | Sum of all three (can be computed) |
| `is_salary_sacrifice` | BOOLEAN | Different tax treatment if true |
| `is_net_pay` | BOOLEAN | Net pay scheme vs relief at source |
| `details` | JSONB | `{fund_name, fund_value, annual_management_charge}` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Why separate from income sources?** Pension contributions are deductions, not income. They interact with the ANI calculation, the 60% trap, HICBC, and the pension annual allowance — all differently. Keeping them in their own table makes these calculations cleaner and lets you model "what if they contribute X more?" without touching income data.

---

### 8. `pension_aa_tracking` — Annual Allowance with Carry Forward

The pension annual allowance has 3-year carry forward, taper rules, and MPAA triggers. This needs its own entity because you need to look across multiple tax years simultaneously.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `client_id` | UUID FK → clients | Per client (not per tax profile — spans years) |
| `tax_year` | TEXT NOT NULL | |
| `annual_allowance` | DECIMAL(12,2) | £60,000 standard, or tapered amount |
| `is_tapered` | BOOLEAN | |
| `tapered_amount` | DECIMAL(12,2) | If tapered, the reduced AA |
| `total_contributions` | DECIMAL(12,2) | All pension inputs this year |
| `used` | DECIMAL(12,2) | How much AA consumed |
| `unused` | DECIMAL(12,2) | Available for carry forward |
| `mpaa_triggered` | BOOLEAN | Has flexibly accessed pension benefits |
| `mpaa_limit` | DECIMAL(12,2) | £10,000 if triggered |
| `threshold_income` | DECIMAL(12,2) | For taper calculation |
| `adjusted_income` | DECIMAL(12,2) | For taper calculation |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |
| **UNIQUE** | `(client_id, tax_year)` | One row per person per year |

**Why per-client not per-tax-profile?** Carry forward looks at the previous 3 years. You need rows for years where the client might not have a full tax profile (e.g., they didn't file Self Assessment but did contribute to a pension). Linking to client directly makes the carry forward query simpler: `WHERE client_id = X AND tax_year IN ('2022/23', '2023/24', '2024/25')`.

---

### 9. `allowance_usage` — Per Client, Per Tax Year, Per Allowance

Tracks usage of each annual allowance. Separate rows per allowance type so they can be queried and displayed independently (the traffic light tracker in the dashboard).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `client_id` | UUID FK → clients | |
| `tax_year` | TEXT NOT NULL | |
| `allowance_type` | TEXT NOT NULL | `'isa'`, `'lisa'`, `'junior_isa'`, `'pension_aa'`, `'cgt_aea'`, `'dividend'`, `'personal_savings'`, `'iht_annual_gift'`, `'marriage_allowance'`, `'trading'`, `'property'`, `'rent_a_room'` |
| `annual_limit` | DECIMAL(12,2) | The limit for this specific tax year |
| `used` | DECIMAL(12,2) | Amount used so far |
| `remaining` | DECIMAL(12,2) | `annual_limit - used` (can be computed) |
| `can_carry_forward` | BOOLEAN | Only pension AA and IHT gift (1 year) |
| `carried_forward_from` | DECIMAL(12,2) | Amount brought forward from prior year |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |
| **UNIQUE** | `(client_id, tax_year, allowance_type)` | One entry per person per year per allowance |

**Why store `annual_limit` per row?** Limits change between tax years (ISA was £20k for years but could change; pension AA went from £40k to £60k in 2023/24). Storing the limit alongside usage means you never need to look up "what was the ISA limit in 2023/24?" from constants.

---

### 10. `investment_holdings` — ISA / SIPP / GIA

Current investment holdings across platforms. Critical for Bed & ISA analysis, CGT planning, and IHT estimation.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `client_id` | UUID FK → clients | |
| `wrapper_type` | TEXT NOT NULL | `'isa'`, `'lisa'`, `'junior_isa'`, `'sipp'`, `'ssas'`, `'gia'`, `'other'` |
| `platform` | TEXT | "Hargreaves Lansdown", "AJ Bell", etc. |
| `account_reference` | TEXT | Platform account number |
| `holding_name` | TEXT NOT NULL | Fund/share name |
| `isin` | TEXT | International Securities Identification Number |
| `units` | DECIMAL(14,4) | Number of units/shares held |
| `current_value` | DECIMAL(12,2) | |
| `cost_basis` | DECIMAL(12,2) | For CGT calculation (GIA only) |
| `unrealised_gain` | DECIMAL(12,2) | `current_value - cost_basis` |
| `annual_income` | DECIMAL(12,2) | Dividends/interest from this holding |
| `last_valued_at` | TIMESTAMPTZ | When the value was last updated |
| `source` | TEXT | `'manual'`, `'extension'`, `'api_sync'` — where the data came from |
| `details` | JSONB | `{yield_percent, fund_type, sector, ocf}` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Why not scope to tax year?** Holdings are *current state*, not year-scoped. The value changes daily. Tax year scoping happens at the analysis level (when you calculate CGT using the Bed & ISA tool). The `source` field tracks whether this was entered manually, captured by the browser extension, or synced via an API integration.

---

### 11. `documents` — Uploaded Files

SA100s, P60s, P11Ds, platform statements — the raw files advisers upload or the extension captures.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `client_id` | UUID FK → clients | |
| `uploaded_by` | UUID FK → users | |
| `document_type` | TEXT NOT NULL | `'sa100'`, `'sa102'`, `'sa103'`, `'sa105'`, `'sa106'`, `'sa108'`, `'p60'`, `'p45'`, `'p11d'`, `'platform_statement'`, `'pension_statement'`, `'payslip'`, `'tax_computation'`, `'other'` |
| `tax_year` | TEXT | Which tax year this document relates to |
| `file_name` | TEXT NOT NULL | Original file name |
| `file_path` | TEXT NOT NULL | S3/R2 storage path |
| `file_size` | INTEGER | Bytes |
| `mime_type` | TEXT | |
| `extraction_status` | TEXT | `'pending'`, `'processing'`, `'completed'`, `'failed'` |
| `metadata` | JSONB | `{page_count, source: "upload"|"extension"}` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### 12. `document_extractions` — Structured Data from Documents

What the AI/OCR extracted from a document. Kept separate so you can re-extract without losing the original document record, and so an adviser can review/approve extractions.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `document_id` | UUID FK → documents | |
| `extracted_data` | JSONB NOT NULL | Flexible: `{income_figures, tax_deducted, ni_paid, pension_contributions, ...}` |
| `overall_confidence` | DECIMAL(3,2) | 0.00 to 1.00 |
| `field_confidence` | JSONB | `{field_name: confidence_score}` — per-field granularity |
| `flagged_fields` | TEXT[] | Fields the AI wasn't sure about |
| `reviewed_by` | UUID FK → users | Adviser who approved/corrected |
| `reviewed_at` | TIMESTAMPTZ | |
| `applied_to_profile` | BOOLEAN | Whether this data has been pushed to a tax_profile |
| `notes` | TEXT | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### 13. `conversations` — Chat Threads

Maps directly to the chat history sidebar in the UI.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | The adviser who owns this conversation |
| `household_id` | UUID FK → households | Optional — some chats may be general |
| `client_id` | UUID FK → clients | Optional — could be household-level or general |
| `title` | TEXT | Auto-generated or user-set |
| `status` | TEXT | `'active'`, `'archived'`, `'deleted'` |
| `last_message_preview` | TEXT | Cached for sidebar display |
| `last_message_at` | TIMESTAMPTZ | Cached for sorting |
| `message_count` | INTEGER | Cached for display |
| `unread` | BOOLEAN | Has new messages since last viewed |
| `tags` | TEXT[] | e.g., `["pension", "year-end"]` |
| `tax_plan_mode` | BOOLEAN | Whether dashboard generation is active |
| `metadata` | JSONB | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Cached fields:** `last_message_preview`, `last_message_at`, `message_count` are denormalized from messages. Updated via trigger or application code on each new message. This avoids a join + aggregate on every sidebar render.

---

### 14. `messages` — Within Conversations

Individual messages in a chat thread.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `conversation_id` | UUID FK → conversations | |
| `role` | TEXT NOT NULL | `'user'`, `'assistant'`, `'system'` |
| `content` | TEXT NOT NULL | The message text |
| `insights` | JSONB | `[{title, description, severity, potential_saving}]` — structured insight chips |
| `tool_calls` | JSONB | `[{tool_name, arguments, result}]` — what tools the AI invoked |
| `dashboard_data` | JSONB | If this message triggered a dashboard update, the `relevantTaxData` payload |
| `attachments` | JSONB | `[{file_name, file_path, mime_type}]` — uploaded documents in this message |
| `model` | TEXT | Which AI model was used |
| `input_tokens` | INTEGER | For cost tracking |
| `output_tokens` | INTEGER | For cost tracking |
| `created_at` | TIMESTAMPTZ | |

**Why store `dashboard_data` on messages?** The research doc's `generate_dashboard` function produces a `relevantTaxData` payload. Storing it on the message that triggered it means you can replay the exact dashboard state at any point in the conversation. This is essential for "go back to what Helio showed me yesterday" workflows.

---

### 15. `observations` — AI-Generated Tax Insights

The critical alerts and opportunities shown in the intelligence panel. These are the things that make Helio valuable — "you're in the 60% trap", "HICBC is costing you £2,212".

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `client_id` | UUID FK → clients | |
| `tax_profile_id` | UUID FK → tax_profiles | Optional — some observations are year-agnostic |
| `generated_by_message_id` | UUID FK → messages | Which chat message produced this |
| `title` | TEXT NOT NULL | e.g., "Personal Allowance Fully Lost" |
| `description` | TEXT NOT NULL | Detailed explanation |
| `severity` | TEXT NOT NULL | `'info'`, `'warning'`, `'opportunity'`, `'critical'` |
| `priority` | TEXT NOT NULL | `'low'`, `'medium'`, `'high'`, `'urgent'` |
| `category` | TEXT NOT NULL | See categories below |
| `potential_saving` | DECIMAL(12,2) | £ amount this could save |
| `deadline` | DATE | If time-sensitive (e.g., 5 April for year-end) |
| `action_required` | TEXT | What the adviser should do |
| `complexity` | TEXT | `'easy'`, `'medium'`, `'complex'` — from the research doc |
| `is_dismissed` | BOOLEAN | Adviser acknowledged/dismissed this |
| `dismissed_at` | TIMESTAMPTZ | |
| `dismissed_by` | UUID FK → users | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**Observation categories:** `'pa_taper'`, `'hicbc'`, `'pension_aa'`, `'pension_taper'`, `'isa_optimisation'`, `'cgt_planning'`, `'iht_planning'`, `'salary_sacrifice'`, `'dividend_planning'`, `'director_remuneration'`, `'scottish_rates'`, `'year_end'`, `'spousal_planning'`, `'gift_aid'`, `'bed_and_isa'`, `'general'`

These categories map directly to the planning sections in the research doc.

---

### 16. `scenarios` — What-If Modelling

"What if they salary sacrifice £50K?" — the scenario comparison feature.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `client_id` | UUID FK → clients | |
| `tax_profile_id` | UUID FK → tax_profiles | Baseline to compare against |
| `created_by` | UUID FK → users | |
| `name` | TEXT NOT NULL | e.g., "£50K Salary Sacrifice" |
| `description` | TEXT | |
| `scenario_type` | TEXT NOT NULL | `'pension_contribution'`, `'salary_sacrifice'`, `'bed_and_isa'`, `'income_change'`, `'gift_aid'`, `'spousal_transfer'`, `'director_remuneration'`, `'custom'` |
| `inputs` | JSONB NOT NULL | Type-specific input parameters |
| `results` | JSONB NOT NULL | Computed results |
| `baseline_total_tax` | DECIMAL(12,2) | Current tax before the change |
| `projected_total_tax` | DECIMAL(12,2) | Tax after the change |
| `total_saving` | DECIMAL(12,2) | Difference |
| `is_recommended` | BOOLEAN | AI flagged this as recommended |
| `is_applied` | BOOLEAN | Whether the adviser confirmed this was implemented |
| `applied_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

**`inputs` JSONB by scenario type:**
- **pension_contribution:** `{amount, type: "personal"|"employer"|"sacrifice", restore_pa: true}`
- **salary_sacrifice:** `{sacrifice_amount, employer_ni_shared: true, employer_ni_share_pct: 50}`
- **bed_and_isa:** `{holdings: [{holding_id, sell_amount}], isa_remaining}`
- **income_change:** `{income_source_type, change_amount, reason}`
- **gift_aid:** `{donation_amount}`
- **spousal_transfer:** `{assets: [{type, value}], from_client_id, to_client_id}`
- **director_remuneration:** `{salary, dividends, pension_via_company}`

**`results` JSONB:**
```json
{
  "new_ani": 97425,
  "new_pa": 12570,
  "new_income_tax": 35279,
  "new_ni": 3841,
  "income_tax_saving": 20812,
  "ni_saving": 1000,
  "hicbc_avoided": 2212.60,
  "pa_restored": 12570,
  "effective_relief": "48%"
}
```

---

### 17. `hicbc_records` — Child Benefit Tracking

High Income Child Benefit Charge — complex enough to warrant its own table, and referenced frequently in planning scenarios.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `tax_profile_id` | UUID FK → tax_profiles | |
| `number_of_children` | INTEGER | |
| `claims_child_benefit` | BOOLEAN | Some families opt out |
| `child_benefit_amount` | DECIMAL(12,2) | Annual entitlement |
| `higher_earner_ani` | DECIMAL(12,2) | The parent with higher ANI |
| `clawback_percentage` | DECIMAL(5,2) | 0 to 100 |
| `hicbc_charge` | DECIMAL(12,2) | Amount clawed back |
| `net_benefit` | DECIMAL(12,2) | `child_benefit_amount - hicbc_charge` |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |
| **UNIQUE** | `(tax_profile_id)` | One per tax profile |

---

### 18. `iht_estimates` — Inheritance Tax Snapshots

Estate planning lives at the household level (couple's combined estate).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `household_id` | UUID FK → households | Estate = household |
| `property_value` | DECIMAL(14,2) | |
| `investment_value` | DECIMAL(14,2) | |
| `cash_value` | DECIMAL(14,2) | |
| `other_assets` | DECIMAL(14,2) | |
| `liabilities` | DECIMAL(14,2) | Mortgages, loans |
| `net_estate` | DECIMAL(14,2) | Computed: assets - liabilities |
| `nil_rate_band` | DECIMAL(14,2) | £325,000 |
| `residence_nil_rate_band` | DECIMAL(14,2) | £175,000 |
| `transferable_nrb` | DECIMAL(14,2) | From deceased spouse |
| `transferable_rnrb` | DECIMAL(14,2) | From deceased spouse |
| `bpr_amount` | DECIMAL(14,2) | Business Property Relief |
| `apr_amount` | DECIMAL(14,2) | Agricultural Property Relief |
| `taxable_estate` | DECIMAL(14,2) | Net estate minus all reliefs |
| `estimated_iht` | DECIMAL(14,2) | At 40% |
| `gifts_last_7_years` | JSONB | `[{date, recipient, amount, type, pet_taper_pct}]` |
| `life_insurance` | JSONB | `{in_trust: amount, not_in_trust: amount}` |
| `notes` | TEXT | |
| `as_at_date` | DATE | When this estimate was prepared |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |

---

### 19. `integrations` — Platform Connections

Connected services (extension, APIs, OAuth).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `firm_id` | UUID FK → firms | |
| `user_id` | UUID FK → users | NULL if firm-wide |
| `provider` | TEXT NOT NULL | `'hargreaves_lansdown'`, `'aj_bell'`, `'interactive_investor'`, `'hmrc'`, `'xero'`, `'freeagent'`, `'sage'`, `'salesforce'` |
| `status` | TEXT | `'connected'`, `'disconnected'`, `'error'`, `'pending'` |
| `credentials` | JSONB | Encrypted OAuth tokens / API keys |
| `scopes` | TEXT[] | Authorized access scopes |
| `last_synced_at` | TIMESTAMPTZ | |
| `sync_frequency` | TEXT | `'manual'`, `'daily'`, `'weekly'` |
| `metadata` | JSONB | Provider-specific config |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | |
| **UNIQUE** | `(firm_id, user_id, provider)` | One connection per provider per user per firm |

---

### 20. `tax_rates` — Versioned Rate Tables

**This is the future-proofing table.** Instead of only relying on hardcoded constants, store rates in the database. When the Chancellor announces new rates in the Budget, insert new rows — no code deployment needed.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `tax_year` | TEXT NOT NULL | `"2025/26"` |
| `rate_type` | TEXT NOT NULL | `'income_tax'`, `'scottish_income_tax'`, `'ni_class_1'`, `'ni_class_4'`, `'dividend'`, `'cgt'`, `'iht'` |
| `region` | TEXT | `'uk'`, `'scotland'` |
| `bands` | JSONB NOT NULL | `[{name, lower_limit, upper_limit, rate}]` |
| `thresholds` | JSONB | `{personal_allowance, pa_taper_start, higher_rate_threshold, ...}` |
| `allowances` | JSONB | `{isa_limit, pension_aa, cgt_aea, ...}` |
| `effective_from` | DATE NOT NULL | Start of applicability |
| `effective_to` | DATE | NULL = current |
| `source` | TEXT | `"HMRC 2025/26"`, `"Autumn Statement 2025"` |
| `created_at` | TIMESTAMPTZ | |
| **UNIQUE** | `(tax_year, rate_type, region)` | One set of rates per type per year per region |

**Migration path:** Start by seeding this table from your existing `constants.py`. The calculation engine reads from here. When 2026/27 rates are announced, an admin inserts new rows — all calculations for the new year automatically use the right rates. Your existing `constants.py` becomes the seed/fallback.

---

### 21. `audit_log` — Compliance Trail

FCA-regulated advisers need to show what was changed, by whom, and when.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `user_id` | UUID FK → users | Who did it |
| `entity_type` | TEXT NOT NULL | `'client'`, `'tax_profile'`, `'scenario'`, `'observation'`, etc. |
| `entity_id` | UUID NOT NULL | ID of the affected row |
| `action` | TEXT NOT NULL | `'create'`, `'update'`, `'delete'`, `'view'`, `'export'` |
| `changes` | JSONB | `{field: {old: x, new: y}}` for updates |
| `ip_address` | INET | |
| `user_agent` | TEXT | |
| `created_at` | TIMESTAMPTZ | |

---

## Key Relationships Summary

| Relationship | Type | Why |
|-------------|------|-----|
| firm → users | 1:many | Multiple advisers per firm |
| firm → households | 1:many | Multiple client households per firm |
| household → clients | 1:many | Spouses + dependents per household |
| client → tax_profiles | 1:many | One per tax year |
| tax_profile → income_sources | 1:many | Multiple income streams |
| tax_profile → pension_contributions | 1:many | Multiple pension schemes |
| tax_profile → hicbc_records | 1:1 | One HICBC calculation per profile |
| tax_profile → observations | 1:many | Multiple findings |
| tax_profile → scenarios | 1:many | Multiple what-ifs |
| client → allowance_usage | 1:many | Per year per allowance type |
| client → pension_aa_tracking | 1:many | Per year (for carry forward) |
| client → investment_holdings | 1:many | Current portfolio |
| client → documents | 1:many | Uploaded files |
| document → document_extractions | 1:many | Re-extraction possible |
| user → conversations | 1:many | Per adviser |
| conversation → messages | 1:many | Chat history |
| household → iht_estimates | 1:many | Snapshots over time |
| firm → integrations | 1:many | Connected platforms |

---

## Indexes

```sql
-- === Lookup / Foreign Key ===
CREATE INDEX idx_users_firm ON users(firm_id);
CREATE INDEX idx_households_firm ON households(firm_id);
CREATE INDEX idx_households_adviser ON households(adviser_id);
CREATE INDEX idx_clients_household ON clients(household_id);
CREATE INDEX idx_clients_firm ON clients(firm_id);
CREATE INDEX idx_clients_name ON clients(last_name, first_name);

-- === Tax Data ===
CREATE INDEX idx_tax_profiles_client ON tax_profiles(client_id);
CREATE INDEX idx_tax_profiles_client_year ON tax_profiles(client_id, tax_year);
CREATE INDEX idx_income_sources_profile ON income_sources(tax_profile_id);
CREATE INDEX idx_income_sources_type ON income_sources(source_type);
CREATE INDEX idx_pension_contributions_profile ON pension_contributions(tax_profile_id);
CREATE INDEX idx_pension_aa_client_year ON pension_aa_tracking(client_id, tax_year);
CREATE INDEX idx_allowance_client_year ON allowance_usage(client_id, tax_year);
CREATE INDEX idx_allowance_type ON allowance_usage(client_id, tax_year, allowance_type);

-- === Investments ===
CREATE INDEX idx_holdings_client ON investment_holdings(client_id);
CREATE INDEX idx_holdings_wrapper ON investment_holdings(wrapper_type);

-- === Documents ===
CREATE INDEX idx_documents_client ON documents(client_id);
CREATE INDEX idx_documents_type ON documents(document_type);
CREATE INDEX idx_extractions_document ON document_extractions(document_id);

-- === Chat ===
CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_client ON conversations(client_id);
CREATE INDEX idx_conversations_last_msg ON conversations(last_message_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- === Observations / Scenarios ===
CREATE INDEX idx_observations_client ON observations(client_id);
CREATE INDEX idx_observations_severity ON observations(severity);
CREATE INDEX idx_observations_category ON observations(category);
CREATE INDEX idx_scenarios_client ON scenarios(client_id);
CREATE INDEX idx_scenarios_profile ON scenarios(tax_profile_id);

-- === Admin ===
CREATE INDEX idx_tax_rates_year ON tax_rates(tax_year);
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_created ON audit_log(created_at DESC);
```

---

## Row Level Security

Every table gets RLS enabled. The core policy pattern: users can only access data that belongs to their firm.

```sql
-- Example: clients visible to same-firm users
CREATE POLICY "Users see their firm's clients"
  ON clients FOR SELECT
  USING (firm_id = (SELECT firm_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Users can insert clients in their firm"
  ON clients FOR INSERT
  WITH CHECK (firm_id = (SELECT firm_id FROM users WHERE id = auth.uid()));
```

For child tables (tax_profiles, income_sources, etc.), the policy traces up through joins:

```sql
CREATE POLICY "Users see their firm's tax profiles"
  ON tax_profiles FOR SELECT
  USING (client_id IN (
    SELECT id FROM clients WHERE firm_id = (
      SELECT firm_id FROM users WHERE id = auth.uid()
    )
  ));
```

---

## Scalability & Future-Proofing Notes

### What This Schema Handles Today
- Full UK tax analysis for employed, self-employed, directors, and retired individuals
- Scottish vs rUK rate differences (via `region` on clients)
- PA taper zone detection and 60% trap modelling
- HICBC calculation and pension mitigation scenarios
- Pension AA with carry forward across 3+ years
- All "use it or lose it" allowance tracking with year-end countdown
- Bed & ISA opportunity detection from investment holdings
- IHT estate planning at household level
- Full chat history with AI-generated insights and dashboard snapshots
- Document upload, extraction, and confidence scoring
- Multi-adviser, multi-firm operation

### What This Schema Can Absorb Without Migration

| Future Change | How the Schema Handles It |
|--------------|--------------------------|
| **New tax year rates** | Insert rows into `tax_rates` — no schema change |
| **New allowance type** | Add a value to the `allowance_type` check constraint on `allowance_usage` |
| **New income source type** | Add a value to the `source_type` check constraint; type-specific details go in JSONB |
| **New scenario type** | Add a value to `scenario_type`; inputs/results live in JSONB |
| **New observation category** | Add a value to the `category` check constraint |
| **New document type** | Add a value to `document_type` |
| **New integration provider** | Just insert a new `provider` value |
| **Scottish rate changes** | Update `tax_rates` rows for Scotland |
| **Pension AA changes** | Insert new `pension_aa_tracking` rows with the new AA amount |
| **CGT rate changes** | Update the CGT entries in `tax_rates` |
| **HICBC threshold changes** | Update thresholds in `tax_rates` |
| **New NI classes or rates** | Update `tax_rates`; breakdown JSONB on tax_profiles accommodates any structure |
| **VAT tracking** | Add a `vat_records` table referencing clients — nothing existing changes |
| **Corporation Tax for directors** | Add a `company_tax_profiles` table referencing households — nothing existing changes |
| **Meeting notes / transcriptions** | Add a `meeting_notes` table referencing conversations/clients |
| **Multi-year comparison views** | Query `tax_profiles` across years — already structured for this |

### What Would Need a Migration

| Future Change | Migration Needed |
|--------------|-----------------|
| Adding a new entity (e.g., `meeting_notes`, `company_tax_profiles`) | New table + indexes + RLS |
| Adding a column to an existing table | `ALTER TABLE ADD COLUMN` |
| Changing a check constraint | `ALTER TABLE DROP/ADD CONSTRAINT` |
| Adding real-time subscriptions | Supabase Realtime on specific tables (config, not schema) |

---

## Mapping to Existing Pydantic Models

Your current models in `apps/api/app/models/` map to this schema as follows:

| Current Model | Schema Table(s) |
|--------------|-----------------|
| `ClientInfo` | `clients` + `households` |
| `IncomeSummary` | `income_sources` (aggregated per `tax_profile`) |
| `TaxCalculation` | `tax_profiles` (cached fields) |
| `AdjustedNetIncome` | `tax_profiles.adjusted_net_income` + `pension_contributions` |
| `AllowancesTracker` | `allowance_usage` (queried per client per year) |
| `AllowanceItem` | One row in `allowance_usage` |
| `Observation` | `observations` |
| `Scenario` | `scenarios` |
| `RelevantTaxData` | Composed at API level from: `clients` + `tax_profiles` + `income_sources` + `allowance_usage` + `observations` + `scenarios` |

The Pydantic models become **API response schemas** — they're how you serialize database rows for the frontend. The database tables are the source of truth; the models are the view layer.
