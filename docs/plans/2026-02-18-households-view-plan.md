# Households View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a sidebar toggle between Clients/Households modes, with a new households list endpoint and household summary main content view.

**Architecture:** New `GET /api/households` endpoint returns households with members and aggregated stats. Frontend adds sidebar mode state, a segmented control toggle, household list rows, and a household detail view in the main content area. All within existing `page.tsx` — no new routes.

**Tech Stack:** FastAPI (Python), SQLAlchemy async, Next.js, React, Tailwind CSS, Framer Motion

---

### Task 1: Add `GET /api/households` endpoint

**Files:**
- Modify: `helio/apps/api/app/routers/clients.py`

**Step 1: Add the endpoint after the existing `list_clients` endpoint (after line ~136)**

```python
@router.get("/households")
async def list_households(
    session: AsyncSession = Depends(get_db_session),
    logger: BoundLogger = Depends(get_request_logger),
):
    """List all households with members and aggregated tax data."""
    user_id = "demo-user"

    logger.info("Listing households", user_id=user_id)

    result = await session.execute(
        select(Household).where(Household.user_id == user_id)
    )
    households = list(result.scalars().all())

    households_out = []
    for hh in households:
        # Fetch all clients in this household
        clients_result = await session.execute(
            select(Client).where(Client.household_id == hh.id)
        )
        clients = list(clients_result.scalars().all())

        members = []
        total_income = 0.0
        total_tax = 0.0
        rate_sum = 0.0
        rate_count = 0

        for client in clients:
            # Fetch latest tax profile
            tp_result = await session.execute(
                select(TaxProfile)
                .where(TaxProfile.client_id == client.id)
                .order_by(desc(TaxProfile.created_at))
                .limit(1)
            )
            tp = tp_result.scalar_one_or_none()

            income = tp.total_income if tp else None
            tax = tp.total_tax if tp else None
            eff_rate = tp.effective_rate if tp else None

            members.append({
                "id": client.id,
                "first_name": client.first_name,
                "last_name": client.last_name,
                "email": client.email,
                "employment_status": client.employment_status,
                "total_income": income,
                "total_tax": tax,
                "effective_rate": eff_rate,
            })

            if income is not None:
                total_income += income
            if tax is not None:
                total_tax += tax
            if eff_rate is not None:
                rate_sum += eff_rate
                rate_count += 1

        households_out.append({
            "id": hh.id,
            "name": hh.name,
            "notes": hh.notes,
            "member_count": len(members),
            "members": members,
            "total_income": total_income,
            "total_tax": total_tax,
            "avg_effective_rate": round(rate_sum / rate_count, 1) if rate_count > 0 else None,
        })

    logger.info("Households listed", count=len(households_out))

    return {"households": households_out}
```

**Step 2: Test the endpoint manually**

Run: `cd helio/apps/api && python -m uvicorn app.main:app --reload --port 8000`
Then: `curl http://localhost:8000/api/households | python -m json.tool`
Expected: JSON with `households` array containing `hh-mitchell` with 2 members (Sarah + James), aggregated income/tax.

**Step 3: Commit**

```bash
git add helio/apps/api/app/routers/clients.py
git commit -m "feat(api): add GET /api/households endpoint with member aggregates"
```

---

### Task 2: Add TypeScript types and household state to page.tsx

**Files:**
- Modify: `helio/apps/web/src/app/clients/page.tsx`

**Step 1: Add HouseholdSummary and HouseholdMember interfaces**

After the existing `ClientDetail` interface (around line 178), add:

```tsx
interface HouseholdMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  employment_status?: string;
  total_income?: number;
  total_tax?: number;
  effective_rate?: number;
}

interface HouseholdSummary {
  id: string;
  name: string;
  notes?: string | null;
  member_count: number;
  members: HouseholdMember[];
  total_income: number;
  total_tax: number;
  avg_effective_rate?: number | null;
}
```

**Step 2: Add new state variables**

Inside `ClientsPage()`, after the existing `useState` declarations (around line 640), add:

```tsx
const [sidebarMode, setSidebarMode] = useState<"clients" | "households">("clients");
const [households, setHouseholds] = useState<HouseholdSummary[]>([]);
const [selectedHouseholdId, setSelectedHouseholdId] = useState<string | null>(null);
const [householdsLoading, setHouseholdsLoading] = useState(true);
```

**Step 3: Add household fetch in the initial useEffect**

In the existing `/* Fetch list */` useEffect, add a parallel fetch for households. Replace the entire useEffect block with:

```tsx
/* Fetch lists */
useEffect(() => {
  (async () => {
    try {
      const [clientsRes, householdsRes] = await Promise.all([
        fetch(`${API_BASE}/api/clients`),
        fetch(`${API_BASE}/api/households`),
      ]);
      const clientsData = await clientsRes.json();
      const householdsData = await householdsRes.json();

      const list: ClientSummary[] = clientsData.clients || [];
      setClients(list);
      if (list.length > 0) setSelectedId(list[0].id);

      const hhList: HouseholdSummary[] = householdsData.households || [];
      setHouseholds(hhList);
      if (hhList.length > 0) setSelectedHouseholdId(hhList[0].id);
    } catch { /* noop */ }
    finally {
      setLoading(false);
      setHouseholdsLoading(false);
    }
  })();
}, []);
```

**Step 4: Add filtered households for search**

After the existing `filtered` useMemo (around line 716), add:

```tsx
const filteredHouseholds = useMemo(() => {
  if (!search.trim()) return households;
  const q = search.toLowerCase();
  return households.filter((h) => h.name.toLowerCase().includes(q));
}, [households, search]);

const selectedHousehold = useMemo(
  () => households.find((h) => h.id === selectedHouseholdId) || null,
  [households, selectedHouseholdId]
);
```

**Step 5: Add a helper to navigate from household member to client**

```tsx
const viewMemberProfile = useCallback((memberId: string) => {
  setSidebarMode("clients");
  setSelectedId(memberId);
}, []);
```

**Step 6: Commit**

```bash
git add helio/apps/web/src/app/clients/page.tsx
git commit -m "feat(web): add household types, state, and data fetching"
```

---

### Task 3: Add sidebar segmented control and household list

**Files:**
- Modify: `helio/apps/web/src/app/clients/page.tsx`

**Step 1: Add HouseholdRow sub-component**

After the existing `ClientRow` component (around line 327), add:

```tsx
/* ── Sidebar household row ── */

function HouseholdRow({ household, active, onSelect }: { household: HouseholdSummary; active: boolean; onSelect: () => void }) {
  return (
    <button onClick={onSelect} className="w-full text-left group relative">
      {active && (
        <motion.div
          layoutId="active-hh-indicator"
          className="absolute left-0 top-1 bottom-1 w-[3px] rounded-full bg-brand-500"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ml-1 transition-all duration-200 ${
        active ? "bg-brand-50/80 dark:bg-brand-950/20 ring-1 ring-brand-200/50 dark:ring-brand-800/30" : "hover:bg-slate-50 dark:hover:bg-zinc-900/50"
      }`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-100 to-violet-100 dark:from-brand-900/40 dark:to-violet-900/40 flex items-center justify-center flex-shrink-0">
          <IconUser className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[13px] font-medium truncate transition-colors ${active ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-zinc-300"}`}>
            {household.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-light text-slate-400 dark:text-zinc-500">
              {household.member_count} {household.member_count === 1 ? "member" : "members"}
            </span>
            {household.total_income > 0 && (
              <>
                <span className="text-slate-300 dark:text-zinc-700 text-[8px]">&middot;</span>
                <span className="text-[10px] font-mono font-light text-slate-400 dark:text-zinc-500">{fmt(household.total_income)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
```

**Step 2: Add the segmented control in the sidebar**

Find the sidebar `{/* Search + Add */}` section. Replace the line:
```tsx
<span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] flex-1">Clients</span>
```

With this segmented control + add button:

```tsx
<div className="flex items-center gap-1 flex-1 p-0.5 rounded-lg bg-slate-100/80 dark:bg-zinc-800/50">
  {(["clients", "households"] as const).map((mode) => (
    <button
      key={mode}
      onClick={() => setSidebarMode(mode)}
      className={`flex-1 text-[10px] font-medium py-1 rounded-md transition-all duration-150 ${
        sidebarMode === mode
          ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm"
          : "text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300"
      }`}
    >
      {mode === "clients" ? "Clients" : "Households"}
    </button>
  ))}
</div>
```

**Step 3: Conditionally render client list or household list**

Find the sidebar `{/* List */}` section. Replace the entire list div contents to conditionally render based on `sidebarMode`:

```tsx
<div className="flex-1 overflow-y-auto pb-2">
  {sidebarMode === "clients" ? (
    <>
      {loading ? (
        <div className="space-y-1 px-3 animate-pulse">
          {[...Array(6)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-[var(--surface)]" />)}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-[12px] text-slate-400 dark:text-zinc-500 font-light py-8">No clients found</p>
      ) : (
        filtered.map((c) => (
          <ClientRow key={c.id} client={c} active={c.id === selectedId} onSelect={() => setSelectedId(c.id)} />
        ))
      )}
    </>
  ) : (
    <>
      {householdsLoading ? (
        <div className="space-y-1 px-3 animate-pulse">
          {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded-lg bg-[var(--surface)]" />)}
        </div>
      ) : filteredHouseholds.length === 0 ? (
        <p className="text-center text-[12px] text-slate-400 dark:text-zinc-500 font-light py-8">No households found</p>
      ) : (
        filteredHouseholds.map((h) => (
          <HouseholdRow key={h.id} household={h} active={h.id === selectedHouseholdId} onSelect={() => setSelectedHouseholdId(h.id)} />
        ))
      )}
    </>
  )}
</div>
```

**Step 4: Commit**

```bash
git add helio/apps/web/src/app/clients/page.tsx
git commit -m "feat(web): add sidebar segmented control and household list"
```

---

### Task 4: Add household detail main content view

**Files:**
- Modify: `helio/apps/web/src/app/clients/page.tsx`

**Step 1: Add HouseholdDetail sub-component**

After the `Skeleton` component (around line 625), add:

```tsx
/* ── Household detail view ── */

function HouseholdDetail({
  household,
  onViewMember,
}: {
  household: HouseholdSummary;
  onViewMember: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[24px] font-semibold text-slate-900 dark:text-white tracking-[-0.025em] leading-none">
          {household.name}
        </h1>
        <p className="text-[13px] font-light text-slate-400 dark:text-zinc-500 mt-2">
          {household.member_count} {household.member_count === 1 ? "member" : "members"}
        </p>
        {household.notes && (
          <p className="text-[12px] font-light text-slate-500 dark:text-zinc-400 mt-2 leading-relaxed">{household.notes}</p>
        )}
      </div>

      {/* Combined stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Income", value: `£${household.total_income.toLocaleString("en-GB", { maximumFractionDigits: 0 })}` },
          { label: "Total Tax", value: `£${household.total_tax.toLocaleString("en-GB", { maximumFractionDigits: 0 })}` },
          { label: "Avg Effective Rate", value: household.avg_effective_rate != null ? `${household.avg_effective_rate}%` : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="refined-card rounded-xl p-5">
            <p className="text-[10px] font-medium text-slate-400 dark:text-zinc-500 uppercase tracking-[0.08em] mb-3">{label}</p>
            <p className="text-[22px] font-semibold font-mono tracking-tight text-slate-900 dark:text-white leading-none">{value}</p>
          </div>
        ))}
      </div>

      {/* Members */}
      <div>
        <h2 className="text-[13px] font-semibold text-slate-900 dark:text-white mb-3">Members</h2>
        <div className="grid grid-cols-2 gap-4">
          {household.members.map((member) => {
            const [g1, g2] = avatarGradient(`${member.first_name} ${member.last_name}`);
            return (
              <div key={member.id} className="refined-card rounded-xl p-4 group">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-[13px] font-semibold shadow-sm shadow-brand-500/20"
                    style={{ background: `linear-gradient(135deg, ${g1}, ${g2})` }}
                  >
                    {member.first_name[0]}{member.last_name[0]}
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-slate-900 dark:text-white">{member.first_name} {member.last_name}</p>
                    {member.employment_status && (
                      <span className="text-[10px] font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/30 px-1.5 py-[1px] rounded">
                        {member.employment_status}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 mb-3">
                  {member.total_income != null && (
                    <div>
                      <p className="text-[9px] font-light text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Income</p>
                      <p className="text-[14px] font-mono font-medium text-slate-900 dark:text-white">
                        £{member.total_income.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  )}
                  {member.effective_rate != null && (
                    <div>
                      <p className="text-[9px] font-light text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Effective</p>
                      <p className="text-[14px] font-mono font-medium text-slate-900 dark:text-white">{member.effective_rate.toFixed(1)}%</p>
                    </div>
                  )}
                  {member.total_tax != null && (
                    <div>
                      <p className="text-[9px] font-light text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Tax</p>
                      <p className="text-[14px] font-mono font-medium text-slate-900 dark:text-white">
                        £{member.total_tax.toLocaleString("en-GB", { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => onViewMember(member.id)}
                  className="flex items-center gap-1 text-[11px] font-medium text-brand-500 dark:text-brand-400 hover:text-brand-600 dark:hover:text-brand-300 transition-colors"
                >
                  View profile <IconArrowRight className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Conditionally render main content based on sidebar mode**

Find the `<main>` element. Wrap the existing client detail content so it only renders when `sidebarMode === "clients"`, and add the household view for the other mode.

Replace the main content area (everything inside `<main className="flex-1 overflow-y-auto relative z-10">`) with:

```tsx
<main className="flex-1 overflow-y-auto relative z-10">
  <div className="max-w-[860px] mx-auto px-10 py-10">
    {sidebarMode === "clients" ? (
      <AnimatePresence mode="wait">
        {/* ... existing client detail content stays exactly as-is ... */}
      </AnimatePresence>
    ) : (
      <AnimatePresence mode="wait">
        {householdsLoading || !selectedHousehold ? (
          <motion.div key="hh-skel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Skeleton />
          </motion.div>
        ) : (
          <motion.div
            key={selectedHousehold.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <HouseholdDetail
              household={selectedHousehold}
              onViewMember={viewMemberProfile}
            />
          </motion.div>
        )}
      </AnimatePresence>
    )}
  </div>
</main>
```

**Important:** Keep the entire existing client detail `AnimatePresence` block exactly as-is inside the `sidebarMode === "clients"` branch. Do NOT delete or modify any existing client rendering logic.

**Step 3: Commit**

```bash
git add helio/apps/web/src/app/clients/page.tsx
git commit -m "feat(web): add household detail view with member cards and aggregated stats"
```

---

### Task 5: Build and verify

**Step 1: Run the API**

Run: `cd helio/apps/api && python -m uvicorn app.main:app --reload --port 8000`

**Step 2: Test the endpoint**

Run: `curl -s http://localhost:8000/api/households | python -m json.tool`
Expected: JSON with Mitchell Household, 2 members, aggregated income/tax.

**Step 3: Build the frontend**

Run: `cd helio/apps/web && npm run build`
Expected: Build succeeds, no TypeScript or lint errors.

**Step 4: Manual verification checklist**

- [ ] Sidebar shows Clients/Households segmented control
- [ ] Switching to Households mode shows household list
- [ ] Clicking a household shows the detail view with members + stats
- [ ] "View profile" on a member card switches to Clients mode and selects that client
- [ ] Search filters households by name
- [ ] Switching back to Clients mode shows the normal client view
- [ ] "+" button still opens add-client panel in both modes

**Step 5: Final commit if adjustments needed**

```bash
git add -A
git commit -m "feat: households view with sidebar toggle and member summary"
```
