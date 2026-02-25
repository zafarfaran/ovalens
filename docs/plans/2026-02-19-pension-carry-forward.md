# Pension Carry Forward Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let advisers input prior-year pension contributions, auto-calculate carry forward in the engine, and display the breakdown on both the dashboard and client profile.

**Architecture:** Store historical contributions in TaxProfile.pension_data JSONB. Add API endpoints for CRUD. Wire carry forward into all tool executors. Add carry forward chart to dashboard and input form to client profile.

**Tech Stack:** Python/FastAPI (backend), React/Next.js/Tailwind/Framer Motion (frontend), SQLAlchemy (ORM), pytest (tests)

---

### Task 1: API — Pension History Endpoints

**Files:**
- Modify: `helio/apps/api/app/routers/clients.py` (add 2 endpoints after line 923)

**Step 1: Write the GET endpoint**

Add to the bottom of `clients.py`:

```python
class PensionHistoryInput(BaseModel):
    contributions_history: dict[str, dict]  # e.g. {"2022/23": {"personal": 10000, "employer": 5000}}


@router.get("/clients/{client_id}/pension-history")
async def get_pension_history(
    client_id: str,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """Return prior-year pension contributions for carry forward."""
    result = await session.execute(
        select(TaxProfile)
        .where(TaxProfile.client_id == client_id)
        .order_by(desc(TaxProfile.created_at))
        .limit(1)
    )
    tp = result.scalar_one_or_none()

    history = {}
    if tp and tp.pension_data:
        history = tp.pension_data.get("contributions_history", {})

    return {"client_id": client_id, "contributions_history": history}
```

**Step 2: Write the PUT endpoint**

```python
@router.put("/clients/{client_id}/pension-history")
async def update_pension_history(
    client_id: str,
    body: PensionHistoryInput,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """Save prior-year pension contributions for carry forward."""
    result = await session.execute(
        select(TaxProfile)
        .where(TaxProfile.client_id == client_id)
        .order_by(desc(TaxProfile.created_at))
        .limit(1)
    )
    tp = result.scalar_one_or_none()
    if tp is None:
        raise HTTPException(status_code=404, detail="No tax profile found for client")

    pension_data = dict(tp.pension_data or {})
    pension_data["contributions_history"] = body.contributions_history
    tp.pension_data = pension_data
    # SQLAlchemy needs to detect mutation on JSONB
    from sqlalchemy.orm.attributes import flag_modified
    flag_modified(tp, "pension_data")
    await session.flush()

    logger.info("Pension history updated", client_id=client_id, years=list(body.contributions_history.keys()))
    return {"client_id": client_id, "contributions_history": body.contributions_history}
```

**Step 3: Run the API to verify no import errors**

Run: `cd helio/apps/api && python -c "from app.routers.clients import router; print('OK')"`

**Step 4: Commit**

```bash
git add helio/apps/api/app/routers/clients.py
git commit -m "feat: add pension history GET/PUT endpoints"
```

---

### Task 2: Wire Carry Forward into Tool Executors

**Files:**
- Modify: `helio/apps/api/app/services/tools/tax_engine.py:12-56` (execute_compute_tax_position)
- Modify: `helio/apps/api/app/services/tools/tax_engine.py:117-152` (execute_model_personal_pension)
- Modify: `helio/apps/api/app/services/tools/tax_engine.py:77-114` (execute_model_salary_sacrifice)
- Modify: `helio/apps/api/app/services/tools/__init__.py:25-33` (execute_tool)
- Modify: `helio/apps/api/app/services/chat.py:243` (tool_context)
- Modify: `helio/apps/api/app/tax/personal_pension.py:22-32` (add pension_contributions_by_year param)
- Modify: `helio/apps/api/app/tax/salary_sacrifice.py:17-26` (add pension_contributions_by_year param)

The tool executors need the client's TaxProfile to fetch `pension_data.contributions_history`. The cleanest way: pass `client_id` in `tool_context` (already done at chat.py:243), then have each executor fetch the history from DB when needed.

However, the executors are `async` but don't have DB access. The simplest approach: fetch the pension history in `chat.py` when building tool_context, and pass it as `pension_contributions_by_year` in the context dict. This avoids giving executors DB sessions.

**Step 1: Update chat.py to include pension history in tool_context**

In `helio/apps/api/app/services/chat.py`, around line 243 where `tool_context` is built, add:

```python
# Build pension carry-forward history from TaxProfile
pension_contributions_by_year = None
if tax_profile and tax_profile.pension_data:
    ch = tax_profile.pension_data.get("contributions_history", {})
    if ch:
        pension_contributions_by_year = {
            year: float(vals.get("personal", 0)) + float(vals.get("employer", 0))
            for year, vals in ch.items()
        }

tool_context = {
    "client_id": client_id,
    "pension_contributions_by_year": pension_contributions_by_year,
}
```

This requires `tax_profile` to be in scope. It's already loaded as `tax_profile` at line 356-362 inside `_load_client_context`. Refactor slightly: extract the tax_profile into a local variable in `stream_message` so it's accessible at tool_context build time. The simplest way: have `_load_client_context` also return the raw `tax_profile` object.

Change `_load_client_context` to return `tuple[dict | None, TaxProfile | None]`:

At `chat.py:333`, update the signature and return:

```python
async def _load_client_context(self, client_id: str) -> tuple[dict | None, TaxProfile | None]:
```

And at the end of the method (around line 469+), return both:

```python
return context, tax_profile
```

(currently it just returns `context`). Find the exact return statement and update it.

Then in `stream_message` at line 205:

```python
client_context, tax_profile_obj = await self._load_client_context(client_id)
```

And build tool_context:

```python
pension_contributions_by_year = None
if tax_profile_obj and tax_profile_obj.pension_data:
    ch = tax_profile_obj.pension_data.get("contributions_history", {})
    if ch:
        pension_contributions_by_year = {
            year: float(vals.get("personal", 0)) + float(vals.get("employer", 0))
            for year, vals in ch.items()
        }

tool_context = {
    "client_id": client_id,
    "pension_contributions_by_year": pension_contributions_by_year,
}
```

**Step 2: Update execute_compute_tax_position to use context**

In `tax_engine.py:12`, the function signature already has `context: dict | None = None`. Add after line 53 (before calling `compute_full_tax_position`):

```python
# Carry forward: merge from context (DB history) with any LLM-provided overrides
contributions_by_year = tool_input.get("pension_contributions_by_year")
if not contributions_by_year and context:
    contributions_by_year = context.get("pension_contributions_by_year")
```

And update line 53 to use it:

```python
pension_contributions_by_year=contributions_by_year,
```

(It already passes `tool_input.get("pension_contributions_by_year")` at line 53, so just change the source.)

**Step 3: Update analyse_personal_pension to accept and pass carry forward**

In `personal_pension.py:22`, add `pension_contributions_by_year: dict[str, float] | None = None` parameter.

Add it to `common_kwargs`:

```python
common_kwargs = dict(
    income_sources=income_sources,
    employer_contributions=employer_contributions,
    gift_aid=gift_aid,
    region=region,
    number_of_children=number_of_children,
    claims_child_benefit=claims_child_benefit,
    pension_contributions_by_year=pension_contributions_by_year,
)
```

Update the AA warning check (line 87-96) to use carry forward:

```python
total_pension = proposed_contribution + employer_contributions
pension_aa_warning = None
if pension_contributions_by_year:
    from app.tax.pension_aa import calculate_pension_aa
    aa_check = calculate_pension_aa(
        adjusted_income=0, threshold_income=0,
        current_year_contributions=total_pension,
        contributions_by_year=pension_contributions_by_year,
    )
    if aa_check.remaining < 0:
        pension_aa_warning = (
            f"Proposed total contributions (£{total_pension:,.0f}) exceed available "
            f"allowance including carry forward (£{aa_check.total_available:,.0f})."
        )
elif total_pension > aa_limit:
    pension_aa_warning = (
        f"Proposed total pension contributions (£{total_pension:,.0f}) "
        f"exceed the annual allowance (£{aa_limit:,.0f}). "
        f"Check carry-forward availability."
    )
```

**Step 4: Update execute_model_personal_pension to pass carry forward**

In `tax_engine.py:117`, add after parsing income sources:

```python
contributions_by_year = None
if context:
    contributions_by_year = context.get("pension_contributions_by_year")
```

And pass to `analyse_personal_pension`:

```python
pension_contributions_by_year=contributions_by_year,
```

**Step 5: Update analyse_salary_sacrifice similarly**

In `salary_sacrifice.py:17`, add `pension_contributions_by_year: dict[str, float] | None = None` parameter. Pass it to both `compute_full_tax_position` calls.

Update `execute_model_salary_sacrifice` in `tax_engine.py:77` to extract from context and pass through.

**Step 6: Run existing tests**

Run: `cd helio/apps/api && python -m pytest tests/tax/ -v`
Expected: All existing tests still pass (no regressions).

**Step 7: Commit**

```bash
git add helio/apps/api/app/services/chat.py helio/apps/api/app/services/tools/tax_engine.py helio/apps/api/app/tax/personal_pension.py helio/apps/api/app/tax/salary_sacrifice.py
git commit -m "feat: wire pension carry forward into tool executors"
```

---

### Task 3: Add Carry Forward Detail to Dashboard Data

**Files:**
- Modify: `helio/apps/api/app/services/tools/tax_engine.py:258-269` (_position_to_dashboard pension allowance section)

**Step 1: Expand the pension allowance entry in _position_to_dashboard**

Replace the pension allowance block (lines 258-269) with:

```python
if pos.pension_aa_result:
    pa_res = pos.pension_aa_result
    used = pa_res.current_year_contributions
    remaining = max(0, pa_res.total_available - used)
    pension_entry: dict = {
        "name": "Pension Annual Allowance",
        "annualLimit": pa_res.annual_allowance,
        "used": used,
        "remaining": remaining,
        "status": _allowance_status(remaining, pa_res.total_available),
        "totalAvailable": pa_res.total_available,
    }
    if pa_res.carry_forward:
        pension_entry["carryForward"] = [
            {
                "taxYear": cf.tax_year,
                "allowance": cf.annual_allowance,
                "used": cf.contributions,
                "unused": cf.unused,
            }
            for cf in pa_res.carry_forward
        ]
        pension_entry["totalCarryForward"] = sum(cf.unused for cf in pa_res.carry_forward)
    allowances.append(pension_entry)
```

**Step 2: Run tests**

Run: `cd helio/apps/api && python -m pytest tests/tax/ -v`

**Step 3: Commit**

```bash
git add helio/apps/api/app/services/tools/tax_engine.py
git commit -m "feat: include carry forward breakdown in dashboard data"
```

---

### Task 4: Add Carry Forward Context to System Prompt

**Files:**
- Modify: `helio/apps/api/app/services/system_prompt.py:192-196` (_format_client_context allowances section)

**Step 1: Add pension carry forward to client context**

After the allowances section (around line 196), check for pension_data with carry forward and add a summary:

```python
if tp.get("pension_data"):
    pd = tp["pension_data"]
    ch = pd.get("contributions_history")
    if ch:
        lines.append("\n**Pension Carry Forward (prior year contributions):**")
        for year, vals in sorted(ch.items()):
            personal = vals.get("personal", 0)
            employer = vals.get("employer", 0)
            total = personal + employer
            lines.append(f"- {year}: £{total:,.0f} contributed (personal: £{personal:,.0f}, employer: £{employer:,.0f})")
```

Also add pension_data to the context dict in `chat.py:453-466` so it's available:

In `chat.py` around line 466, add `"pension_data": tax_profile.pension_data,` to the tax_profile context dict.

**Step 2: Update tool instructions to mention carry forward**

In `system_prompt.py`, in the `_TOOL_INSTRUCTIONS` string around line 34-41 (compute_tax_position docs), add:

```
- If the client has prior-year pension contributions stored, carry forward is calculated automatically by the engine. You do not need to pass `pension_contributions_by_year` — it is injected from the database.
```

**Step 3: Commit**

```bash
git add helio/apps/api/app/services/system_prompt.py helio/apps/api/app/services/chat.py
git commit -m "feat: add pension carry forward to system prompt context"
```

---

### Task 5: Frontend — Pension History Input on Client Profile

**Files:**
- Modify: `helio/apps/web/src/components/edit-client-form.tsx` (add Pension History section)

**Step 1: Add pension history state and fetch**

In the component, after the existing state declarations (around line 155), add:

```typescript
// Pension contribution history for carry forward
const [pensionHistory, setPensionHistory] = useState<Record<string, { personal: number; employer: number }>>({
  "2022/23": { personal: 0, employer: 0 },
  "2023/24": { personal: 0, employer: 0 },
  "2024/25": { personal: 0, employer: 0 },
});
const [pensionHistoryLoaded, setPensionHistoryLoaded] = useState(false);

// Fetch pension history on mount
useEffect(() => {
  fetch(`${API_BASE}/api/clients/${client.id}/pension-history`)
    .then((r) => r.json())
    .then((data) => {
      if (data.contributions_history && Object.keys(data.contributions_history).length > 0) {
        setPensionHistory((prev) => ({ ...prev, ...data.contributions_history }));
      }
      setPensionHistoryLoaded(true);
    })
    .catch(() => setPensionHistoryLoaded(true));
}, [client.id]);
```

**Step 2: Add the Pension History form section**

Add a new card section between the Professional and Notes sections (around line 632). Use the same card/input styling pattern as other sections:

```tsx
{/* Pension Contribution History */}
<motion.div variants={fadeUp}>
  <div className="rounded-xl bg-[var(--card)] border border-[var(--card-border)] overflow-hidden">
    <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[var(--border-subtle)]">
      <IconTrendingUp className="w-[14px] h-[14px] text-[var(--accent)]" />
      <h3 className="text-[13px] font-semibold text-[var(--foreground)] tracking-[-0.01em]">Pension Contribution History</h3>
      <span className="text-[10px] text-[var(--muted)] ml-auto">For carry forward calculation</span>
    </div>
    <div className="px-5 py-4 space-y-3">
      <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-2 items-center">
        <span className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider">Year</span>
        <span className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider">Personal (£)</span>
        <span className="text-[10px] font-medium text-[var(--muted)] uppercase tracking-wider">Employer (£)</span>
        {(["2022/23", "2023/24", "2024/25"] as const).map((year) => (
          <React.Fragment key={year}>
            <span className="text-[12px] font-mono text-[var(--foreground)]">{year}</span>
            <input
              type="number"
              min="0"
              step="100"
              value={pensionHistory[year]?.personal || 0}
              onChange={(e) =>
                setPensionHistory((prev) => ({
                  ...prev,
                  [year]: { ...prev[year], personal: parseFloat(e.target.value) || 0 },
                }))
              }
              className={inputClass + " font-mono"}
            />
            <input
              type="number"
              min="0"
              step="100"
              value={pensionHistory[year]?.employer || 0}
              onChange={(e) =>
                setPensionHistory((prev) => ({
                  ...prev,
                  [year]: { ...prev[year], employer: parseFloat(e.target.value) || 0 },
                }))
              }
              className={inputClass + " font-mono"}
            />
          </React.Fragment>
        ))}
      </div>
      <p className="text-[10px] text-[var(--muted)]/60 mt-1">
        Enter total pension contributions for each tax year. Unused allowance carries forward for up to 3 years.
      </p>
    </div>
  </div>
</motion.div>
```

**Step 3: Save pension history on form submit**

In the `submit` function (around line 186), after the existing PATCH call succeeds, save pension history:

```typescript
// Save pension history
try {
  await fetch(`${API_BASE}/api/clients/${client.id}/pension-history`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contributions_history: pensionHistory }),
  });
} catch {
  // Non-critical — pension history save failed but client saved
}
```

**Step 4: Add React import**

Add `React` to the imports at top if not already present (needed for `React.Fragment`).

**Step 5: Verify build**

Run: `cd helio/apps/web && npx next build` (or `npm run build`)

**Step 6: Commit**

```bash
git add helio/apps/web/src/components/edit-client-form.tsx
git commit -m "feat: add pension contribution history form to client profile"
```

---

### Task 6: Frontend — Carry Forward Chart in Dashboard

**Files:**
- Modify: `helio/apps/web/src/components/charts/allowances-radial-chart.tsx`

This task should use the **frontend-design skill** for high-quality visual treatment.

**Step 1: Extend the Allowance interface**

Add carry forward fields to the `Allowance` interface:

```typescript
interface CarryForwardYear {
  taxYear: string;
  allowance: number;
  used: number;
  unused: number;
}

interface Allowance {
  type?: string;
  label?: string;
  name?: string;
  annual_limit?: number;
  annualLimit?: number;
  used: number;
  remaining: number;
  status?: string;
  carryForward?: CarryForwardYear[];
  totalCarryForward?: number;
  totalAvailable?: number;
}
```

**Step 2: Add carry forward breakdown below the pension allowance bar**

After the existing progress bar + status row for each allowance, if `a.carryForward` exists, render a collapsible breakdown. Design requirements:

- Stacked horizontal bar showing each year's unused allowance in different shades
- Year labels with amounts
- Subtle animation on mount
- Match the existing design language (10-12px text, `var(--muted)` colors, `font-mono` for numbers)
- Use the frontend-design skill for polished visual treatment

The implementation should show:
- Current year AA (e.g. £60,000)
- Each carry forward year with its unused amount as a segment
- Total available = current AA + total carry forward
- Clear visual hierarchy

**Step 3: Verify build**

Run: `cd helio/apps/web && npx next build`

**Step 4: Commit**

```bash
git add helio/apps/web/src/components/charts/allowances-radial-chart.tsx
git commit -m "feat: add carry forward breakdown chart to dashboard"
```

---

### Task 7: Tests — Carry Forward Integration

**Files:**
- Modify: `helio/apps/api/tests/tax/test_pension_aa.py` (add carry forward edge cases)
- Modify: `helio/apps/api/tests/tax/test_personal_pension.py` (test with carry forward)

**Step 1: Add carry forward tests to test_pension_aa.py**

```python
def test_carry_forward_partial_years():
    """Only some years have contributions."""
    r = calculate_pension_aa(
        150_000, 150_000,
        current_year_contributions=50_000,
        contributions_by_year={
            "2024/25": 60_000,  # Fully used → 0 unused
            "2023/24": 0,       # None used → 60k unused
            # 2022/23 not provided → not included
        },
    )
    assert r.total_available == 60_000 + 60_000  # current + 2023/24 unused
    assert r.remaining == 70_000  # 120k - 50k


def test_carry_forward_no_history():
    """No carry forward data → just current year AA."""
    r = calculate_pension_aa(
        150_000, 150_000,
        current_year_contributions=30_000,
        contributions_by_year=None,
    )
    assert r.total_available == 60_000
    assert r.remaining == 30_000
    assert len(r.carry_forward) == 0


def test_carry_forward_tapered_with_history():
    """Tapered AA with carry forward still available."""
    r = calculate_pension_aa(
        300_000, 250_000,
        current_year_contributions=50_000,
        contributions_by_year={
            "2024/25": 10_000,  # 50k unused
            "2023/24": 10_000,  # 50k unused
            "2022/23": 10_000,  # 30k unused
        },
    )
    assert r.is_tapered is True
    assert r.annual_allowance == 40_000
    assert r.total_available == 40_000 + 50_000 + 50_000 + 30_000  # 170k
    assert r.remaining == 120_000  # 170k - 50k
```

**Step 2: Run tests**

Run: `cd helio/apps/api && python -m pytest tests/tax/test_pension_aa.py -v`
Expected: All pass.

**Step 3: Commit**

```bash
git add helio/apps/api/tests/tax/test_pension_aa.py
git commit -m "test: add pension carry forward edge case tests"
```
