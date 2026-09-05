#!/usr/bin/env bash
set -euo pipefail
docker exec khepree-production-api-1 sh -c 'grep -R desktop_activate_auto_trial /app 2>/dev/null | head -3 || true'
docker exec khepree-production-api-1 sh -c 'grep -R tryGrantFreeTrialOnce /app 2>/dev/null | head -3 || true'
curl -fsS https://api.khepree.com/readyz
echo
curl -fsS https://api.khepree.com/healthz
echo
docker ps --filter name=khepree-production --format 'table {{.Names}}\t{{.Status}}'
