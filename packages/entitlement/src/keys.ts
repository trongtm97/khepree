import { createHash, randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export interface IssuedLicenseKey {
  plaintext: string;
  keyHash: string;
  keyPrefix: string;
  keyLast4: string;
}

/** Human-readable key. Encodes no rights — the entitlement row is the source of truth. */
export function createHumanLicenseKey(bytes: () => Buffer = () => randomBytes(10)): IssuedLicenseKey {
  const raw = bytes();
  if (raw.length < 10) throw new Error("License key entropy must be at least 80 bits");
  let bits = 0n;
  for (const byte of raw.subarray(0, 10)) bits = (bits << 8n) | BigInt(byte);
  const chars: string[] = [];
  for (let i = 0; i < 16; i += 1) {
    chars.push(ALPHABET[Number(bits & 31n)] ?? "A");
    bits >>= 5n;
  }
  const grouped = [chars.slice(0, 4), chars.slice(4, 8), chars.slice(8, 12), chars.slice(12, 16)]
    .map((part) => part.join(""))
    .join("-");
  const plaintext = `KHPR-${grouped}`;
  return {
    plaintext,
    keyHash: hashLicenseKey(plaintext),
    keyPrefix: plaintext.slice(0, 9),
    keyLast4: plaintext.slice(-4),
  };
}

export function hashLicenseKey(plaintext: string): string {
  return createHash("sha256").update(plaintext.trim().toUpperCase(), "utf8").digest("hex");
}

export function maskLicenseKey(prefix: string | null, last4: string | null): string | null {
  if (!prefix || !last4) return null;
  return `${prefix}••••${last4}`;
}
