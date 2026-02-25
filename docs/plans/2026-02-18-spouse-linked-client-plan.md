# Spouse as Linked Client — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace flat `spouse_*` text columns on Client with a proper `spouse_id` FK, making James Mitchell a first-class Client record in the same Household, linked bidirectionally to Sarah.

**Architecture:** Self-referencing nullable FK `spouse_id` on the `Client` table. Both Sarah and James are full `Client` rows in `hh-mitchell`. The API resolves the FK into a nested `spouse` object and returns a `household_members` array. The frontend Profile tab renders a linked spouse card with navigation.

**Tech Stack:** SQLAlchemy ORM (async, SQLite), FastAPI, Next.js / React / Framer Motion

**Note:** This project has no test infrastructure. Verification is done via `curl` against the API and `npx next build` for the frontend.

---

### Task 1: Update Client ORM model — remove flat spouse columns, add spouse_id FK

**Files:**
- Modify: `helio/apps/api/app/db/models.py:105-111` (remove spouse_* columns), `:124-130` (add relationship)

**Step 1: Remove the 6 flat spouse columns**

In `helio/apps/api/app/db/models.py`, delete lines 105-111 (the entire `# Spouse / partner` block):

```python
    # Spouse / partner
    spouse_first_name: Mapped[str | None] = mapped_column(String)
    spouse_last_name: Mapped[str | None] = mapped_column(String)
    spouse_date_of_birth: Mapped[str | None] = mapped_column(String)
    spouse_ni_number: Mapped[str | None] = mapped_column(String)
    spouse_employment_status: Mapped[str | None] = mapped_column(String)
    spouse_annual_income: Mapped[float | None] = mapped_column(Float)
```

**Step 2: Add `spouse_id` FK and relationship**

Replace the removed block with:

```python
    # Spouse / partner (self-referencing FK)
    spouse_id: Mapped[str | None] = mapped_column(ForeignKey("clients.id"))
```

Then in the relationships section (after line ~124), add:

```python
    spouse = relationship(
        "Client",
        foreign_keys=[spouse_id],
        remote_side="Client.id",
        uselist=False,
    )
```

**Important:** The `remote_side` must be passed as a string `"Client.id"` to avoid circular reference issues during class definition. `uselist=False` because it's a one-to-one link.

**Step 3: Verify the model file has no syntax errors**

Run: `cd helio/apps/api && python -c "from app.db.models import Client; print('OK')"`

Expected: `OK`

---

### Task 2: Update seed data — create James as a Client, set bidirectional spouse_id

**Files:**
- Modify: `helio/apps/api/app/db/seed.py:69-104`

**Step 1: Update Sarah's Client seed**

In `helio/apps/api/app/db/seed.py`, replace the entire `Client(...)` block for Sarah (lines 70-103). Remove the 6 `spouse_*` kwargs. Add `spouse_id="client-james"`.

The updated Sarah seed:

```python
    client = Client(
        id="client-sarah",
        household_id="hh-mitchell",
        user_id="demo-user",
        first_name="Sarah",
        last_name="Mitchell",
        email="sarah.mitchell@email.co.uk",
        region="england",
        employment_status="employed",
        date_of_birth="1982-03-15",
        ni_number="QQ 12 34 56 C",
        utr="1234567890",
        # Contact
        phone="+44 7700 900123",
        address_line_1="42 Elm Grove",
        address_line_2="Clapham",
        city="London",
        postcode="SW4 7QR",
        # Personal / family
        marital_status="married",
        number_of_children=2,
        claims_child_benefit=True,
        # Spouse link
        spouse_id="client-james",
        # Professional
        employer_name="Meridian Capital Partners",
        # Notes
        notes="Two children (ages 8 and 11). Sarah is a senior portfolio manager. James runs a freelance consultancy. They own two buy-to-let flats in South London.",
    )
    session.add(client)
```

**Step 2: Add James Mitchell as a new Client**

Immediately after `session.add(client)` (Sarah), add:

```python
    # ── Client — Spouse ─────────────────────────────────────────────────
    spouse = Client(
        id="client-james",
        household_id="hh-mitchell",
        user_id="demo-user",
        first_name="James",
        last_name="Mitchell",
        email="james.mitchell@email.co.uk",
        region="england",
        employment_status="self-employed",
        date_of_birth="1980-07-22",
        ni_number="AB 98 76 54 D",
        # Contact (same household address)
        phone="+44 7700 900456",
        address_line_1="42 Elm Grove",
        address_line_2="Clapham",
        city="London",
        postcode="SW4 7QR",
        # Personal / family
        marital_status="married",
        number_of_children=2,
        claims_child_benefit=False,
        # Spouse link (bidirectional)
        spouse_id="client-sarah",
        # Professional
        company_name="Mitchell Consulting Ltd",
        # Notes
        notes="Self-employed IT consultant. Annual income ~£45,000. Unused pension allowance available for carry-forward planning.",
    )
    session.add(spouse)
```

**Step 3: Verify seed file syntax**

Run: `cd helio/apps/api && python -c "from app.db.seed import seed_if_empty; print('OK')"`

Expected: `OK`

---

### Task 3: Update API — return spouse object + household_members, update CreateClientRequest

**Files:**
- Modify: `helio/apps/api/app/routers/clients.py:21-52` (CreateClientRequest), `:132-270` (get_client), `:292-321` (create_client)

**Step 1: Update CreateClientRequest**

In `helio/apps/api/app/routers/clients.py`, replace lines 40-46 (the `# Spouse` block in CreateClientRequest):

```python
    # Spouse
    spouse_first_name: str | None = None
    spouse_last_name: str | None = None
    spouse_date_of_birth: str | None = None
    spouse_ni_number: str | None = None
    spouse_employment_status: str | None = None
    spouse_annual_income: float | None = None
```

With:

```python
    # Spouse
    spouse_id: str | None = None
```

**Step 2: Update get_client endpoint**

In the `get_client` function, after loading the client (line ~135) and before loading the tax profile, add a query to eagerly load the spouse and household members:

```python
    # Load spouse (if linked)
    spouse_out = None
    if client.spouse_id:
        sp_result = await session.execute(
            select(Client).where(Client.id == client.spouse_id)
        )
        sp = sp_result.scalar_one_or_none()
        if sp:
            spouse_out = {
                "id": sp.id,
                "first_name": sp.first_name,
                "last_name": sp.last_name,
                "email": sp.email,
                "date_of_birth": sp.date_of_birth,
                "ni_number": sp.ni_number,
                "employment_status": sp.employment_status,
                "region": sp.region,
            }

    # Load household members (other clients in the same household)
    hh_result = await session.execute(
        select(Client)
        .where(Client.household_id == client.household_id)
        .where(Client.id != client.id)
    )
    household_members_out = [
        {"id": m.id, "first_name": m.first_name, "last_name": m.last_name}
        for m in hh_result.scalars().all()
    ]
```

Then in the return dict (lines 234-270), replace the `# Spouse` block:

```python
        # Spouse
        "spouse_first_name": client.spouse_first_name,
        "spouse_last_name": client.spouse_last_name,
        "spouse_date_of_birth": client.spouse_date_of_birth,
        "spouse_ni_number": client.spouse_ni_number,
        "spouse_employment_status": client.spouse_employment_status,
        "spouse_annual_income": client.spouse_annual_income,
```

With:

```python
        # Spouse (resolved from FK)
        "spouse": spouse_out,
        "household_members": household_members_out,
```

**Step 3: Update create_client endpoint**

In the `create_client` function (lines 292-321), replace the 6 `spouse_*` kwargs:

```python
        spouse_first_name=body.spouse_first_name,
        spouse_last_name=body.spouse_last_name,
        spouse_date_of_birth=body.spouse_date_of_birth,
        spouse_ni_number=body.spouse_ni_number,
        spouse_employment_status=body.spouse_employment_status,
        spouse_annual_income=body.spouse_annual_income,
```

With:

```python
        spouse_id=body.spouse_id,
```

**Step 4: Verify router file syntax**

Run: `cd helio/apps/api && python -c "from app.routers.clients import router; print('OK')"`

Expected: `OK`

---

### Task 4: Delete SQLite DB for schema recreation

**Files:**
- Delete: `helio/apps/api/helio.db`

**Step 1: Delete the database**

```bash
rm -f helio/apps/api/helio.db
```

**Step 2: Verify it's gone**

```bash
ls helio/apps/api/helio.db 2>&1
```

Expected: `No such file or directory`

---

### Task 5: Update frontend — ClientDetail interface + Profile tab spouse card

**Files:**
- Modify: `helio/apps/web/src/app/clients/page.tsx:136-172` (ClientDetail interface), `:968-978` (spouse card in Profile tab)

**Step 1: Update ClientDetail interface**

In `helio/apps/web/src/app/clients/page.tsx`, replace lines 156-162 (the `// Spouse` block):

```typescript
  // Spouse
  spouse_first_name?: string;
  spouse_last_name?: string;
  spouse_date_of_birth?: string;
  spouse_ni_number?: string;
  spouse_employment_status?: string;
  spouse_annual_income?: number;
```

With:

```typescript
  // Spouse (resolved object from API)
  spouse?: {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    date_of_birth?: string;
    ni_number?: string;
    employment_status?: string;
    region?: string;
  } | null;
  // Household
  household_members?: { id: string; first_name: string; last_name: string }[];
```

**Step 2: Replace the Spouse card in the Profile tab**

In the Profile tab section (~lines 968-978), replace:

```tsx
{detail.spouse_first_name && (
  <Card title="Spouse / Partner" icon={IconUser}>
    <KV label="Name" value={`${detail.spouse_first_name} ${detail.spouse_last_name || ""}`} />
    <KV label="Date of Birth" value={detail.spouse_date_of_birth ? new Date(detail.spouse_date_of_birth).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : undefined} />
    <KV label="NI Number" value={detail.spouse_ni_number} mono />
    <KV label="Employment" value={detail.spouse_employment_status ? detail.spouse_employment_status.charAt(0).toUpperCase() + detail.spouse_employment_status.slice(1) : undefined} />
    <KV label="Annual Income" value={detail.spouse_annual_income != null ? fmt(detail.spouse_annual_income) : undefined} mono />
  </Card>
)}
```

With:

```tsx
{detail.spouse && (
  <Card title="Spouse / Partner" icon={IconUser}>
    <KV label="Name" value={`${detail.spouse.first_name} ${detail.spouse.last_name}`} />
    <KV label="Date of Birth" value={detail.spouse.date_of_birth ? new Date(detail.spouse.date_of_birth).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : undefined} />
    <KV label="NI Number" value={detail.spouse.ni_number} mono />
    <KV label="Employment" value={detail.spouse.employment_status ? detail.spouse.employment_status.charAt(0).toUpperCase() + detail.spouse.employment_status.slice(1) : undefined} />
    <KV label="Region" value={detail.spouse.region ? detail.spouse.region.charAt(0).toUpperCase() + detail.spouse.region.slice(1) : undefined} />
    <div className="mt-3 pt-3 border-t border-[var(--border-subtle)]">
      <button
        onClick={() => setSelectedId(detail.spouse!.id)}
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
      >
        View full profile <IconArrowRight className="w-3 h-3" />
      </button>
    </div>
  </Card>
)}
```

**Step 3: Verify build**

Run: `cd helio/apps/web && npx next build 2>&1 | tail -15`

Expected: `✓ Compiled successfully` and no type errors

---

### Task 6: Commit

**Step 1: Stage all changes**

```bash
git add helio/apps/api/app/db/models.py helio/apps/api/app/db/seed.py helio/apps/api/app/routers/clients.py helio/apps/web/src/app/clients/page.tsx docs/plans/2026-02-18-spouse-linked-client-design.md docs/plans/2026-02-18-spouse-linked-client-plan.md
```

**Step 2: Commit**

```bash
git commit -m "refactor: model spouse as linked Client via spouse_id FK

Replace flat spouse_* text columns on Client with a self-referencing
spouse_id FK. James Mitchell is now a first-class Client record in the
Mitchell Household, linked bidirectionally to Sarah. API returns a
resolved spouse object and household_members array. Profile tab shows
a linked spouse card with navigation to the spouse's full profile."
```

---

## Verification Checklist

After all tasks are complete:

1. `rm -f helio/apps/api/helio.db` (if not already deleted)
2. Start API server — confirm it seeds with both Sarah and James
3. `curl http://localhost:8000/api/clients` — verify James appears as separate client
4. `curl http://localhost:8000/api/clients/client-sarah` — verify `spouse` object with `id: "client-james"` and `household_members` array
5. `curl http://localhost:8000/api/clients/client-james` — verify `spouse` object with `id: "client-sarah"` (bidirectional)
6. `npx next build` — verify no build errors
7. Open client profile page — verify Profile tab shows linked spouse card with "View full profile" button
8. Click "View full profile" on Sarah's spouse card — verify navigation to James's profile
9. Verify James's profile shows Sarah as spouse with link back
