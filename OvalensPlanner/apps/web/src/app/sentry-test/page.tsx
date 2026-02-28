"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

/** Optional Sentry logger (available in SDK 9.41+ with enableLogs). */
const sentryLogger =
  "logger" in Sentry && typeof (Sentry as { logger?: { info: (a: string, b?: object) => void; error: (a: string, b?: object) => void; trace: (a: string, b?: object) => void; debug: (a: unknown) => void; warn: (a: string, b?: object) => void; fmt: (t: TemplateStringsArray, ...v: unknown[]) => string } }).logger === "object"
    ? (Sentry as { logger: { info: (a: string, b?: object) => void; error: (a: string, b?: object) => void; trace: (a: string, b?: object) => void; debug: (a: unknown) => void; warn: (a: string, b?: object) => void; fmt: (t: TemplateStringsArray, ...v: unknown[]) => string } }).logger
    : null;

/**
 * Sentry verification page: exception capture, tracing (spans), and logs.
 * Visit /sentry-test. Remove or protect in production if desired.
 */
export default function SentryTestPage() {
  const [fetchStatus, setFetchStatus] = useState<string>("");

  const handleTestButtonClick = () => {
    Sentry.startSpan(
      {
        op: "ui.click",
        name: "Test Button Click",
      },
      (span) => {
        span.setAttribute("button", "throw-test");
        span.setAttribute("page", "sentry-test");
        sentryLogger?.info("Sentry test button clicked", { action: "throw" });
        throw new Error(
          "Sentry web test — synthetic exception for error monitoring verification"
        );
      }
    );
  };

  const handleFetchTest = async () => {
    setFetchStatus("loading");
    try {
      const data = await Sentry.startSpan(
        {
          op: "http.client",
          name: "GET /api/health (Sentry test)",
        },
        async (span) => {
          span.setAttribute("url", "/api/health");
          const res = await fetch("/api/health");
          span.setAttribute("http.status_code", res.status);
          const data = (await res.json()) as { status?: string };
          return data;
        }
      );
      setFetchStatus(`ok: ${(data as { status?: string }).status ?? "unknown"}`);
      sentryLogger?.info("Health check completed", {
        status: (data as { status?: string }).status,
        endpoint: "/api/health",
      });
    } catch (err) {
      setFetchStatus("error");
      sentryLogger?.error("Health check failed", { endpoint: "/api/health" });
      Sentry.captureException(err);
    }
  };

  const handleLogExamples = () => {
    if (sentryLogger) {
      sentryLogger.trace("Trace: starting sentry test flow", { screen: "sentry-test" });
      sentryLogger.debug(`Debug: user on test page at ${new Date().toISOString()}`);
      sentryLogger.info("Info: log examples triggered", { count: 1 });
      sentryLogger.warn("Warn: this is a sample warning", { isSample: true });
    } else {
      console.info("Log examples (Sentry.logger not in this SDK version; use console)");
    }
    setFetchStatus("Logs sent (check Sentry or console)");
  };

  return (
    <div className="p-6 max-w-md space-y-6">
      <h1 className="text-xl font-semibold">Sentry test</h1>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Exception</h2>
        <p className="text-sm text-muted-foreground">
          Click to throw a synthetic error (captured with Sentry.captureException via
          global-error or span).
        </p>
        <button
          type="button"
          onClick={handleTestButtonClick}
          className="px-4 py-2 rounded bg-primary text-primary-foreground"
        >
          Throw test error
        </button>
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Tracing (span)</h2>
        <p className="text-sm text-muted-foreground">
          API call wrapped in Sentry.startSpan (op: http.client).
        </p>
        <button
          type="button"
          onClick={handleFetchTest}
          className="px-4 py-2 rounded border border-input bg-background"
        >
          Fetch /api/health
        </button>
        {fetchStatus && (
          <p className="text-sm text-muted-foreground">{fetchStatus}</p>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Logs</h2>
        <p className="text-sm text-muted-foreground">
          Send trace/debug/info/warn to Sentry (enableLogs: true).
        </p>
        <button
          type="button"
          onClick={handleLogExamples}
          className="px-4 py-2 rounded border border-input bg-background"
        >
          Send sample logs
        </button>
      </section>
    </div>
  );
}
