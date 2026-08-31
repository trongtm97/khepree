# Device recovery guide

Self-service device management for Khepree desktop products.

## User flow

1. Sign in at **account.khepree.com**
2. Open **Products** → product hub, or **Devices**
3. Review slots used / max for each product
4. Remove an old device (step-up auth may be required if session is stale)
5. Activate the new machine from the desktop app

## What happens on remove

- Device status → `deactivated`, `removed_at` set
- Active desktop sessions for that device are **revoked**
- Slot becomes available for a new activation
- Transfer limits and cooldowns apply per plan features (`devices.transfers.max`, cooldown)

## Admin block vs owner remove

| Action | Who | Effect |
|--------|-----|--------|
| **Remove device** | Owner | Soft remove; user can free slot |
| **Block device** | Admin | `blocked` status; same installation cannot reactivate |

## Deep link from desktop

Device limit errors include `manageDevicesUrl` pointing to `/devices?currentDevice={publicId}`.

## Support escalation

If transfer limit reached or cooldown active, direct users to support with order id and product slug — do not bypass limits in application code.
