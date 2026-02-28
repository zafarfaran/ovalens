"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/**
 * Captures React render errors and shows a fallback UI.
 * Use Sentry.captureException(error) in try/catch or where exceptions are expected.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    if (error) Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <h1>Something went wrong</h1>
        <p>We’ve been notified and are looking into it.</p>
      </body>
    </html>
  );
}
