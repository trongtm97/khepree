import { describe, expect, it } from "vitest";
import {
  buildUpdateArtifactManifest,
  canonicalizeUpdateArtifactManifest,
  verifyUpdateArtifactManifestSignature,
} from "./update-signing";
import { generateEphemeralUpdateSigningKeys, signUpdateArtifactManifest } from "./update-signing.test-helpers";

describe("update-signing manifest", () => {
  const keys = generateEphemeralUpdateSigningKeys();
  const manifest = buildUpdateArtifactManifest({
    productId: "11111111-1111-4111-8111-111111111111",
    releasePublicId: "rel_test01",
    version: "1.0.0",
    channel: "stable",
    platform: "windows",
    architecture: "x64",
    artifactKind: "installer",
    fileName: "setup.exe",
    sizeBytes: 100,
    sha256: "a".repeat(64),
  });

  it("canonicalizes deterministically", () => {
    expect(canonicalizeUpdateArtifactManifest(manifest)).toContain('"artifactKind":"installer"');
    expect(canonicalizeUpdateArtifactManifest(manifest)).toContain('"releasePublicId":"rel_test01"');
  });

  it("verifies CI signature with trusted public key", () => {
    const signed = signUpdateArtifactManifest(manifest, keys.privateKey, keys.keyId);
    expect(() =>
      verifyUpdateArtifactManifestSignature({
        manifest,
        signatureBase64: signed.signatureBase64,
        keyId: signed.keyId,
        trustedPublicKeys: new Map([[keys.keyId, keys.publicKey]]),
      }),
    ).not.toThrow();
  });
});
