# Desktop integration guide

Integrate a Khepree desktop app (e.g. NovelTrans) with account-based auth, device activation, and Khepree-hosted checkout.

## Prerequisites

- Registered `desktop_clients` row bound to a catalog `product_id`
- Allowlisted redirect URIs (custom scheme, e.g. `khepree-noveltrans://auth/callback`)
- API base: `https://api.khepree.com` (dev: `http://localhost:3004`)

## Flow overview

1. **Browser login** — open `account.khepree.com/desktop/authorize?...` (PKCE)
2. **Token exchange** — `POST /api/v1/desktop/auth/exchange`
3. **Activate device** — `POST /api/v1/desktop/activate` (Bearer access token)
4. **Refresh / heartbeat** — device-bound Ed25519 proof on every refresh
5. **Checkout / upgrade** — `POST /api/v1/desktop/checkout` → open `handoffUrl` in system browser
6. **Poll status** — `GET /api/v1/desktop/checkout/{publicId}/status`

Payment secrets never reach the desktop app. Entitlement grants only via verified payment webhook → outbox.

## API endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/api/v1/desktop/auth/exchange` | PKCE code |
| POST | `/api/v1/desktop/activate` | Bearer access token |
| POST | `/api/v1/desktop/auth/refresh` | Refresh token + device proof |
| POST | `/api/v1/desktop/heartbeat` | Access token + device proof |
| POST | `/api/v1/desktop/auth/logout` | Access token |
| GET | `/api/v1/desktop/me` | Bearer access token |
| POST | `/api/v1/desktop/checkout` | Bearer access token |
| GET | `/api/v1/desktop/checkout/{publicId}/status` | Bearer access token |

Types: `@khepree/sdk`.

## Device proof

Each refresh/heartbeat signs: session id, timestamp, nonce, method, path, body SHA-256. Store the device private key in OS secure storage; never send it to Khepree.

## Checkout

Desktop POST checkout returns `{ handoffUrl }` only. Open in the default browser. User completes payment on Khepree account; poll status until `ACCESS_ACTIVE`.

## Return to app

After account checkout/billing, users may see “Return to {app}” using the first allowlisted custom-scheme URI from `desktop_clients.allowed_redirect_uris` — never a client-supplied URL.

## SDK error codes

See `DESKTOP_ERROR_CODES` in `@khepree/sdk`. Map `ENTITLEMENT_MISSING`, `DEVICE_LIMIT_REACHED`, `DEVICE_REMOVED`, etc. to in-app UX.

## Not production-ready alone

Desktop integration is implemented in source but **Khepree is not production-ready** until B1 SePay sandbox proof and production gates in `docs/PRODUCTION-STATUS.md` are satisfied.
