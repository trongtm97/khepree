# Khepree Architecture

## Domain map

| Domain | App | Purpose |
|--------|-----|---------|
| khepree.com | `apps/web` | Marketing, SEO, products, blog, docs |
| account.khepree.com | `apps/account` | Customer account |
| app.khepree.com | (future) | Web products |
| partner.khepree.com | `apps/partner` | Reseller / affiliate |
| admin.khepree.com | `apps/admin` | Internal administration |
| api.khepree.com | `apps/api` | Public/internal APIs |
| cdn.khepree.com | R2 public bucket | Static assets |
| download.khepree.com | R2 private + signed URLs | Protected downloads |

## Package boundaries

| Package | Responsibility |
|---------|----------------|
| `@khepree/config` | Typed env, domain constants |
| `@khepree/types` | Shared TypeScript contracts |
| `@khepree/db` | Drizzle schema, client, migrations |
| `@khepree/auth` | Better Auth — identity only |
| `@khepree/security` | RBAC permission matrix |
| `@khepree/entitlement` | Feature-based authorization |
| `@khepree/licensing` | License activation, Ed25519 leases |
| `@khepree/commerce` | Orders, payments, subscriptions |
| `@khepree/catalog` | Products, plans, features |
| `@khepree/storage` | R2 adapter |
| `@khepree/ui` | Design system |

## Core principles

1. **Auth ≠ Entitlement ≠ License** — three separate systems
2. **Feature-based authorization** — never `if (plan === "PRO")`
3. **Money as integer minor units** — no floating point
4. **Payment provider adapter** — billing events normalize before entitlement
5. **i18n via content model** — no `title_en` / `title_vi` columns
6. **Server Components first** — client only when interaction requires it

## Phase roadmap (planned)

- **Phase 0** ✅ Monorepo scaffold, design system, DB schema foundation, marketing shell
- **Phase 1** Account app + Better Auth flows + user profiles
- **Phase 2** Catalog + entitlement engine
- **Phase 3** Commerce + payment provider adapter
- **Phase 4** Licensing + desktop activation
- **Phase 5** Partner portal
- **Phase 6** Admin + content CMS

Each phase inherits the Master Prompt rules. Do not skip phases.
