import { createHmac, timingSafeEqual } from "node:crypto";

const TTL_MS = 60 * 60 * 1000;

export function createProductPreviewToken(input: {
  productId: string;
  secret: string;
  now?: number;
}): string {
  const issuedAt = input.now ?? Date.now();
  const payload = `${input.productId}.${issuedAt}`;
  const sig = createHmac("sha256", input.secret).update(payload).digest("base64url");
  return `${issuedAt}.${sig}`;
}

export function verifyProductPreviewToken(input: {
  productId: string;
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
  const payload = `${input.productId}.${issuedAt}`;
  const expected = createHmac("sha256", input.secret).update(payload).digest("base64url");
  try {
    return timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}
