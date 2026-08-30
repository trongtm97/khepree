#!/usr/bin/env bash
set -euo pipefail
CADDY='/opt/chapmee/app/Caddyfile.production'
SNIP="${VPS_PATH:?}/Caddyfile.shared-vps.snippet"
if [ -f "$CADDY" ] && [ -f "$SNIP" ] && ! grep -q 'khepree.com {' "$CADDY"; then
  sudo cp "$CADDY" "${CADDY}.bak.$(date -u +%Y%m%d-%H%M%S)"
  sudo bash -c "cat '$SNIP' >> '$CADDY'"
  docker exec chapmee-caddy caddy validate --config /etc/caddy/Caddyfile
  docker exec chapmee-caddy caddy reload --config /etc/caddy/Caddyfile
  echo 'Caddy updated'
else
  echo 'Caddy skip (already configured or files missing)'
fi
