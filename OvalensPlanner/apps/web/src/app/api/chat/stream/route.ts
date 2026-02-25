/**
 * SSE streaming proxy — forwards the chat stream from the Python API
 * without buffering, so tokens arrive in real-time through ngrok / proxies.
 */
const BACKEND = process.env.BACKEND_URL || "http://localhost:8000";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.text();

  const upstream = await fetch(`${BACKEND}/api/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
