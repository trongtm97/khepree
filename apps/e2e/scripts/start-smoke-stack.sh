#!/usr/bin/env bash
# Start production builds of smoke apps and wait until HTTP ports respond.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

pnpm --filter @khepree/web start &
pnpm --filter @khepree/account start &
pnpm --filter @khepree/admin start &
pnpm --filter @khepree/partner start &

pnpm exec wait-on -t 180000 \
  http-get://127.0.0.1:3000 \
  http-get://127.0.0.1:3001 \
  http-get://127.0.0.1:3002 \
  http-get://127.0.0.1:3003

echo "Smoke stack ready"
