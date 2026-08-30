# Observability

Diagnose production issues without SSH log archaeology. All services emit **structured JSON** to stdout (Docker captures via `json-file` driver — see `compose.production.yml`).

Related: `docs/DATA-SAFETY.md`, `docs/PRODUCTION-INTEGRATIONS.md`, `docs/VPS-SECURITY.md`.

## 1. Structured logging

`createLogger(service)` in `@khepree/config` writes one JSON object per line:

| Field | Description |
|-------|-------------|
| `timestamp` | ISO-8601 UTC |
| `level` | `debug` \| `info` \| `warn` \| `error` |
| `service` | App or subsystem name (`api`, `outbox`, `email`, …) |
| `event` | Stable event name for dashboards |
| `requestId` | Correlation ID when in request scope |
| `msg` | Human-readable default (= `event` if omitted) |

`debug` is suppressed in production.

### Never logged (redacted automatically)

Passwords, auth tokens, cookies, API keys, SePay secrets, license private keys, and similar fields are replaced with `[REDACTED]` via `redact()`.

Do not log raw webhook bodies, `Authorization` headers, or `OUTBOX_WORKER_SECRET`.

### Service names (examples)

| Service | Logger name |
|---------|-------------|
| API | `api` |
| Outbox worker | `outbox-worker` |
| Outbox dispatcher | `outbox` |
| Email | `email` |
| Alerts | `alerts` |
| Errors (default reporter) | `errors` |

## 2. Request ID and correlation

### Ingress

- **Caddy** forwards `X-Request-ID` from the client/Cloudflare (`docker/Caddyfile`).
- **Apps** call `getRequestIdFromHeaders()` — generates UUID if header absent.
- **Security headers** attach `x-request-id` on responses (`@khepree/security`).

### Payment → entitlement trace

```
SePay webhook (api)
  requestId in logs
  → commerce.processWebhook({ requestId })
  → outbox payload._correlation.requestId
  → outbox dispatcher logs (outbox_event_processed / outbox_event_failed)
  → entitlement/licensing handlers (same requestId in logs)
```

Search logs: `requestId:"<uuid>"` across `docker compose logs`.

## 3. Health endpoints

| Endpoint | App | Checks |
|----------|-----|--------|
| `GET /healthz` | web, account, admin, partner, api | Process up (`validateRuntimeEnv` at boot) |
| `GET /readyz` | api only | PostgreSQL `SELECT 1`, Redis ping, production config (email, R2, license keys) |

```bash
curl -sS https://khepree.com/healthz
curl -sS https://api.khepree.com/readyz
```

Returns `503` when any `readyz` check is `fail`.

## 4. Outbox health metrics

Internal endpoint (no payloads):

```
GET https://api.khepree.com/api/v1/internal/outbox/health
Authorization: Bearer <OUTBOX_WORKER_SECRET>
```

Response:

```json
{
  "status": "ok",
  "metrics": {
    "pending": 0,
    "processing": 0,
    "failed": 0,
    "oldestPendingAgeSeconds": null,
    "lastWorkerRun": "2026-08-30T12:00:00.000Z"
  },
  "requestId": "..."
}
```

`lastWorkerRun` is written to Redis by the outbox worker each tick (`khepree:observability:outbox:last_worker_run`).

Alert when `failed > 0`, `oldestPendingAgeSeconds > 3600`, or worker heartbeat older than 15 minutes (`outboxHealthNeedsAlert()`).

## 5. Business-critical alerts

Events prefixed with `alert.` go to the `alerts` service logger. Wire your log stack to notify on `level:warn|error` + `event:alert.*`.

| Alert event | Trigger |
|-------------|---------|
| `alert.outbox_event_failed` | Outbox event exhausted retries |
| `alert.outbox_worker_tick_failed` | Worker tick threw |
| `alert.outbox_stale_locks_reclaimed` | Stale PROCESSING locks reclaimed |
| `alert.webhook_processing_failed` | Payment webhook 500 |
| `alert.webhook_invalid` | Webhook signature invalid |
| `alert.email_send_failed` | Resend rejected send |
| `alert.r2_operation_failed` | R2/S3 infrastructure error |
| `alert.backup_stale` | From `scripts/backup/db-health-check.sh` (cron) |

Also monitor:

- `readyz` returning non-200 (DB/Redis/config)
- `db-health-check.sh` exit code ≥ 1

## 6. Error tracking (`ErrorReporter`)

Vendor-neutral interface in `@khepree/config`:

```typescript
import { getErrorReporter } from "@khepree/config";

getErrorReporter().captureException(error, { requestId, service: "api" });
```

| Mode | When |
|------|------|
| Default | Structured JSON via `loggingErrorReporter()` |
| Sentry | Set `SENTRY_DSN` and install `@sentry/node` in the image (optional peer) |

Application code must **not** import `@sentry/node` directly — use `getErrorReporter()`.

## 7. External uptime monitoring

**Do not** rely on a status page hosted on the same VPS as production.

Monitor from **outside** the VPS (e.g. UptimeRobot, Better Stack, Pingdom, Cloudflare Health Checks):

| URL | Expected |
|-----|----------|
| `https://khepree.com/healthz` | 200 |
| `https://account.khepree.com/healthz` | 200 |
| `https://admin.khepree.com/healthz` | 200 |
| `https://partner.khepree.com/healthz` | 200 |
| `https://api.khepree.com/readyz` | 200 with `"status":"ok"` |

Interval: 1–5 minutes. Alert on 2+ consecutive failures.

Optional internal checks (same VPS cron):

```bash
./scripts/backup/db-health-check.sh
curl -fsS -H "Authorization: Bearer $OUTBOX_WORKER_SECRET" \
  https://api.khepree.com/api/v1/internal/outbox/health
```

## Log access on VPS

```bash
docker compose -f compose.production.yml logs -f api worker
docker compose -f compose.production.yml logs --since 1h api | jq 'select(.event|startswith("alert."))'
```

Forward stdout to your log platform (Loki, Datadog, Cloudflare Logpush, etc.) — not configured in-repo; operator choice.
