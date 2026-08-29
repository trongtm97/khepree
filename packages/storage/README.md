# @khepree/storage — Object Storage

S3-compatible object storage abstraction for Cloudflare R2.

## Design

Applications depend on **`ObjectStorage`** — not R2-specific APIs. Production uses `S3ObjectStorage` (AWS SDK v3 against R2 endpoints). Development/test falls back to **`MockObjectStorage`** only when R2 env vars are missing — **never in production/staging**.

## Buckets

| Logical bucket | Env var | Use |
|----------------|---------|-----|
| `public` | `R2_BUCKET_PUBLIC` | Marketing images, blog assets, product screenshots |
| `private` | `R2_BUCKET_PRIVATE` | Installers, release files, protected downloads |

**Private never falls back to public.** Both buckets are required in production/staging (`validateRuntimeEnv` fail-fast).

Configure via `.env`:

```bash
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_PUBLIC=
R2_BUCKET_PRIVATE=
R2_PUBLIC_BASE_URL=https://cdn.khepree.com
```

## Interface

```typescript
import {
  getPublicObjectStorage,
  getPrivateObjectStorage,
  createObjectKey,
  validateUpload,
} from "@khepree/storage";

const publicStorage = getPublicObjectStorage();
const privateStorage = getPrivateObjectStorage();

await publicStorage.putObject({ key, body, contentType });
await privateStorage.getObject(key);
await privateStorage.headObject(key);

const upload = await privateStorage.createPresignedUpload({ key, contentType });
const download = await privateStorage.createPresignedDownload({ key }); // low-level — authorize in app layer
```

`getObject()` / `headObject()` return `null` only for missing keys (404/NoSuchKey). Network/auth/outage errors propagate as `StorageInfrastructureError`.

## Security

- **R2 secret keys are server-only** — never exposed to the browser bundle.
- Client uploads use **presigned PUT** URLs with short TTL (15 min default).
- Private download URLs must be issued by **`DownloadService`** in `@khepree/catalog` after authorization — not via a generic media helper.
- Upload validation: MIME allowlist + size limits per bucket. **SVG uploads to public bucket are blocked** (untrusted executable markup).
- Object keys are generated server-side via `createObjectKey()` — client filenames are never trusted.

## Upload limits

| Bucket | Max size |
|--------|----------|
| public | 10 MB |
| private | 512 MB |

## Related packages

- `@khepree/catalog` — `MediaService`, `ContentService` (metadata in Postgres, bodies in R2)
- `@khepree/db` — `media_assets`, `content_versions` tables
