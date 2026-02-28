# CI/CD for Ovalens

## CI (GitHub Actions)

The pipeline runs on **push** and **pull_request** to `main`.

| Job   | What it does |
|-------|----------------|
| **API** | Python 3.12, `uv sync --all-extras`, Ruff lint, Pytest in `OvalensPlanner/apps/api` |
| **Web** | Node 20, `npm ci`, Turbo lint + type-check + build for `@helio/web` |
| **Deploy API** | On push to `main` only: deploy `OvalensPlanner/apps/api` to Vercel (ovalens-api) |
| **Deploy Web** | On push to `main` only: deploy `OvalensPlanner` to Vercel (ovalens-web) |

- **Location:** `.github/workflows/ci.yml` (repo root).
- **CI secrets:** None required. Optional for web build: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or placeholders are used).

## CD (Deploy to Vercel from GitHub Actions)

On **push to `main`**, after the API and Web jobs succeed, the workflow deploys both apps to Vercel using the Vercel CLI.

### Required GitHub secrets (Settings → Secrets and variables → Actions)

| Secret | Description |
|--------|-------------|
| `VERCEL_TOKEN` | Vercel account token ([create](https://vercel.com/account/tokens)) |
| `VERCEL_ORG_ID` | Your Vercel team/org ID (from project Settings → General, or `.vercel/project.json` after `vercel link`) |
| `VERCEL_PROJECT_ID_API` | Project ID for the API (ovalens-api) |
| `VERCEL_PROJECT_ID_WEB` | Project ID for the Web (ovalens-web) |

To get org and project IDs: run `vercel link` in the API or Web project directory, then read `orgId` and `projectId` from `.vercel/project.json`.

### Vercel project setup

- **API:** Root directory = `OvalensPlanner/apps/api`; use existing `vercel.json` and env vars in Vercel.
- **Web:** Root directory = `OvalensPlanner`; build/output per your existing Vercel config. Set all env vars in the Vercel project settings.

Deploy jobs run only on **push** to `main` (not on pull requests). Preview deployments can still use Vercel’s Git integration if the repo is connected in Vercel.

## Quick checklist

- [ ] Add `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_API`, `VERCEL_PROJECT_ID_WEB` to GitHub repo secrets.
- [ ] Env vars and secrets set in Vercel for both API and Web projects.
- [ ] Optional: add `NEXT_PUBLIC_SUPABASE_*` to GitHub secrets so the CI web build matches production.
- [ ] Push to `main` to run CI and trigger production deploy.
