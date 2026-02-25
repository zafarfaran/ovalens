# Expanded Observations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enrich the observation system with more engine rules and an AI `save_observation` tool, tagged by source for recompute safety.

**Architecture:** Add a `source` column to the Observation DB model (`"engine"` or `"ai"`). Expand the tax engine with 5 new observation rules. Add a `save_observation` tool to Claude's tool set with a new API endpoint and tool executor. Update frontend to show an "AI" badge on AI-sourced observations.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, Anthropic tool-calling, React 18, Tailwind CSS

---

### Task 1: Add `source` column to Observation model

**Files:**
- Modify: `helio/apps/api/app/db/models.py`

**Step 1: Add the source column**

Add `source` field to the `Observation` class, after the `is_dismissed` field:

```python
    source: Mapped[str] = mapped_column(String, nullable=False, default="engine")
```

**Step 2: Update the DB**

Since we're using SQLite with no migrations framework, we need to add the column. Run:

```bash
cd helio/apps/api
.venv/bin/python -c "
import sqlite3
conn = sqlite3.connect('helio.db')
try:
    conn.execute('ALTER TABLE observations ADD COLUMN source TEXT NOT NULL DEFAULT \"engine\"')
    conn.commit()
    print('Column added')
except Exception as e:
    print(f'Column may already exist: {e}')
conn.close()
"
```

**Step 3: Commit**

```bash
git add helio/apps/api/app/db/models.py
git commit -m "feat(db): add source column to Observation model"
```

---

### Task 2: Update tax-profile endpoint to only delete engine observations on recompute

**Files:**
- Modify: `helio/apps/api/app/routers/clients.py`

**Step 1: Filter deletes by source='engine'**

In the `compute_client_tax_profile` endpoint, change the observation delete query (around line 336-340) from:

```python
    existing_obs = await session.execute(
        select(Observation).where(Observation.client_id == client_id)
    )
    for obs in existing_obs.scalars().all():
        await session.delete(obs)
```

To:

```python
    existing_obs = await session.execute(
        select(Observation).where(
            Observation.client_id == client_id,
            Observation.source == "engine",
        )
    )
    for obs in existing_obs.scalars().all():
        await session.delete(obs)
```

**Step 2: Set source="engine" on new observations**

In the same endpoint, where observations are saved (around line 432-442), add `source="engine"` to each Observation constructor:

```python
    for obs_item in pos.observations:
        session.add(Observation(
            client_id=client_id,
            tax_year=pos.tax_year,
            title=obs_item.title,
            description=obs_item.description,
            severity=obs_item.severity,
            priority="high" if obs_item.severity in ("warning", "critical") else "medium",
            category=obs_item.category,
            potential_saving=obs_item.potential_saving,
            source="engine",
        ))
```

**Step 3: Include `source` in the GET client response**

In the `get_client` endpoint, add `"source"` to the observations_out dict (around line 186-202):

```python
    observations_out = [
        {
            "id": obs.id,
            "tax_year": obs.tax_year,
            "title": obs.title,
            "description": obs.description,
            "severity": obs.severity,
            "priority": obs.priority,
            "category": obs.category,
            "potential_saving": obs.potential_saving,
            "deadline": obs.deadline,
            "action_required": obs.action_required,
            "is_dismissed": obs.is_dismissed,
            "source": obs.source,
            "created_at": obs.created_at.isoformat() if obs.created_at else None,
        }
        for obs in observations
    ]
```

**Step 4: Commit**

```bash
git add helio/apps/api/app/routers/clients.py
git commit -m "feat(api): preserve AI observations on tax profile recompute"
```

---

### Task 3: Add 5 new engine observation rules

**Files:**
- Modify: `helio/apps/api/app/tax/observations.py`

**Step 1: Add new rules to `detect_observations()`**

Add these parameters to the function signature:

```python
def detect_observations(
    ani: ANIResult,
    income_tax: IncomeTaxResult,
    ni: NIResult,
    hicbc: HICBCResult | None,
    pension_aa: PensionAAResult | None,
    *,
    total_income: float,
    pension_contributions: float = 0,
    gift_aid: float = 0,
    has_dividends: bool = False,
    is_director_or_self_employed: bool = False,
    cgt_gains: float = 0,
) -> list[ObservationItem]:
```

Add these rules before the `return obs` statement:

```python
    # Marriage Allowance eligibility
    if total_income > 0 and total_income <= 12_570:
        obs.append(ObservationItem(
            id="marriage-allowance",
            title="Marriage Allowance Eligibility",
            description=(
                f"With income of £{total_income:,.0f} (below the Personal Allowance), "
                f"you may be able to transfer £1,260 of unused allowance to a spouse "
                f"or civil partner, saving them up to £252 per year."
            ),
            severity="opportunity",
            category="income_tax",
            potential_saving=252,
            action="Check if your spouse/partner is a basic rate taxpayer to claim Marriage Allowance.",
        ))

    # Savings Allowance tracking
    marginal = _estimate_marginal_rate(ani, income_tax)
    psa_limit = 1_000 if marginal <= 0.20 else (500 if marginal <= 0.40 else 0)
    savings_income = sum(
        b.income_in_band for b in income_tax.savings_bands
    ) if income_tax.savings_bands else 0
    if psa_limit > 0 and savings_income > 0:
        psa_used = min(savings_income, psa_limit)
        psa_remaining = psa_limit - psa_used
        obs.append(ObservationItem(
            id="savings-allowance",
            title="Personal Savings Allowance",
            description=(
                f"Your PSA is £{psa_limit:,} at your tax band. "
                f"£{psa_used:,.0f} used, £{psa_remaining:,.0f} remaining."
            ),
            severity="info",
            category="savings",
        ))

    # Dividend vs Salary flag for directors/self-employed
    if is_director_or_self_employed and has_dividends and total_income > 50_000:
        obs.append(ObservationItem(
            id="dividend-salary-split",
            title="Dividend vs Salary Optimisation",
            description=(
                "As a director/self-employed person with dividends, there may be "
                "opportunities to optimise the split between salary and dividends "
                "to reduce your overall tax and NI liability."
            ),
            severity="opportunity",
            category="income_tax",
            action="Review the salary/dividend mix with your adviser for potential NI savings.",
        ))

    # Gift Aid higher-rate relief
    if gift_aid > 0 and marginal > 0.20:
        extra_relief = gift_aid * 0.25 * (marginal - 0.20)
        obs.append(ObservationItem(
            id="gift-aid-relief",
            title="Gift Aid Higher-Rate Relief",
            description=(
                f"As a {marginal:.0%} rate taxpayer, your £{gift_aid:,.0f} Gift Aid donations "
                f"qualify for additional tax relief of £{extra_relief:,.0f} via your Self Assessment."
            ),
            severity="opportunity",
            category="income_tax",
            potential_saving=extra_relief,
            action="Claim the additional relief on your Self Assessment tax return.",
        ))

    # CGT Annual Exemption reminder
    if cgt_gains > 0:
        aea = 3_000
        aea_used = min(cgt_gains, aea)
        aea_remaining = max(0, aea - cgt_gains)
        if cgt_gains > aea:
            obs.append(ObservationItem(
                id="cgt-aea-exceeded",
                title="CGT Annual Exemption Exceeded",
                description=(
                    f"Your capital gains of £{cgt_gains:,.0f} exceed the £{aea:,} annual exemption. "
                    f"£{cgt_gains - aea:,.0f} is subject to Capital Gains Tax."
                ),
                severity="warning",
                category="capital_gains",
                action="Consider spreading disposals across tax years or using losses to offset gains.",
            ))
        else:
            obs.append(ObservationItem(
                id="cgt-aea-usage",
                title="CGT Annual Exemption Usage",
                description=(
                    f"You have used £{aea_used:,.0f} of your £{aea:,} CGT annual exemption. "
                    f"£{aea_remaining:,.0f} remaining this tax year."
                ),
                severity="info",
                category="capital_gains",
            ))
```

**Step 2: Update the engine caller to pass the new parameters**

In `helio/apps/api/app/tax/engine.py`, find where `detect_observations()` is called and pass the new params:

```python
    observations = detect_observations(
        ani_result,
        income_tax_result,
        ni_result,
        hicbc_result,
        pension_aa_result,
        total_income=total_income,
        pension_contributions=pension_contributions,
        gift_aid=gift_aid,
        has_dividends=any(s.source_type == IncomeType.DIVIDENDS for s in income_sources),
        is_director_or_self_employed=any(
            s.source_type == IncomeType.SELF_EMPLOYMENT for s in income_sources
        ),
        cgt_gains=0,  # CGT not yet computed by engine, passed from API layer
    )
```

Note: `cgt_gains` is tracked as a form input (from the ISA/CGT form fields we added earlier), not computed by the engine. We'll need to thread it from the API endpoint into the engine call. In `helio/apps/api/app/routers/clients.py`, update the `compute_full_tax_position` call or pass `cgt_gains` directly to `detect_observations`. The simplest approach: add `cgt_gains` as a parameter to `compute_full_tax_position` and thread it through to `detect_observations`.

In `helio/apps/api/app/tax/engine.py`, add `cgt_gains: float = 0` to the `compute_full_tax_position` signature and pass it to `detect_observations`.

In `helio/apps/api/app/routers/clients.py`, pass `cgt_gains=body.cgt_gains` to the engine call.

**Step 3: Commit**

```bash
git add helio/apps/api/app/tax/observations.py helio/apps/api/app/tax/engine.py helio/apps/api/app/routers/clients.py
git commit -m "feat(engine): add 5 new observation rules (marriage allowance, PSA, dividend split, gift aid relief, CGT)"
```

---

### Task 4: Add `save_observation` tool for Claude

**Files:**
- Modify: `helio/apps/api/app/services/llm/claude.py` (tool definition)
- Create: `helio/apps/api/app/services/tools/observations.py` (tool executor)
- Modify: `helio/apps/api/app/services/tools/__init__.py` (register tool)
- Modify: `helio/apps/api/app/services/system_prompt.py` (instruct Claude)

**Step 1: Add tool definition in claude.py**

Add after `DASHBOARD_TOOLS`:

```python
OBSERVATION_TOOLS = [
    {
        "name": "save_observation",
        "description": (
            "Save a tax planning observation or advisory insight to the client's record. "
            "Use this when you identify an actionable insight during the conversation that "
            "the adviser should be aware of — e.g. marriage allowance opportunity, pension "
            "carry-forward reminder, or a planning consideration. These persist on the client's "
            "profile for future reference. Do NOT save trivial or generic observations."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Short title for the observation (e.g. 'Marriage Allowance Transfer Opportunity')",
                },
                "description": {
                    "type": "string",
                    "description": "Detailed description with specific numbers and context from the conversation",
                },
                "severity": {
                    "type": "string",
                    "enum": ["info", "warning", "opportunity"],
                    "description": "info = FYI, warning = needs attention, opportunity = potential saving",
                },
                "category": {
                    "type": "string",
                    "description": "Tax area: income_tax, pension, savings, capital_gains, child_benefit, planning, iht",
                },
                "potential_saving": {
                    "type": "number",
                    "description": "Estimated annual tax saving in £ (optional, only if quantifiable)",
                },
            },
            "required": ["title", "description", "severity", "category"],
        },
    }
]
```

**Step 2: Create tool executor**

Create `helio/apps/api/app/services/tools/observations.py`:

```python
"""Observation tool — saves AI-generated observations to the client record."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.db.engine import async_session_factory
from app.db.models import Client, Observation

logger = get_logger(__name__)


async def execute_save_observation(
    tool_input: dict, context: dict | None = None
) -> dict:
    """Save an AI-generated observation to the database."""
    client_id = context.get("client_id") if context else None
    if not client_id:
        return {"error": "No client context available"}

    title = tool_input.get("title", "")
    description = tool_input.get("description", "")
    severity = tool_input.get("severity", "info")
    category = tool_input.get("category", "planning")
    potential_saving = tool_input.get("potential_saving")

    if not title or not description:
        return {"error": "Title and description are required"}

    async with async_session_factory() as session:
        # Verify client exists
        result = await session.execute(
            select(Client).where(Client.id == client_id)
        )
        client = result.scalar_one_or_none()
        if not client:
            return {"error": f"Client {client_id} not found"}

        # Check for duplicate (same title + source=ai for this client)
        existing = await session.execute(
            select(Observation).where(
                Observation.client_id == client_id,
                Observation.title == title,
                Observation.source == "ai",
            )
        )
        if existing.scalar_one_or_none():
            return {"success": True, "message": "Observation already exists", "duplicate": True}

        priority = "high" if severity == "warning" else ("medium" if severity == "opportunity" else "low")

        obs = Observation(
            client_id=client_id,
            title=title,
            description=description,
            severity=severity,
            priority=priority,
            category=category,
            potential_saving=potential_saving,
            source="ai",
        )
        session.add(obs)
        await session.flush()

        logger.info(
            "AI observation saved",
            client_id=client_id,
            title=title,
            severity=severity,
            observation_id=obs.id,
        )

        return {
            "success": True,
            "observation_id": obs.id,
            "message": f"Observation '{title}' saved to client record.",
        }
```

**Step 3: Register in tool registry**

In `helio/apps/api/app/services/tools/__init__.py`, add:

```python
from app.services.tools.observations import execute_save_observation

TOOL_EXECUTORS: dict = {
    "generate_dashboard": execute_generate_dashboard,
    "search_meeting_notes": execute_search_meeting_notes,
    "compute_tax_position": execute_compute_tax_position,
    "model_salary_sacrifice": execute_model_salary_sacrifice,
    "save_observation": execute_save_observation,
}
```

**Step 4: Include tool in chat tools list**

In `helio/apps/api/app/services/chat.py`, where tools are assembled (around line 236-240):

```python
        from app.services.llm.claude import BASE_TOOLS, DASHBOARD_TOOLS, ENGINE_TOOLS, OBSERVATION_TOOLS

        tools = list(BASE_TOOLS)
        tools.extend(ENGINE_TOOLS)
        tools.extend(DASHBOARD_TOOLS)
        tools.extend(OBSERVATION_TOOLS)
```

**Step 5: Add instruction to system prompt**

In `helio/apps/api/app/services/system_prompt.py`, add to `_TOOL_INSTRUCTIONS` (after the "What NOT to do" section):

```python
### save_observation
Save a notable tax planning insight to the client's permanent record. Use this when you identify:
- A specific tax saving opportunity (e.g. "Marriage Allowance transfer would save £252/yr")
- A warning about an upcoming threshold or deadline
- A planning consideration from the conversation that the adviser should track

**When to use:** After identifying an actionable insight. Don't save trivial or obvious things.
**When NOT to use:** Don't save generic reminders, don't duplicate what the engine already flagged.
```

**Step 6: Commit**

```bash
git add helio/apps/api/app/services/llm/claude.py helio/apps/api/app/services/tools/observations.py helio/apps/api/app/services/tools/__init__.py helio/apps/api/app/services/chat.py helio/apps/api/app/services/system_prompt.py
git commit -m "feat(ai): add save_observation tool for Claude to persist advisory insights"
```

---

### Task 5: Add `POST /api/clients/{client_id}/observations` endpoint

**Files:**
- Modify: `helio/apps/api/app/routers/clients.py`

**Step 1: Add the endpoint**

Add after the `compute_client_tax_profile` endpoint:

```python
class CreateObservationRequest(BaseModel):
    title: str
    description: str
    severity: Literal["info", "warning", "opportunity"]
    category: str
    potential_saving: float | None = None
    source: Literal["engine", "ai"] = "ai"


@router.post("/clients/{client_id}/observations", status_code=201)
async def create_observation(
    client_id: str,
    body: CreateObservationRequest,
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """Create a single observation for a client."""
    result = await session.execute(
        select(Client).where(Client.id == client_id)
    )
    client = result.scalar_one_or_none()
    if client is None:
        raise HTTPException(status_code=404, detail="Client not found")

    priority = "high" if body.severity == "warning" else ("medium" if body.severity == "opportunity" else "low")

    obs = Observation(
        client_id=client_id,
        title=body.title,
        description=body.description,
        severity=body.severity,
        priority=priority,
        category=body.category,
        potential_saving=body.potential_saving,
        source=body.source,
    )
    session.add(obs)
    await session.flush()

    logger.info("Observation created", client_id=client_id, observation_id=obs.id, source=body.source)

    return {
        "id": obs.id,
        "title": obs.title,
        "description": obs.description,
        "severity": obs.severity,
        "priority": priority,
        "category": obs.category,
        "potential_saving": obs.potential_saving,
        "source": obs.source,
    }
```

**Step 2: Commit**

```bash
git add helio/apps/api/app/routers/clients.py
git commit -m "feat(api): add POST /api/clients/{client_id}/observations endpoint"
```

---

### Task 6: Frontend — add AI badge and source field

**Files:**
- Modify: `helio/apps/web/src/app/clients/page.tsx`

**Step 1: Add `source` to the Observation interface**

```typescript
interface Observation {
  id: string;
  tax_year?: string;
  title: string;
  description: string;
  severity: string;
  priority?: string;
  category?: string;
  potential_saving?: number | null;
  deadline?: string | null;
  action_required?: string | null;
  is_dismissed?: boolean;
  source?: string;
  created_at?: string;
}
```

**Step 2: Add AI badge in ObsItem**

In the `ObsItem` component, after the severity badge, add:

```tsx
{obs.source === "ai" && (
  <span className="text-[8px] font-semibold uppercase tracking-wider px-1.5 py-[1px] rounded bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400">
    AI
  </span>
)}
```

**Step 3: Commit**

```bash
git add helio/apps/web/src/app/clients/page.tsx
git commit -m "feat(web): show AI badge on AI-generated observations"
```
