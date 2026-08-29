# Khepree Platform — Phase 01 Foundation

Monorepo foundation for the Khepree global software ecosystem.

**Software that moves you forward.**

## Prerequisites

- Node.js 22+
- pnpm 9+ (project uses pnpm 11)
- Docker (optional, for PostgreSQL in later phases)

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment template
cp .env.example .env

# 3. Start all apps in development
pnpm dev
```

Or start individual apps:

```bash
pnpm dev:web      # Marketing shell  → http://localhost:3000
pnpm --filter @khepree/account dev   # Account shell  → http://localhost:3001
pnpm --filter @khepree/admin dev     # Admin shell    → http://localhost:3002
pnpm --filter @khepree/partner dev   # Partner shell  → http://localhost:3003
pnpm --filter @khepree/api dev       # API            → http://localhost:3004
```

## Health check

```bash
curl http://localhost:3004/health
```

Response:

```json
{
  "status": "ok",
  "environment": "development",
  "timestamp": "2026-08-29T...",
  "version": "0.1.0"
}
```

## Development ports

| App     | Port | Domain (production)   |
|---------|------|-----------------------|
| web     | 3000 | khepree.com           |
| account | 3001 | account.khepree.com   |
| admin   | 3002 | admin.khepree.com     |
| partner | 3003 | partner.khepree.com   |
| api     | 3004 | api.khepree.com       |

## Scripts

| Command           | Description                    |
|-------------------|--------------------------------|
| `pnpm dev`        | Start all apps (Turborepo)     |
| `pnpm build`      | Production build all apps      |
| `pnpm typecheck`  | TypeScript strict check        |
| `pnpm lint`       | ESLint                         |
| `pnpm test`       | Unit tests                     |
| `pnpm format`     | Prettier format                |

## Stack (Phase 01)

- **Monorepo:** pnpm workspaces + Turborepo
- **Apps:** Next.js 16 App Router, React 19, TypeScript strict
- **UI:** Tailwind CSS v4, `@khepree/ui` design system
- **Config:** `@khepree/config` with Zod env validation
- **Packages:** `ui`, `config`, `types`, `validation`, `db` (schema stub)

## Package imports

```typescript
import { Button, PublicShell } from "@khepree/ui";
import { getEnv, BRAND } from "@khepree/config";
import type { GlobalRole } from "@khepree/types";
import { emailSchema } from "@khepree/validation";
```

## What's included (Phase 01)

- 5 app shells (web, account, admin, partner, api)
- Shared UI component library with Khepree design tokens
- Shared ESLint, Prettier, TypeScript configs in `tooling/`
- Environment validation via `@khepree/config`
- `GET /health` on API app

## What's NOT included yet

- Marketing homepage (Phase 02)
- Database migrations & domain services (Phase 03)
- Authentication (Phase 04)
- Object storage & CMS (Phase 05)

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for the full phase roadmap.

## License

Proprietary — Khepree. All rights reserved.
