# Households View Design

**Date:** 2026-02-18
**Goal:** Add a households view to the client page via a sidebar toggle, letting users browse and view household summaries with member details and aggregated stats.

## Backend

New endpoint: `GET /api/households`

Returns all households for the current user with members and aggregated tax data. Response includes: household id, name, notes, member_count, members array (each with id, name, email, employment_status, total_income, total_tax, effective_rate), and aggregates (total_income, total_tax, avg_effective_rate).

## Frontend — Sidebar

Segmented control at top of sidebar: `[Clients] [Households]`. In households mode, sidebar lists household rows (name + member count badge). Search filters by household name. "+" button still opens add-client panel.

## Frontend — Main Content (Household Selected)

- **Header**: Household name, member count, notes
- **Members grid**: Card per member with gradient avatar, name, employment badge, income, effective rate, "View profile →" link
- **Combined stats**: 3 metric cards (Total Income, Total Tax, Avg Effective Rate)
- Styled to match chat page design language

## State Management

All in existing `page.tsx`:
- `sidebarMode: "clients" | "households"`
- `households: HouseholdSummary[]`, `selectedHouseholdId: string | null`
- Fetched on mount alongside client list
- "View profile" sets sidebarMode back to "clients" and selects the member
