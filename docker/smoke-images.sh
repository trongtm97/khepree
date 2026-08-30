#!/usr/bin/env bash
# Build and smoke-test production Docker images locally.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=docker/smoke-env.sh
source docker/smoke-env.sh

declare -A APPS=(
  [web]="@khepree/web:3000"
  [account]="@khepree/account:3001"
  [admin]="@khepree/admin:3002"
  [partner]="@khepree/partner:3003"
  [api]="@khepree/api:3004"
)

build_app() {
  local name="$1" filter="$2" port="$3"
  echo "==> Building khepree-${name}"
  docker build \
    --network host \
    -f docker/Dockerfile.app \
    --build-arg APP_NAME="${name}" \
    --build-arg APP_FILTER="${filter}" \
    --build-arg PORT="${port}" \
    --build-arg DATABASE_URL="${DATABASE_URL:-postgresql://khepree:khepree_local@127.0.0.1:5434/khepree_local}" \
    -t "khepree-${name}:local" \
    .
}

smoke_app() {
  local name="$1" port="$2"
  local cid
  cid="$(docker run -d --rm -p "${port}:${port}" -e "PORT=${port}" "${SMOKE_ENV[@]}" "khepree-${name}:local")"
  trap 'docker stop "$cid" >/dev/null 2>&1 || true' EXIT
  for _ in $(seq 1 30); do
    if curl -sf "http://127.0.0.1:${port}/healthz" >/dev/null; then
      echo "OK khepree-${name} /healthz"
      docker stop "$cid" >/dev/null
      trap - EXIT
      return 0
    fi
    sleep 2
  done
  echo "FAIL khepree-${name} /healthz" >&2
  docker logs "$cid" >&2 || true
  docker stop "$cid" >/dev/null
  exit 1
}

build_worker() {
  echo "==> Building khepree-outbox-worker"
  docker build -f docker/Dockerfile.outbox-worker -t khepree-outbox-worker:local .
}

smoke_worker() {
  echo "==> Smoke khepree-outbox-worker"
  local output
  output="$(docker run --rm khepree-outbox-worker:local 2>&1)" || true
  if echo "$output" | grep -q "DATABASE_URL is required"; then
    echo "OK khepree-outbox-worker entrypoint"
    return 0
  fi
  echo "FAIL khepree-outbox-worker: $output" >&2
  exit 1
}

MODE="${1:-all}"
case "$MODE" in
  build)
    for name in "${!APPS[@]}"; do
      IFS=: read -r filter port <<< "${APPS[$name]}"
      build_app "$name" "$filter" "$port"
    done
    build_worker
    ;;
  smoke)
    for name in "${!APPS[@]}"; do
      IFS=: read -r _ port <<< "${APPS[$name]}"
      smoke_app "$name" "$port"
    done
    smoke_worker
    ;;
  all)
    for name in "${!APPS[@]}"; do
      IFS=: read -r filter port <<< "${APPS[$name]}"
      build_app "$name" "$filter" "$port"
      smoke_app "$name" "$port"
    done
    build_worker
    smoke_worker
    ;;
  *)
    echo "Usage: $0 [build|smoke|all]" >&2
    exit 1
    ;;
esac

echo "Docker smoke complete"
