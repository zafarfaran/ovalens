# Add Client Slide-Out Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a slide-out panel on the /clients page that lets advisers manually create new clients via a form.

**Architecture:** New `AddClientPanel` component with Framer Motion slide-in animation, Zod form validation, and a new `POST /api/clients` FastAPI endpoint. The panel is triggered by a "+" button in the sidebar and submits to the backend, which creates both a household and client record.

**Tech Stack:** Next.js 14, React 18, Framer Motion, Zod, Tailwind CSS, FastAPI, SQLAlchemy

---

### Task 1: Add POST /api/clients endpoint

**Files:**
- Modify: `helio/apps/api/app/routers/clients.py`

**Step 1: Add the Pydantic request model and endpoint**

Add these imports at the top of `clients.py`:

```python
from pydantic import BaseModel, EmailStr, field_validator
from app.db.models import Client, Household, Observation, TaxProfile
```

Note: `Household` is the new import. `Client`, `Observation`, `TaxProfile` are already imported via `select`.

Add the request model after the imports:

```python
class CreateClientRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    date_of_birth: str
    ni_number: str
    utr: str
    region: str = "england"
    employment_status: str = "employed"
    notes: str | None = None
```

Add the endpoint after the existing `get_client` function:

```python
@router.post("/clients", status_code=201)
async def create_client(
    body: CreateClientRequest,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """Create a new client with an auto-generated household."""
    user_id = "demo-user"

    logger.info("Creating client", first_name=body.first_name, last_name=body.last_name)

    # Create a household for this client
    household = Household(
        user_id=user_id,
        name=f"{body.last_name} Household",
    )
    session.add(household)
    await session.flush()  # Get the household ID

    # Create the client
    client = Client(
        household_id=household.id,
        user_id=user_id,
        first_name=body.first_name,
        last_name=body.last_name,
        email=body.email,
        date_of_birth=body.date_of_birth,
        ni_number=body.ni_number,
        utr=body.utr,
        region=body.region,
        employment_status=body.employment_status,
        metadata_={"notes": body.notes} if body.notes else {},
    )
    session.add(client)
    await session.flush()

    logger.info("Client created", client_id=client.id)

    return {
        "id": client.id,
        "first_name": client.first_name,
        "last_name": client.last_name,
        "email": client.email,
        "date_of_birth": client.date_of_birth,
        "ni_number": client.ni_number,
        "utr": client.utr,
        "region": client.region,
        "employment_status": client.employment_status,
    }
```

**Step 2: Verify the endpoint works**

Run: `cd helio/apps/api && python -m uvicorn app.main:app --reload --port 8000`

Test with curl:
```bash
curl -X POST http://localhost:8000/api/clients \
  -H "Content-Type: application/json" \
  -d '{"first_name":"John","last_name":"Smith","email":"john@test.com","date_of_birth":"1990-01-15","ni_number":"AB123456C","utr":"1234567890","region":"england","employment_status":"employed"}'
```

Expected: 201 response with the created client JSON.

**Step 3: Commit**

```bash
git add helio/apps/api/app/routers/clients.py
git commit -m "feat(api): add POST /api/clients endpoint for manual client creation"
```

---

### Task 2: Create the AddClientPanel component

**Files:**
- Create: `helio/apps/web/src/components/add-client-panel.tsx`

**Step 1: Create the component file**

Use the frontend-design skill to create this component. The component should:

- Accept props: `isOpen: boolean`, `onClose: () => void`, `onClientAdded: (client: { id: string; first_name: string; last_name: string; email: string; region?: string; employment_status?: string }) => void`
- Use Framer Motion `AnimatePresence` + `motion.div` for slide-from-right animation (translateX: 100% → 0)
- Semi-transparent backdrop that closes on click
- Form with sections: Personal Details, Tax Identifiers, Profile, Notes
- Zod validation schema:
  - `first_name`: min 1 char
  - `last_name`: min 1 char
  - `email`: valid email format
  - `date_of_birth`: non-empty string
  - `ni_number`: regex `/^[A-Za-z]{2}\d{6}[A-Za-z]$/`
  - `utr`: regex `/^\d{10}$/`
  - `region`: one of england, wales, scotland, northern_ireland
  - `employment_status`: non-empty string
  - `notes`: optional string
- Inline error messages below each field on blur/submit
- Submit calls `POST ${API_BASE}/api/clients`, then `onClientAdded` with the response
- Loading state on submit button
- Error banner at top of form on API error

**Visual design specs** (match existing Helio patterns):
- Panel width: `w-[480px]`
- Background: `bg-[var(--background)]`
- Border: `border-l border-[var(--border)]`
- Input styling: same as sidebar search input (`text-[12px] bg-[var(--surface)] border border-[var(--border-subtle)] rounded-lg ...`)
- Section headers: `text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]`
- Submit button: `bg-[var(--accent)] text-white rounded-lg text-[13px] font-medium`
- Cancel button: ghost style with `text-[var(--muted)]`
- Use existing icons from `@/components/icons`: `IconUser`, `IconShield`, `IconFileText`
- Animation: `ease: [0.16, 1, 0.3, 1]` matching existing pattern

**Step 2: Commit**

```bash
git add helio/apps/web/src/components/add-client-panel.tsx
git commit -m "feat(web): add AddClientPanel slide-out form component"
```

---

### Task 3: Integrate AddClientPanel into the clients page

**Files:**
- Modify: `helio/apps/web/src/app/clients/page.tsx`

**Step 1: Add state and import**

At the top of `clients/page.tsx`, add the import:

```typescript
import { AddClientPanel } from "@/components/add-client-panel";
```

Inside `ClientsPage()`, add state after the existing `useState` declarations:

```typescript
const [showAddPanel, setShowAddPanel] = useState(false);
```

Add a callback for when a client is created:

```typescript
const handleClientAdded = (newClient: ClientSummary) => {
  setClients((prev) => [newClient, ...prev]);
  setSelectedId(newClient.id);
  setShowAddPanel(false);
};
```

**Step 2: Add the "+" button in the sidebar**

In the sidebar search area (around line 603), add a button next to the search input. Change the search `<div className="px-4 py-3">` section to include a header row with the button:

```tsx
{/* Search + Add */}
<div className="px-4 py-3">
  <div className="flex items-center gap-2 mb-2">
    <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] flex-1">Clients</span>
    <button
      onClick={() => setShowAddPanel(true)}
      className="w-6 h-6 rounded-lg bg-[var(--accent)] flex items-center justify-center text-white hover:bg-[var(--accent-hover)] transition-colors"
      title="Add client"
    >
      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
    </button>
  </div>
  <div className="relative">
    ...existing search input...
  </div>
</div>
```

**Step 3: Render the panel**

Before the closing `</div>` of the root element (end of the component return), add:

```tsx
<AddClientPanel
  isOpen={showAddPanel}
  onClose={() => setShowAddPanel(false)}
  onClientAdded={handleClientAdded}
/>
```

**Step 4: Verify visually**

Open `http://localhost:3000/clients`, click the "+" button, verify:
- Panel slides in from right
- All form fields render correctly
- Validation works on blur and submit
- Submit creates client and closes panel
- New client appears in sidebar list

**Step 5: Commit**

```bash
git add helio/apps/web/src/app/clients/page.tsx
git commit -m "feat(web): integrate AddClientPanel into clients page sidebar"
```
