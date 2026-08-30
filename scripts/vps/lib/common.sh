#!/usr/bin/env bash
# Shared helpers for Khepree VPS scripts. Source, do not execute directly.

set -euo pipefail

require_root() {
  if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    echo "error: run as root (sudo)" >&2
    exit 1
  fi
}

require_ubuntu_2404() {
  if [[ ! -f /etc/os-release ]]; then
    echo "error: /etc/os-release not found" >&2
    exit 1
  fi
  # shellcheck disable=SC1091
  source /etc/os-release
  if [[ "${ID:-}" != "ubuntu" ]] || [[ "${VERSION_ID:-}" != "24.04" ]]; then
    echo "warning: scripts target Ubuntu 24.04 LTS; detected ${PRETTY_NAME:-unknown}" >&2
  fi
}

log() {
  echo "[khepree-vps] $*"
}

confirm() {
  local prompt="${1:-Continue?}"
  if [[ "${KHEPREE_VPS_YES:-}" == "1" ]]; then
    return 0
  fi
  read -r -p "${prompt} [y/N] " reply
  [[ "${reply}" =~ ^[Yy]$ ]]
}

deploy_user() {
  echo "${KHEPREE_DEPLOY_USER:-khepree}"
}

deploy_home() {
  echo "/home/$(deploy_user)"
}
