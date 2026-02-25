# Manual Tax Data Input Design

## Overview

Allow advisers to manually enter client income data and tax-relevant parameters on the client detail page. On submit, the tax engine computes a full tax position and the dashboard updates immediately.

## Where It Lives

On the `/clients` detail page:
- **No tax profile:** The existing empty state is replaced with an inline TaxDataForm
- **Has tax profile:** An "Edit tax data" button in the header opens the form, replacing the dashboard temporarily

## API Endpoint

`POST /api/clients/{client_id}/tax-profile`

**Request body:**
```json
{
  "income_sources": [
    { "type": "employment", "gross_amount": 85000, "label": "Employment" }
  ],
  "pension_contributions": 10000,
  "gift_aid": 0,
  "claims_child_benefit": false,
  "number_of_children": 0
}
```

**Behavior:**
1. Validates inputs
2. Calls `compute_full_tax_position()` with inputs + client's region
3. Upserts TaxProfile record (client_id + tax_year unique constraint)
4. Generates and saves Observation records
5. Returns full client detail (same shape as GET /clients/{client_id})

## Frontend Component

`TaxDataForm` — inline form on client detail page.

### Form Sections

1. **Income Sources** — dynamic list, add/remove rows
   - Type: dropdown (employment, self_employment, rental, pension_income, savings, dividends, other)
   - Gross Amount: number input
   - Label: optional text (auto-generates from type if empty)

2. **Pension** — personal contributions amount (number, default 0)

3. **Gift Aid** — donations amount (number, default 0)

4. **Child Benefit** — toggle + number of children (shown when toggle on)

### Behavior
- Region pulled from client record automatically
- Submit button: "Calculate Tax Position"
- Loading state during computation
- On success: parent re-fetches client detail, form replaced by dashboard
- On error: error banner

## Visual Design
- Matches existing Helio card pattern
- Same input styling as AddClientPanel
- Income source rows: grid with type dropdown + amount + remove button
- "Add income source" button below the list
