# Spec: Phase 08 — Entitlement + License + Device Activation

## Objective

Entitlement is the source of truth for access. Licenses and signed leases are projections. Commerce grants and suspends entitlements; it never deletes them. Device limits are enforced server-side. Ed25519 leases are verifiable offline with a documented, non-instant revocation model.

## Assumptions

1. Existing DB enums stay: source `trial | subscription | perpetual | complimentary | reseller | admin_grant`. Conceptual names map: PURCHASE → perpetual or subscription by billing type; PARTNER → reseller; ADMIN → admin_grant; PROMOTION → complimentary.
2. One license row per entitlement. The license key is shown only at issuance; thereafter prefix/last4.
3. Installation identity is a client-provided opaque id, stored as SHA-256 hex. No MAC/CPU/disk serials.
4. Default device limit is `devices.max` from the entitlement feature snapshot, else 1.
5. Offline revocation is eventual: a lease remains cryptographically valid until `exp`; policy may allow a grace window. Live APIs always re-check entitlement.
6. No Stripe/partner portal/admin CMS in this phase.

## Commands

```
pnpm --filter @khepree/entitlement test
pnpm --filter @khepree/licensing test
pnpm --filter @khepree/sdk typecheck
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

## Success criteria

- grant/update/suspend/revoke/expire/resolve/canUseProduct exist; no `license.valid = true` shortcut
- paid purchase grants idempotently; full refund suspends (does not delete)
- activate is concurrency-safe against device limits
- tampered / wrong-key / expired leases fail tests; valid signature passes
- account licenses + devices (deactivate) use real data
- GET /v1/me/entitlements returns a feature set, not billing internals
- `@khepree/sdk` has types and error codes only — no secrets
