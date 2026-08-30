# Object Storage (Vietnix S3-compatible)

Khepree uses a generic S3-compatible adapter (`@khepree/storage`). Production targets **Vietnix Object Storage** with **Cloudflare CDN** for public browser URLs.

## Environment

| Variable | Purpose |
|----------|---------|
| `STORAGE_PROVIDER` | `s3` (production) |
| `S3_ENDPOINT` | Vietnix S3 API endpoint (backend only) |
| `S3_REGION` | Provider region (Vietnix often `auto`) |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | API credentials — never in git |
| `S3_BUCKET_PUBLIC` | Public marketing/media bucket |
| `S3_BUCKET_PRIVATE` | Private installers, CMS bodies, entitled downloads |
| `S3_PUBLIC_BASE_URL` | CDN origin, e.g. `https://cdn.khepree.com` |
| `S3_FORCE_PATH_STYLE` | `true` for Vietnix/MinIO-style endpoints |
| `S3_PUBLIC_ACCESS_MODE` | `acl` (default) or `none` |

Production validation requires HTTPS `S3_PUBLIC_BASE_URL` and rejects `S3_ENDPOINT` hostname matching the CDN hostname.

## Public URL contract

PostgreSQL stores **`objectKey` only** (e.g. `pub/media/<uuid>.webp`). Public URLs are resolved centrally:

```
storage.publicUrl(objectKey) → S3_PUBLIC_BASE_URL + "/" + objectKey
```

Never persist full CDN URLs in the database or concatenate URLs in React components.

## Object key namespaces

Server-generated keys only — clients cannot supply raw keys.

| Visibility | Prefix | Examples |
|------------|--------|----------|
| Public | `pub/` | `pub/brand/`, `pub/products/{slug}/`, `pub/media/` |
| Private | `prv/` | `prv/content/`, `prv/releases/`, `prv/downloads/` |

Keys reject traversal (`../`), backslashes, absolute paths, and unsafe characters.

## Public access strategy

Vietnix uploads are **private by default**. With `S3_PUBLIC_ACCESS_MODE=acl`:

- Server `putObject` and presigned PUT include `ACL: public-read`
- Browser upload must send `x-amz-acl: public-read` (returned in presign `headers`)

If the provider returns `AccessControlListNotSupported`, `AccessDenied`, or `InvalidRequest` for ACL operations, the app throws `StorageConfigurationError` — it does **not** silently treat objects as public.

**Fallback when ACL is unsupported:** configure bucket-level public-read policy or an authenticated CDN origin strategy. Set `S3_PUBLIC_ACCESS_MODE=none` only when bucket policy (not per-object ACL) grants anonymous read.

After public `completeUpload`, the backend calls `verifyPublicReadAccess()` (unsigned HEAD against the S3 API endpoint) when mode is `acl`.

## Private isolation

Private bucket objects never receive `public-read` ACL. `publicUrl()` on the private storage instance returns `null`. Downloads use short-lived presigned GET after auth/entitlement checks.

## CMS markdown bodies

Long-form bodies (`article`, `page`, `doc`, `product_page`, `legal`) are stored as UTF-8 Markdown in **private** object storage:

```
prv/content/{entryId}/{locale}/v{versionNumber}.md
```

PostgreSQL keeps queryable metadata (title, slug, SEO, status, `bodyObjectKey`, `bodyChecksumSha256`, provider, bucket). Published version keys are **immutable** — edits create a new draft/version.

## Orphan objects

Upload + DB insert are not atomic. On DB failure after a successful object write, services attempt best-effort delete of the orphaned key (see `ContentService.createDraft` / `createDraftVersion`). A scheduled reconciliation scanner is the upgrade path for production (`ponytail:` — not implemented yet). Never delete objects still referenced by `content_versions` or `media_assets`.

## Health check

`runStorageHealthCheck()` writes probe objects under `_health/`, verifies public read and private isolation, tests presigned GET, and deletes probes. Safe for production — does not touch customer objects.

## CDN caching

Public objects use immutable UUID/content-addressed keys with `Cache-Control: public, max-age=31536000, immutable` when ACL mode is active. Do not overwrite keys in place when replacing images.

## Next.js images

`next/image` allows `cdn.khepree.com` via `S3_PUBLIC_BASE_URL` at build time — no wildcard remote hosts.
