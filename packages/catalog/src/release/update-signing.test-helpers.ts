import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, sign } from "node:crypto";
import type { KeyObject } from "node:crypto";
import {
  canonicalizeUpdateArtifactManifest,
  deriveUpdateSigningKeyId,
  type UpdateArtifactManifest,
} from "./update-signing";

export function generateEphemeralUpdateSigningKeys(): {
  privateKey: KeyObject;
  publicKey: KeyObject;
  keyId: string;
  publicKeySpkiBase64: string;
} {
  const pair = generateKeyPairSync("ed25519");
  const publicKeySpkiBase64 = pair.publicKey.export({ type: "spki", format: "der" }).toString("base64");
  return {
    privateKey: pair.privateKey,
    publicKey: pair.publicKey,
    publicKeySpkiBase64,
    keyId: deriveUpdateSigningKeyId(publicKeySpkiBase64),
  };
}

export function signUpdateArtifactManifest(
  manifest: UpdateArtifactManifest,
  privateKey: KeyObject,
  keyId: string,
): { signatureBase64: string; keyId: string } {
  const canonical = canonicalizeUpdateArtifactManifest(manifest);
  const signature = sign(null, Buffer.from(canonical, "utf8"), privateKey);
  return { signatureBase64: signature.toString("base64"), keyId };
}

export function sha256HexOfString(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
