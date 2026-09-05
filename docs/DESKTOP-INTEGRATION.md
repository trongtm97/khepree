# Desktop integration guide

Integrate a Khepree desktop app (e.g. NovelTrans) with account-based auth, device activation, Khepree-hosted checkout, product-scoped announcements, and software updates.

For the full client design contract (auth, entitlement/license, announcements, updates, recommended loops), see [`DESKTOP-CLIENT-DESIGN.md`](./DESKTOP-CLIENT-DESIGN.md).

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
7. **Announcements** — `GET /api/v1/desktop/announcements` (product scoped server-side)
8. **Updates** — `GET /api/v1/desktop/updates/latest` → download or Squirrel auto-update

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
| GET | `/api/v1/desktop/plans` | Bearer access token |
| POST | `/api/v1/desktop/checkout` | Bearer access token |
| GET | `/api/v1/desktop/checkout/{publicId}/status` | Bearer access token |
| GET | `/api/v1/desktop/announcements` | Bearer + query (`clientId`, `appVersion`, `platform`, `architecture`, `channel?`, `locale?`) |
| POST | `/api/v1/desktop/announcements/{publicId}/read` | Bearer |
| POST | `/api/v1/desktop/announcements/{publicId}/dismiss` | Bearer |
| GET | `/api/v1/desktop/updates/latest` | Bearer + query (`clientId`, `currentVersion`, `platform`, `architecture`, `channel?`, `locale?`) |
| POST | `/api/v1/desktop/updates/download` | Bearer + body (`clientId`, `releasePublicId`, `artifactPublicId`) |
| POST | `/api/v1/desktop/updates/squirrel-feed-ticket` | Bearer + body (`clientId`, `architecture?`, `channel?`) |
| GET | `/api/v1/squirrel/feed/{productSlug}/windows/{arch}/{channel}/RELEASES` | Feed ticket (`ft`) |

Types: `@khepree/sdk` (`DesktopAnnouncementItem`, `DesktopLatestUpdate`, `buildSquirrelFeedUrl`, …).

### Announcements

- Product scope comes from the session’s `desktop_clients.product_id` — never from a client-supplied `productId`.
- CTA kinds: `none` | `open_url` | `open_path` | `software_update`.
- `software_update` payload: `{ releasePublicId, actions: ["download","auto_update"] }` — render **Tải về** and/or **Tự động cập nhật**.
- Rendering lanes: `general` | `whats_new` | `urgent`.

### Updates

- Version truth is always `/updates/latest` (or Squirrel feed), not announcement copy.
- Announcements with `software_update` only surface an update; still resolve artifacts via update APIs.
- Windows auto-update: mint feed ticket → `buildSquirrelFeedUrl` → Electron `autoUpdater`.
- macOS/Linux: use download installer artifact until a native feed exists.

## Device proof

Each refresh/heartbeat signs: session id, timestamp, nonce, method, path, body SHA-256. Store the device private key in OS secure storage; never send it to Khepree.

## Checkout

Desktop POST checkout returns `{ handoffUrl }` only. Open in the default browser. User completes payment on Khepree account; poll status until `ACCESS_ACTIVE`.

## Return to app

After account checkout/billing, users may see “Return to {app}” using the first allowlisted custom-scheme URI from `desktop_clients.allowed_redirect_uris` — never a client-supplied URL.

## Windows unpackaged deep links

Dev Electron must register the protocol with `execPath` + app entry:

```js
app.setAsDefaultProtocolClient(scheme, process.execPath, [path.resolve(process.argv[1])])
```

Bare `setAsDefaultProtocolClient(scheme)` writes `electron.exe "%1"` into the registry — OAuth callbacks never reach the running app. Packaged builds can use the one-argument form.

## SDK error codes

See `DESKTOP_ERROR_CODES` in `@khepree/sdk`. Map `ENTITLEMENT_MISSING`, `DEVICE_LIMIT_REACHED`, `DEVICE_REMOVED`, etc. to in-app UX.

## Catalog registration scripts

Idempotent SQL for production catalog + `desktop_clients` (also mirrored in `packages/db/src/seed/index.ts`):

| App | Script |
|-----|--------|
| Livestream AI | `scripts/register-livestream-ai-desktop-client.sql` |
| TTS Batch AI | `scripts/register-tts-batch-ai-desktop-client.sql` |
| Batch Chat AI | `scripts/register-batch-chat-ai-desktop-client.sql` |

## Not production-ready alone

Desktop integration is implemented in source but **Khepree is not production-ready** until B1 SePay sandbox proof and production gates in `docs/PRODUCTION-STATUS.md` are satisfied.
