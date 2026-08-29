# Spec: Phase 09 — Partner + Reseller Platform

## Objective

`partner.khepree.com` lets Khepree run referral (affiliate) and reseller programs. Partners never write the entitlement table. Entitlement stays the source of truth; the partner domain requests an issue/renew and the entitlement service performs it.

## Assumptions

1. A partner is a business entity with memberships (`PARTNER_OWNER` / `PARTNER_MANAGER` / `PARTNER_SALES`). It is not a customer organization.
2. Modes are additive flags: `REFERRAL`, `RESELLER`. `DISTRIBUTOR` is reserved and unused.
3. Partner status: `PENDING` | `ACTIVE` | `SUSPENDED` | `REJECTED`. Mutations require `ACTIVE`.
4. **Referral attribution (first-touch signup):** a click records a hashed visitor token. The first successful signup for that user wins. Orders attribute to that signup partner only. Later clicks do not steal the signup. This is not last-click.
5. Reseller issue: validate partner + price + customer scope → debit wallet (idempotent) → `entitlement.grantEntitlement({ source: "reseller" })`.
6. Wallet cached `balance_minor` is derived from the ledger in the same transaction. No balance write without a transaction row.
7. No negative balance unless `allowNegativeBalance` is true. Commission clawbacks on already-paid rows use `REVERSAL` and follow that same policy; unpaid commissions reverse without a wallet debit.
8. Admin CMS UI is out of scope; `setPartnerStatus` / commission approve-pay exist as domain methods.

## Attribution policy (public)

- Click: stored as `sha256(visitorId)`, no raw IP/UA.
- Signup: first `ref` code associated with the user is sticky.
- Order: commission only if a signup attribution exists for the paying user. Guest/unattributed checkouts create no commission.

## Commands

```
pnpm --filter @khepree/reseller test
pnpm --filter @khepree/security test
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

## Success criteria

- Partner A cannot read Partner B data (tested)
- Ledger has history + idempotency; balance matches sum of signed txs
- UI never grants entitlements except through the partner domain service
- Empty dashboard states, no fake charts
- Partner approval statuses exist
