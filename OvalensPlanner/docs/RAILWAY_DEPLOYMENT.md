# Deploying the API to Railway

This doc describes how to deploy the **Ovalens API** (`apps/api`) to [Railway](https://railway.app/) so migrations run before traffic and the app is ready for production (Supabase Postgres, optional Redis, optional worker).

## Prerequisites

- Railway account and CLI (optional): `npm i -g @railway/cli` then `railway login`
- Supabase project: **DATABASE_URL** (Postgres) and **SUPABASE_JWT_SECRET**
- Optional: Redis (Railway plugin or external) for **REDIS_URL**

## One-time setup

### 1. Create a Railway project

1. In [Railway](https://railway.app/), **New Project**.
2. **Add service** → **GitHub repo** (or **Empty** and deploy with CLI).
3. Connect the repo that contains `OvalensPlanner` (or your monorepo root).

### 2. Configure the API service

- **Root Directory:** Set to the directory that contains the API and its `Dockerfile`.
  - If repo root is `ovalens` and API is in `OvalensPlanner/apps/api` → use **`OvalensPlanner/apps/api`**.
  - If repo root is `OvalensPlanner` → use **`apps/api`**.
- **Build:** Railway will detect the **Dockerfile** in that root and build the image. No need to set a custom build command unless you use a different Dockerfile path.
- **Start:** The Dockerfile **CMD** runs `alembic upgrade head` then `uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Railway sets **PORT**; leave start command empty so the image CMD is used.

### 3. Environment variables

In the API service → **Variables**, set at least:

| Variable | Required | Description |
|----------|----------|-------------|
| **DATABASE_URL** | Yes (prod) | Supabase Postgres URI. Use **connection pooler** (port 6543) for serverless; direct (5432) is fine for long-lived containers. |
| **SUPABASE_JWT_SECRET** | Yes (prod) | Supabase → Project Settings → API → JWT Secret. |
| **ENVIRONMENT** | Recommended | `production` or `beta`. |
| **ANTHROPIC_API_KEY** | Yes (for chat) | Anthropic API key. |
| **REDIS_URL** | No | When set: Redis-backed rate limiting and async context ingest (202 + worker). When unset: in-memory rate limit and sync ingest. |
| **PORT** | Set by Railway | Do not override unless needed. |

Optional: **SENTRY_DSN**, **CORS_ORIGINS**, **RATE_LIMIT_***, etc. See `apps/api/.env.example`.

### 4. Deploy

- Push to the connected branch or run **Deploy** in the dashboard. Railway builds the Docker image and runs the container. On each deploy, **migrations run first** (`alembic upgrade head`), then uvicorn starts.
- Open the generated URL (e.g. `https://your-api.up.railway.app`) and check **/health** and **/ready**.

## Optional: Context ingest worker (when using Redis)

If **REDIS_URL** is set, you can run a **worker** that processes context ingest jobs (LLM cleanup). Use the **same image** and **same env vars**, with a different start command.

1. In the same Railway project, **Add service** → **From same repo** (or duplicate the API service).
2. Set **Root Directory** to the same as the API (`OvalensPlanner/apps/api` or `apps/api`).
3. **Build:** Same Dockerfile (same image).
4. **Start command (override):**  
   `python scripts/context_ingest_worker.py`  
   (No migrations; worker only consumes the queue.)
5. **Variables:** Same as API (at least **DATABASE_URL**, **REDIS_URL**; **ANTHROPIC_API_KEY** for LLM cleanup). No need to expose a public URL for the worker.

The API and worker share **REDIS_URL** and **DATABASE_URL**; the API enqueues jobs, the worker pops and processes them.

## Optional: Redis on Railway

- In the project, **New** → **Database** → **Redis**. Railway will add **REDIS_URL** (or a reference). Attach it to the API (and worker) service so they receive the variable.
- Or use an external Redis (Upstash, Redis Cloud) and set **REDIS_URL** manually.

## Frontend (Vercel) → API URL

In your **Vercel** project (web app), set **NEXT_PUBLIC_API_URL** or **API_URL** to the Railway API URL (e.g. `https://your-api.up.railway.app`). The Next.js app will send API requests to that host.

## Summary

- **One API service:** Root Directory = path to `apps/api`, Dockerfile runs migrate then uvicorn. Set **DATABASE_URL**, **SUPABASE_JWT_SECRET**, **ENVIRONMENT**, **ANTHROPIC_API_KEY** (and optionally **REDIS_URL**).
- **Optional worker:** Second service, same image, start command `python scripts/context_ingest_worker.py`, same env.
- **Migrations:** Run automatically on every API container start before uvicorn; no separate migration job required.
