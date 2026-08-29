import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
  type KeyObject,
} from "node:crypto";
import { LicensingError } from "./errors";
import { canonicalizeLeasePayload } from "./canonicalize";
import type { LicenseLeasePayload, SignedLease } from "./types";

export interface SigningKeyPair {
  privateKey: KeyObject;
  publicKey: KeyObject;
  keyId: string;
  publicKeySpkiBase64: string;
}

export function generateEphemeralSigningKeys(): SigningKeyPair {
  const pair = generateKeyPairSync("ed25519");
  return fromKeyObjects(pair.privateKey, pair.publicKey);
}

export function signingKeysFromEnv(input: {
  privateKey: string;
  publicKey: string;
}): SigningKeyPair {
  return fromKeyObjects(parsePrivateKey(input.privateKey), parsePublicKey(input.publicKey));
}

export function signLease(payload: LicenseLeasePayload, keys: SigningKeyPair): SignedLease {
  const canonical = canonicalizeLeasePayload(payload);
  const signature = sign(null, Buffer.from(canonical, "utf8"), keys.privateKey);
  return {
    payload,
    signature: signature.toString("base64"),
    keyId: keys.keyId,
  };
}

export function verifyLease(
  token: SignedLease,
  publicKey: KeyObject,
  policy: { nowSeconds: number; gracePeriodSeconds: number },
): { payload: LicenseLeasePayload; grace: boolean } {
  const canonical = canonicalizeLeasePayload(token.payload);
  const ok = verify(
    null,
    Buffer.from(canonical, "utf8"),
    publicKey,
    Buffer.from(token.signature, "base64"),
  );
  if (!ok) {
    throw new LicensingError("INVALID_LICENSE", "Lease signature is invalid");
  }
  const graceEnds = token.payload.exp + policy.gracePeriodSeconds;
  if (policy.nowSeconds > graceEnds) {
    throw new LicensingError("LEASE_EXPIRED", "Lease has expired");
  }
  return {
    payload: token.payload,
    grace: policy.nowSeconds > token.payload.exp,
  };
}

export function publicKeyFromSpkiBase64(spkiBase64: string): KeyObject {
  return parsePublicKey(spkiBase64);
}

function fromKeyObjects(privateKey: KeyObject, publicKey: KeyObject): SigningKeyPair {
  const publicKeySpkiBase64 = publicKey.export({ type: "spki", format: "der" }).toString("base64");
  return {
    privateKey,
    publicKey,
    publicKeySpkiBase64,
    keyId: createHash("sha256").update(publicKeySpkiBase64, "utf8").digest("hex").slice(0, 16),
  };
}

function parsePrivateKey(value: string): KeyObject {
  if (value.includes("BEGIN")) {
    return createPrivateKey(value);
  }
  return createPrivateKey({
    key: Buffer.from(value, "base64"),
    format: "der",
    type: "pkcs8",
  });
}

function parsePublicKey(value: string): KeyObject {
  if (value.includes("BEGIN")) {
    return createPublicKey(value);
  }
  return createPublicKey({
    key: Buffer.from(value, "base64"),
    format: "der",
    type: "spki",
  });
}
