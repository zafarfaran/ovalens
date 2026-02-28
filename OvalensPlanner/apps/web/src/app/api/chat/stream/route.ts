/**
 * SSE streaming proxy — forwards the chat stream from the Python API
 * without buffering, so tokens arrive in real-time through ngrok / proxies.
 * Forwards auth, request-id, and trace headers for E2E auth and observability.
 */
const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

/** Headers we forward to the backend (auth + correlation + tracing). */
const FORWARD_HEADERS = [
  "Authorization",
  "X-Request-ID",
  "traceparent",
  "tracestate",
  "baggage",
] as const;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function buildUpstreamHeaders(req: Request): Record<string, string> {
  const out: Record<string, string> = { "Content-Type": "application/json" };
  for (const name of FORWARD_HEADERS) {
    const value = req.headers.get(name);
    if (value != null && value !== "") out[name] = value;
  }
  return out;
}

export async function POST(req: Request) {
  const body = await req.text();
  const headers = buildUpstreamHeaders(req);

  const upstream = await fetch(`${BACKEND}/api/chat/stream`, {
    method: "POST",
    headers,
    body,
  });

  if (!upstream.ok || !upstream.body) {
    return new Response(upstream.statusText, { status: upstream.status });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
