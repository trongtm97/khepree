#!/usr/bin/env bash
set -euo pipefail
: "${VPS_PATH:?}" "${ENV_FILE:?}" "${COMPOSE_FILE:?}" "${ROLLBACK_FILE:?}"
cd "$VPS_PATH"
test -f "$ROLLBACK_FILE"
while IFS='=' read -r key val; do
  [ -z "$key" ] && continue
  case "$key" in \#*) continue ;; esac
  if sudo grep -q "^${key}=" "$ENV_FILE"; then
    sudo sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" | sudo tee -a "$ENV_FILE" >/dev/null
  fi
done < "$ROLLBACK_FILE"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d --pull never
sleep 10
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps
