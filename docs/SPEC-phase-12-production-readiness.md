# Spec: Phase 12 — Final production readiness

## Objective

Make the public website honest and crawlable, document how to run Khepree in real environments, add CI quality gates, and inventory what is still missing before a production launch. This phase does **not** claim the platform is production-ready.

## Assumptions

1. No marketing/analytics cookies are implemented. A `/cookies` page is **not** required; privacy copy states that. Requests to `/:locale/cookies` redirect to privacy.
2. Blog and docs routes are backed by published CMS entries (`article` / `doc`). Empty states are shown when none exist — no fake posts.
3. Hosting is portable (container/Node). Docs do not lock to a single vendor.
4. Real payment processing, transactional email, Redis rate limits, and production secrets remain **external** work.

## In scope

- Public IA: solutions audiences, blog/[slug], docs/[...slug]
- SEO: canonical, hreflang (incl. `x-default`), sitemap, robots, OG, JSON-LD, layout metadata fix
- Performance: RSC header, drop unused mono font, cache-safe catalog (no BigInt through `unstable_cache`)
- CI: lint, typecheck, test, build; optional E2E
- Deployment / env / DB / R2 / signing-key documentation
- TODO ledger: BLOCKER / BEFORE PRODUCTION / POST-MVP

## Out of scope

- Stripe (or any live PSP)
- Production email provider SDK
- Redis rate-limit backend
- Generating or committing Ed25519 production keys
- Claiming production-ready

## Done in this phase

- Public routes match the target IA (no `/cookies` page)
- Legal/contact copy describes the current system (Better Auth, hashed licenses, private R2, no marketing cookies)
- Canonical lives on each page; locale layout no longer overrides every path to `/`
- CI workflow: install → lint → typecheck → test → build (no deploy)
- Ops docs: `DEPLOYMENT.md`, `ENVIRONMENTS.md`, `DATABASE.md`, `LICENSE-SIGNING.md`, `R2.md`, `TODOS.md`, `PRODUCTION-STATUS.md`
