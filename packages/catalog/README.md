# @khepree/catalog — Content, Media & Product Services

Domain services for CMS content, media metadata, and the product catalog. Binary bodies live in `@khepree/storage` (R2); Postgres stores metadata only.

## ProductService

```typescript
import { createProductService, PlanFeatureSet } from "@khepree/catalog";

const products = createProductService();

await products.listPublicProducts();
await products.getPublicProductBySlug("development-sample");
await products.listPricingGroups();

const plan = detail.plans[0];
const features = PlanFeatureSet.fromPublicFeatures(plan.features);
features.hasFeature("api_access");
features.getFeatureLimit("team_members");
```

Public listings include `active` products only. Plans, features, and prices load from Postgres — never hard-coded plan names.

### Product statuses

`draft` | `active` | `hidden` | `retired`

### Plan billing types

`free` | `one_time` | `recurring` | `perpetual` | `custom`

Custom plans surface as contact-sales on public pricing UI.

## ContentService

```typescript
import { createContentService } from "@khepree/catalog";

const content = createContentService();

await content.createDraft({ slug, contentType, locale, title, body });
await content.updateDraft({ versionId, title, body });
await content.publish(versionId); // returns revalidation plan
await content.archive(versionId);
await content.getPublished({ slug, contentType, locale });
await content.getBody(version); // single R2 fetch — cache at request scope
```

### Statuses

`DRAFT` → `PUBLISHED` → `ARCHIVED`

Publishing archives the previous published version for the same entry+locale.

### Cache revalidation

After publish, call `buildContentRevalidationPlan()` tags/paths with Next.js `revalidateTag` / `revalidatePath`.

## MediaService

```typescript
import { createMediaService } from "@khepree/catalog";

const media = createMediaService();

const intent = await media.prepareUpload({ mimeType, sizeBytes, visibility, namespace });
// Client PUTs to intent.upload.url with intent.upload.headers

const record = await media.completeUpload({ objectKey, bucket, mimeType, expectedSizeBytes });
const download = await media.createPrivateDownloadUrl(publicId);
```

## API routes (`apps/api`)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/media/upload-url` | Presigned upload intent |
| POST | `/api/v1/media/complete` | Register upload after PUT |
| GET | `/api/v1/media/[publicId]/download-url` | Short-lived private download URL |

## Dev admin UI

`apps/admin/content` — minimal draft/publish workflow for local testing.
