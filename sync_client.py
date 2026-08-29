#!/usr/bin/env python3
"""
Pushes a fresh Marbella events dataset (JSON) to the FOMO backend's sync
endpoint. Run this by hand whenever the external research pipeline hands
you a new marbella_events_*.json file. Uses only the Python standard
library — no pip install needed.

Setup (once):
    export FOMO_SYNC_URL="http://localhost:3000/api/marbella-events/sync"   # or your deployed URL
    export FOMO_SYNC_SECRET="<the SYNC_SECRET value from .env>"

Usage:
    python3 sync_client.py path/to/marbella_events_aug_sep_2026.json
"""
import json, os, sys
import urllib.request
import urllib.error

def main():
    if len(sys.argv) != 2:
        print("usage: sync_client.py <path-to-marbella-events.json>")
        sys.exit(1)
    path = sys.argv[1]
    url = os.environ.get("FOMO_SYNC_URL")
    secret = os.environ.get("FOMO_SYNC_SECRET")
    if not url or not secret:
        print("Set FOMO_SYNC_URL and FOMO_SYNC_SECRET environment variables first (see the docstring at the top of this file).")
        sys.exit(1)
    with open(path) as f:
        payload = json.load(f)
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "x-sync-secret": secret},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            print(json.loads(resp.read().decode("utf-8")))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        print(f"HTTP {e.code}: {body}")
        sys.exit(1)
    except urllib.error.URLError as e:
        print(f"Could not reach {url}: {e.reason}")
        sys.exit(1)

if __name__ == "__main__":
    main()
