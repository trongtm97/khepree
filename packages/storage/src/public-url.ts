import type { S3PublicAccessMode } from "./s3-access";

function trimOrigin(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.includes("CHANGE_ME")) return undefined;
  return trimmed.replace(/\/$/, "");
}

/**
 * Browser origin for public object keys.
 * With `none` (bucket policy / no ACL), CDN cannot read private objects — serve via marketing app `/pub/*`.
 */
export function resolvePublicBrowserBaseUrl(
  publicBaseUrl: string | undefined,
  publicAccessMode: S3PublicAccessMode,
): string | undefined {
  if (publicAccessMode === "none") {
    const appOrigin = trimOrigin(process.env.WEB_URL) ?? trimOrigin(process.env.KHEPREE_PUBLIC_MEDIA_ORIGIN);
    if (appOrigin) return appOrigin;
  }
  return trimOrigin(publicBaseUrl);
}

/** Build browser-facing public media URL — CDN origin + canonical object key (not S3 API endpoint). */
export function buildPublicObjectUrl(baseUrl: string, objectKey: string): string {
  const base = baseUrl.replace(/\/$/, "");
  const key = objectKey.replace(/^\/+/, "");
  if (!key) return base;

  const encodedKey = key
    .split("/")
    .filter((segment) => segment.length > 0)
    .map(encodeURIComponent)
    .join("/");

  return `${base}/${encodedKey}`;
}

/** Production public assets must be served over HTTPS (CDN Worker origin). */
export function assertHttpsPublicBaseUrl(baseUrl: string, label = "S3_PUBLIC_BASE_URL"): void {
  let parsed: URL;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error(`${label} must be a valid URL`);
  }
  if (parsed.protocol !== "https:") {
    throw new Error(`${label} must use HTTPS in production`);
  }
}

export function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim());
}
