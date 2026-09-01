# Simplified Product Studio

> Audit + design spec — Phase catalog simplification  
> Last updated: 2026-09-01

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

### Phase A — This commit (policy + docs)

- Add `studio-field-policy.ts` with canonical keys, SEO derivation, description template
- Document field matrix and target UX (this file)
- **No database migration**

### Phase B — Studio UI refactor (next)

1. Replace 10 tabs with single-page 4-group layout
2. Locale switcher instead of duplicate forms
3. Inline plan cards with preset term mapping
4. Hide marketing tab; stop writing `metadata.marketing` from Studio
5. Auto-slug on create (remove from create form)
6. Advanced collapsible: slug, SEO, licensing, feature keys
7. Media upload pickers (icon, cover, gallery)
8. "Chèn mẫu mô tả" button on rich editor

### Phase C — Public site alignment

1. `apps/web` product page: render full description as primary content
2. Fallback read `metadata.marketing` for existing products
3. OG tags use `deriveSeoFields()` + cover/icon media URLs
4. Category filter on `/products` using `metadata.productCategory`

### Phase D — Data migration (optional)

- Script: merge `description` + `content` → `description` where both exist
- Script: map common marketing blocks → markdown sections (best-effort)
- Deprecation notice on legacy admin routes

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
