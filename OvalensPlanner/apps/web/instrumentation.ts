/**
 * Next.js instrumentation: load Sentry for server and edge runtimes.
 * Config lives in config/sentry/; root files are required by Next.js/Sentry.
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./config/sentry/server");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./config/sentry/edge");
  }
}

export const onRequestError = Sentry.captureRequestError;
