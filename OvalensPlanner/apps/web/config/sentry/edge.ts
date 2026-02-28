/**
 * Sentry edge runtime init. Loaded via instrumentation.ts when NEXT_RUNTIME === "edge".
 */
import * as Sentry from "@sentry/nextjs";
import { applyWebEventScrubbing } from "./shared";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
const environment =
  process.env.SENTRY_ENVIRONMENT ||
  process.env.VERCEL_ENV ||
  process.env.NODE_ENV ||
  "development";
const release =
  process.env.SENTRY_RELEASE ||
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
  });
}
