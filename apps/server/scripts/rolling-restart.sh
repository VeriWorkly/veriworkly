#!/usr/bin/env sh
# Restarts the two API copies from ecosystem.config.cjs one at a time (V-373).
#
# A copy draining for its restart stops accepting connections, so nginx sends new requests to
# the other copy (its upstreams list both). A copy is restarted only while the other one answers
# /health/ready, and the next restart waits until the restarted copy is ready again, so one copy
# is always serving. If the other copy is not healthy, nothing is restarted.
#
# Usage, from apps/server after `npm run build`:  sh scripts/rolling-restart.sh
set -eu

ready() {
  curl -fs -o /dev/null --max-time 5 "http://127.0.0.1:$1/api/v1/health/ready" 2>/dev/null
}

# Refuses to go on when the copy that must keep serving is not healthy.
require_ready() {
  if ! ready "$2"; then
    echo "$1 on port $2 is not ready, so restarting the other copy would leave nobody serving. Nothing was restarted; fix $1 first." >&2
    exit 1
  fi
}

wait_ready() {
  # Boot can take Redis's connect timeout (15 s) plus Prisma and the admin check; allow 90 s.
  i=0
  until ready "$2"; do
    i=$((i + 1))
    if [ "$i" -ge 90 ]; then
      echo "$1 is not ready on port $2 after 90 s; stopping before the other copy restarts." >&2
      exit 1
    fi
    sleep 1
  done
  echo "$1 is ready on port $2."
}

require_ready veriworkly-server-b 7043
pm2 restart veriworkly-server-a
wait_ready veriworkly-server-a 7042
require_ready veriworkly-server-a 7042
pm2 restart veriworkly-server-b
wait_ready veriworkly-server-b 7043
