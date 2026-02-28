# Sentry config (web app)

Sentry initialization and PII scrubbing for client, server, and edge runtimes.

## Layout

| File | Purpose |
|------|--------|
| `shared.ts` | PII scrubbers, `applyWebEventScrubbing()` (tags + redaction). |
| `client.ts` | Browser init: DSN, `beforeSend`, logs, tracing. |
| `server.ts` | Node.js init (API routes, Server Components). |
| `edge.ts` | Edge runtime init. |

## Root entry points (required by Next.js / Sentry)

These stay at `apps/web/` and delegate here:

- `instrumentation.ts` → imports `config/sentry/server` and `config/sentry/edge`
- `sentry.client.config.ts` → imports `config/sentry/client`
- `instrumentation-client.ts` → imports `config/sentry/client`

Do not move the root files; the build and SDK expect them at project root.
