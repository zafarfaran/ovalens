# Nora processing stuck – debugging guide

When a session stays at **processing** and no meeting note is generated, use this to find the cause.

## Diagnostics endpoint – security

`GET /api/clients/{client_id}/nora/sessions/{session_id}/diagnostics` uses the **same auth** as other Nora endpoints: the caller must be authenticated and must own the given `client_id`. It returns only: session status, error_message, transcript chunk count, whether Redis is configured, and queue length. It does **not** return secrets, other users’ data, or PII. Safe to leave enabled in production; restrict by client ownership as you do for the rest of the Nora API.

## Pipeline (what has to happen)

1. **Bot joins** → Recall sends events; we set status to `joining` then `recording`.
2. **Meeting ends** → Recall sends `recording.done` to our webhook.
3. **We request transcript** → We call Recall’s “Create Async Transcript”; they generate it.
4. **Recall sends `transcript.done`** → Our webhook receives it, fetches transcript chunks from Recall, saves `TranscriptChunk` rows, then either:
   - **With Redis:** Pushes a job to the Nora processing queue and sets status `processing`. A **worker** must be running to pop the job and run note generation. If no worker runs, the session stays at `processing` and no note is created.
   - **Without Redis:** We run note generation **inline** in the webhook and set status to `ready`.
5. **Note is created** → `NoraProcessingService` builds a `MeetingNote` from transcript chunks and sets status to `ready`.

So “stuck at processing” usually means one of:

- **Redis is set but the worker is not running** → Jobs are queued, never consumed.
- **Webhooks never received** → `recording.done` or `transcript.done` never hit our API (e.g. 401, wrong URL, Recall not sending).
- **Transcript never saved** → `transcript.done` received but fetching transcript from Recall failed; no chunks in DB; when the worker runs it fails with “No transcript chunks available”.

---

## What to collect

### 1. Diagnostics for the stuck session

Call the API (with the same auth as the app) for the **stuck session**:

```http
GET /api/clients/{client_id}/nora/sessions/{session_id}/diagnostics
```

Example response:

```json
{
  "session_id": "...",
  "status": "processing",
  "error_message": null,
  "transcript_chunk_count": 0,
  "redis_configured": true,
  "nora_processing_queue_length": 2,
  "hint": "..."
}
```

**How to interpret:**

| transcript_chunk_count | redis_configured | queue_length | Likely cause |
|------------------------|------------------|--------------|--------------|
| 0 | true | ≥ 0 or null | Transcript never saved. Either `transcript.done` webhook not received, or fetch from Recall failed. Check API logs for `nora_transcript_done_*` or `nora_webhook_ignored`. |
| 0 | true | null | Redis unreachable. API can’t push or read queue. |
| > 0 | true | > 0 | Jobs in queue but not consumed → **worker not running**. Start `nora_processing_worker` or run processing inline (see below). |
| > 0 | true | 0 | Job may have been consumed; if status still `processing`, worker might have crashed after popping. Check worker logs. |
| any | false | null | No Redis; processing runs inline in webhook. If still stuck, webhook may not be receiving `transcript.done`. |

Send this JSON (and, if possible, the session id and client id) when asking for help.

### 2. API logs (Railway or your host)

Search for:

- `nora_webhook_signature_rejected` → Webhook 401; fix `RECALL_WEBHOOK_SECRET` (see [nora-webhook-setup.md](./nora-webhook-setup.md)).
- `nora_webhook_ignored` → Payload ignored (e.g. `unknown_bot`); check `reason` in the log.
- `nora_async_transcript_started` → We received `recording.done` and requested async transcript.
- `nora_async_transcript_failed` → Create-async-transcript call to Recall failed.
- `nora_transcript_done_queued` or `nora_transcript_done_processed` → We received `transcript.done`, saved chunks, and either queued a job or processed inline.
- `nora_transcript_done_fetch_failed` → We received `transcript.done` but fetching transcript from Recall failed; session may be set to `failed` with `error_message`.

Copy the relevant log lines (and timestamps) for the session’s time window.

### 3. Worker logs (if you run the worker)

If `REDIS_URL` is set, you must run the Nora worker somewhere (e.g. a second Railway process or a background job):

```bash
# From apps/api
uv run python scripts/nora_processing_worker.py
```

If the worker is not running, jobs sit in Redis and status stays `processing`. Check:

- Is the worker process actually running?
- Any errors in worker stdout/stderr (e.g. DB connection, “No transcript chunks available”)?

### 4. Environment

- **REDIS_URL** – Set in production? If yes, a worker must be running. If you don’t want to run a worker, unset `REDIS_URL` so processing runs inline in the webhook.
- **RECALL_WEBHOOK_SECRET** – Must match Recall’s dashboard (see [nora-webhook-setup.md](./nora-webhook-setup.md)).
- **NORA_WEBHOOK_BASE_URL** – Must be the public URL where Recall can POST (e.g. `https://your-api.up.railway.app`).

---

## Quick fix: run processing without a worker

If Redis is set but you don’t run a worker:

1. **Option A – Use “Retry” (Zap) in the UI**  
   For a session in `processing` or `failed`, click the retry button. That calls `POST .../nora/sessions/{session_id}/process`, which will either push another job (same problem) or, if Redis is down, run processing inline.

2. **Option B – Use “Fetch” then “Retry”**  
   If there are no transcript chunks yet, click **Fetch** to pull the transcript from Recall and save chunks, then **Retry** to generate the note (inline if no Redis).

3. **Option C – Unset REDIS_URL in production**  
   Then all processing runs inline in the webhook; no worker needed. Redeploy so `transcript.done` triggers note generation in the same request.

---

## Summary: what to send when asking for help

1. **Diagnostics response** for the stuck session:  
   `GET /api/clients/{client_id}/nora/sessions/{session_id}/diagnostics`
2. **API logs** around the time of the meeting (search for `nora_webhook_*`, `nora_transcript_done_*`, `nora_async_transcript_*`).
3. Whether **REDIS_URL** is set and whether the **Nora worker** is running.
4. (Optional) One **Recall webhook** payload (redact secrets) if you have it – e.g. from Recall dashboard or a proxy log.

With that, we can pinpoint whether the failure is webhooks, transcript fetch, Redis, or the worker.
