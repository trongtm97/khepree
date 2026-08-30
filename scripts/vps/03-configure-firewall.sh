#!/usr/bin/env bash
# Configure UFW: allow SSH + HTTP/HTTPS only. Block Postgres, Redis, app ports.
#
# Usage:
#   sudo SSH_PORT=22 ./03-configure-firewall.sh
#   sudo KHEPREE_VPS_YES=1 SSH_PORT=2222 ./03-configure-firewall.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_root
require_ubuntu_2404

SSH_PORT="${SSH_PORT:-22}"

if ! command -v ufw &>/dev/null; then
  apt-get update
  apt-get install -y ufw
fi

log "allowing SSH on tcp/${SSH_PORT}, HTTP 80, HTTPS 443"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow "${SSH_PORT}/tcp" comment 'SSH'
ufw allow 80/tcp comment 'HTTP (Caddy ACME + redirect)'
ufw allow 443/tcp comment 'HTTPS (Caddy)'

log "explicitly NOT opening: 3000-3004, 5432, 6379 (internal Docker network only)"

if confirm "Enable UFW now?"; then
  ufw --force enable
  ufw status verbose
  log "firewall enabled"
else
  log "rules staged; run 'ufw enable' manually when ready"
fi
