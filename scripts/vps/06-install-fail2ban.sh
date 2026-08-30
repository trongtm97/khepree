#!/usr/bin/env bash
# Optional: install fail2ban with a conservative SSH jail.
#
# Usage:
#   sudo SSH_PORT=22 ./06-install-fail2ban.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_root
require_ubuntu_2404

SSH_PORT="${SSH_PORT:-22}"

apt-get update
apt-get install -y fail2ban

cat > /etc/fail2ban/jail.d/khepree-sshd.local <<EOF
[sshd]
enabled = true
port = ${SSH_PORT}
maxretry = 5
findtime = 10m
bantime = 1h
backend = systemd
EOF

systemctl enable fail2ban
systemctl restart fail2ban

log "fail2ban installed for sshd on port ${SSH_PORT}"
log "status: fail2ban-client status sshd"
