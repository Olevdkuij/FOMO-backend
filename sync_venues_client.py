#!/usr/bin/env python3
"""
Pushes new/updated venues (JSON) to the FOMO backend's venues sync endpoint.
Additive-only: existing venues not in the payload are left untouched.

Setup (once):
    export FOMO_SYNC_URL="https://fomo-backend-3s7g.onrender.com/api/venues/sync"
    export FOMO_SYNC_SECRET="<the SYNC_SECRET value from .env>"

Usage:
    python3 sync_venues_client.py path/to/venues.json
"""
import json, os, sys
import urllib.request
import urllib.error

def main():
    if len(sys.argv) != 2:
        print("usage: sync_venues_client.py <path-to-venues.json>")
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
