# Expanded Observations Design

## Overview

Enrich the observation system with two layers: more deterministic engine rules for common tax planning scenarios, and a new AI tool that lets Claude save advisory insights during chat conversations. Observations are tagged by source (`engine` vs `ai`) for audit trail and recompute safety.

## Database Change

Add `source` column to Observation model: `"engine"` (default) or `"ai"`. When tax profile is recomputed, only `source='engine'` observations are deleted and regenerated. AI observations are preserved across recomputes.

## New Engine Rules

| Rule | Severity | Condition | Category |
|------|----------|-----------|----------|
| Marriage Allowance Eligibility | opportunity | Basic/non-taxpayer with income under PA threshold | income_tax |
| Savings Allowance Tracking | info | PSA varies by band: £1k basic / £500 higher / £0 additional | savings |
| Dividend vs Salary Flag | opportunity | Director/self-employed with >£50k, dividends present | income_tax |
| Gift Aid Higher-Rate Relief | opportunity | Higher/additional rate taxpayer with gift aid > 0 | income_tax |
| CGT Annual Exemption Reminder | info | CGT gains provided, AEA partially/fully used | capital_gains |

## AI `save_observation` Tool

New chat tool callable by Claude:

- **Parameters:** title, description, severity (info/warning/opportunity), category, potential_saving (optional)
- **Behavior:** Saves to DB with `source='ai'`, linked to current client
- **System prompt:** Claude instructed to call this when it identifies actionable tax planning insights during conversation
- **Persistence:** Survives tax profile recomputes

## API Endpoint

`POST /api/clients/{client_id}/observations` — creates a single observation. Used by chat tool handler. Returns created observation.

## Frontend

AI observations get a small "AI" badge next to the severity badge. All other display (cards, dismiss, styling) unchanged.
