# API CORS + Vercel troubleshooting runbook

Use this guide when requests from `https://www.ovalens.com` to
`https://ovalens-api.vercel.app` start failing with CORS errors.

## Quick diagnosis

Browser errors often say:

- `No 'Access-Control-Allow-Origin' header is present`
- `Response to preflight request doesn't pass access control check`
- `Failed to fetch`

These messages can be misleading. Most production incidents are one of:

1. API function is crashing (500) before FastAPI CORS middleware runs.
2. `CORS_ORIGINS` on Vercel does not include your live domain(s).

## 1) Check whether this is really CORS or a backend crash

From PowerShell:

```powershell
curl.exe -i -X OPTIONS "https://ovalens-api.vercel.app/api/clients" `
  -H "Origin: https://www.ovalens.com" `
  -H "Access-Control-Request-Method: GET" `
  -H "Access-Control-Request-Headers: authorization,content-type"
```

Interpretation:

- If you see `X-Vercel-Error: FUNCTION_INVOCATION_FAILED` or status `500`, backend is crashing.
- If you see `Disallowed CORS origin`, backend is alive but origin is not in allowlist.
- Healthy preflight should return `200 OK` and include:
  - `Access-Control-Allow-Origin: https://www.ovalens.com`

## 2) Inspect runtime logs

```powershell
npx vercel logs https://ovalens-api.vercel.app --no-follow --scope farandeads-projects
```

Look for import/startup errors (example we hit before):

- `ModuleNotFoundError: No module named 'jwt'`

If there is a module error, continue to step 3.

## 3) Fix dependency/lockfile drift (Python API)

In `apps/api`, Vercel installs from `uv.lock`. If `pyproject.toml` was updated but
`uv.lock` was not, production can crash.

```powershell
cd "d:\Projects\ovalens\OvalensPlanner\apps\api"
python -m uv lock
```

Then redeploy API:

```powershell
npx vercel --prod --yes --scope farandeads-projects
```

## 4) Verify `CORS_ORIGINS` on Vercel

List env vars:

```powershell
npx vercel env ls production --scope farandeads-projects
```

Recommended value for `CORS_ORIGINS` (JSON array):

```json
["https://www.ovalens.com","https://ovalens.com","https://ovalens-web.vercel.app","http://localhost:3000"]
```

If this is missing or wrong, update it in Vercel Dashboard:

- Project: `ovalens-api`
- Settings -> Environment Variables
- Key: `CORS_ORIGINS`
- Environments: Production (and Preview/Development if needed)

Redeploy after env changes:

```powershell
npx vercel --prod --yes --scope farandeads-projects
```

## 5) Final verification

Re-run preflight test:

```powershell
curl.exe -i -X OPTIONS "https://ovalens-api.vercel.app/api/clients" `
  -H "Origin: https://www.ovalens.com" `
  -H "Access-Control-Request-Method: GET" `
  -H "Access-Control-Request-Headers: authorization,content-type"
```

Expected:

- `HTTP/1.1 200 OK`
- `Access-Control-Allow-Origin: https://www.ovalens.com`

Optionally test normal API response with origin header:

```powershell
curl.exe -i "https://ovalens-api.vercel.app/api/clients" `
  -H "Origin: https://www.ovalens.com" `
  -H "Authorization: Bearer invalid"
```

You should get a JSON app response (often `401`) that still includes
`Access-Control-Allow-Origin`.

## Common gotchas

- Empty or malformed `CORS_ORIGINS` can block all origins.
- CORS errors in browser can be a symptom of server crashes, not just CORS config.
- If using auth, ensure `SUPABASE_JWT_SECRET` is set in `ovalens-api`.
- Keep lockfile (`uv.lock`) updated whenever Python dependencies change.

## Security notes

- Never commit tokens (`VERCEL_TOKEN`, API keys, secrets) to git.
- If a token is shared accidentally, rotate/revoke it in Vercel.
