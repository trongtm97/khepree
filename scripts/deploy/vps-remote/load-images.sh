#!/usr/bin/env bash
set -euo pipefail
: "${VPS_PATH:?}" "${TAG:?}" "${DEPLOY_TAG:?}" "${ROLLBACK_FILE:?}" "${ARCHIVE_REMOTE:?}"
cd "$VPS_PATH"
if docker image inspect "khepree-web:${TAG}" >/dev/null 2>&1; then
  : > "$ROLLBACK_FILE"
  save_rb() {
    local img="$1" key="$2"
    if ! docker image inspect "${img}:${TAG}" >/dev/null 2>&1; then
      return
    fi
    local rb="${img}:rollback-${DEPLOY_TAG}"
    docker tag "${img}:${TAG}" "$rb"
    echo "${key}=${rb}" >> "$ROLLBACK_FILE"
  }
  save_rb khepree-web KHEPREE_WEB_IMAGE
  save_rb khepree-account KHEPREE_ACCOUNT_IMAGE
  save_rb khepree-admin KHEPREE_ADMIN_IMAGE
  save_rb khepree-partner KHEPREE_PARTNER_IMAGE
  save_rb khepree-api KHEPREE_API_IMAGE
  save_rb khepree-migrate KHEPREE_MIGRATE_IMAGE
  save_rb khepree-outbox-worker KHEPREE_WORKER_IMAGE
fi
gunzip -c "$ARCHIVE_REMOTE" | docker load
for img in khepree-web khepree-account khepree-admin khepree-partner khepree-api khepree-migrate khepree-outbox-worker; do
  docker tag "${img}:deploy-${DEPLOY_TAG}" "${img}:${TAG}"
done
