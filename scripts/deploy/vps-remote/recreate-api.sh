#!/usr/bin/env bash
set -euo pipefail
TAG="${1:?deploy tag}"
ENV_FILE=/etc/khepree/.env.production
cd /opt/khepree/app
docker tag "khepree-api:deploy-${TAG}" khepree-api:production
if sudo grep -q '^KHEPREE_API_IMAGE=' "$ENV_FILE"; then
  sudo sed -i 's|^KHEPREE_API_IMAGE=.*|KHEPREE_API_IMAGE=khepree-api:production|' "$ENV_FILE"
else
  echo 'KHEPREE_API_IMAGE=khepree-api:production' | sudo tee -a "$ENV_FILE" >/dev/null
fi
docker compose -f compose.shared-vps.yml --env-file "$ENV_FILE" up -d --pull never --no-deps --force-recreate khepree-api
sleep 10
docker ps --filter name=khepree-api --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
docker logs khepree-api --tail 30
