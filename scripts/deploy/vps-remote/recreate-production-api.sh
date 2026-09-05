#!/usr/bin/env bash
set -euo pipefail
TAG="${1:?deploy tag}"
ENV_FILE=/etc/khepree/.env.production
COMPOSE_FILE=/opt/khepree/app/compose.production.yml
PROJECT=khepree-production

docker tag "khepree-api:deploy-${TAG}" khepree-api:production

if sudo grep -q '^KHEPREE_API_IMAGE=' "$ENV_FILE"; then
  sudo sed -i 's|^KHEPREE_API_IMAGE=.*|KHEPREE_API_IMAGE=khepree-api:production|' "$ENV_FILE"
else
  echo 'KHEPREE_API_IMAGE=khepree-api:production' | sudo tee -a "$ENV_FILE" >/dev/null
fi

cd /opt/khepree/app
docker compose -p "$PROJECT" -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --pull never --no-deps --force-recreate api
sleep 12
docker ps --filter name=khepree-production-api --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
docker logs khepree-production-api-1 --tail 40
