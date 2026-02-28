# CI/CD for Ovalens

## CI (GitHub Actions)

The pipeline runs on **push** and **pull_request** to `main`.

| Job   | What it does |
|-------|----------------|
| **API** | Python 3.12, `uv sync --all-extras`, Ruff lint, Pytest in `OvalensPlanner/apps/api` |
| **Web** | Node 20, `npm ci`, Turbo lint + type-check + build for `@helio/web` |

- **Location:** `.github/workflows/ci.yml` (repo root).
- **Required:** No secrets for CI. For a reliable web **build**, add optional repo secrets so Next.js can resolve env at build time:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  If not set, the workflow uses placeholders so the build still runs.

## CD (Deploy) via Vercel

Deploys are handled by **Vercel**, not by the workflow.

1. **Connect the repo** in the Vercel dashboard: **Add New Project** → import your Git repo.
2. **Configure two projects** (or reuse existing):
   - **Web:** Root directory = `OvalensPlanner`, build command e.g. `cd ../.. && npm ci && npx turbo run build --filter=@helio/web`, output = Next.js (see your existing Vercel config).
   - **API:** Root directory = `OvalensPlanner/apps/api`, use the existing serverless/`vercel.json` setup.
3. **Branches:**
   - Production: usually `main` → production URLs (e.g. `www.ovalens.com`, `ovalens-api.vercel.app`).
   - Other branches → preview deployments.
4. **Secrets:** Set all required env vars (and secrets) in the Vercel project settings for both API and Web.

CI does **not** trigger deploys; Vercel’s Git integration does that when you push. CI only checks that lint, type-check, tests, and build pass.

## Quick checklist

- [ ] Repo connected to Vercel for API and Web.
- [ ] Env vars and secrets set in Vercel for both projects.
- [ ] Optional: add `NEXT_PUBLIC_SUPABASE_*` to GitHub repo secrets if you want the CI web build to match production.
- [ ] Push to `main` (or open a PR) to confirm the CI workflow runs.
