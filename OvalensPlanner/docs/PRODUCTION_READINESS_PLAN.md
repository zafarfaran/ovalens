# Production readiness plan — Ovalens (beta)

This document is an **AI engineer / staff engineer** view of what’s needed to make the existing Ovalens stack production-grade for **beta testers**: observability (logging, metrics, tracing, errors), auth, config, reliability, testing, deployment, and beta-specific concerns.

---

## 1. Current state (summary)

| Area | Status | Notes |
|------|--------|--------|
| **API logging** | ✅ Good | Structlog, request_id, section, JSON in prod |
| **API config** | ✅ Good | Pydantic Settings, `.env`, env-validated |
| **API errors** | ✅ Good | Custom handlers, AppError hierarchy, logged with context |
| **API middleware** | ✅ Good | RequestContextMiddleware (timing, X-Request-ID) |
| **Metrics** | ❌ Missing | No Prometheus/StatsD/OTEL |
| **Tracing** | ❌ Missing | No distributed traces (request → LLM → DB) |
| **Error tracking** | ❌ Missing | No Sentry (or similar) |
| **Auth** | ⚠️ Partial | Web has Supabase; API uses hardcoded `demo-user` |
| **Rate limiting** | ❌ Missing | Chat/API unprotected |
| **Secrets** | ⚠️ Manual | No vault; keys in env only |
| **CI/CD** | ❌ Missing | No project-level GitHub Actions |
| **Containers** | ❌ Missing | No Dockerfile(s) |
| **Env docs** | ⚠️ Weak | No `.env.example` in repo |
| **Health** | ✅ Exists | `/health`; still returns legacy `helio-api` name |

---

## 2. Observability

### 2.1 Logging (already in place — small improvements)

- **Keep:** structlog, request_id, section, JSON in production.
- **Add:**
  - **Structured error logging** in stream path: log stream errors (e.g. LLM/network) with `request_id`, `conversation_id`, `client_id` so support can trace a single chat.
  - **Sensitive data:** ensure no PII (client names, numbers) in log messages; use IDs only where possible (or redact in a processor).
  - **Log level from config:** already have `log_level`; ensure production defaults to `INFO` and that `DEBUG` is only for temporary troubleshooting.

### 2.2 Metrics (new)

**Goal:** Know request volume, latency, errors, and LLM usage so you can spot regressions and plan capacity.

**Recommended: Prometheus + Grafana (or managed equivalent).**

1. **API (FastAPI)**  
   - Use **`prometheus-client`** (or **`starlette-prometheus`** / **`fastapi-prometheus`**) to expose `/metrics`.
   - **Counters:**  
     - `http_requests_total` (method, path, status).  
     - `chat_messages_total` (optional: by client_id bucket or “per user” if you have auth).  
     - `llm_requests_total`, `llm_tokens_input_total`, `llm_tokens_output_total` (provider, model).
   - **Histograms:**  
     - `http_request_duration_seconds` (method, path).  
     - `chat_stream_first_token_seconds`, `chat_stream_total_duration_seconds`.  
     - `llm_request_duration_seconds`.
   - **Config:**  
     - Add `metrics_enabled: bool` (default True in prod, False in dev if you don’t want local metrics).  
     - Mount metrics route only when enabled; optionally protect `/metrics` with a simple secret or network policy in production.

2. **Web (Next.js)**  
   - **Web Vitals:** use Next.js `reportWebVitals` (or Vercel Analytics) and send to your backend or a provider (e.g. Vercel, PostHog) for LCP, FID, CLS.  
   - Optional: counter for “chat stream started / completed / errored” (client-side) to correlate with API metrics.

3. **Where to run**  
   - **Beta:** Single server: run Prometheus scraping the API; Grafana in Docker or a small VM.  
   - **Later:** Managed Prometheus (Grafana Cloud, Aiven, etc.) or OpenTelemetry Collector pushing to a backend.

### 2.3 Distributed tracing (new, high value for chat)

**Goal:** One trace per request from “HTTP in” → “DB / LLM / tools” so you can see where time and errors go (e.g. slow LLM, slow tax engine).

**Recommended: OpenTelemetry (OTEL).**

1. **API**  
   - **`opentelemetry-api`**, **`opentelemetry-sdk`**, **`opentelemetry-instrumentation-fastapi`**, **`opentelemetry-instrumentation-sqlalchemy`**, **`opentelemetry-instrumentation-httpx`** (for Anthropic).  
   - Export spans to Jaeger, Grafana Tempo, or a managed OTEL backend.  
   - Ensure the same trace id is used for the whole chat request and for any outbound calls (LLM, DB).  
   - Add a span for “chat stream” and child spans for “build prompt”, “LLM stream”, “tool: compute_tax_position”, etc.

2. **Web**  
   - Optional: OTEL for Next.js (e.g. `@vercel/otel`) and set trace context so that when the frontend calls the API, the backend can continue the same trace (via headers).  
   - For beta, backend-only tracing is often enough.

### 2.4 Error tracking (new)

**Goal:** Get alerts and stack traces for unhandled or logged errors (especially in streaming and LLM code).

**Recommended: Sentry.**

1. **API (Python)**  
   - **`sentry-sdk[fastapi]`**.  
   - Init in `main.py` from config (e.g. `SENTRY_DSN`); disable when DSN empty or `environment=development`.  
   - Use `before_send` to strip PII and attach `request_id`, `section`.  
   - In exception handlers and in the chat stream error path, capture exceptions (Sentry will dedupe).

2. **Web (Next.js)**  
   - **`@sentry/nextjs`**.  
   - Same: init from env; disable in dev.  
   - Add Error Boundary for the chat UI so that stream errors are captured with context (e.g. conversation_id).

3. **Beta**  
   - One Sentry project for API, one for Web (or one project with two “platforms”).  
   - Alerts on new issues and on error rate spike.

---

## 3. Auth and security (beta)

### 3.1 API auth (required for beta)

- **Current:** Chat and other endpoints use `user_id = "demo-user"`; no validation of Supabase JWT.
- **Target:** All mutable/authenticated API routes accept a **Supabase JWT** and resolve `user_id` from it.

**Steps:**

1. **API:**  
   - Add dependency that reads `Authorization: Bearer <token>`, verifies JWT with Supabase (JWKS or shared secret), and returns `user_id` (and optionally email).  
   - Use **`python-jose`** or **`PyJWT`** + **`httpx`** to fetch JWKS from Supabase.  
   - Config: `SUPABASE_URL`, `SUPABASE_JWT_SECRET` (or anon key + JWT secret depending on Supabase docs).  
   - Protect all chat, clients, documents, context, exports routes with this dependency; return 401 when token missing/invalid.

2. **Web:**  
   - Already has Supabase client and `getToken` in API client; ensure every API call that goes to your backend passes the Supabase session token (from `getSession()` or equivalent).  
   - Ensure the chat stream route (Next.js API route that proxies to Python) forwards the same `Authorization` header from the incoming request to the backend.

3. **Optional for beta:**  
   - Rate limit per `user_id` (see below).  
   - CORS: keep `cors_origins` strict (only your frontend and, if needed, extension origin).

### 3.2 Secrets and config

- **Do not** commit `.env` or any real keys.  
- **Add** `.env.example` (repo-root and/or per app) listing every variable with a dummy value and short comment (e.g. `ANTHROPIC_API_KEY=sk-...`, `SUPABASE_JWT_SECRET=...`, `SENTRY_DSN=...`).  
- **Beta:** Env vars on the host or in the container runner (e.g. Docker Compose, Render, Fly.io) are acceptable.  
- **Later:** Consider a secrets manager (e.g. Doppler, HashiCorp Vault) and inject at runtime.

### 3.3 Database

- **Current:** SQLite with `helio.db` default.  
- **Beta:** SQLite is fine for a single instance; ensure the process has a single writer and that the file is on a persistent volume.  
- **Production later:** Plan migration to PostgreSQL (e.g. Supabase Postgres) and switch `database_url`; keep the same SQLAlchemy async usage.

---

## 4. Reliability and resilience

### 4.1 Rate limiting

- **Goal:** Protect API from abuse and accidental loops; give beta testers a fair quota.
- **Implementation:**  
  - **`slowapi`** or **`fastapi-limiter`** (e.g. in-memory or Redis).  
  - For beta, in-memory is enough: e.g. 60 requests/minute per IP or per `user_id` (if auth is in place).  
  - Stricter limit on `/api/chat/stream` (e.g. 20/minute per user) to cap LLM cost.  
- **Response:** 429 with `Retry-After`; log and optionally emit a metric `rate_limit_exceeded_total`.

### 4.2 Timeouts and retries

- **API → Anthropic:** Set a generous but finite timeout (e.g. 120s for stream start, 300s for full stream) and retries with backoff for transient errors (e.g. 503). Use **`httpx`** timeout and retry in the LLM client.  
- **Next.js proxy → API:** Set timeout slightly above backend (e.g. 330s) so the backend can respond before the proxy closes.  
- **DB:** SQLAlchemy/engine timeouts already help; ensure no unbounded queries (e.g. limit list endpoints).

### 4.3 Health checks

- **Current:** `/health` returns status and DB type.  
- **Improve:**  
  - **Liveness:** Keep simple (e.g. 200 if process is up).  
  - **Readiness:** Add a DB check (e.g. `SELECT 1` or run a tiny query) and optionally check that the LLM API key is set (or that a test call succeeds). Return 503 if not ready.  
- **Rename:** Change response from `"service": "helio-api"` to `"service": "ovalens-api"` (and update tests).

---

## 5. Testing and CI/CD

### 5.1 API tests

- **Current:** Pytest, async client, tax engine and health tests.  
- **Add:**  
  - **Integration test for chat stream:** mock Anthropic (or use a small model) and assert SSE events and that no unhandled exception leaks.  
  - **Auth tests:** with valid JWT → 200; without / invalid → 401.  
  - **Rate limit test:** exceed limit → 429.

### 5.2 Front-end tests

- **Add:** At least smoke tests (e.g. Playwright) for: login (if you add it), open chat, send one message, see streamed response.  
- Optional: unit tests for critical components (e.g. tax breakdown, scenario comparison).

### 5.3 CI (GitHub Actions)

- **Add** (e.g. `.github/workflows/ci.yml`):  
  - On push/PR:  
    - API: install deps, lint (ruff), typecheck (mypy), run pytest (including integration tests that mock external APIs).  
    - Web: install deps, lint, typecheck, build.  
  - Optionally: run E2E (Playwright) against a preview or staging URL.  
- **Secrets:** Use GitHub secrets for any keys needed in CI (e.g. `ANTHROPIC_API_KEY` for tests that hit real API; or keep those tests local-only and mock in CI).

### 5.4 CD (beta)

- **Simple option:** Manual deploy (e.g. pull on server, restart services).  
- **Better:** GitHub Action on push to `main`: build Docker images, push to registry, deploy to one beta environment (e.g. Render, Fly.io, or a single VM with Docker Compose).  
- **Artifacts:** Build and push both API and Web images; run migration/seed only for API.

---

## 6. Deployment and runbooks

### 6.1 Containers

- **API:**  
  - **Dockerfile:** multi-stage; Python 3.12, install deps, copy `app`, run with `uvicorn app.main:app --host 0.0.0.0 --port 8000`.  
  - Use a non-root user and minimal base image (e.g. `python:3.12-slim`).  
- **Web:**  
  - Next.js standalone build; Dockerfile that runs `node server.js` (or use Vercel and only containerize if you self-host).  
- **docker-compose.yml (beta):**  
  - Services: `api`, `web` (if self-hosted), `prometheus`, `grafana` (optional).  
  - Env from `.env` or env_file.  
  - Single SQLite volume for API.  
  - Healthchecks and restart policies.

### 6.2 Environment matrix

- **Development:** Local API + local web; SQLite; no Sentry; optional metrics.  
- **Staging/Beta:** One environment; real Supabase, Anthropic key, Sentry; metrics and tracing enabled; CORS for beta URL.  
- **Production:** Later; same stack with stricter limits and secrets from vault if you adopt it.

### 6.3 Runbooks

- **Add** a short `docs/RUNBOOKS.md` (or per-topic files):  
  - How to check logs (e.g. `docker compose logs -f api` or where logs are shipped).  
  - How to read metrics (e.g. Grafana dashboard for request rate, latency, errors, LLM tokens).  
  - How to handle “chat not responding” (check API logs by request_id, Sentry, LLM status page).  
  - How to run DB backup (SQLite: copy file or `sqlite3 .backup`).

---

## 7. Front-end production tweaks

### 7.1 Error handling

- **Error boundary** around the main chat/content area so that any React error is caught and reported to Sentry, with a friendly “Something went wrong” and retry.  
- **Stream errors:** When the SSE stream fails, show a clear message and optionally “Retry”; log and send to Sentry with conversation_id.

### 7.2 Feature flags (optional for beta)

- If you want to roll out features to a subset of beta users, add a simple feature-flag mechanism (e.g. env-based, or a small API endpoint that returns flags for the current user).  
- Can be as simple as `NEXT_PUBLIC_FEATURE_X=enabled` or a Supabase table “user_flags”.

### 7.3 Analytics (optional)

- **Product analytics:** e.g. PostHog, Mixpanel, or Vercel Analytics to see “sessions”, “chat started”, “message sent”, “report downloaded”.  
- **Privacy:** Document in privacy policy; prefer anonymised or pseudonymised and limit PII.

---

## 8. Beta-specific checklist

- [ ] **Auth:** API validates Supabase JWT; all relevant routes use `user_id` from token.  
- [ ] **Env:** `.env.example` added; production env vars documented.  
- [ ] **Metrics:** Prometheus `/metrics` on API; dashboards for requests, latency, errors, LLM usage.  
- [ ] **Tracing:** OTEL on API (and optionally web) with one trace per chat request.  
- [ ] **Errors:** Sentry for API and Web; alerts configured.  
- [ ] **Rate limiting:** Per-user or per-IP limits on chat and key endpoints.  
- [ ] **Health:** Readiness includes DB (and optionally LLM); rename to `ovalens-api`.  
- [ ] **CI:** Lint, typecheck, tests on push/PR for API and Web.  
- [ ] **Containers:** Dockerfile for API (and web if self-hosted); docker-compose for local/beta.  
- [ ] **Runbooks:** How to inspect logs, metrics, and handle common issues.  
- [ ] **Feedback:** Simple way for beta testers to report issues (e.g. link to Sentry, typeform, or in-app feedback form).

---

## 9. Suggested implementation order

1. **Week 1 – Observability and correctness**  
   - Add Prometheus metrics to API (request count, latency, LLM tokens).  
   - Add Sentry for API (and Web).  
   - Fix health response to `ovalens-api`; add readiness DB check.

2. **Week 2 – Auth and protection**  
   - Implement JWT validation dependency and wire to all authenticated routes.  
   - Add rate limiting (in-memory) for chat and global.

3. **Week 3 – Reliability and deployment**  
   - Timeouts and retries for LLM client.  
   - Dockerfile for API + docker-compose; deploy to one beta environment.  
   - Add `.env.example` and short deployment doc.

4. **Week 4 – CI and polish**  
   - GitHub Actions: lint, typecheck, test for API and Web.  
   - Optional: OTEL tracing on API.  
   - Runbooks and beta feedback channel.

This order gets you to a state where beta testers use a real auth-protected, monitored, and deployable stack without blocking on a single big change.
