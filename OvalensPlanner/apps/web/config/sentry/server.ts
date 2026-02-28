/**
 * Sentry server-side init (Node.js). Loaded via instrumentation.ts when NEXT_RUNTIME === "nodejs".
 */
import * as Sentry from "@sentry/nextjs";
import { applyWebEventScrubbing } from "./shared";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment =
  process.env.SENTRY_ENVIRONMENT ||
  process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
  process.env.VERCEL_ENV ||
  process.env.NODE_ENV ||
  "development";
const release =
  process.env.SENTRY_RELEASE ||
  process.env.NEXT_PUBLIC_SENTRY_RELEASE ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  "ovalens-web@0.0.1";

function beforeSend(
  event: Sentry.Event,
  _hint: Sentry.EventHint
): Sentry.Event | null {
  applyWebEventScrubbing(event, environment);
  return event;
}

if (dsn) {
  Sentry.init({
    dsn,
    environment,
    release,
    beforeSend,
    sendDefaultPii: false,
    enableLogs: true,
    tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
    integrations: [
      Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    ],
  });
}
