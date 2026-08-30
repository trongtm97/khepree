#!/usr/bin/env bash
set -euo pipefail
: "${VPS_PATH:?}" "${ENV_FILE:?}" "${COMPOSE_FILE:?}" "${TAG:?}"
cd "$VPS_PATH"
upsert() {
  local key="$1" val="$2"
  if sudo grep -q "^${key}=" "$ENV_FILE"; then
    sudo sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" | sudo tee -a "$ENV_FILE" >/dev/null
  fi
}
upsert KHEPREE_WEB_IMAGE "khepree-web:${TAG}"
upsert KHEPREE_ACCOUNT_IMAGE "khepree-account:${TAG}"
upsert KHEPREE_ADMIN_IMAGE "khepree-admin:${TAG}"
upsert KHEPREE_PARTNER_IMAGE "khepree-partner:${TAG}"
upsert KHEPREE_API_IMAGE "khepree-api:${TAG}"
upsert KHEPREE_MIGRATE_IMAGE "khepree-migrate:${TAG}"
upsert KHEPREE_WORKER_IMAGE "khepree-outbox-worker:${TAG}"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --pull never
