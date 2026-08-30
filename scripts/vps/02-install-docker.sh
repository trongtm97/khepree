#!/usr/bin/env bash
# Install Docker Engine + Compose plugin on Ubuntu 24.04 (official Docker apt repo).
#
# Usage:
#   sudo ./02-install-docker.sh

set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

require_root
require_ubuntu_2404

if command -v docker &>/dev/null; then
  log "docker already installed: $(docker --version)"
else
  log "installing Docker Engine"
  apt-get update
  apt-get install -y ca-certificates curl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

USER_NAME="$(deploy_user)"
if id "${USER_NAME}" &>/dev/null; then
  usermod -aG docker "${USER_NAME}"
  log "added ${USER_NAME} to docker group (re-login required)"
fi

systemctl enable --now docker
log "docker compose version: $(docker compose version)"
