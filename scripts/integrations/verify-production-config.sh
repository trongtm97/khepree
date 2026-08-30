#!/usr/bin/env bash
# Validate production integration config shape — never prints secret values.
#
# Usage:
#   ./verify-production-config.sh
#   KHEPREE_ENV_FILE=/etc/khepree/.env.production ./verify-production-config.sh
#
# Exit 0 = all checks pass. Exit 1 = one or more failures.

set -euo pipefail

ENV_FILE="${KHEPREE_ENV_FILE:-/etc/khepree/.env.production}"
FAIL=0

warn() { echo "[verify-config] FAIL: $*" >&2; FAIL=1; }
ok() { echo "[verify-config] OK: $*"; }

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "[verify-config] error: env file not found: ${ENV_FILE}" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "${ENV_FILE}"
set +a

check_url() {
  local name="$1"
  local value="$2"
  local expected_host="$3"
  if [[ -z "${value}" || "${value}" == *"CHANGE_ME"* ]]; then
    warn "${name} missing or placeholder"
    return
  fi
  if [[ "${value}" != "https://${expected_host}" && "${value}" != "https://${expected_host}/" ]]; then
    warn "${name} should be https://${expected_host} (got host mismatch — value not printed)"
    return
  fi
  ok "${name}"
}

check_set() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "${value}" || "${value}" == *"CHANGE_ME"* ]]; then
    warn "${name} missing or placeholder"
  else
    ok "${name} is set"
  fi
}

echo "[verify-config] checking ${ENV_FILE}"

check_url WEB_URL "${WEB_URL:-}" "khepree.com"
check_url APP_URL "${APP_URL:-}" "khepree.com"
check_url ACCOUNT_URL "${ACCOUNT_URL:-}" "account.khepree.com"
check_url ADMIN_URL "${ADMIN_URL:-}" "admin.khepree.com"
check_url PARTNER_URL "${PARTNER_URL:-}" "partner.khepree.com"
check_url API_URL "${API_URL:-}" "api.khepree.com"
check_url BETTER_AUTH_URL "${BETTER_AUTH_URL:-}" "account.khepree.com"

check_url NEXT_PUBLIC_WEB_URL "${NEXT_PUBLIC_WEB_URL:-}" "khepree.com"
check_url NEXT_PUBLIC_ACCOUNT_URL "${NEXT_PUBLIC_ACCOUNT_URL:-}" "account.khepree.com"
check_url NEXT_PUBLIC_ADMIN_URL "${NEXT_PUBLIC_ADMIN_URL:-}" "admin.khepree.com"
check_url NEXT_PUBLIC_PARTNER_URL "${NEXT_PUBLIC_PARTNER_URL:-}" "partner.khepree.com"

check_set BETTER_AUTH_SECRET
check_set POSTGRES_USER
check_set POSTGRES_PASSWORD
check_set POSTGRES_DB
check_set REDIS_PASSWORD
check_set LICENSE_SIGNING_PRIVATE_KEY
check_set LICENSE_SIGNING_PUBLIC_KEY

if [[ -n "${S3_ENDPOINT:-}" && "${S3_ENDPOINT}" != *"CHANGE_ME"* ]]; then
  check_set S3_ENDPOINT
  check_set S3_REGION
  check_set S3_ACCESS_KEY_ID
  check_set S3_SECRET_ACCESS_KEY
  check_set S3_BUCKET_PUBLIC
  check_set S3_BUCKET_PRIVATE
  if [[ -n "${S3_PUBLIC_BASE_URL:-}" && "${S3_PUBLIC_BASE_URL}" == https://* ]]; then
    ok "S3_PUBLIC_BASE_URL uses HTTPS CDN origin"
  else
    warn "S3_PUBLIC_BASE_URL must be https:// CDN origin (not S3 API endpoint)"
  fi
  ok "S3 storage configured"
else
  warn "S3 storage is not configured"
fi

mail_from="${MAIL_FROM:-${EMAIL_FROM:-}}"
if [[ -z "${mail_from}" || "${mail_from}" == *"CHANGE_ME"* ]]; then
  warn "MAIL_FROM or EMAIL_FROM missing or placeholder"
else
  ok "MAIL_FROM/EMAIL_FROM is set"
fi

if [[ "${EMAIL_PROVIDER:-}" == "smtp" ]]; then
  check_set SMTP_HOST
  if [[ -z "${SMTP_PORT:-}" || "${SMTP_PORT}" == *"CHANGE_ME"* ]]; then
    warn "SMTP_PORT missing or placeholder"
  else
    ok "SMTP_PORT is set"
  fi
  ok "EMAIL_PROVIDER=smtp"
elif [[ "${EMAIL_PROVIDER:-}" == "resend" ]]; then
  check_set EMAIL_PROVIDER_API_KEY
  ok "EMAIL_PROVIDER=resend"
else
  warn "EMAIL_PROVIDER must be smtp or resend in production"
fi

if [[ "${PAYMENT_PROVIDER:-}" != "sepay" ]]; then
  warn "PAYMENT_PROVIDER must be sepay"
else
  ok "PAYMENT_PROVIDER=sepay"
fi

if [[ "${SEPAY_ENV:-}" == "production" && "${KHEPREE_ALLOW_SEPAY_PRODUCTION:-}" != "1" ]]; then
  warn "SEPAY_ENV=production requires manual go-live — set KHEPREE_ALLOW_SEPAY_PRODUCTION=1 to acknowledge"
elif [[ "${SEPAY_ENV:-}" == "sandbox" ]]; then
  ok "SEPAY_ENV=sandbox (expected until B1 gate)"
elif [[ "${SEPAY_ENV:-}" == "production" ]]; then
  ok "SEPAY_ENV=production (manual go-live acknowledged)"
else
  warn "SEPAY_ENV must be sandbox or production"
fi

if [[ -z "${REDIS_PASSWORD:-}" || "${REDIS_PASSWORD}" == *"CHANGE_ME"* ]]; then
  warn "REDIS_PASSWORD missing (REDIS_URL is composed in compose file)"
else
  ok "REDIS_PASSWORD is set"
fi

if [[ "${TRUSTED_PROXY:-}" == "cloudflare" ]]; then
  ok "TRUSTED_PROXY=cloudflare"
elif [[ -z "${TRUSTED_PROXY:-}" || "${TRUSTED_PROXY}" == "none" ]]; then
  ok "TRUSTED_PROXY=none (direct DNS — expected on shared VPS without CF proxy)"
else
  warn "TRUSTED_PROXY has unexpected value"
fi

if [[ -n "${GOOGLE_CLIENT_ID:-}" && -n "${GOOGLE_CLIENT_SECRET:-}" ]]; then
  if [[ "${GOOGLE_CLIENT_ID}" == *"CHANGE_ME"* || "${GOOGLE_CLIENT_SECRET}" == *"CHANGE_ME"* ]]; then
    warn "Google OAuth placeholders must be removed or vars unset"
  else
    ok "Google OAuth configured (verify redirect URIs in Google Console)"
  fi
else
  ok "Google OAuth not configured (optional)"
fi

if [[ -n "${OUTBOX_WORKER_SECRET:-}" && "${OUTBOX_WORKER_SECRET}" != *"CHANGE_ME"* ]]; then
  ok "OUTBOX_WORKER_SECRET is set (HTTP outbox endpoint)"
else
  ok "OUTBOX_WORKER_SECRET unset or placeholder (OK if using dedicated worker container only)"
fi

if [[ "${FAIL}" -ne 0 ]]; then
  echo "[verify-config] completed with failures" >&2
  exit 1
fi

echo "[verify-config] all checks passed"
exit 0
