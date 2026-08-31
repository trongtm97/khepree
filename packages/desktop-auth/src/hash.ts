import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function generateSecureToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url");
}

export function hashSecret(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function secretsEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}
