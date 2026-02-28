#!/usr/bin/env python3
"""Send 30 GET requests to http://localhost:8000/health and print status for each."""
import urllib.request
import sys

url = "http://localhost:8000/health"
timeout = 5
count = 30

ok = 0
fail = 0
for i in range(1, count + 1):
    try:
        r = urllib.request.urlopen(url, timeout=timeout)
        status = r.status
        ok += 1
        print(f"  {i:2}: {status}")
    except Exception as e:
        fail += 1
        print(f"  {i:2}: ERROR {e}", file=sys.stderr)

print(f"\nDone: {ok} ok, {fail} failed")
sys.exit(0 if fail == 0 else 1)
