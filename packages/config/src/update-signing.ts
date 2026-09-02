import { createHash, createPublicKey, type KeyObject } from "node:crypto";
import { getEnv, type Env } from "./env";

function parseUpdateSigningPublicKey(value: string): KeyObject {
  const trimmed = value.trim();
  if (trimmed.includes("BEGIN")) {
    return createPublicKey(trimmed);
  }
  return createPublicKey({
    key: Buffer.from(trimmed, "base64"),
    format: "der",
    type: "spki",
  });
}

function deriveUpdateSigningKeyId(publicKeySpkiBase64: string): string {
  return createHash("sha256").update(publicKeySpkiBase64, "utf8").digest("hex").slice(0, 16);
}

export function loadUpdateSigningTrustStore(env: Env = getEnv()): Map<string, KeyObject> {
  const raw = env.UPDATE_SIGNING_PUBLIC_KEY?.trim();
  if (!raw || raw.includes("CHANGE_ME")) {
    return new Map();
  }

  const publicKey = parseUpdateSigningPublicKey(raw);
  const spkiBase64 = publicKey.export({ type: "spki", format: "der" }).toString("base64");
  const derivedKeyId = deriveUpdateSigningKeyId(spkiBase64);

  const trustedIds = (env.UPDATE_SIGNING_TRUSTED_KEY_IDS ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const allowed = new Set(trustedIds.length > 0 ? trustedIds : [derivedKeyId]);
  const store = new Map<string, KeyObject>();
  if (allowed.has(derivedKeyId)) {
    store.set(derivedKeyId, publicKey);
  }
  return store;
}

export function isUpdateSigningConfigured(env: Env = getEnv()): boolean {
  return loadUpdateSigningTrustStore(env).size > 0;
}
