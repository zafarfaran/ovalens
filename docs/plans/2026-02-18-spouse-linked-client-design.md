# Spouse as Linked Client — Design Document

**Date:** 2026-02-18
**Status:** Approved

## Problem

The Client model stores spouse data as 6 flat text columns (`spouse_first_name`, `spouse_last_name`, etc.) directly on the primary client record. This is not relational — James Mitchell exists only as denormalized text on Sarah's row. The Household model already exists to group related clients, but it's unused (only Sarah is seeded).

## Decision

**Approach A: `spouse_id` FK on Client** — a nullable self-referencing foreign key on the `Client` table. Both Sarah and James become first-class `Client` records in the same `Household`, linked bidirectionally via `spouse_id`.

### Why not alternatives?

- **Join table (`ClientRelationship`):** Over-engineered for current needs. YAGNI — can be added later if child/dependent modeling is needed.
- **Household JSON metadata:** Not relational, not queryable, same anti-pattern as the flat fields.

## Data Model

### Client table changes

**Remove columns:**
- `spouse_first_name`
- `spouse_last_name`
- `spouse_date_of_birth`
- `spouse_ni_number`
- `spouse_employment_status`
- `spouse_annual_income`

**Add column:**
- `spouse_id: Mapped[str | None] = mapped_column(ForeignKey("clients.id"))` — nullable self-referencing FK

**Add relationship:**
- `spouse` relationship using `remote_side=[id]` for self-referential resolution

### Seed data

- Sarah (`client-sarah`) stays in `hh-mitchell`
- James (`client-james`) is created as a new `Client` in `hh-mitchell` with:
  - first_name="James", last_name="Mitchell"
  - date_of_birth="1980-07-22", ni_number="AB 98 76 54 D"
  - employment_status="self-employed"
  - Same address as Sarah (same household)
  - phone, marital_status="married"
- Bidirectional link: Sarah.spouse_id = "client-james", James.spouse_id = "client-sarah"

## API Changes

### GET /clients/{client_id}

Remove 6 flat `spouse_*` fields. Add:

```json
{
  "spouse": {
    "id": "client-james",
    "first_name": "James",
    "last_name": "Mitchell",
    "email": "...",
    "date_of_birth": "1980-07-22",
    "ni_number": "AB 98 76 54 D",
    "employment_status": "self-employed",
    "region": "england"
  },
  "household_members": [
    { "id": "client-james", "first_name": "James", "last_name": "Mitchell" }
  ]
}
```

`spouse` is `null` if no spouse linked. `household_members` lists all other clients in the same household.

### POST /clients (CreateClientRequest)

Remove 6 flat `spouse_*` fields. Add optional `spouse_id: str | None`.

### GET /clients

No changes — James appears as his own entry in the client list.

## Frontend Changes

### ClientDetail interface

Remove 6 `spouse_*` fields. Add:
- `spouse?: { id, first_name, last_name, email, date_of_birth, ni_number, employment_status, region } | null`
- `household_members?: { id, first_name, last_name }[]`

### Profile tab — Spouse card

Render from `detail.spouse` instead of flat fields. Include a "View profile" action that navigates to the spouse's full client profile via `setSelectedId(spouse.id)`.

### Sidebar

James appears naturally as a separate client row (he's a full Client record).

## Files Modified

1. `helio/apps/api/app/db/models.py` — Remove spouse_* cols, add spouse_id FK + relationship
2. `helio/apps/api/app/db/seed.py` — Add James as Client, set bidirectional spouse_id
3. `helio/apps/api/app/routers/clients.py` — Return spouse object + household_members, update CreateClientRequest
4. `helio/apps/api/helio.db` — Delete for schema recreation
5. `helio/apps/web/src/app/clients/page.tsx` — Update ClientDetail, Profile tab spouse card with navigation link
