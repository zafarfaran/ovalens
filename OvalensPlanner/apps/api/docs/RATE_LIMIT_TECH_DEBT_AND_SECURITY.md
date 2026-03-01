# Rate limiting — tech debt & security notes

## Security

### 1. **X-Forwarded-For is trusted by default (HIGH)**

**Issue:** `get_client_ip()` uses the first value of `X-Forwarded-For` when present. Any client can send this header and pretend to be another IP, so:
- Per-IP rate limits can be bypassed (attacker sets `X-Forwarded-For: 1.2.3.4` and rotates values to get fresh “IPs”).
- A single bad actor can make requests appear to come from many IPs and evade IP-based limits.

**Mitigation:** Only use `X-Forwarded-For` when the request is known to come from a trusted proxy (e.g. Vercel, your load balancer). Use a config flag like `trust_proxy=True` and only then read `X-Forwarded-For`; otherwise use `request.client.host` only. Ensure your deployment strips or overwrites `X-Forwarded-For` from untrusted clients.

### 2. **User limit checked first → information disclosure (LOW)**

**Issue:** We check per-user then per-IP. A client can infer they hit the user limit (vs IP limit) by observing behavior. Not a direct vulnerability but reveals which limit was hit.

**Mitigation:** Optional: return a generic “rate limit exceeded” without distinguishing user vs IP in logs sent to the client. Keep detailed scope in server-side logs only.

### 3. **No rate limit on unauthenticated paths to these endpoints (N/A)**

**Issue:** Both `/api/chat/stream` and `/api/context/ingest` require auth. Unauthenticated abuse gets 401 before rate limit, so no bypass. If you later add unauthenticated access, add per-IP (and optionally per-fingerprint) limits before auth.

### 4. **`clear_store_for_tests()` in production code (LOW)**

**Issue:** If any production code or an RCE ever calls `clear_store_for_tests()`, rate limit state would reset. Not exposed over HTTP.

**Mitigation:** Keep it for tests; consider guarding with `if os.environ.get("ENVIRONMENT") == "test"` or moving to a test-only helper so it’s never called in production.

### 5. **Stolen JWT consumes victim’s user quota**

**Issue:** Per-user limits are keyed by JWT `sub`. If a token is stolen, the attacker burns the victim’s quota. This is inherent to “per-user” limits; no code bug.

**Mitigation:** Short-lived tokens, refresh flow, and anomaly detection (e.g. many IPs for one user) can help.

---

## Tech debt

### 1. **In-memory store — not shared across instances (HIGH for scale)**

**Issue:** Each process has its own `_store`. With N instances, effective limit is roughly N × configured limit (e.g. 30/user × 3 = 90/user across 3 pods).

**Mitigation:** Use a shared backend (e.g. Redis) with the same fixed-window or sliding-window logic when you run multiple instances. The current API (`check_rate_limit` with endpoint/scope/identifier/limit/window) can be backed by Redis without changing callers.

### 2. **Store never pruned — unbounded memory (MEDIUM)**

**Issue:** `_store` only grows: every (endpoint, scope, user_id or IP) adds a key. Old windows are reused in place, but new users/IPs add entries. Under heavy or abusive traffic (many distinct IPs/user IDs), memory can grow.

**Mitigation:** Periodically remove keys whose `window_end` is in the past (e.g. background task or cleanup every M requests). Or use a TTL-based store (e.g. Redis) so keys expire automatically.

### 3. **Fixed window allows 2× burst at boundary (LOW)**

**Issue:** Fixed windows allow up to `limit` at the end of window A and `limit` at the start of window B, so 2× limit in a short time.

**Mitigation:** For stricter fairness, consider a sliding window or token bucket. Optional improvement; current design is acceptable for many products.

### 4. **Single global lock (LOW)**

**Issue:** `_lock` is process-global. Under high concurrency, every rate-limit check serializes on this lock.

**Mitigation:** Acceptable for moderate traffic. If needed, use per-key or sharded locks, or move to Redis which handles concurrency internally.

### 5. **No distinction between 4xx and 5xx for metrics**

**Issue:** `record_http_request` and rate-limit metrics don’t tag whether the 429 was due to user vs IP. You already have `record_rate_limit_hit(endpoint, scope)` with `scope in ("user", "ip")`, so this is covered.

---

## Edge cases (behavioral)

- **Empty or missing IP:** `get_client_ip` returns `"unknown"`; all such requests share one bucket. If many clients have no `request.client`, they share one per-IP limit. Rare behind a reverse proxy.
- **Clock skew:** Fixed window uses `time.time()`. Large skew between servers matters only with a shared store (e.g. Redis); in-memory per-process is consistent per process.
- **Very large limit values:** Config uses `ge=0` but no upper bound. Extremely large values don’t break logic but could make the store large if combined with many identifiers; consider a sanity cap (e.g. ≤ 10_000) in config.

---

## Recommended next steps (priority)

1. **Security:** Make `X-Forwarded-For` usage configurable and off by default (or only when `trust_proxy` is True).
2. **Scale:** Introduce a Redis-backed rate limiter when running multiple API instances.
3. **Operations:** Add optional periodic cleanup of expired keys in the in-memory store (or document that single-instance + restarts are acceptable).
4. **Hardening:** Guard or relocate `clear_store_for_tests()` so it cannot run in production.
