# Beta Detailed Implementation Plan (2-6 Weeks)

This plan is designed to make Ovalens production-ready for external beta testers without changing core product behavior.

## 1) Objectives and Non-Goals

### Objectives
- Improve reliability, observability, security, testing, and operability for beta.
- Add AI production controls: prompt/versioning discipline, evals, cost/latency tracking, fallback safety.
- Establish deployment and incident response readiness.

### Non-Goals
- No product rewrite.

### Beta requirement: Migrate to PostgreSQL (Supabase)
- **Database migration to Postgres using Supabase is a requirement for beta.** The app currently defaults to SQLite; for beta (and production) it must run against Supabase-hosted PostgreSQL so that auth, scaling, and backups are production-ready.

## 2) Delivery Model

## 2.1 Workstreams
- Security/Auth
- Observability
- Reliability/Resilience
- Testing/QA
- CI/CD and Release
- AI Quality and Safety
- Beta Operations

## 2.2 Owners
- Backend Engineer
- Frontend Engineer
- DevOps Engineer
- AI Engineer
- Product/Ops Lead

## 2.3 Weekly Cadence
- Mon: plan and prioritization (P0/P1 focus)
- Wed: implementation checkpoint + blocker removal
- Fri: release readiness review + risk log update

## 2.4 Definition of Done (Global)
- Code merged with tests and CI passing.
- Dashboard panel(s) and alerts added where relevant.
- Runbook entry added for operational tasks.
- Owner demo completed.

---

## 3) Phase 1 (Week 1-2): Must-Have Before External Beta

## 3.1 Security/Auth (P0)

### Task S1: Enforce backend JWT auth and user scoping
- Priority: P0
- Effort: M
- Owner: Backend
- Files:
  - `apps/api/app/dependencies.py`
  - `apps/api/app/routers/chat.py`
  - `apps/api/app/routers/clients.py`
  - `apps/api/app/routers/context.py`
  - new `apps/api/app/core/auth.py`
- Implementation notes:
  - Add token validation dependency using Supabase JWT.
  - Replace `demo-user` usage with authenticated `user_id`.
  - Scope all data access by authenticated user.
- Acceptance criteria:
  - Valid token succeeds; invalid/missing token returns 401.
  - Cross-user data access is blocked.
  - No route depends on hardcoded user identity.

### Task S2: Forward auth headers in chat stream proxy
- Priority: P0
- Effort: S
- Owner: Frontend
- Files:
  - `apps/web/src/app/api/chat/stream/route.ts`
- Implementation notes:
  - Forward `Authorization`, `X-Request-ID`, and trace headers to backend.
- Acceptance criteria:
  - Authenticated streaming works end-to-end.
  - Unauthorized calls fail predictably.

### Task S3: Secrets and env hygiene baseline
- Priority: P0
- Effort: S
- Owner: DevOps
- Files:
  - new `.env.example` (root)
  - new `apps/api/.env.example`
  - new `apps/web/.env.example`
- Implementation notes:
  - Document required env vars and safe defaults.
  - Ensure no secrets are committed.
- Acceptance criteria:
  - Fresh environment can boot from examples + docs.

## 3.2 Observability Baseline (P0)

### Task O1: Error monitoring (API + web)
- Priority: P0
- Effort: S
- Owner: Backend + Frontend
- Files:
  - `apps/api/app/main.py`
  - new `apps/api/app/core/observability.py`
  - web Sentry init files (as needed)
- Implementation notes:
  - Integrate Sentry with environment/release tags.
  - Add PII scrubber in event pipeline.
- Acceptance criteria:
  - Synthetic API and web exceptions appear in Sentry with request correlation.

### Task O2: Metrics endpoint and baseline dashboards
- Priority: P0
- Effort: M
- Owner: Backend + DevOps
- Files:
  - new `apps/api/app/core/metrics.py`
  - `apps/api/app/main.py`
- Implementation notes:
  - Add HTTP metrics: request count, latency, status distribution.
  - Add chat metrics: stream starts/completions/errors, time to first token.
  - Add LLM metrics: request duration, tokens in/out, failure rate.
- Acceptance criteria:
  - `/metrics` exposed in beta env.
  - Grafana dashboard shows live data during smoke tests.

### Task O3: Logging hardening and redaction
- Priority: P0
- Effort: S
- Owner: Backend
- Files:
  - `apps/api/app/core/logging.py`
  - `apps/api/app/services/chat.py`
  - `apps/api/app/services/llm/claude.py`
- Implementation notes:
  - Add redaction processor for sensitive fields.
  - Standardize event names for lifecycle events.
- Acceptance criteria:
  - Logs have `request_id`, `service`, `env`, `event`, `duration_ms`.
  - No PII in sampled production logs.

## 3.3 Reliability Controls (P0)

### Task R1: LLM timeout/retry/fallback policy
- Priority: P0
- Effort: M
- Owner: AI + Backend
- Files:
  - `apps/api/app/services/llm/claude.py`
  - new `apps/api/app/services/llm/policy.py`
  - `apps/api/app/config.py`
- Implementation notes:
  - Configure connect/read/overall timeouts.
  - Retry transient errors with capped backoff.
  - Add fallback model/provider path behind feature flag.
- Acceptance criteria:
  - Transient failures recover within retry budget.
  - Fallback events are logged and metered.

### Task R2: Rate limiting for expensive endpoints
- Priority: P0
- Effort: S
- Owner: Backend
- Files:
  - `apps/api/app/main.py`
  - router files for chat/context
- Implementation notes:
  - Apply per-user and per-IP limits for chat stream and context ingest.
- Acceptance criteria:
  - Exceeding limits returns 429 with predictable response body.

### Task R3: Health/readiness split
- Priority: P0
- Effort: S
- Owner: Backend
- Files:
  - `apps/api/app/routers/health.py`
  - new `apps/api/app/routers/ready.py`
- Implementation notes:
  - Keep `/health` as liveness.
  - Add `/ready` with DB connectivity + config dependency checks.
- Acceptance criteria:
  - Readiness returns 503 when critical dependencies are unavailable.

## 3.4 Testing and CI Baseline (P0)

### Task T1: Add critical API integration tests
- Priority: P0
- Effort: M
- Owner: Backend
- Files:
  - new `apps/api/tests/test_auth.py`
  - new `apps/api/tests/test_rate_limit.py`
  - new `apps/api/tests/test_chat_stream.py`
- Implementation notes:
  - Cover auth enforcement, stream behavior, and throttling.
- Acceptance criteria:
  - New tests pass in CI and fail on regression.

### Task C1: CI workflow for quality gates
- Priority: P0
- Effort: M
- Owner: DevOps
- Files:
  - new `.github/workflows/ci.yml`
- Implementation notes:
  - API: lint, type-check, test.
  - Web/extension: lint, type-check, build.
  - Add dependency/security scan (pip-audit, npm audit or equivalent).
- Acceptance criteria:
  - PRs cannot merge unless all required checks pass.

---

## 4) Phase 2 (Week 3-4): Should-Have Shortly After Beta Start

## 4.1 Tracing (P1)

### Task O4: OpenTelemetry instrumentation
- Priority: P1
- Effort: M
- Owner: Backend + DevOps
- Files:
  - `apps/api/app/main.py`
  - new `apps/api/app/core/tracing.py`
- Implementation notes:
  - Instrument FastAPI inbound requests, SQLAlchemy DB calls, and outbound LLM requests.
  - Correlate trace IDs with logs.
- Acceptance criteria:
  - One trace spans request -> DB -> LLM and visible in tracing backend.

## 4.2 Frontend E2E smoke tests (P1)

### Task T2: Add Playwright smoke suite
- Priority: P1
- Effort: M
- Owner: Frontend
- Files:
  - new `apps/web/tests/e2e/smoke.spec.ts`
- Implementation notes:
  - Test login/session, chat stream, clients list, and basic export flow.
- Acceptance criteria:
  - Smoke suite runs on every main branch build.

## 4.3 Deployment reproducibility (P1)

### Task D1: Containerization and runtime consistency
- Priority: P1
- Effort: M
- Owner: DevOps
- Files:
  - new `apps/api/Dockerfile`
  - new `apps/web/Dockerfile`
  - new `docker-compose.beta.yml`
- Implementation notes:
  - Define environment variables and health checks.
  - Include restart policy and persistent storage for DB.
- Acceptance criteria:
  - Staging-beta deploy can be recreated from clean environment.

## 4.4 AI eval and regression loop (P1)

### Task A1: Golden dataset and offline eval runner
- Priority: P1
- Effort: M
- Owner: AI
- Files:
  - new `apps/api/evals/datasets/beta_golden.jsonl`
  - new `apps/api/evals/run_eval.py`
  - new `apps/api/evals/README.md`
- Implementation notes:
  - Build scenario set for top adviser workflows.
  - Track factual correctness boundaries, tool-use compliance, latency, and cost.
- Acceptance criteria:
  - Eval report generated in CI for prompt/model changes.
  - Regression thresholds defined and enforced.

---

## 4.5 Migrate to PostgreSQL using Supabase (P1, Beta requirement) — **Done**

Database migration to **PostgreSQL via Supabase** is a beta requirement so that auth, backups, and scaling use a single production-ready stack.

### Task DB1: Migrate to PostgreSQL using Supabase — **Done**
- **Priority:** P1 (required for beta)
- **Effort:** M
- **Owner:** Backend + DevOps
- **Status:** Implemented. Config supports `DATABASE_URL` and async driver; engine and FTS are dialect-aware; Alembic env + initial migration and `apps/api/.env.example` added.

### Steps (put in doc / runbook)

1. **Create Supabase project**
   - New project at [supabase.com](https://supabase.com); note project ref and region.
   - In **Settings → Database**: copy the **Connection string** (URI). Use "Session mode" for the API (or "Transaction" if you use connection pooling).
   - For the app use the **direct** connection string (not the pooler) unless you add a pooler-compatible driver. Format: `postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres` (pooler) or `postgresql://postgres:[YOUR-PASSWORD]@db.[ref].supabase.co:5432/postgres` (direct).

2. **Configure the API for Postgres**
   - Set `DATABASE_URL` in the API environment to the Supabase PostgreSQL URL.
   - If the URL is `postgresql://...`, the app must use the **async** driver (`postgresql+asyncpg://...`). Ensure config converts or uses the correct driver so the API connects with asyncpg.

3. **Schema and migrations**
   - Use **Alembic** (or equivalent) for schema versions. Create an `alembic` directory under the API with `env.py` and `versions/`.
   - **Initial migration:** create all tables (users, households, clients, tax_profiles, documents, context_snippets, conversations, messages, observations, meeting_notes). Add any PostgreSQL-specific objects (e.g. full-text search column/index for `meeting_notes`).
   - Run migrations against the Supabase DB: `alembic upgrade head` (or equivalent), with `DATABASE_URL` set to the Supabase Postgres URL (sync URL for Alembic if using sync migrations, e.g. `postgresql://...` with psycopg2).

4. **Full-text search (meeting notes)**
   - On **SQLite** the app uses FTS5. On **PostgreSQL** use native full-text search: add a `tsvector` column (e.g. generated from `subject`, `summary`, `action_items`) and a GIN index on it. Update the meeting-notes search tool to use `to_tsquery` / `ts_rank` / `headline()` when connected to Postgres.

5. **Seeding and backups**
   - Seed demo data only when appropriate (e.g. dev/staging); do not seed production.
   - Use Supabase backups (point-in-time recovery) and document restore procedure in the runbook.

6. **Health and readiness**
   - Health/readiness endpoint should report database type (e.g. `postgresql`) when using Supabase, and should verify DB connectivity in readiness (e.g. `SELECT 1` or a lightweight query).

7. **Security**
   - Restrict DB access with Supabase credentials; use env vars (or a secrets manager) for `DATABASE_URL`. Never commit the URL or password.
   - Align Supabase Auth (JWT) with API auth so the same Supabase project backs both DB and identity.

### Acceptance criteria
- [x] API runs against Supabase PostgreSQL with `DATABASE_URL` set.
- [x] All tables and indexes (including FTS for meeting notes) created via migrations or app init.
- [x] Health/readiness reflects Postgres and passes when DB is reachable.
- [ ] Backup/restore and rollback steps documented (runbook to be added).

### Implementation (completed)
- `apps/api/app/config.py` – `DATABASE_URL`, `database_url_async`, `is_postgres`.
- `apps/api/app/db/engine.py` – async engine; `init_fts` splits into Postgres (tsvector) and SQLite (FTS5).
- `apps/api/app/services/tools/meeting_notes.py` – `_search_postgres` (tsvector/headline) and `_search_sqlite` (FTS5 + LIKE fallback).
- `apps/api/app/routers/health.py` – returns `database: "postgresql"` when `DATABASE_URL` is Postgres.
- `apps/api/alembic/env.py` – reads `DATABASE_URL`, sync URL for migrations.
- `apps/api/alembic/versions/001_initial_schema_and_meeting_notes_fts.py` – creates all tables and adds `meeting_notes.search_vector` + GIN index on Postgres.
- `apps/api/.env.example` – documents `DATABASE_URL` and Supabase.
- **Run:** Set `DATABASE_URL` to Supabase URI, then `alembic upgrade head` (from `apps/api`; requires `psycopg2-binary` for sync migrations). Or start the app once and use `init_db` + `init_fts`.

---

## 5) Phase 3 (Week 5-6+): Scale and Maturity

### Task M1: Post-migration hardening (optional after DB1)
- Priority: P2
- Effort: S
- Owner: Backend + DevOps
- Notes:
  - After Supabase is live: connection pooling, read replicas, or migration rollback drill if needed.

### Task M2: Async work queue for heavy operations
- Priority: P2
- Effort: M
- Owner: Backend
- Notes:
  - Move expensive, non-interactive tasks to background jobs with retry and dead-letter handling.

### Task M3: Advanced security hardening
- Priority: P2
- Effort: M
- Owner: DevOps + Backend
- Notes:
  - Add stronger network policies, secret rotation automation, stricter CSP/headers, and regular vulnerability scans.

---

## 6) AI-Specific Production Controls (Cross-Phase)

### Prompt and version management
- Version prompt files and log prompt version per request.
- Require change notes for prompt updates.

### Schema validation and deterministic boundaries
- Validate tool inputs/outputs server-side.
- Never allow freeform model math to replace deterministic tax engine output.

### Fallback strategy
- Primary model + backup model with explicit trigger conditions.
- Track fallback rate and success.

### Cost and latency governance
- Track input/output tokens and estimated cost per request.
- Alert on cost spikes and latency regressions.

### Prompt injection and tool-call safety
- Treat extension context as untrusted.
- Enforce allowlisted tool names and strict argument validation.

---

## 7) Beta Operations and Support Plan

### Incident response minimum viable runbook
- Detect -> Triage -> Mitigate -> Communicate -> Postmortem.
- Severity classes:
  - Sev1: outage/data/security issue
  - Sev2: degraded critical flow
  - Sev3: non-critical bug

### Support workflow
- Single intake channel for beta feedback.
- Daily triage during first two weeks.
- SLA targets:
  - Sev1 immediate acknowledgement
  - Sev2 within 4 business hours
  - Sev3 next business day

### Dashboard checklist (must exist before external invite)
- API request rate, error rate, latency.
- Chat stream success/failure and first-token latency.
- LLM token/cost/failure/fallback.
- Auth failure rate and rate-limit hits.
- Top user journeys completion metrics.

---

## 8) Release Gates (Go/No-Go Checklist)

- **Database running on Supabase PostgreSQL** (migration completed, migrations and FTS documented).
- Auth and authorization enforced end-to-end.
- Observability stack active (logs, metrics, tracing, error monitoring).
- Rate limiting and LLM resilience controls active.
- CI required checks enforced.
- Backup/restore and rollback rehearsed at least once.
- AI eval baseline established and passing thresholds.
- Incident runbook published and ownership on-call rotation confirmed.

---

## 9) Suggested Task Execution Order

1. ~~**Migrate to PostgreSQL using Supabase** (DB1)~~ **Done**
2. Auth enforcement + stream auth propagation
3. Error monitoring + metrics + logging redaction
4. LLM timeout/retry/fallback + rate limiting
5. API integration tests + CI quality gates
6. Readiness checks + deployment reproducibility
7. AI eval harness and beta operations runbooks

This order minimizes beta risk fastest while preserving current feature behavior.
