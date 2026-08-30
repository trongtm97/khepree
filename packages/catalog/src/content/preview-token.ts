import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_MS = 60 * 60 * 1000;

export function createContentPreviewToken(input: {
  versionId: string;
  secret: string;
  now?: number;
}): string {
  const issuedAt = input.now ?? Date.now();
  const payload = `${input.versionId}.${issuedAt}`;
  const sig = createHmac("sha256", input.secret).update(payload).digest("base64url");
  return `${issuedAt}.${sig}`;
}

export function verifyContentPreviewToken(input: {
  versionId: string;
  token: string;
  secret: string;
  now?: number;
}): boolean {
  const [issuedRaw, sig] = input.token.split(".");
  if (!issuedRaw || !sig) return false;
  const issuedAt = Number(issuedRaw);
  if (!Number.isFinite(issuedAt)) return false;
  const now = input.now ?? Date.now();
  if (now - issuedAt > TTL_MS || issuedAt > now + 60_000) return false;
  const payload = `${input.versionId}.${issuedAt}`;
  const expected = createHmac("sha256", input.secret).update(payload).digest("base64url");
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function contentPreviewUrl(input: {
  locale: string;
  contentType: "article" | "doc" | "page";
  slug: string;
  versionId: string;
  secret: string;
  webBaseUrl: string;
}): string {
  const token = createContentPreviewToken({ versionId: input.versionId, secret: input.secret });
  const prefix =
    input.contentType === "article" ? "blog" : input.contentType === "doc" ? "docs" : "pages";
  const base = input.webBaseUrl.replace(/\/$/, "");
  return `${base}/${input.locale}/${prefix}/${input.slug}?preview=${encodeURIComponent(token)}&versionId=${encodeURIComponent(input.versionId)}`;
}
