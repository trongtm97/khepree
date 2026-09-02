import { createHash, createPublicKey, verify, type KeyObject } from "node:crypto";
import type {
  ReleaseArchitecture,
  ReleaseArtifactKind,
  ReleaseChannel,
  ReleasePlatform,
} from "@khepree/db";
import { CatalogError } from "../product/admin";
import { canonicalizeJsonPayload } from "./canonical-json";

export interface UpdateArtifactManifest {
  productId: string;
  releasePublicId: string;
  version: string;
  channel: ReleaseChannel;
  platform: ReleasePlatform;
  architecture: ReleaseArchitecture;
  artifactKind: ReleaseArtifactKind;
  fileName: string;
  sizeBytes: number;
  sha256: string;
}

export function buildUpdateArtifactManifest(input: UpdateArtifactManifest): UpdateArtifactManifest {
  return {
    productId: input.productId.trim(),
    releasePublicId: input.releasePublicId.trim(),
    version: input.version.trim(),
    channel: input.channel,
    platform: input.platform,
    architecture: input.architecture,
    artifactKind: input.artifactKind,
    fileName: input.fileName.trim(),
    sizeBytes: input.sizeBytes,
    sha256: input.sha256.trim().toLowerCase(),
  };
}

export function canonicalizeUpdateArtifactManifest(manifest: UpdateArtifactManifest): string {
  return canonicalizeJsonPayload(buildUpdateArtifactManifest(manifest));
}

export function deriveUpdateSigningKeyId(publicKeySpkiBase64: string): string {
  return createHash("sha256").update(publicKeySpkiBase64, "utf8").digest("hex").slice(0, 16);
}

export function parseUpdateSigningPublicKey(value: string): KeyObject {
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

export function verifyUpdateArtifactManifestSignature(input: {
  manifest: UpdateArtifactManifest;
  signatureBase64: string;
  keyId: string;
  trustedPublicKeys: Map<string, KeyObject>;
}): void {
  const keyId = input.keyId.trim();
  if (!keyId) {
    throw new CatalogError("INVALID_INPUT", "Thiếu signing keyId");
  }
  const publicKey = input.trustedPublicKeys.get(keyId);
  if (!publicKey) {
    throw new CatalogError("INVALID_INPUT", "signing keyId không được tin cậy");
  }

  const canonical = canonicalizeUpdateArtifactManifest(input.manifest);
  let signature: Buffer;
  try {
    signature = Buffer.from(input.signatureBase64.trim(), "base64");
  } catch {
    throw new CatalogError("INVALID_INPUT", "Chữ ký manifest không hợp lệ");
  }

  const ok = verify(null, Buffer.from(canonical, "utf8"), publicKey, signature);
  if (!ok) {
    throw new CatalogError("INVALID_INPUT", "Chữ ký manifest không khớp nội dung artifact");
  }
}
