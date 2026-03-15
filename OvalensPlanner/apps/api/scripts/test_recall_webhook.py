#!/usr/bin/env python3
"""Manually test Recall webhook signature by sending a signed POST to your API.

Usage (from OvalensPlanner/apps/api):
  # Load secret from .env in current dir, or set it:
  set RECALL_WEBHOOK_SECRET=whsec_your_secret
  python scripts/test_recall_webhook.py

  # Or pass URL:
  python scripts/test_recall_webhook.py https://ovalens-production.up.railway.app
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import sys
import time

# Optional: load .env from apps/api if present (no extra deps)
def _load_dotenv() -> None:
    for path in [os.path.join(os.path.dirname(__file__), ".env"), ".env"]:
        if os.path.isfile(path):
            with open(path, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, _, v = line.partition("=")
                        k, v = k.strip(), v.strip()
                        if k == "RECALL_WEBHOOK_SECRET" and v:
                            v = v.strip('"').strip("'")
                            os.environ.setdefault(k, v)
                            return
            break


def sign_payload(secret: str, msg_id: str, raw_body: bytes, timestamp: str | None = None) -> str:
    """Compute Recall workspace webhook signature (webhook-id.timestamp.body, base64 HMAC)."""
    ts = timestamp or str(int(time.time()))
    if not secret.startswith("whsec_"):
        raise SystemExit("RECALL_WEBHOOK_SECRET must be a workspace secret (whsec_...).")
    key = base64.b64decode(secret.removeprefix("whsec_"))
    payload_str = raw_body.decode("utf-8")
    to_sign = f"{msg_id}.{ts}.{payload_str}"
    return base64.b64encode(hmac.new(key, to_sign.encode(), hashlib.sha256).digest()).decode()


def main() -> int:
    _load_dotenv()
    secret = (os.environ.get("RECALL_WEBHOOK_SECRET") or "").strip()
    if not secret:
        print("RECALL_WEBHOOK_SECRET not set. Set it or add to .env in apps/api.", file=sys.stderr)
        return 1

    base = (sys.argv[1] if len(sys.argv) > 1 else "https://ovalens-production.up.railway.app").rstrip("/")
    url = f"{base}/api/nora/webhooks/recall"

    payload = {
        "event": "recording.done",
        "event_id": "manual-test-event-1",
        "bot_id": "manual-test-bot",
        "data": {"recording": {"id": "rec-manual-1"}},
    }
    body = json.dumps(payload).encode()
    msg_id = "msg_manual_test_1"
    ts = str(int(time.time()))
    sig_b64 = sign_payload(secret, msg_id, body, ts)
    headers = {
        "Content-Type": "application/json",
        "webhook-id": msg_id,
        "webhook-timestamp": ts,
        "webhook-signature": f"v1,{sig_b64}",
    }

    try:
        import urllib.request
        req = urllib.request.Request(url, data=body, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=15) as resp:
            code = resp.getcode()
            out = resp.read().decode()
            print(f"Response {code}")
            print(out)
            return 0 if code == 200 else 1
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code}", file=sys.stderr)
        print(e.read().decode(), file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
