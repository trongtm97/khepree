# Desktop support guide (internal)

Quick reference for support staff handling NovelTrans and future desktop apps.

## Common symptoms

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| “No entitlement” after login | No purchase or webhook pending | Check billing; payment must be webhook-confirmed |
| “Device limit reached” | Plan slot full | Guide to account → Devices → remove old device |
| “Device removed” on heartbeat | User removed device or admin block | Re-activate or unblock in admin |
| “Entitlement suspended” | Refund / void | Expected; access revoked per commerce policy |
| Checkout stuck on pending | Awaiting bank / SePay IPN | Check order status in admin; B1 sandbox may block real proof |
| Refresh fails “invalid proof” | Clock skew or wrong private key | Check system time; re-activate if key lost |

## Verify entitlement

Admin → user → entitlements. Status must be `active`. Feature snapshot reflects plan at grant/upgrade time; desktop refresh picks up changes.

## Verify payment

Order `paid` only after verified webhook — success redirect alone is insufficient.

## Security

- Never ask users to paste refresh tokens or license signing keys
- Never approve arbitrary redirect URLs
- Desktop return links must match registered client allowlist

## Production blockers

SePay B1 sandbox IPN proof remains open (`docs/TODOS.md`). Do not claim production-ready billing until resolved.
