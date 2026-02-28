# Production auth setup (www.ovalens.com)

Use this checklist so Google sign-in works in production.

## Local development

To sign in on **localhost** without being redirected to production:

- **Supabase → Authentication → URL Configuration → Redirect URLs:** add `http://localhost:3000` and `http://localhost:3000/**` (and the same for any other port you use, e.g. `http://localhost:3001/**`).
- The app uses the **current browser origin** for the OAuth redirect when you’re on `localhost` or `127.0.0.1`, so you don’t need to set `NEXT_PUBLIC_APP_URL` to localhost in `.env`; it will redirect back to localhost even if that variable is set to the production URL.

## 1. Supabase Dashboard

1. Go to [Supabase](https://supabase.com/dashboard) → your project.
2. **Authentication → URL Configuration**
   - **Site URL:** `https://www.ovalens.com`
   - **Redirect URLs:** Add (one per line):
     - `https://www.ovalens.com`
     - `https://www.ovalens.com/**`
     - For local dev: `http://localhost:3000` and `http://localhost:3000/**`
     - If you also use the non-www domain: `https://ovalens.com` and `https://ovalens.com/**`
3. **Authentication → Providers → Google**  
   Ensure Google is enabled and your OAuth client IDs are set.

4. **Google Cloud Console** (for the OAuth 2.0 Client ID used by Supabase):
   - Open [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → your OAuth 2.0 Client ID (Web application).
   - **Authorized JavaScript origins** (where sign-in is *started* from the browser):
     - `https://www.ovalens.com`
     - If you use the non-www domain: `https://ovalens.com`
     - For local dev: `http://localhost:3000`
   - **Authorized redirect URIs** (where Google sends the user *after* sign-in; Supabase handles the callback):
     - `https://<your-project-ref>.supabase.co/auth/v1/callback`  
     (Supabase shows the exact URL in Authentication → Providers → Google.)

## 2. Vercel (ovalens-web) environment variables

In **Vercel → ovalens-web → Settings → Environment Variables**, set for **Production** (and Preview if you want):

| Name | Value | Notes |
|------|--------|--------|
| `NEXT_PUBLIC_APP_URL` | `https://www.ovalens.com` | Used as OAuth redirect target (no trailing slash). |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://lfwfbhscvrgmfaopsbtc.supabase.co` | Same as local. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | Same as local (publishable key only). |
| `NEXT_PUBLIC_API_URL` | `https://ovalens-api.vercel.app` | Backend API for production. |
| `BACKEND_URL` | `https://ovalens-api.vercel.app` | Server-side proxy to API. |

Redeploy ovalens-web after changing env vars.

## 3. Domain and redirects

- Point **www.ovalens.com** (and optionally **ovalens.com**) to the Vercel project in your DNS (Vercel will show the required records).
- If you use both **ovalens.com** and **www.ovalens.com**, add both to Supabase **Redirect URLs** (as in step 1).

After this, "Continue with Google" on https://www.ovalens.com should complete and redirect back to your app.

## 4. Vercel (ovalens-api) — avoid 500 / CORS

If the API returns **500** or the browser reports **CORS** (no `Access-Control-Allow-Origin`), the serverless function may be crashing before it can send headers. In **Vercel → ovalens-api → Settings → Environment Variables**, set for **Production**:

| Name | Value |
|------|--------|
| `DATABASE_URL` | Your Supabase connection string (Postgres URI from Supabase → Project Settings → Database). |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret (Project Settings → API → JWT Secret) so the API can validate auth tokens. |
| `ANTHROPIC_API_KEY` | For chat/AI. |
| `CORS_ORIGINS` | Optional. Leave unset to use defaults (www.ovalens.com, ovalens.com, localhost). If you set it, use a valid JSON array, e.g. `["https://www.ovalens.com","https://ovalens.com"]` — an empty value would block all origins. |

Redeploy ovalens-api after changing env vars. If the API still crashes, check the deployment logs in Vercel. “Continue with Google” on https://www.ovalens.com should complete and redirect back to your app.

## 5. Troubleshooting runbook

If production requests still fail with CORS or `Failed to fetch`, use:

- `docs/API-CORS-TROUBLESHOOTING.md`
