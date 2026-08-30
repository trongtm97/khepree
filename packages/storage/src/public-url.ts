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
