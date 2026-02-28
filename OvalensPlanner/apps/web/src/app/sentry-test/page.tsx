"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";

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
        Sentry.logger.info("Sentry test button clicked", { action: "throw" });
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
      Sentry.logger.info("Health check completed", {
        status: (data as { status?: string }).status,
        endpoint: "/api/health",
      });
    } catch (err) {
      setFetchStatus("error");
      Sentry.logger.error("Health check failed", { endpoint: "/api/health" });
      Sentry.captureException(err);
    }
  };

  const handleLogExamples = () => {
    Sentry.logger.trace("Trace: starting sentry test flow", { screen: "sentry-test" });
    Sentry.logger.debug(
      Sentry.logger.fmt`Debug: user on test page at ${new Date().toISOString()}`
    );
    Sentry.logger.info("Info: log examples triggered", { count: 1 });
    Sentry.logger.warn("Warn: this is a sample warning", { isSample: true });
    setFetchStatus("Logs sent (check Sentry)");
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
