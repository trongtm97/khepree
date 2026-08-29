# @khepree/storage — Object Storage

S3-compatible object storage abstraction for Cloudflare R2.

## Design

Applications depend on **`ObjectStorage`** — not R2-specific APIs. Production uses `S3ObjectStorage` (AWS SDK v3 against R2 endpoints). Development falls back to **`MockObjectStorage`** when R2 env vars are missing.

## Buckets

| Logical bucket | Use |
|----------------|-----|
| `public` | Marketing images, blog assets, product screenshots, public docs media |
| `private` | Installers, release files, customer documents, protected downloads |

Configure via `.env`:

```bash
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_PUBLIC=
R2_BUCKET_PRIVATE=
R2_PUBLIC_BASE_URL=https://cdn.khepree.com
```

Status: **NOT CONFIGURED** until all required vars are set — mock adapter is used in development.

## Interface

```typescript
import { getObjectStorage, createObjectKey, validateUpload } from "@khepree/storage";

const storage = getObjectStorage();

await storage.putObject({ key, body, contentType, bucket: "public" });
await storage.getObject(key, "private");
await storage.headObject(key, "private");
await storage.deleteObject(key, "public");

const upload = await storage.createPresignedUpload({ key, contentType, bucket: "private" });
const download = await storage.createPresignedDownload({ key, bucket: "private" }); // 5 min default TTL
```

## Security

- **R2 secret keys are server-only** — never exposed to the browser bundle.
- Client uploads use **presigned PUT** URLs with short TTL (15 min default).
- Private downloads use **presigned GET** URLs with short TTL (5 min default).
- Upload validation: MIME allowlist + size limits per bucket.
- Object keys are generated server-side via `createObjectKey()` — client filenames are never trusted.

## Upload limits

| Bucket | Max size |
|--------|----------|
| public | 10 MB |
| private | 512 MB |

## Related packages

- `@khepree/catalog` — `MediaService`, `ContentService` (metadata in Postgres, bodies in R2)
- `@khepree/db` — `media_assets`, `content_versions` tables
