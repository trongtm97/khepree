import { describe, expect, it } from "vitest";
import type { ObjectStorage } from "@khepree/storage";
import { assessReleasePublishReadiness, verifyReleaseArtifact } from "./publish-gate";
import type { ReleaseArtifactRecord } from "./types";
import {
  generateEphemeralUpdateSigningKeys,
  sha256HexOfString,
  signUpdateArtifactManifest,
} from "./update-signing.test-helpers";

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const RELEASE = {
  id: "release-1",
  productId: PRODUCT_ID,
  publicId: "rel_test01",
  version: "1.0.0",
  platform: "windows" as const,
  architecture: "x64" as const,
  channel: "stable",
  status: "draft",
};

function artifact(overrides: Partial<ReleaseArtifactRecord> = {}): ReleaseArtifactRecord {
  return {
    id: "art-1",
    publicId: "rart_installer",
    releaseId: RELEASE.id,
    kind: "installer",
    mediaAssetId: "media-1",
    mediaPublicId: "med_1",
    fileName: "setup.exe",
    contentType: "application/octet-stream",
    sizeBytes: 11,
    sha256: sha256HexOfString("hello world"),
    signature: null,
    signingKeyId: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function mockStorage(bytes: Buffer): ObjectStorage {
  return {
    provider: "mock",
    status: "mock",
    headObject: async () => ({ contentLength: bytes.length, contentType: "application/octet-stream" }),
    getObject: async () => bytes,
    putObject: async () => ({ key: "x" }),
    deleteObject: async () => {},
    createPresignedUpload: async () => {
      throw new Error("not implemented");
    },
    createPresignedDownload: async () => {
      throw new Error("not implemented");
    },
    publicUrl: () => null,
  };
}

describe("verifyReleaseArtifact", () => {
  const keys = generateEphemeralUpdateSigningKeys();
  const trusted = new Map([[keys.keyId, keys.publicKey]]);
  const bytes = Buffer.from("hello world");
  const sha256 = sha256HexOfString("hello world");

  it("fails when one byte is tampered in storage", async () => {
    const signed = signUpdateArtifactManifest(
      {
        productId: PRODUCT_ID,
        releasePublicId: RELEASE.publicId,
        version: RELEASE.version,
        channel: "stable",
        platform: "windows",
        architecture: "x64",
        artifactKind: "installer",
        fileName: "setup.exe",
        sizeBytes: bytes.length,
        sha256,
      },
      keys.privateKey,
      keys.keyId,
    );

    const result = await verifyReleaseArtifact({
      release: RELEASE,
      artifact: artifact({
        sha256,
        sizeBytes: bytes.length,
        signature: signed.signatureBase64,
        signingKeyId: signed.keyId,
      }),
      mediaObjectKey: "releases/setup.exe",
      storage: mockStorage(Buffer.from("hello worle")),
      trustedPublicKeys: trusted,
    });

    expect(result.state).toBe("storage_mismatch");
  });

  it("fails when manifest filename does not match artifact row", async () => {
    const signed = signUpdateArtifactManifest(
      {
        productId: PRODUCT_ID,
        releasePublicId: RELEASE.publicId,
        version: RELEASE.version,
        channel: "stable",
        platform: "windows",
        architecture: "x64",
        artifactKind: "installer",
        fileName: "other.exe",
        sizeBytes: bytes.length,
        sha256,
      },
      keys.privateKey,
      keys.keyId,
    );

    const result = await verifyReleaseArtifact({
      release: RELEASE,
      artifact: artifact({
        fileName: "setup.exe",
        sha256,
        sizeBytes: bytes.length,
        signature: signed.signatureBase64,
        signingKeyId: signed.keyId,
      }),
      mediaObjectKey: "releases/setup.exe",
      storage: mockStorage(bytes),
      trustedPublicKeys: trusted,
    });

    expect(result.state).toBe("storage_mismatch");
  });

  it("fails for untrusted keyId", async () => {
    const signed = signUpdateArtifactManifest(
      {
        productId: PRODUCT_ID,
        releasePublicId: RELEASE.publicId,
        version: RELEASE.version,
        channel: "stable",
        platform: "windows",
        architecture: "x64",
        artifactKind: "installer",
        fileName: "setup.exe",
        sizeBytes: bytes.length,
        sha256,
      },
      keys.privateKey,
      keys.keyId,
    );

    const result = await verifyReleaseArtifact({
      release: RELEASE,
      artifact: artifact({
        sha256,
        sizeBytes: bytes.length,
        signature: signed.signatureBase64,
        signingKeyId: "untrusted-key",
      }),
      mediaObjectKey: "releases/setup.exe",
      storage: mockStorage(bytes),
      trustedPublicKeys: trusted,
    });

    expect(result.state).toBe("untrusted_key");
  });

  it("fails when manifest channel does not match release row", async () => {
    const signed = signUpdateArtifactManifest(
      {
        productId: PRODUCT_ID,
        releasePublicId: RELEASE.publicId,
        version: RELEASE.version,
        channel: "beta",
        platform: "windows",
        architecture: "x64",
        artifactKind: "installer",
        fileName: "setup.exe",
        sizeBytes: bytes.length,
        sha256,
      },
      keys.privateKey,
      keys.keyId,
    );

    const result = await verifyReleaseArtifact({
      release: RELEASE,
      artifact: artifact({
        sha256,
        sizeBytes: bytes.length,
        signature: signed.signatureBase64,
        signingKeyId: signed.keyId,
      }),
      mediaObjectKey: "releases/setup.exe",
      storage: mockStorage(bytes),
      trustedPublicKeys: trusted,
    });

    expect(result.state).toBe("storage_mismatch");
  });

  it("passes for valid artifact bytes and signature", async () => {
    const signed = signUpdateArtifactManifest(
      {
        productId: PRODUCT_ID,
        releasePublicId: RELEASE.publicId,
        version: RELEASE.version,
        channel: "stable",
        platform: "windows",
        architecture: "x64",
        artifactKind: "installer",
        fileName: "setup.exe",
        sizeBytes: bytes.length,
        sha256,
      },
      keys.privateKey,
      keys.keyId,
    );

    const result = await verifyReleaseArtifact({
      release: RELEASE,
      artifact: artifact({
        sha256,
        sizeBytes: bytes.length,
        signature: signed.signatureBase64,
        signingKeyId: signed.keyId,
      }),
      mediaObjectKey: "releases/setup.exe",
      storage: mockStorage(bytes),
      trustedPublicKeys: trusted,
    });

    expect(result.state).toBe("verified");
  });
});

describe("assessReleasePublishReadiness", () => {
  const keys = generateEphemeralUpdateSigningKeys();
  const trusted = new Map([[keys.keyId, keys.publicKey]]);

  it("blocks publish when required artifacts are missing", async () => {
    const readiness = await assessReleasePublishReadiness({
      release: RELEASE,
      artifacts: [artifact({ kind: "installer", signature: "x", signingKeyId: keys.keyId })],
      notes: [{ locale: "vi", releaseNotes: "Ghi chú" }],
      mediaById: new Map([["media-1", { objectKey: "k" }]]),
      storage: mockStorage(Buffer.from("hello world")),
      trustedPublicKeys: trusted,
    });

    expect(readiness.ready).toBe(false);
    expect(readiness.blockers.some((line) => line.includes("full-nupkg"))).toBe(true);
  });
});
