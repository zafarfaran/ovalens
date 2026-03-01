# Rate limiting: concepts you need to know

This doc explains the ideas behind rate limiting, how our implementation uses them, and what the “tech debt” items mean in plain language.

---

## 1. What is rate limiting?

**Rate limiting** = capping how many times someone (or something) can do an action in a period of time.

**Why we use it:**

- **Cost:** Chat and context-ingest call LLMs and do heavy work. Unlimited requests would burn budget or overload the system.
- **Fairness:** One user or one IP shouldn’t be able to hog capacity.
- **Abuse:** Bots or bad actors can’t hammer the API without hitting a ceiling.

So we say: “You can do at most X requests per Y seconds.” If they go over → we respond with **429 Too Many Requests** and tell them when they can try again.

---

## 2. “Per what?” — Scopes (user vs IP)

We need to decide **who** we’re counting. Two common choices:

| Scope   | We count by…              | Good for…                          | Weakness…                          |
|--------|----------------------------|-------------------------------------|------------------------------------|
| **Per user** | Logged-in identity (e.g. JWT `sub`) | Fair per account                    | Stolen token uses victim’s quota   |
| **Per IP**   | Client IP address                  | Limiting anonymous / shared-IP abuse | IP can be spoofed (e.g. X-Forwarded-For) |

We use **both** on the same endpoint:

- **Per user:** e.g. 30 chat streams per minute per account.
- **Per IP:** e.g. 60 chat streams per minute per IP (so one IP can’t host 100 accounts and each do 30).

If **either** limit is exceeded → 429. So we have two “buckets” per request; both must be under their limit.

**In our code:**  
`scope` is either `"user"` (identifier = user_id from JWT) or `"ip"` (identifier = client IP). We call `check_rate_limit(endpoint, scope, identifier, limit, window_seconds)` once for user and once for IP.

---

## 3. “Per what time?” — Windows (fixed vs sliding)

We need a **time window**: “X requests **per Y seconds**”.

### Fixed window

Time is split into fixed buckets: 0–60s, 60–120s, 120–180s, …

- We count requests in the **current** bucket.
- When the clock crosses into the next bucket, the counter **resets**.

Example (limit 3 per 60s):

```
Window 1: 0s -------- 60s   Window 2: 60s -------- 120s
          |  req req req |              | req req req |
          count=3 ✓      |              count=3 ✓
                        |
          At 59s: 3 requests → allowed. At 60s: new window → count=0, 3 more allowed.
```

**Downside:** At the boundary you can get a “burst”: up to `limit` at end of window 1 and `limit` at start of window 2 → **2× limit** in a short time. That’s the “fixed window allows 2× burst” tech debt.

**In our code:**  
`_current_window_end(now, window_seconds)` computes the end of the current 60s (or whatever) bucket. We store `(count, window_end)` per key. When `now >= window_end`, we reset count and move to the next window.

### Sliding window (we don’t use it yet)

The window is “last 60 seconds from **now**”, not fixed buckets.

- Stricter: no double burst at a boundary.
- More work: you need to store timestamps of recent requests (or use a different algorithm like token bucket).

Our current design is **fixed window**; sliding is an optional improvement (tech debt item).

---

## 4. Where do we store the counters? — In-memory vs Redis

We need a **store**: key → (count, window info).

### In-memory (what we use)

- A Python dict in the process: `_store[key] = (count, window_end)`.
- **Pros:** Simple, no extra infra, fast.
- **Cons:**
  - **Not shared:** Each API process has its own dict. With 3 instances, each allows 30/user → effectively 90/user. That’s the “in-memory not shared across instances” tech debt.
  - **No expiry:** We never delete keys. New users/IPs add new keys → dict can grow forever (“store never pruned” tech debt).

### Redis (or similar)

- Store counters in Redis with a TTL (time-to-live) or sliding-window logic in Redis.
- **Pros:** Shared by all API instances (one limit per user/IP globally), and Redis can auto-expire keys.
- **Cons:** You need Redis and a bit more code.

When you run **multiple pods/instances**, you’ll want a shared store (Redis) so “30 per user” is 30 total, not 30 per instance.

---

## 5. How a request flows (our implementation)

Rough flow for `POST /api/chat/stream`:

1. **Request** hits FastAPI.
2. **Auth:** `get_current_user` runs → we get `user_id` (or 401).
3. **Rate limit dependency** `rate_limit_chat_stream` runs:
   - Reads config: e.g. 30/user, 60/IP, window 60s.
   - Gets client IP (from `request.client.host` or, if `RATE_LIMIT_TRUST_PROXY=true`, from `X-Forwarded-For`).
   - Calls `check_rate_limit("chat_stream", "user", user_id, 30, 60)`.
     - If over limit → log, metric, raise `RateLimitError` → **429**.
   - Calls `check_rate_limit("chat_stream", "ip", ip, 60, 60)`.
     - If over limit → log, metric, raise `RateLimitError` → **429**.
4. If both checks pass, the **route handler** runs (chat stream, etc.).

So: **one** request **consumes** one from both the user bucket and the IP bucket. If either bucket is already at limit, we return 429 before doing the expensive work.

---

## 6. HTTP details: 429, Retry-After, X-RateLimit-*

- **429 Too Many Requests:** Standard status for “you’re over the limit.”
- **Response body (our schema):**
  ```json
  {
    "error": { "code": "RATE_LIMIT_EXCEEDED", "message": "Rate limit exceeded. Try again later." },
    "retry_after_seconds": 45
  }
  ```
  So clients can show “Try again in X seconds” or wait and retry.

- **Retry-After header:** Same idea in HTTP form (seconds until the client can retry). Browsers and clients often respect this.

- **X-RateLimit-Limit / X-RateLimit-Remaining:** We send these on **429** responses:
  - `X-RateLimit-Limit`: the limit that was hit (e.g. 30).
  - `X-RateLimit-Remaining`: 0 when rate limited.

(We could also send them on 200 responses so clients know how many requests they have left; we don’t do that yet.)

---

## 7. Concurrency: why we use a lock

Many requests can hit the API at the same time. The rate-limit **check and increment** must be **atomic**: read count, maybe reset window, add 1, write back. If two requests do that at the same time without coordination, both might see “count = 29” and both allow, so you get 31 requests in the window.

So we use a single **asyncio lock** (`_lock`) around the read–update–write. Only one coroutine at a time updates the store. That’s the “single global lock” tech debt: under very high concurrency it can become a bottleneck; for moderate traffic it’s fine. Redis would move that coordination into Redis instead.

---

## 8. Tech debt in plain language

| Tech debt | What it means | When it matters |
|-----------|----------------|------------------|
| **In-memory, not shared** | Each API process has its own counters. 3 instances ⇒ 3× the effective limit per user/IP. | When you run more than one instance and want a single global limit. **Fix:** Redis (or similar) backend. |
| **Store never pruned** | We never delete old keys. Every new user or IP adds a key; the dict only grows. | Long-running process with many distinct users/IPs ⇒ memory can grow. **Fix:** Periodic cleanup of expired windows, or Redis with TTL. |
| **Fixed window 2× burst** | At the boundary between two windows you can get up to 2× your limit in a short time. | If you need stricter “smooth” limits. **Fix:** Sliding window or token bucket. |
| **Single global lock** | Every rate-limit check takes the same lock. | Very high concurrency might make this a bottleneck. **Fix:** Per-key locking or Redis. |
| **X-Forwarded-For / trust proxy** | If we trust the header by default, a client could send a fake IP and bypass per-IP limits. | Security. **Fix:** Only use `X-Forwarded-For` when behind a trusted proxy (`RATE_LIMIT_TRUST_PROXY=true`). |
| **clear_store_for_tests** | A function that clears all rate-limit state. | If ever called in production (e.g. by mistake or RCE), limits would reset. **Fix:** We already guard it with `ENVIRONMENT=test`. |

---

## 9. Summary

- **Rate limiting** = cap “how many requests per time” to protect cost, fairness, and abuse.
- **Scopes:** We limit both **per user** (JWT) and **per IP** (client IP, with optional trust of `X-Forwarded-For`).
- **Window:** We use a **fixed** 60s (or configured) window; **sliding** would be stricter but more complex.
- **Storage:** **In-memory** dict per process; for multiple instances or large scale, a **shared store (e.g. Redis)** is the next step.
- **Flow:** Auth → rate-limit dependency (user + IP check) → 429 or route handler. We use a **lock** so check+increment is atomic.
- **HTTP:** 429, JSON body with `retry_after_seconds`, and **Retry-After** / **X-RateLimit-*** headers.
- **Tech debt:** Documented in `RATE_LIMIT_TECH_DEBT_AND_SECURITY.md`; the main ones are “in-memory not shared,” “store not pruned,” “fixed-window burst,” and “trust proxy” (already configurable).

---

## 10. Input size vs request count

**Request-count rate limiting** (what we built) answers: “How many requests per minute?”  
**Input-size limiting** answers: “How big can each request’s payload be?” — because LLM cost is driven by **tokens** (roughly proportional to characters sent).

- **Context ingest:** We already cap input: `raw_content` is trimmed to `MAX_RAW_CONTENT_LENGTH` (50 000 characters) before being sent to the LLM. So we limit cost per ingest.
- **Chat stream:** The **user message** has no max length. A single request could send a huge message (plus we send up to 50 history messages, system prompt, client context). So one request could burn a lot of input tokens.

So yes — it’s reasonable to add **per-message size limits** for chat (e.g. max characters per user message). That:
- Caps cost per request.
- Reduces abuse (someone sending 1 MB of text every request).
- Helps avoid hitting the model’s context limit in one shot.

We add a configurable **max chat message length** and reject (e.g. 413 Payload Too Large) when exceeded; that complements request-count rate limiting.
