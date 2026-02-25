# Helio Prototype Schema

> Minimal database schema for the MVP (Phases 1-2). Eight tables instead of twenty-one. Everything that becomes its own table later lives as JSONB now — same data, fewer joins, faster to build. When you're ready to scale, you extract the JSONB into normalized tables without rewriting anything.

---

## Philosophy: JSONB as Expansion Joints

The production schema has 21 tables. This prototype has 8. The difference isn't missing data — it's where the data lives.

| Production (later) | Prototype (now) | Migration path |
|--------------------|-----------------|----------------|
| `firms` table | Skip — single-tenant | Add table, backfill `firm_id` on users/clients |
| `income_sources` table | `tax_profiles.income_sources` JSONB | Extract JSONB rows → new table |
| `pension_contributions` table | `tax_profiles.pension_data` JSONB | Extract JSONB rows → new table |
| `pension_aa_tracking` table | `tax_profiles.pension_data` JSONB | Extract JSONB rows → new table |
| `allowance_usage` table | `tax_profiles.allowances` JSONB | Extract JSONB rows → new table |
| `hicbc_records` table | `tax_profiles.hicbc` JSONB | Extract JSONB rows → new table |
| `investment_holdings` table | Skip until Phase 2 (extension) | Add table when extension ships |
| `document_extractions` table | `documents.extracted_data` JSONB | Extract JSONB → new table |
| `iht_estimates` table | Skip until Phase 4 | Add table when IHT ships |
| `integrations` table | Skip until Phase 4 | Add table when integrations ship |
| `tax_rates` table | Use `constants.py` / shared constants | Add table, seed from constants |
| `audit_log` table | Skip — add for production | Add table + triggers |
| `scenarios` table | `tax_profiles.scenarios` JSONB | Extract JSONB → new table |

**The point:** Your Pydantic models and API responses look exactly the same whether the data comes from a JSONB column or a normalized table. The frontend never knows the difference. You build once, then normalize behind the scenes when you need query performance or relational integrity on that data.

---

## Prototype ERD

```
                 ┌──────────┐
                 │  users   │
                 │(advisers)│
                 └────┬─────┘
                      │ 1
          ┌───────────┼───────────┐
          │           │           │
          ▼ *         ▼ *         ▼ *
   ┌────────────┐ ┌──────────┐ ┌───────────────┐
   │ households │ │ conver-  │ │  (future:     │
   │            │ │ sations  │ │   firms,      │
   └─────┬──────┘ └────┬─────┘ │   integrations│
         │ 1            │ 1     │   etc.)       │
         │              │       └───────────────┘
         ▼ *            ▼ *
   ┌──────────┐  ┌──────────┐
   │ clients  │  │ messages │
   └────┬─────┘  └──────────┘
        │ 1
        ├─────────────┬───────────────┐
        │             │               │
        ▼ *           ▼ *             ▼ *
  ┌────────────┐ ┌──────────┐  ┌──────────────┐
  │tax_profiles│ │documents │  │ observations │
  │            │ │          │  │              │
  │ (JSONB:   │ │ (JSONB:  │  └──────────────┘
  │  income,  │ │  extract │
  │  pension, │ │  data)   │
  │  allow.,  │ └──────────┘
  │  hicbc,   │
  │  scenarios│
  │  )        │
  └───────────┘
```

**8 tables. That's it.**

---

## Table Definitions

### 1. `users`

Single-tenant for now. No `firm_id` — add it when multi-firm ships in Phase 4.

```sql
CREATE TABLE users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL UNIQUE,
  full_name   TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT 'adviser'
              CHECK (role IN ('owner', 'admin', 'adviser', 'viewer')),
  preferences JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Production upgrade: ADD COLUMN firm_id UUID REFERENCES firms(id)
```

**`preferences` JSONB shape:**
```json
{
  "theme": "dark",
  "default_tax_year": "2025/26",
  "notifications": { "year_end_reminders": true, "observation_alerts": true }
}
```

---

### 2. `households`

Thin wrapper — just groups clients together. Keeps the FK in place so you never have to backfill it.

```sql
CREATE TABLE households (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Production upgrade: ADD COLUMN firm_id, ADD COLUMN adviser_id, ADD COLUMN metadata JSONB
```

**Why keep this in the prototype?** Your research doc shows planning for "James & Sarah Mitchell" as a unit. IHT is joint. Spousal transfers are joint. Child benefit is cross-checked between spouses. Without households you'd have to retrofit every client query later. It's one small table now that saves a painful migration later.

---

### 3. `clients`

The core entity. Every field that drives a tax calculation is a real column (not buried in JSONB).

```sql
CREATE TABLE clients (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id       UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name         TEXT NOT NULL,
  last_name          TEXT NOT NULL,
  email              TEXT,
  date_of_birth      DATE,
  ni_number          TEXT,
  utr                TEXT,
  region             TEXT NOT NULL DEFAULT 'england'
                     CHECK (region IN ('england', 'wales', 'northern_ireland', 'scotland')),
  employment_status  TEXT DEFAULT 'employed'
                     CHECK (employment_status IN (
                       'employed', 'self_employed', 'director', 'retired', 'multiple'
                     )),
  metadata           JSONB DEFAULT '{}',
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_clients_household ON clients(household_id);
CREATE INDEX idx_clients_user ON clients(user_id);
CREATE INDEX idx_clients_name ON clients(last_name, first_name);

-- Production upgrade: ADD COLUMN firm_id (denormalized), ADD COLUMN relationship_to_head
```

**`user_id` replaces `firm_id` for now.** In single-tenant mode, RLS filters by user. When firms ship, you add `firm_id` and update the policies.

---

### 4. `tax_profiles` — The Big One

This is where the prototype packs the most data. Income sources, pension details, allowances, HICBC, and scenarios all live as JSONB here instead of in separate tables. The cached summary fields (`total_income`, `effective_rate`, etc.) are real columns for fast reads.

```sql
CREATE TABLE tax_profiles (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id             UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tax_year              TEXT NOT NULL,

  -- === Cached summary (real columns for fast reads / context ribbon) ===
  total_income          DECIMAL(12,2) DEFAULT 0,
  adjusted_net_income   DECIMAL(12,2) DEFAULT 0,
  taxable_income        DECIMAL(12,2) DEFAULT 0,
  income_tax            DECIMAL(12,2) DEFAULT 0,
  national_insurance    DECIMAL(12,2) DEFAULT 0,
  dividend_tax          DECIMAL(12,2) DEFAULT 0,
  total_tax             DECIMAL(12,2) DEFAULT 0,
  effective_rate        DECIMAL(5,2) DEFAULT 0,
  marginal_rate         DECIMAL(5,2) DEFAULT 0,
  personal_allowance    DECIMAL(12,2) DEFAULT 12570,
  pa_status             TEXT DEFAULT 'full'
                        CHECK (pa_status IN ('full', 'tapered', 'lost')),

  -- === Flags (drive dashboard alerts) ===
  in_pa_taper_zone      BOOLEAN DEFAULT false,
  hicbc_applies         BOOLEAN DEFAULT false,
  pension_taper_applies BOOLEAN DEFAULT false,

  -- === Detailed breakdowns (JSONB — flexible structure) ===
  tax_breakdown         JSONB DEFAULT '[]',
  ni_breakdown          JSONB DEFAULT '{}',

  -- === JSONB expansion joints (become separate tables later) ===
  income_sources        JSONB DEFAULT '[]',
  pension_data          JSONB DEFAULT '{}',
  allowances            JSONB DEFAULT '[]',
  hicbc                 JSONB DEFAULT '{}',
  scenarios             JSONB DEFAULT '[]',

  -- === Meta ===
  status                TEXT DEFAULT 'draft'
                        CHECK (status IN ('draft', 'in_progress', 'reviewed', 'finalised')),
  data_confidence       TEXT DEFAULT 'low'
                        CHECK (data_confidence IN ('low', 'medium', 'high')),
  confidence_notes      TEXT[],
  source_notes          TEXT[],

  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now(),

  UNIQUE(client_id, tax_year)
);

CREATE INDEX idx_tax_profiles_client ON tax_profiles(client_id);
CREATE INDEX idx_tax_profiles_year ON tax_profiles(client_id, tax_year);
```

#### JSONB Shapes

**`income_sources`** — array of income items:
```json
[
  {
    "id": "uuid",
    "source_type": "employment",
    "label": "ACME Corp",
    "gross_amount": 141500,
    "tax_deducted": 45000,
    "ni_deducted": 4841,
    "expenses": 0,
    "details": {
      "employer_name": "ACME Corp",
      "paye_ref": "123/A456",
      "salary_sacrifice_available": true
    }
  },
  {
    "id": "uuid",
    "source_type": "rental",
    "label": "42 High Street",
    "gross_amount": 12000,
    "tax_deducted": 0,
    "ni_deducted": 0,
    "expenses": 4700,
    "details": {
      "property_address": "42 High Street, London",
      "mortgage_interest": 2400
    }
  }
]
```

**`pension_data`** — contributions + carry forward:
```json
{
  "contributions": [
    {
      "scheme_name": "Workplace DC — Aviva",
      "scheme_type": "workplace_dc",
      "employee": 8000,
      "employer": 12000,
      "personal": 0,
      "is_salary_sacrifice": false
    }
  ],
  "annual_allowance": 60000,
  "total_contributions": 20000,
  "aa_remaining": 40000,
  "carry_forward": {
    "2022/23": { "available": 40000, "used": 15000, "remaining": 25000 },
    "2023/24": { "available": 60000, "used": 25000, "remaining": 35000 },
    "2024/25": { "available": 60000, "used": 20000, "remaining": 40000 }
  },
  "total_carry_forward": 100000,
  "is_tapered": false,
  "mpaa_triggered": false
}
```

**`allowances`** — array matching the dashboard tracker:
```json
[
  {
    "type": "isa",
    "label": "ISA Allowance",
    "annual_limit": 20000,
    "used": 12000,
    "remaining": 8000,
    "can_carry_forward": false
  },
  {
    "type": "pension_aa",
    "label": "Pension Annual Allowance",
    "annual_limit": 60000,
    "used": 20000,
    "remaining": 40000,
    "can_carry_forward": true
  },
  {
    "type": "cgt_aea",
    "label": "CGT Annual Exempt",
    "annual_limit": 3000,
    "used": 0,
    "remaining": 3000,
    "can_carry_forward": false
  }
]
```

**`hicbc`** — child benefit clawback:
```json
{
  "number_of_children": 2,
  "claims_child_benefit": true,
  "child_benefit_amount": 2212.60,
  "higher_earner_ani": 147425,
  "clawback_percentage": 100,
  "hicbc_charge": 2212.60,
  "net_benefit": 0
}
```

**`scenarios`** — what-if modelling:
```json
[
  {
    "id": "uuid",
    "name": "£50K Salary Sacrifice",
    "scenario_type": "salary_sacrifice",
    "inputs": {
      "sacrifice_amount": 50000,
      "employer_ni_shared": true
    },
    "results": {
      "new_ani": 97425,
      "new_pa": 12570,
      "new_income_tax": 35279,
      "ni_saving": 1000,
      "hicbc_avoided": 2212.60,
      "total_saving": 24024.60,
      "effective_relief": "48%"
    },
    "baseline_total_tax": 63144.60,
    "projected_total_tax": 39120,
    "total_saving": 24024.60,
    "is_recommended": true,
    "created_at": "2026-02-17T10:30:00Z"
  }
]
```

**`tax_breakdown`** — band-by-band detail:
```json
[
  { "band": "Basic Rate", "amount": 37700, "rate": 0.20, "tax": 7540 },
  { "band": "Higher Rate", "amount": 87440, "rate": 0.40, "tax": 34976 },
  { "band": "Additional Rate", "amount": 22285, "rate": 0.45, "tax": 10028 }
]
```

**`ni_breakdown`**:
```json
{
  "class1": {
    "earnings_in_main_band": 37700,
    "main_rate": 0.08,
    "main_ni": 3016,
    "earnings_above_uel": 91230,
    "additional_rate": 0.02,
    "additional_ni": 1825,
    "total_employee_ni": 4841,
    "employer_ni": 18254
  }
}
```

---

### 5. `documents`

Upload support with extraction data inline (no separate extraction table yet).

```sql
CREATE TABLE documents (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id          UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  uploaded_by        UUID NOT NULL REFERENCES users(id),
  document_type      TEXT NOT NULL
                     CHECK (document_type IN (
                       'sa100', 'sa102', 'sa103', 'sa105', 'sa106', 'sa108',
                       'p60', 'p45', 'p11d', 'platform_statement',
                       'pension_statement', 'payslip', 'tax_computation', 'other'
                     )),
  tax_year           TEXT,
  file_name          TEXT NOT NULL,
  file_path          TEXT NOT NULL,
  file_size          INTEGER,
  mime_type          TEXT,

  -- Extraction (inline for prototype — becomes separate table later)
  extraction_status  TEXT DEFAULT 'pending'
                     CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed')),
  extracted_data     JSONB DEFAULT '{}',
  extraction_confidence DECIMAL(3,2) DEFAULT 0,
  flagged_fields     TEXT[],

  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_documents_client ON documents(client_id);

-- Production upgrade: Extract extracted_data/confidence/flags → document_extractions table
```

---

### 6. `conversations`

Chat threads. Cached fields for the sidebar.

```sql
CREATE TABLE conversations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id            UUID REFERENCES clients(id) ON DELETE SET NULL,
  title                TEXT,
  status               TEXT DEFAULT 'active'
                       CHECK (status IN ('active', 'archived', 'deleted')),
  last_message_preview TEXT,
  last_message_at      TIMESTAMPTZ,
  message_count        INTEGER DEFAULT 0,
  unread               BOOLEAN DEFAULT false,
  tags                 TEXT[],
  tax_plan_mode        BOOLEAN DEFAULT false,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_client ON conversations(client_id);
CREATE INDEX idx_conversations_last_msg ON conversations(last_message_at DESC);

-- Production upgrade: ADD COLUMN household_id, ADD COLUMN metadata JSONB
```

---

### 7. `messages`

Individual chat messages with structured AI data.

```sql
CREATE TABLE messages (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role             TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content          TEXT NOT NULL,
  insights         JSONB DEFAULT '[]',
  tool_calls       JSONB DEFAULT '[]',
  dashboard_data   JSONB,
  attachments      JSONB DEFAULT '[]',
  model            TEXT,
  input_tokens     INTEGER,
  output_tokens    INTEGER,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);
```

---

### 8. `observations`

AI-generated insights and alerts — the intelligence panel.

```sql
CREATE TABLE observations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id        UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  tax_year         TEXT,
  title            TEXT NOT NULL,
  description      TEXT NOT NULL,
  severity         TEXT NOT NULL
                   CHECK (severity IN ('info', 'warning', 'opportunity', 'critical')),
  priority         TEXT NOT NULL
                   CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category         TEXT NOT NULL,
  potential_saving DECIMAL(12,2),
  deadline         DATE,
  action_required  TEXT,
  is_dismissed     BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_observations_client ON observations(client_id);
CREATE INDEX idx_observations_severity ON observations(severity);

-- Production upgrade: ADD COLUMN tax_profile_id FK, ADD COLUMN generated_by_message_id FK,
--   ADD COLUMN complexity, ADD COLUMN dismissed_by/dismissed_at
```

---

## Row Level Security (Prototype)

Single-tenant = filter by `auth.uid()`. Simple policies.

```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE households ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE tax_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE observations ENABLE ROW LEVEL SECURITY;

-- Users see only themselves
CREATE POLICY "users_own" ON users
  FOR ALL USING (id = auth.uid());

-- Households belong to the user
CREATE POLICY "households_own" ON households
  FOR ALL USING (user_id = auth.uid());

-- Clients belong to the user
CREATE POLICY "clients_own" ON clients
  FOR ALL USING (user_id = auth.uid());

-- Tax profiles via client ownership
CREATE POLICY "tax_profiles_own" ON tax_profiles
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- Documents via client ownership
CREATE POLICY "documents_own" ON documents
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));

-- Conversations belong to the user
CREATE POLICY "conversations_own" ON conversations
  FOR ALL USING (user_id = auth.uid());

-- Messages via conversation ownership
CREATE POLICY "messages_own" ON messages
  FOR ALL USING (conversation_id IN (SELECT id FROM conversations WHERE user_id = auth.uid()));

-- Observations via client ownership
CREATE POLICY "observations_own" ON observations
  FOR ALL USING (client_id IN (SELECT id FROM clients WHERE user_id = auth.uid()));
```

---

## Updated `at` Trigger

One function, applied to all tables with `updated_at`:

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON households
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON tax_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON observations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## Conversation Cache Trigger

Keep `conversations` sidebar fields in sync when messages are inserted:

```sql
CREATE OR REPLACE FUNCTION update_conversation_cache()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations SET
    last_message_preview = LEFT(NEW.content, 120),
    last_message_at = NEW.created_at,
    message_count = message_count + 1,
    updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cache_conversation_on_message
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION update_conversation_cache();
```

---

## Mapping to Existing Pydantic Models

Your current models work exactly as-is — they become the serialization layer over this schema.

| Pydantic Model | Reads From |
|---------------|------------|
| `ClientInfo` | `clients` row |
| `IncomeSummary` | `tax_profiles.income_sources` JSONB |
| `TaxCalculation` | `tax_profiles` cached columns + `tax_breakdown` JSONB |
| `AdjustedNetIncome` | `tax_profiles` columns + `pension_data` JSONB |
| `AllowancesTracker` | `tax_profiles.allowances` JSONB |
| `Observation` | `observations` row |
| `Scenario` | `tax_profiles.scenarios` JSONB |
| `RelevantTaxData` | Composed from all the above |

No model changes needed. The API assembles `RelevantTaxData` from one `tax_profiles` row + one `observations` query. Two queries for the whole dashboard.

---

## Prototype → Production Migration Path

When you're ready to promote a JSONB column to its own table, the pattern is always:

```sql
-- 1. Create the new table
CREATE TABLE income_sources ( ... );

-- 2. Migrate data
INSERT INTO income_sources (tax_profile_id, source_type, gross_amount, ...)
SELECT
  tp.id,
  src->>'source_type',
  (src->>'gross_amount')::decimal,
  ...
FROM tax_profiles tp,
     jsonb_array_elements(tp.income_sources) AS src;

-- 3. Update application code to read from the new table
-- 4. Drop the JSONB column when confident
ALTER TABLE tax_profiles DROP COLUMN income_sources;
```

### Phase-by-phase promotion plan

| Phase | What gets promoted | Why now |
|-------|-------------------|---------|
| **Phase 3** (Intelligence) | `income_sources` → own table | Need relational queries for tax engine (sum by type, join to documents) |
| **Phase 3** | `pension_data` → `pension_contributions` + `pension_aa_tracking` | Carry forward needs cross-year queries |
| **Phase 3** | `scenarios` → own table | Multiple scenario comparison needs sorting, filtering |
| **Phase 3** | `allowances` → `allowance_usage` | Year-end tracker needs per-allowance queries |
| **Phase 4** | `hicbc` → `hicbc_records` | Cross-spouse HICBC comparison |
| **Phase 4** | Add `investment_holdings` | Extension sends holdings data |
| **Phase 4** | Add `iht_estimates` | IHT estimator feature |
| **Phase 4** | Add `firms`, `integrations` | Multi-firm + platform connections |
| **Phase 4** | Add `audit_log` | FCA compliance readiness |
| **Phase 4** | Add `tax_rates` | Stop relying on hardcoded constants |
| **Phase 4** | `extracted_data` → `document_extractions` | Need review workflow, re-extraction |

---

## What This Gives You for Phase 1

With these 8 tables you can build everything in the Phase 1 scope:

| Phase 1 Feature | Supported By |
|-----------------|-------------|
| Chat interface | `conversations` + `messages` |
| Document upload | `documents` |
| Tax data extraction | `documents.extracted_data` JSONB |
| Dashboard with tax summary | `tax_profiles` cached columns |
| Allowance tracker | `tax_profiles.allowances` JSONB |
| Critical alerts (PA taper, HICBC) | `observations` + `tax_profiles` flags |
| Single "what if" scenario | `tax_profiles.scenarios` JSONB |
| Client save/load | `clients` + `households` |

Two queries power the entire dashboard: one `tax_profiles` read, one `observations` list. Chat is two more: `conversations` list, `messages` for the active thread. The frontend doesn't care that income sources are JSONB instead of a joined table — the API response shape is identical either way.
