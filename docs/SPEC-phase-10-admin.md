# Spec: Phase 10 — Admin Control Center

## Objective

`admin.khepree.com` (`apps/admin`, :3002) is an **internal** control center. Staff sign in with existing identity. There is no public sign-up. Authorization is the central permission matrix in `@khepree/security` — never `if (isAdmin)` or `if (role === "ADMIN")` at call sites.

## Assumptions

1. Staff roles: `SUPPORT` | `FINANCE` | `ADMIN` | `SUPER_ADMIN`. `USER` and partner roles cannot access admin.
2. Mutations go through domain services (`entitlement`, `catalog`, `licensing`, `reseller`, identity directory). The UI never `db.insert`s entitlements, wallets, or prices.
3. Complimentary / manual entitlement uses `grantComplimentary` → `grantEntitlement` with `source: "complimentary" | "admin_grant"`. Reason + actor audit are required.
4. License reissue and device block use entitlement/licensing services. Impersonation is **out of scope**.
5. Catalog objects referenced by `order_items` cannot be deleted; archive/retire/deactivate instead.
6. Audit logs are append-only. Standard UI has no edit/delete.
7. Production: `ADMIN` and `SUPER_ADMIN` must have MFA enabled before using the admin app. Development does not force this.
8. Wallet `ADJUSTMENT` (privileged) requires a reason and an audit row.

## Permission map

| Permission | SUPPORT | FINANCE | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| `admin.access` | ✓ | ✓ | ✓ | ✓ |
| `admin.users.read` | ✓ | | ✓ | ✓ |
| `admin.users.write` | | | ✓ | ✓ |
| `support.read` | ✓ | | ✓ | ✓ |
| `finance.read` | | ✓ | ✓ | ✓ |
| `finance.write` | | ✓ | | ✓ |
| `catalog.read` | ✓ | | ✓ | ✓ |
| `catalog.write` | | | ✓ | ✓ |
| `content.read` | ✓ | | ✓ | ✓ |
| `content.write` | | | ✓ | ✓ |
| `entitlement.read` | ✓ | | ✓ | ✓ |
| `entitlement.admin` | | | ✓ | ✓ |
| `partner.admin` | | | ✓ | ✓ |

`finance.write` covers wallet credit/adjustment and commission pay. `partner.admin` covers approve/suspend/tier/price. SUPPORT cannot perform finance or admin-only writes.

## Commands

```
pnpm --filter @khepree/security test
pnpm --filter @khepree/entitlement test
pnpm --filter @khepree/catalog test
pnpm --filter @khepree/reseller test
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

## Success criteria

- Permission matrix tests: USER/partner cannot `admin.access`; SUPPORT cannot `finance.write` / `entitlement.admin` / `catalog.write`; ADMIN cannot `finance.write`; SUPER_ADMIN can.
- Admin grant/revoke/reissue/wallet adjustment require a reason and write audit.
- Catalog delete of financially referenced rows is rejected.
- Audit UI is read-only.
- No impersonation routes.
- Build passes.
