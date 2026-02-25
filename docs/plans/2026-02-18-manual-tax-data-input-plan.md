# Manual Tax Data Input Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Allow advisers to manually enter client income data and tax parameters, run the tax engine, and display the computed tax position on the client detail page.

**Architecture:** A new `POST /api/clients/{client_id}/tax-profile` endpoint that accepts income sources + pension/gift-aid/child-benefit config, calls `compute_full_tax_position()`, and upserts a TaxProfile + Observations into the DB. On the frontend, a new `TaxDataForm` component replaces the empty state on the client detail page.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, React 18, Framer Motion, Zod, Tailwind CSS

---

### Task 1: Add POST /api/clients/{client_id}/tax-profile endpoint

**Files:**
- Modify: `helio/apps/api/app/routers/clients.py`

**Step 1: Add the Pydantic models and endpoint**

Add these imports at the top of `clients.py` (some already exist):

```python
from typing import Literal
from app.tax.engine import compute_full_tax_position
from app.tax.types import IncomeSource as TaxIncomeSource, IncomeType
```

Add these Pydantic models after `CreateClientRequest`:

```python
class IncomeSourceInput(BaseModel):
    type: Literal["employment", "self_employment", "rental", "pension_income", "savings", "dividends", "other"]
    gross_amount: float
    label: str = ""

class ComputeTaxProfileRequest(BaseModel):
    income_sources: list[IncomeSourceInput]
    pension_contributions: float = 0
    gift_aid: float = 0
    claims_child_benefit: bool = False
    number_of_children: int = 0

    @field_validator("income_sources")
    @classmethod
    def validate_income_sources(cls, v: list[IncomeSourceInput]) -> list[IncomeSourceInput]:
        if len(v) == 0:
            raise ValueError("At least one income source is required")
        return v
```

Add the endpoint after the existing `create_client` function:

```python
@router.post("/clients/{client_id}/tax-profile")
async def compute_client_tax_profile(
    client_id: str,
    body: ComputeTaxProfileRequest,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """Compute and save a tax profile for a client using the deterministic engine."""

    # Load client
    result = await session.execute(
        select(Client).where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    logger.info("Computing tax profile", client_id=client_id)

    # Build engine inputs
    engine_sources = [
        TaxIncomeSource(
            source_type=IncomeType(s.type),
            gross_amount=s.gross_amount,
            label=s.label or s.type.replace("_", " ").title(),
        )
        for s in body.income_sources
    ]

    # Run engine
    pos = compute_full_tax_position(
        engine_sources,
        pension_contributions=body.pension_contributions,
        gift_aid=body.gift_aid,
        region=client.region or "england",
        number_of_children=body.number_of_children,
        claims_child_benefit=body.claims_child_benefit,
    )

    # Delete existing tax profile and observations for this client + tax year
    existing_tp = await session.execute(
        select(TaxProfile).where(
            TaxProfile.client_id == client_id,
            TaxProfile.tax_year == pos.tax_year,
        )
    )
    old_tp = existing_tp.scalar_one_or_none()
    if old_tp:
        await session.delete(old_tp)

    existing_obs = await session.execute(
        select(Observation).where(Observation.client_id == client_id)
    )
    for obs in existing_obs.scalars().all():
        await session.delete(obs)

    await session.flush()

    # Save new TaxProfile
    tax_profile = TaxProfile(
        client_id=client_id,
        tax_year=pos.tax_year,
        total_income=pos.total_income,
        adjusted_net_income=pos.adjusted_net_income,
        taxable_income=pos.taxable_income,
        income_tax=pos.income_tax,
        national_insurance=pos.national_insurance,
        dividend_tax=pos.dividend_tax,
        total_tax=pos.total_tax,
        effective_rate=pos.effective_rate,
        marginal_rate=pos.marginal_rate,
        personal_allowance=pos.personal_allowance,
        pa_status=pos.pa_status,
        in_pa_taper_zone=pos.in_pa_taper_zone,
        hicbc_applies=pos.hicbc_applies,
        pension_taper_applies=pos.pension_taper_applies,
        income_sources=[
            {
                "source_type": s.source_type.value,
                "label": s.label or s.source_type.value.replace("_", " ").title(),
                "gross_amount": s.gross_amount,
            }
            for s in pos.income_sources
        ],
        pension_data={
            "contributions": body.pension_contributions,
            "aa_remaining": pos.pension_aa_result.remaining if pos.pension_aa_result else 60_000 - body.pension_contributions,
            "annual_allowance": pos.pension_aa_result.annual_allowance if pos.pension_aa_result else 60_000,
        },
        allowances=[
            {
                "type": "personal_allowance",
                "label": "Personal Allowance",
                "annual_limit": 12_570,
                "used": 12_570 - pos.personal_allowance,
                "remaining": pos.personal_allowance,
                "status": "fully_used" if pos.personal_allowance == 0 else "available",
            },
            {
                "type": "pension_aa",
                "label": "Pension Annual Allowance",
                "annual_limit": 60_000,
                "used": body.pension_contributions,
                "remaining": pos.pension_aa_result.remaining if pos.pension_aa_result else 60_000 - body.pension_contributions,
            },
            {
                "type": "dividend",
                "label": "Dividend Allowance",
                "annual_limit": 500,
                "used": pos.income_tax_result.dividend_allowance_used,
                "remaining": 500 - pos.income_tax_result.dividend_allowance_used,
            },
        ],
        hicbc={
            "number_of_children": body.number_of_children,
            "claims_child_benefit": body.claims_child_benefit,
            "child_benefit_amount": pos.hicbc_result.child_benefit_annual if pos.hicbc_result else 0,
            "clawback_percentage": pos.hicbc_result.clawback_percentage if pos.hicbc_result else 0,
            "hicbc_charge": pos.hicbc_result.hicbc_charge if pos.hicbc_result else 0,
        },
        tax_breakdown=[
            {
                "band": b.name,
                "amount": b.income_in_band,
                "rate": b.rate,
                "tax": b.tax,
            }
            for b in pos.income_tax_result.non_savings_bands
        ],
        ni_breakdown={
            "class1": {
                "total_employee_ni": pos.ni_result.class_1.total_employee_ni if pos.ni_result.class_1 else 0,
            },
            "class2": {
                "annual_ni": pos.ni_result.class_2.annual_ni if pos.ni_result.class_2 else 0,
            },
            "class4": {
                "total_ni": pos.ni_result.class_4.total_ni if pos.ni_result.class_4 else 0,
            },
        },
        status="computed",
        data_confidence="high",
    )
    session.add(tax_profile)

    # Save observations
    for obs in pos.observations:
        session.add(Observation(
            client_id=client_id,
            tax_year=pos.tax_year,
            title=obs.title,
            description=obs.description,
            severity=obs.severity,
            priority="high" if obs.severity in ("warning", "critical") else "medium",
            category=obs.category,
            potential_saving=obs.potential_saving,
        ))

    await session.flush()

    logger.info("Tax profile computed and saved", client_id=client_id, total_tax=pos.total_tax)

    # Return the full client detail (same as GET /clients/{client_id})
    # Re-use the existing get_client logic
    return await get_client(client_id, session, logger)
```

**Step 2: Commit**

```bash
git add helio/apps/api/app/routers/clients.py
git commit -m "feat(api): add POST /api/clients/{client_id}/tax-profile endpoint"
```

---

### Task 2: Create TaxDataForm component

**Files:**
- Create: `helio/apps/web/src/components/tax-data-form.tsx`

**Step 1: Create the component**

Use the frontend-design skill. The component should:

- **Props:**
  - `clientId: string`
  - `clientRegion: string`
  - `onComputed: () => void` — called after successful computation so parent can re-fetch detail
  - `existingData?: { income_sources?: Array<{source_type: string; gross_amount: number; label: string}>; pension_data?: {contributions: number}; hicbc?: {claims_child_benefit: boolean; number_of_children: number} }` — pre-fill form when editing existing profile

- **Layout:** A card matching the existing `Card` component pattern on the clients page. Sections:

  1. **Income Sources** — dynamic list
     - Each row: type dropdown + gross amount input + optional label + remove button
     - Types: Employment, Self-Employment, Rental, Pension Income, Savings, Dividends, Other
     - "Add income source" button (starts with one empty row)
     - Minimum 1 source required

  2. **Tax Reliefs** — two fields side by side
     - Pension Contributions (£): number input, default 0
     - Gift Aid Donations (£): number input, default 0

  3. **Child Benefit** — toggle row
     - "Claims Child Benefit" toggle/checkbox
     - When on: "Number of Children" number input appears

  4. **Region note** — small text showing "Calculating for: {region}" from client data

- **Footer:** "Calculate Tax Position" submit button

- **Validation (Zod):**
  - income_sources: array min length 1
  - Each source: type required, gross_amount > 0
  - pension_contributions: >= 0
  - gift_aid: >= 0
  - number_of_children: >= 0 when claims_child_benefit is true

- **Submit behavior:**
  - POST to `${API_BASE}/api/clients/${clientId}/tax-profile`
  - Loading state on button: "Calculating..."
  - On success: call `onComputed()`
  - On error: error banner

- **Visual specs:**
  - Same card/surface styling as existing client detail cards
  - Income source rows: grid with `grid-cols-[1fr_140px_1fr_32px]` for type/amount/label/remove
  - Amount inputs: `font-mono` with `£` prefix
  - Toggle: simple checkbox styled as toggle
  - Section headers: same `text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]` pattern
  - Animations: Framer Motion fadeUp on sections, AnimatePresence for adding/removing income rows

**Step 2: Commit**

```bash
git add helio/apps/web/src/components/tax-data-form.tsx
git commit -m "feat(web): add TaxDataForm component for manual income data entry"
```

---

### Task 3: Integrate TaxDataForm into clients page

**Files:**
- Modify: `helio/apps/web/src/app/clients/page.tsx`

**Step 1: Add import and state**

At the top of `clients/page.tsx`:

```typescript
import { TaxDataForm } from "@/components/tax-data-form";
```

Inside `ClientsPage()`, add state:

```typescript
const [showTaxForm, setShowTaxForm] = useState(false);
```

Add a re-fetch callback:

```typescript
const refetchDetail = useCallback(() => {
  if (!selectedId) return;
  setShowTaxForm(false);
  setDetailLoading(true);
  (async () => {
    try {
      const res = await fetch(`${API_BASE}/api/clients/${selectedId}`);
      const data: ClientDetail = await res.json();
      setDetail(data);
    } catch { /* noop */ }
    finally { setDetailLoading(false); }
  })();
}, [selectedId]);
```

**Step 2: Replace the empty state with TaxDataForm**

Find the existing empty state section (the "No tax profile" dashed border div) and replace it:

```tsx
{/* Empty state → Tax data form */}
{!tp && !showTaxForm && (
  <div className="rounded-xl border border-dashed border-[var(--border)] p-14 text-center">
    <IconFileText className="w-7 h-7 mx-auto text-[var(--muted)] mb-3" />
    <p className="text-[14px] font-medium text-[var(--muted)] mb-1">No tax profile</p>
    <p className="text-[12px] text-[var(--muted-foreground)] mb-4">Enter income data to calculate this client&apos;s tax position.</p>
    <button
      onClick={() => setShowTaxForm(true)}
      className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
    >
      Enter tax data <IconArrowRight className="w-3 h-3" />
    </button>
  </div>
)}

{!tp && showTaxForm && (
  <TaxDataForm
    clientId={detail.id}
    clientRegion={detail.region || "england"}
    onComputed={refetchDetail}
  />
)}
```

**Step 3: Add "Edit tax data" button for existing profiles**

In the header area of the client detail (near the prev/next buttons), add:

```tsx
{tp && (
  <button
    onClick={() => {
      setShowTaxForm(true);
      // Scroll to form area (the tp sections will be hidden)
    }}
    className="text-[11px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors"
  >
    Edit tax data
  </button>
)}
```

When `showTaxForm` is true AND there is already a `tp`, show the form instead of the dashboard sections:

```tsx
{showTaxForm ? (
  <TaxDataForm
    clientId={detail.id}
    clientRegion={detail.region || "england"}
    onComputed={refetchDetail}
    existingData={{
      income_sources: tp?.income_sources,
      pension_data: tp?.pension_data as Record<string, unknown> | undefined,
      hicbc: tp?.hicbc,
    }}
  />
) : (
  /* ...existing dashboard sections (metrics, cards, observations)... */
)}
```

**Step 4: Commit**

```bash
git add helio/apps/web/src/app/clients/page.tsx
git commit -m "feat(web): integrate TaxDataForm into client detail page"
```
