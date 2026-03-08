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

The **API** (`apps/api`) is a FastAPI app. Deploy it to **Railway** first (see **[Railway deployment](RAILWAY_DEPLOYMENT.md)**). Then connect the frontend as below.

### Hook the frontend to your Railway backend

1. **Get your API URL**  
   In Railway, open your **API** service → **Settings** → **Networking** (or **Deployments**). Copy the public URL, e.g. `https://your-api-name.up.railway.app` (no trailing slash).

2. **Set env vars on the Vercel project** (the **web** app, not the API):
   - **Vercel** → your **web** project → **Settings** → **Environment Variables**.
   - Add these for **Production** (and **Preview** if you want preview deploys to use the same API):

   | Name | Value | Notes |
   |------|--------|------|
   | **NEXT_PUBLIC_API_URL** | `https://your-api-name.up.railway.app` | Used by Next.js rewrites and client; must match your Railway API URL. |
   | **API_URL** | Same as above | Used at build time for rewrites; set so `/api/*` and `/metrics` proxy to Railway. |
   | **BACKEND_URL** | Same as above | Used by server-side code (e.g. chat stream proxy). |

   Use the **exact** Railway URL (no trailing slash). Leave other vars (Supabase, Sentry, etc.) as you already have them.

3. **Redeploy the web app**  
   Trigger a new deployment (e.g. **Deployments** → **Redeploy** on latest, or push a commit). The build will use the new API URL for rewrites; at runtime the browser and server will call your Railway API.

4. **CORS**  
   The API already allows `https://ovalens-web.vercel.app`, `https://www.ovalens.com`, and `https://ovalens.com`. If your Vercel URL is different (e.g. `https://your-project.vercel.app`), add it on **Railway** by setting **CORS_ORIGINS** on the API service (e.g. `["https://your-project.vercel.app","https://www.ovalens.com"]` or a comma-separated list).

After this, the frontend will use your Railway backend for `/api/*` and chat streaming.
