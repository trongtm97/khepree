import { createHash, randomBytes } from "node:crypto";

export function hashVisitorId(visitorId: string): string {
  return createHash("sha256").update(visitorId.trim(), "utf8").digest("hex");
}

export function newVisitorId(): string {
  return randomBytes(16).toString("hex");
}

export function newReferralCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let out = "KH";
  for (const byte of bytes) {
    out += alphabet[byte % alphabet.length];
  }
  return out;
}
