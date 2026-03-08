# Environment setup

Use the `.env.example` files as templates. **Never commit real secrets.**

## Quick start

1. **Root** (for CI/deploy only):  
   `cp .env.example .env` at repo root → set `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID_*` if you use the deploy workflow.

2. **API** (OvalensPlanner/apps/api):  
   `cp .env.example .env` → set `ANTHROPIC_API_KEY` (required for chat). For local dev, SQLite is used by default.  
   **Beta/production:** set `DATABASE_URL` (Supabase Postgres URI) and `SUPABASE_JWT_SECRET`.

3. **Web** (OvalensPlanner/apps/web):  
   `cp .env.example .env` → set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase → Project Settings → API).  
   **Beta/production:** set `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`, and `BACKEND_URL` to your deployed URLs.

## Redis (API: rate limiting + async context ingest)

Redis is **optional**. When set, the API uses it for:

- **Rate limiting** — shared across instances (important if you run multiple API replicas).
- **Context ingest** — POST `/api/context/ingest` returns **202** and enqueues a job; a **worker** processes it. Without Redis, ingest runs synchronously (200).

**Local**

1. Install Redis:
   - **Windows:** [WSL](https://docs.microsoft.com/en-us/windows/wsl/install) and `sudo apt install redis-server`, or [Memurai](https://www.memurai.com/) (Redis-compatible), or [Docker](https://docs.docker.com/get-docker/): `docker run -d -p 6379:6379 redis:7-alpine`.
   - **macOS:** `brew install redis` then `brew services start redis` (or run `redis-server`).
   - **Linux:** `sudo apt install redis-server` (or equivalent) and start the service.
2. In **API** `.env` (OvalensPlanner/apps/api): set  
   `REDIS_URL=redis://localhost:6379/0`  
   Use database `0` for dev; use `1` (or another index) for tests if you run Redis tests: `REDIS_URL=redis://localhost:6379/1`.
3. (Optional) Run the context ingest worker: from `apps/api`,  
   `python scripts/context_ingest_worker.py`  
   Requires `REDIS_URL` and `DATABASE_URL` (or default SQLite).

**Production (e.g. Railway)**

1. Add Redis to your backend project:
   - **Railway:** New → Database → **Redis**, or use an external Redis (Upstash, Redis Cloud, etc.).
   - Copy the Redis URL (e.g. `redis://default:PASSWORD@host:port` or `rediss://...` for TLS).
2. In your **API** environment variables set **`REDIS_URL`** to that URL (same env as `DATABASE_URL`).
3. Deploy the **worker** as a separate process (same codebase): run `python scripts/context_ingest_worker.py` with the same `REDIS_URL` and `DATABASE_URL`. On Railway you can add a second service that runs the worker command.

If **REDIS_URL** is unset, the API still runs: rate limiting is in-memory (per process) and context ingest is synchronous.

## Where to get values

- **DATABASE_URL:** Supabase → Project Settings → Database → Connection string (URI). Required for beta/prod.
- **SUPABASE_JWT_SECRET:** Supabase → Project Settings → API → JWT Secret.
- **NEXT_PUBLIC_SUPABASE_*:** Supabase → Project Settings → API → Project URL and anon/public key (safe to expose in browser).
- **Vercel:** Dashboard project/org IDs; token from Vercel account settings (use GitHub Secrets for CI).
- **Sentry:** See [Sentry](#sentry) below.

## Sentry

Add these only if you use Sentry for error monitoring. Leave unset to disable.

| Where | Variable | Purpose |
|-------|----------|---------|
| **API** — `OvalensPlanner/apps/api/.env` | `SENTRY_DSN` | Sentry project DSN (API project in Sentry). Optional: `SENTRY_RELEASE` (e.g. `ovalens-api@0.0.1`). |
| **Web** — `OvalensPlanner/apps/web/.env` | `NEXT_PUBLIC_SENTRY_DSN` | Same or different Sentry project DSN; must be `NEXT_PUBLIC_` so the browser can send events. Optional: `NEXT_PUBLIC_SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_SENTRY_RELEASE`. |
| **Web (server/edge)** | `SENTRY_DSN` | Can be set instead of or in addition to `NEXT_PUBLIC_SENTRY_DSN` for server-side; server config falls back to `NEXT_PUBLIC_SENTRY_DSN`. |
| **Source maps (CI or Vercel)** | `SENTRY_ORG` | Sentry org slug (e.g. from URL: sentry.io/organizations/**org-slug**/). |
| | `SENTRY_PROJECT` | Sentry project slug for the **web** app (used by `withSentryConfig` to upload source maps). |
| | `SENTRY_AUTH_TOKEN` | Auth token from Sentry → Settings → Auth Tokens. Needed only if you upload source maps in build (Vercel or CI). |

**Where to add them**

- **Local:** In each app’s `.env` (copy from the app’s `.env.example`). API: `apps/api/.env`. Web: `apps/web/.env`.
- **Vercel (API project):** Project **ovalens-api** → Settings → Environment Variables → add `SENTRY_DSN` (and optionally `SENTRY_RELEASE`) for Production/Preview/Development as needed.
- **Vercel (Web project):** Project **ovalens-web** → Settings → Environment Variables → add `NEXT_PUBLIC_SENTRY_DSN` (and optionally `NEXT_PUBLIC_SENTRY_ENVIRONMENT`, `NEXT_PUBLIC_SENTRY_RELEASE`). For source map uploads add `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN` (mark as sensitive).
- **GitHub Actions (CI):** Only if your workflow uploads source maps or needs Sentry in CI — add `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` as repository secrets and pass them into the job env.

**Getting the DSN:** Sentry → Your project → Settings → Client Keys (DSN). Use the same project for API and web or create separate projects and use two DSNs.

## Troubleshooting: API returns 500 for `/api/clients` or `/api/chat/conversations`

The web app proxies these to the **Ovalens API** (Next.js rewrites). If you see **HTTP 500** or **"Failed to load clients"** / **"Unexpected token 'A'"** (non-JSON response), the API is failing.

1. **API running?**  
   For local dev the API must be running (e.g. `uvicorn` in `apps/api`). The web app uses `NEXT_PUBLIC_API_URL` or `API_URL` (in `next.config.js`) to proxy; that must point at the running API (e.g. `http://localhost:8000`).

2. **API env (apps/api/.env):**  
   - **DATABASE_URL** — required if you use Postgres/Supabase. Wrong URL or unreachable DB causes 500.  
   - **SUPABASE_JWT_SECRET** — required for validating the frontend’s Bearer token (Supabase → Project Settings → API → JWT Secret). If missing, auth can fail with 501; wrong value can cause 401 or downstream errors.

3. **See the real error:**  
   Run the API in a terminal and watch the logs. Unhandled errors are logged with `unhandled_exception` and the full traceback. The API now returns **JSON** on 500 (`{"error":{"code":"INTERNAL_ERROR","message":"..."}}`) so the frontend won’t break with "invalid JSON"; the underlying cause will still appear in the **API** logs.

## Secrets hygiene

- `.gitignore` excludes `.env` and `.env.*` except `.env.example`. Only `.env.example` (with placeholders) may be committed.
- If `docs/ENV-VARIABLES.txt` or any `.env` file with **real values** was ever committed, **rotate those secrets** (Vercel token, Supabase keys, API keys) and use the `.env.example` files above for setup.
