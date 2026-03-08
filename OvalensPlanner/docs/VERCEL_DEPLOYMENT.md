# Deploying the Web App to Vercel

This project uses a Turborepo monorepo. The Next.js app lives in `apps/web`.

## One-time setup

1. **Import the project** in [Vercel](https://vercel.com/new):
   - Connect your Git repository (e.g. GitHub).
   - Set **Root Directory** to `OvalensPlanner/apps/web` (if your repo root is `ovalens`) or `apps/web` (if your repo root is `OvalensPlanner`).
   - Enable **Include source files outside of the Root Directory** so the monorepo (parent) is available for install and build.

2. **Build settings** (optional; `apps/web/vercel.json` already sets these):
   - **Framework Preset:** Next.js
   - **Build Command:** `cd ../.. && npx turbo run build --filter=@helio/web`
   - **Install Command:** `cd ../.. && npm install`

3. **Environment variables** (Project Settings → Environment Variables):
   - **`API_URL`** (or **`NEXT_PUBLIC_API_URL`**): full URL of your backend API in production (e.g. `https://your-api.railway.app` or `https://api.yourdomain.com`).  
     If unset, the app falls back to `http://localhost:8000` (dev only).  
     The Next.js app rewrites `/api/*` to this URL.

## Deploy

Push to your connected branch; Vercel will build and deploy. Preview deployments are created for other branches/PRs if configured.

## Backend (FastAPI) on Railway

The **API** (`apps/api`) is a FastAPI app. Deploy it to **Railway** (recommended) so migrations run before traffic and the same image can run the API and the optional context-ingest worker. See **[Railway deployment](RAILWAY_DEPLOYMENT.md)** for Root Directory, env vars, and worker setup. After deploy, set **NEXT_PUBLIC_API_URL** (or **API_URL**) on Vercel to your Railway API URL (e.g. `https://your-api.up.railway.app`).  
Alternatively you can host the API on Render, Fly.io, etc., and point Vercel at that URL.
