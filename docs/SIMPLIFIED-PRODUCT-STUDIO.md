# Simplified Product Studio

> Audit + design + migration QA — Phase catalog simplification  
> Last updated: 2026-09-01

## Before → After

**Before (legacy admin workflow)**

```
Product → Plans → Prices → Features → Releases → SEO
         (separate tabs / pages, 10 Studio tabs, 30+ visible inputs)
```

**After (unified Product Studio)**

```
Product Studio
├─ Thông tin (Information)
├─ Hình ảnh (Media)
├─ Gói & bản quyền (Plans & Licensing)
└─ Phát hành (Release — desktop only)
```

Actions: **Save Draft** · **Preview** · **Publish** — one screen, locale switcher `[ Tiếng Việt | English ]`.

Advanced tools remain available for expert administration (slug, SEO overrides, plan slug, extra feature keys via legacy `/plans`, `/features`, `/prices` routes).

### Technical Identity (Advanced — not on main form)

| Field | Storage |
|-------|---------|
| Product ID | `products.public_id` (read-only) |
| Product Code | `products.metadata.productCode` (unique index) |
| Access Feature | `metadata.accessFeatureKey` + `plan_features` grant |
| Desktop Client ID | `desktop_clients.client_id` (unique) |
| Desktop Protocol | `metadata.desktopProtocol` (unique index) |
| Callback URI | `desktop_clients.allowed_redirect_uris` (derived only) |
| Internal Plan Code | `plans.internal_code` (unique per product) |

Module: `packages/catalog/src/product/technical-identity.ts`

### Field count (normal workflow)

| Metric | Before | After |
|--------|--------|-------|
| Studio tabs | 10 | 0 (single scroll page, 4 sections) |
| Visible product inputs (excl. plans) | ~20+ | ~8 core + locale switch |
| Marketing-only inputs | ~15 | 0 (merged into Full Description) |
| Separate SEO form | 2/locale | 0 (auto-derived; Advanced override) |
| Plan + price screens | 2 tabs | Inline plan cards |
| Navigation to create price/feature | Required | Not in normal workflow |

### Field status legend

| Status | Meaning |
|--------|---------|
| **ACTIVE** | Shown in normal Studio UI; read/write |
| **DERIVED** | Auto-computed on save or read; optional Advanced override |
| **ADVANCED** | Collapsed / legacy admin only |
| **DEPRECATED** | UI removed; DB column retained; legacy read fallback |
| **MIGRATED** | Composed into another field (idempotent) |

### Removed from normal UI (not dropped from DB)

- `metadata.marketing.*` write path from Studio (solutions, highlights, benefits, howItWorks, faq, cta, relatedContent)
- Separate Content / Marketing / SEO / Features tabs
- Manual slug on product create
- Duplicate VI/EN form pages

### Auto-generated (DERIVED)

| Field | Rule |
|-------|------|
| Slug | `suggestProductSlug(nameVi)` |
| **Product Code** | `suggestProductCode(nameVi)` → `KHEPREE_NOVEL_AI` |
| **Access Feature** | `suggestAccessFeatureKey(nameVi)` → `novel_ai.access` |
| **Desktop Client ID** | `suggestDesktopClientId(nameVi)` (desktop only) |
| **Desktop Protocol** | `suggestDesktopProtocol(nameVi)` (desktop only) |
| **Callback URI** | `{protocol}://auth/callback` (derived only) |
| **Internal Plan Code** | `suggestInternalPlanCode(productCode, termKind)` |
| SEO title | `{name} \| Khepree` |
| Meta description | `short_description` |
| Canonical | `/vi/products/{slug}` |
| OG image | cover → icon |
| Publisher | Khepree (public hardcoded) |
| Product ID / timestamps | System |
| Draft status | Until Publish |

Implementation: `deriveSeoFields()`, `resolvePublicSeoFields()`, `resolvePublicFullDescription()`.

### Moved to Advanced

- Product slug override, SEO title/description override
- Plan slug, billing type override, extra `plan_features` keys
- `licensing_mode` (auto from product type; override in Advanced)
- `metadata.operatingSystems`
- Legacy routes: `/plans`, `/features`, `/prices`

### Migrations (read-time, idempotent)

| Source | Target | Module |
|--------|--------|--------|
| `description` + `content` | `description` (merged read) | `mergeFullDescription()` |
| `metadata.marketing` blocks | Full description markdown | `composeMarketingToMarkdown()` |
| Empty description + marketing | Composed description | `resolvePublicFullDescription()` |
| One-shot DB migrate (optional) | `migrateLegacyDescriptionCopy()` | Idempotent; skips when description exists |

**No database columns dropped.** Public pages use legacy marketing sections only when no full description is available.

### Backward compatibility (QA verified)

| Area | Status |
|------|--------|
| Existing product data | Preserved — marketing JSON untouched |
| Public product pages | Full description primary; legacy marketing fallback; cover → gallery → icon for OG |
| Checkout / commerce | Same `plans` + `prices` tables — no "studio price" |
| Entitlement | `plan_features` keys unchanged |
| Licensing device limit | `devices.max` via `plan_features` only |
| Account required | `account.required` via `plan_features` |
| Releases | `software_releases` + private media — Studio orchestrates only |
| Translations | VI primary; EN optional; `resolveLocalizedRow` fallback |
| SEO | Auto fallbacks; explicit overrides respected |
| Security | Rich text sanitization unchanged; hidden fields server-validated |

### Novel AI fixture (concept test)

| Plan | Price | Term | Account | Devices |
|------|-------|------|---------|---------|
| Free | 0 VND | 24h (trial, 1 day) | anonymous | 1 |
| Monthly | 99,000 VND | 30 days | required | 1 |
| Yearly | 900,000 VND | 365 days | required | 1 |

Verified via `studio-novel-ai.test.ts` + `studio-compatibility.test.ts` (term mapping, feature keys).

### Tests

- `packages/catalog/src/product/compose-legacy-description.test.ts`
- `packages/catalog/src/product/public-display.test.ts`
- `packages/catalog/src/product/studio-compatibility.test.ts`
- `packages/catalog/src/product/studio-novel-ai.test.ts`
- `apps/e2e/tests/critical-flows.spec.ts` — admin product studio auth gate

---

## Goal

Admin creates a **complete commercial software product from one Product Studio screen** without understanding internal database tables (`products`, `plans`, `prices`, `features`, `releases`).

**UI is simplified; domain model stays.** Product Studio is an orchestration layer calling existing `@khepree/catalog`, commerce, entitlement, and licensing services.

---

## Current state (audit)

### Admin surface today

Product Studio (`apps/admin`) uses **10 tabs**:

| Tab | ID | Status |
|-----|-----|--------|
| Tổng quan | `overview` | Name, slug, short desc, licensing, platforms, OS, icon ID |
| Nội dung | `content` | Separate VI/EN forms — `description` + `content` TipTap |
| Trang TM | `marketing` | Solutions, highlights, FAQ, CTA, related links (15+ inputs) |
| Gói & Giá | `plans` | Plan + price on separate tab |
| Tính năng | `features` | Global feature keys on separate tab |
| Media | `media` | Stub — link to `/media` |
| Bản quyền | `licensing` | Read-only docs — field on overview |
| Phiên bản | `releases` | Release upload |
| SEO | `seo` | Manual title + meta per locale |
| Xuất bản | `publish` | Readiness checklist |

**Parallel legacy admin** still exists: `/plans`, `/features`, `/prices` via `CatalogAdminService` — can drift from Studio.

### Database (unchanged domain)

```
products ──< product_translations
    │
    ├──< plans ──< plan_translations
    │       ├──< prices
    │       └──< plan_features ──> features (global)
    │
    └──< software_releases ──> media_assets (private)
```

Key files:

- Schema: `packages/db/src/schema/catalog.ts`, `release.ts`, `content.ts`
- Studio service: `packages/catalog/src/product/studio/service.ts`
- Public catalog: `packages/catalog/src/product/service.ts`
- Marketing metadata parser: `packages/catalog/src/product/metadata.ts`

### Gaps vs target

| Target field | Current storage | Gap |
|--------------|-----------------|-----|
| Category | — | **Missing** — use `metadata.productCategory` |
| Product type | `platform_capabilities` only | **Partial** — add `metadata.productType` |
| Short description | `product_translations.short_description` | Exists |
| Full description | `description` + `content` split | Merge in UI |
| Icon | `products.icon_media_id` | Exists; needs upload picker |
| Cover | — | **Missing** — use `metadata.coverMediaPublicId` |
| Gallery | `metadata.galleryMediaPublicIds` | Exists in parser; **no Studio UI** |
| Inline plans | plans tab separate | Needs inline cards |
| Account required / plan | — | Use `plan_features` key `account.required` |
| Device limit / plan | `plan_features` key `devices.max` | Exists; hidden in Advanced |
| Recommended plan | — | Use `metadata.recommendedPlanPublicId` |
| Releases inline | releases tab | Keep in group 4 |

**No new tables required** for category, type, cover, recommended plan — all fit `products.metadata` JSONB.

---

## Target UX — 4 groups

Single scrollable page (or accordion), locale switcher `[ Tiếng Việt ] [ English ]` on one form.

### Group 1 — Thông tin sản phẩm

| Field | Required | UI | Storage |
|-------|----------|-----|---------|
| Tên sản phẩm | Yes | Main | `product_translations.name` |
| Danh mục | Yes | Select | `products.metadata.productCategory` |
| Loại sản phẩm | Yes | Select | `products.metadata.productType` |
| Mô tả ngắn (120–240 chars) | Yes | Textarea | `product_translations.short_description` |
| Mô tả đầy đủ | Yes | Rich editor + "Chèn mẫu mô tả" | `product_translations.description` (primary); `content` deprecated/hidden |

**Locale:** VI primary (`DEFAULT_LOCALE`). EN fields on same form via tab switch. Fallback EN → VI per `resolveLocalizedRow`.

**Template button** inserts `PRODUCT_DESCRIPTION_TEMPLATE` from `@khepree/catalog` — text only, no schema per section.

### Group 2 — Hình ảnh

| Field | Required | Storage |
|-------|----------|---------|
| Icon / Logo | Yes | `products.icon_media_id` |
| Cover / Hero | Recommended | `products.metadata.coverMediaPublicId` |
| Gallery | Optional | `products.metadata.galleryMediaPublicIds[]` |

**Derive, don't duplicate:** social/OG image = cover → icon fallback. No separate thumbnail/card/social fields.

### Group 3 — Gói & bản quyền (inline)

Each plan card:

| Field | Required | Storage |
|-------|----------|---------|
| Tên gói | Yes | `plan_translations.name` |
| Giá (VND default) | Yes | `prices.amount_minor` + `currency` |
| Loại thời hạn | Yes | Maps to `plans.billing_type` + `access_term_days` via `ACCESS_TERM_PRESETS` |
| Giá trị thời hạn | Yes | `plans.access_term_days` (trial: 1 day = 24h) |
| Require Khepree Account | Toggle | `plan_features` → `account.required` (boolean) |
| Device limit | Integer | `plan_features` → `devices.max` (integer) |
| Featured / Recommended | Optional | `products.metadata.recommendedPlanPublicId` |

**Advanced (collapsible):** plan slug, billing type override, feature keys, concurrency, transfer policy, internal metadata. Never authorize by plan name.

Product-level `licensing_mode` stays on product — set automatically from product type (desktop → `LICENSE_KEY_DEVICE`) or Advanced.

### Group 4 — Phát hành

| Field | Storage |
|-------|---------|
| Platform | `software_releases.platform` |
| Version | `software_releases.version` |
| Installer file | `software_releases.media_asset_id` (private) |
| Release notes | `release_translations.release_notes` |
| Publish | `software_releases.status` |

**Auto/hidden:** checksum, file size, storage key, signed URL, artifact ID — system-generated on upload.

### Actions

`Save Draft` · `Preview` · `Publish` — status defaults `draft`; no manual status picker on create.

---

## Field matrix

### Product identity & translations

| Current field | Decision | Reason | Target storage |
|---------------|----------|--------|----------------|
| `products.id` | AUTO | System | `products.id` |
| `products.public_id` | AUTO | System | `products.public_id` |
| `products.slug` | AUTO (+ Advanced override) | SEO URL; derive from name | `products.slug` |
| `products.status` | AUTO (Draft/Publish actions) | Workflow | `products.status` |
| `products.licensing_mode` | ADVANCED (auto from type) | Entitlement/licensing | `products.licensing_mode` |
| `products.platform_capabilities` | DERIVE from product type | Filtering | Keep; sync from `productType` |
| `products.metadata` (marketing blocks) | REMOVE FROM UI | Marketing → full description | Keep column; stop writing from Studio |
| `product_translations.name` | KEEP | Display, SEO | `product_translations.name` |
| `product_translations.short_description` | KEEP | Cards, SEO fallback | `product_translations.short_description` |
| `product_translations.description` | KEEP (merged UI) | Full rich description | `product_translations.description` |
| `product_translations.content` | DEPRECATE UI | Merged into description | Keep column; migrate existing |
| `product_translations.seo_title` | AUTO (+ Advanced) | SEO | `product_translations.seo_title` |
| `product_translations.seo_description` | AUTO (+ Advanced) | SEO | `product_translations.seo_description` |
| Category (new) | KEEP | Filter/search | `metadata.productCategory` |
| Product type (new) | KEEP | Filter, licensing hint | `metadata.productType` |
| Cover (new) | KEEP | Hero, OG fallback | `metadata.coverMediaPublicId` |
| Gallery | KEEP | Public gallery | `metadata.galleryMediaPublicIds` |
| `metadata.operatingSystems` | ADVANCED | Release platform detail | `metadata.operatingSystems` |

### Marketing metadata (remove from main form)

| Current field | Decision | Reason | Target |
|---------------|----------|--------|--------|
| `marketing.solutions` | REMOVE FROM UI | Presentation only | Deprecate; content in full description |
| `marketing.highlights` | REMOVE FROM UI | Duplicate of benefits | Deprecate |
| `marketing.benefits` | REMOVE FROM UI | Presentation only | Deprecate |
| `marketing.howItWorks` | REMOVE FROM UI | Presentation only | Deprecate |
| `marketing.faq` | REMOVE FROM UI | Presentation only | Deprecate |
| `marketing.relatedContent` | REMOVE FROM UI | Presentation only | Deprecate |
| `marketing.cta` | REMOVE FROM UI | Presentation only | Deprecate |

Public pages (`apps/web`) continue reading legacy metadata until migration pass renders full description instead.

### Plans, prices, features

| Current field | Decision | Reason | Target |
|---------------|----------|--------|--------|
| `plans.slug` | AUTO (+ Advanced) | Internal routing | `plans.slug` |
| `plans.billing_type` | DERIVE from term preset | Payment | `plans.billing_type` |
| `plans.access_term_days` | KEEP | Entitlement term | `plans.access_term_days` |
| `plans.status` | AUTO (publish activates) | Workflow | `plans.status` |
| `plan_translations.name` | KEEP | Display | `plan_translations.name` |
| `plan_translations.description` | REMOVE FROM UI | Marketing | Keep column |
| `prices.amount_minor` | KEEP | Payment | `prices.amount_minor` |
| `prices.currency` | AUTO (VND default) | Payment | `prices.currency` |
| `prices.region` | ADVANCED | Market policy | `prices.region` |
| `prices.interval` | DERIVE from billing type | Recurring only | `prices.interval` |
| `features.key` | ADVANCED | Entitlement | `features.key` |
| `plan_features.*` | ADVANCED (except devices.max, account.required) | Entitlement | `plan_features` |
| Recommended plan | KEEP | Pricing UI | `metadata.recommendedPlanPublicId` |

### Releases

| Current field | Decision | Target |
|---------------|----------|--------|
| version, platform, architecture, channel | KEEP (platform prominent) | `software_releases` |
| file upload | KEEP | `media_assets` + release FK |
| release_notes | KEEP | `release_translations` |
| checksum, file_size | AUTO | `software_releases` |
| signature | ADVANCED | `software_releases.signature` |

### Auto-generated fields

| Field | Default rule | Override |
|-------|--------------|----------|
| Slug | `suggestProductSlug(nameVi)` | Advanced → URL |
| SEO title | `{name} \| Khepree` | Advanced → SEO |
| Meta description | short_description | Advanced → SEO |
| Canonical | `/vi/products/{slug}` | Advanced → SEO |
| Open Graph title | product name | — |
| Open Graph description | short_description | — |
| Open Graph image | cover → icon | — |
| Publisher | Khepree (hardcoded public) | — |
| Product ID | `createPublicId("prod")` | — |
| Timestamps | DB defaults | — |
| Status | `draft` | Publish → `active` |

Implementation: `deriveSeoFields()` in `packages/catalog/src/product/studio-field-policy.ts`.

---

## Duplicate fields identified

| Duplicate | Resolution |
|-----------|------------|
| `description` vs `content` | Single "Mô tả đầy đủ" editor; `mergeFullDescription()` for reads |
| `marketing.highlights` vs `marketing.benefits` | Stop editing; public site already prefers `solutions` |
| `short_description` vs SEO meta | SEO auto-falls back to short_description |
| `platform_capabilities` vs `productType` | `productType` is admin concept; sync capabilities on save |
| `platform_capabilities` vs `operatingSystems` | OS is Advanced / release-level |
| Studio vs `/plans`, `/features`, `/prices` | Deprecate legacy admin routes after Studio parity |
| `features.description` vs `feature_translations.description` | Unused; ignore in Studio |

---

## Migration strategy (backward compatible)

### Phase A — Policy + docs ✅

### Phase B — Studio UI refactor ✅

### Phase C — Public site alignment ✅

1. `apps/web` product page: full description in overview; legacy sections hidden when description present
2. Fallback read `metadata.marketing` via `resolvePublicFullDescription()` for existing products
3. OG tags: cover → gallery → icon; SEO via `resolvePublicSeoFields()`
4. Category filter on `/products` — **deferred** (metadata ready)

### Phase D — Data migration (optional, on-demand)

- `migrateLegacyDescriptionCopy()` for one-shot scripts; read-time compose covers public display without DB writes

---

## Files to change (implementation phases)

### Phase B — Admin UI

| File | Change |
|------|--------|
| `apps/admin/src/app/(admin)/products/[productId]/page.tsx` | Single-page 4-group layout |
| `apps/admin/src/app/(admin)/products/new/page.tsx` | Name-only create; auto slug |
| `apps/admin/src/components/product-studio/*` | New group components, locale switcher, plan cards |
| `apps/admin/src/app/(admin)/products/studio-actions.ts` | Unified save; metadata category/type/cover |
| `apps/admin/src/components/product-studio/studio-tab-ids.ts` | Replace tabs with section IDs or remove |

### Phase B — Catalog package

| File | Change |
|------|--------|
| `packages/catalog/src/product/studio/service.ts` | Save category/type/cover; plan preset mapping |
| `packages/catalog/src/product/studio/readiness.ts` | Check category, type, icon, short desc |
| `packages/catalog/src/product/metadata.ts` | Export cover/category parsers (or use field-policy) |
| `packages/catalog/src/product/service.ts` | Expose category, type, cover on public API |

### Phase C — Public web

| File | Change |
|------|--------|
| `apps/web/src/app/**/products/**` | Simplified page layout |
| Product listing filters | Category from metadata |

### Deprecate (after parity)

- `apps/admin/src/app/(admin)/plans/page.tsx`
- `apps/admin/src/app/(admin)/features/page.tsx`
- `apps/admin/src/app/(admin)/prices/page.tsx`

---

## Architecture constraints (preserved)

- **Auth ≠ Entitlement ≠ License** — unchanged
- **Feature-based authorization** — `devices.max`, `account.required`, etc.; never `if (plan === "PRO")`
- **i18n via translation tables** — no `name_en` columns
- **Money as BIGINT minor units** — VND default
- **Domain services only** — Studio calls `ProductStudioService`, not raw SQL from UI
- **Private downloads** — release media stays private; entitlement-gated

---

## Canonical constants

```ts
import {
  PRODUCT_CATEGORIES,
  PRODUCT_TYPES,
  ACCESS_TERM_PRESETS,
  STUDIO_FEATURE_KEYS,
  PRODUCT_DESCRIPTION_TEMPLATE,
  deriveSeoFields,
} from "@khepree/catalog";
```

Category values: `ai-tools`, `translation`, `productivity`, `developer-tools`, `creative`, `business`, `other`.

Product types: `desktop-software`, `web-app`, `mobile-app`, `plugin`, `digital-tool`.

Access term presets map to `billing_type` + `access_term_days` — see `ACCESS_TERM_PRESETS` in `studio-field-policy.ts`.

---

## Readiness checklist (target)

| Check | Required |
|-------|----------|
| Vietnamese name | Yes |
| Category + product type | Yes |
| Short description (VI) | Yes |
| Full description (VI) | Yes |
| Icon | Yes |
| Slug (auto) | Yes |
| Sellable plan + price (if commercial) | Conditional |
| Licensing mode | Yes (auto or Advanced) |
| SEO (auto-derived) | Yes |
| Published release (if desktop) | Conditional |

---

## Related docs

- `docs/ARCHITECTURE.md` — package boundaries
- `AGENTS.md` — phase status
- `CONSTRAINTS.md` — non-negotiables
