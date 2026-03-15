# Nora: Auto transcript and UI update when the bot leaves

When the Nora bot leaves the meeting, the app can **automatically** create the transcript and show the new note in the client panel. This is done via **Recall webhooks** and your API’s webhook endpoint.

## Flow (already implemented)

1. **Bot leaves** → Recall sends a `recording.done` webhook to your API.
2. **API** → Calls Recall’s “Create Async Transcript” for that recording.
3. **Recall** → Generates the transcript, then sends a `transcript.done` webhook.
4. **API** → Fetches the transcript, saves chunks, runs the Nora processor (summary/note), and commits to the DB.
5. **UI** → The client Notes panel polls meeting notes every 8–15 seconds; the new note appears on the next poll.

No manual “Fetch transcript” is required when webhooks are set up correctly.

---

## Setup

### 1. Make your API reachable by Recall

Recall must be able to **POST** to your API. So your API must be available at a **public HTTPS** URL.

- **Production:** Use your deployed API URL (e.g. `https://api.yourapp.com`).
- **Local dev:** Use a tunnel, e.g. **ngrok**:
  ```bash
  ngrok http 8000
  ```
  Use the `https://xxxx.ngrok.io` URL as the webhook base (see step 3).

### 2. Get the webhook secret from Recall

1. Open [Recall Dashboard](https://app.recall.ai/) (use the same region as your API, e.g. EU: `eu-central-1`).
2. Go to **Settings** / **API** (or **Webhooks**) and copy the **Webhook secret** (used to verify that requests really come from Recall).

### 3. Configure the API

In your **API** `.env` (e.g. `OvalensPlanner/apps/api/.env`):

```env
# Required for webhooks
RECALL_WEBHOOK_SECRET=your_webhook_secret_from_recall_dashboard

# Public base URL where Recall can reach your API (no trailing slash)
# Production example:
NORA_WEBHOOK_BASE_URL=https://api.yourapp.com
# Local with ngrok:
# NORA_WEBHOOK_BASE_URL=https://xxxx.ngrok.io
```

- **RECALL_WEBHOOK_SECRET** – Required. If missing, the webhook endpoint returns 401 and events are ignored.
- **NORA_WEBHOOK_BASE_URL** – Your API’s public base URL. When you start a Nora meeting, the app sends Recall a webhook URL of:
  `{NORA_WEBHOOK_BASE_URL}/api/nora/webhooks/recall`
  If this is not set and the request is from localhost, the app does **not** send a webhook URL to Recall (to avoid 403 on localhost).

### 4. (Optional) Redis + worker for background processing

- **Without Redis:** The webhook handler creates the transcript and runs the Nora processor **inline**. The new note is written in the same request and appears in the UI on the next poll.
- **With Redis:** You can run a separate worker so processing happens in the background:
  ```bash
  # e.g. Redis
  docker run -d --name ovalens-redis -p 6379:6379 redis:7 redis-server --appendonly yes
  ```
  In `.env`: `REDIS_URL=redis://localhost:6379/0`
  Run the worker: `python scripts/nora_processing_worker.py` (from `apps/api`).

Either way, the note is created and the client panel will show it.

### 5. Recall dashboard (if your project uses account-level webhooks)

Some Recall setups use a **per-bot** webhook URL (we send it when creating the bot). In that case you don’t need to configure a webhook in the dashboard; setting **NORA_WEBHOOK_BASE_URL** and **RECALL_WEBHOOK_SECRET** is enough.

If your Recall project uses **account-level** webhook configuration:

1. In the Recall dashboard, open **Webhooks** (or equivalent).
2. Add a webhook URL: `https://your-api-domain.com/api/nora/webhooks/recall` (must match `NORA_WEBHOOK_BASE_URL` + path).
3. Subscribe to at least: **recording.done**, **transcript.done**.

Use the same region (e.g. EU) as in your API’s `RECALL_API_BASE_URL`.

---

## How the UI gets the update

- **MeetingNotesTimeline** (client Notes) polls **every 15 seconds**.
- **NoraAIPanel** polls sessions every 8 seconds when there is an active session (joining / recording / **processing**), and each poll triggers a notes refresh (`onNoteRefresh` → bumps `refreshKey` for the timeline).
- So when the webhook creates the note, the next poll (within ~8–15 seconds) will show it in the client panel.

No extra real-time setup is required for the note to appear; polling is enough.

---

## Quick checklist

| Step | What to do |
|------|------------|
| 1 | API reachable at public HTTPS (deploy or ngrok). |
| 2 | Copy **Webhook secret** from Recall dashboard. |
| 3 | In API `.env`: `RECALL_WEBHOOK_SECRET=...`, `NORA_WEBHOOK_BASE_URL=https://...`. |
| 4 | (Optional) Redis + worker for background processing. |
| 5 | If your Recall project uses account-level webhooks: add URL and subscribe to `recording.done`, `transcript.done`. |

After this, when the bot leaves, the transcript is created automatically and the new note shows up in the client panel on the next refresh.
