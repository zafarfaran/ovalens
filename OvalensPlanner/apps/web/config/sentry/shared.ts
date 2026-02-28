/**
 * Shared Sentry config: PII scrubbing and common tags for web (client, server, edge).
 */

export const REDACT_HEADERS = new Set([
  "authorization",
  "cookie",
  "x-api-key",
  "x-auth-token",
]);

export const PII_KEYS = /^(password|secret|token|api_key|apikey|auth|credential|email|phone|ssn|address)$/i;

export function scrubObj(obj: unknown): unknown {
  if (obj == null) return obj;
  if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") return obj;
  if (Array.isArray(obj)) return obj.map(scrubObj);
  if (typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = PII_KEYS.test(k) ? "[REDACTED]" : scrubObj(v);
    }
    return out;
  }
  return obj;
}

/** Event-like shape used by beforeSend in client, server, and edge. */
export interface SentryEventLike {
  request?: { headers?: Record<string, unknown>; data?: unknown };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
}

/**
 * Apply web service tags (service, environment, request_id) and scrub PII on request/extra/contexts.
 */
export function applyWebEventScrubbing(event: SentryEventLike, environment: string): void {
  const tags: Record<string, string> = { ...event.tags, service: "web", environment };
  if (event.request?.headers && typeof event.request.headers === "object") {
    const reqId = event.request.headers["X-Request-ID"] ?? event.request.headers["x-request-id"];
    if (reqId != null) tags["request_id"] = String(reqId);
  }
  event.tags = tags;

  if (event.request?.headers && typeof event.request.headers === "object") {
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(event.request.headers)) {
      headers[k] = REDACT_HEADERS.has(k.toLowerCase()) ? "[REDACTED]" : String(v);
    }
    event.request.headers = headers;
  }
  if (event.request?.data != null) {
    event.request.data = scrubObj(event.request.data) as Record<string, unknown>;
  }
  if (event.extra && typeof event.extra === "object") {
    event.extra = scrubObj(event.extra) as Record<string, unknown>;
  }
  if (event.contexts && typeof event.contexts === "object") {
    for (const key of Object.keys(event.contexts)) {
      (event.contexts as Record<string, unknown>)[key] = scrubObj(
        (event.contexts as Record<string, unknown>)[key]
      );
    }
  }
}
