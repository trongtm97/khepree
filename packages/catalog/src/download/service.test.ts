import { describe, expect, it } from "vitest";
import { CatalogError } from "../product/admin";
import { DownloadService, DESKTOP_RELEASE_DOWNLOAD_TTL_SECONDS } from "./service";
import { MemoryDownloadTicketStore } from "./ticket-store";

const PRODUCT_ID = "11111111-1111-4111-8111-111111111111";
const RELEASE_ID = "release-internal";

const releaseRow = {
  id: RELEASE_ID,
  publicId: "rel_pub1",
  productId: PRODUCT_ID,
  version: "2.0.0",
  platform: "windows" as const,
  architecture: "x64" as const,
  channel: "stable" as const,
  mediaAssetId: "media-primary",
  fileName: "setup.exe",
  fileSize: 100,
  checksumSha256: "a".repeat(64),
  signature: null,
  minimumSupportedVersion: null,
  mandatoryUpdate: false,
  status: "published" as const,
  publishedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

const artifactRow = {
  id: "art-internal",
  publicId: "rart_installer",
  releaseId: RELEASE_ID,
  kind: "installer" as const,
  mediaAssetId: "media-artifact",
  fileName: "setup.exe",
  contentType: "application/octet-stream",
  sizeBytes: 100,
  sha256: "a".repeat(64),
  signature: "sig",
  signingKeyId: "key",
  createdAt: new Date(),
};

const otherArtifact = { ...artifactRow, publicId: "rart_other", releaseId: "release-other" };

const mediaRow = {
  id: "media-artifact",
  publicId: "med_artifact",
  storageProvider: "s3" as const,
  bucket: "private" as const,
  objectKey: "secret/releases/setup.exe",
  mimeType: "application/octet-stream",
  sizeBytes: 100,
  checksumSha256: "a".repeat(64),
  width: null,
  height: null,
  visibility: "private" as const,
  altText: null,
  ownerType: null,
  ownerId: null,
  context: "release:rel_pub1",
  createdAt: new Date(),
};

function mockStorage() {
  return {
    provider: "mock" as const,
    status: "mock" as const,
    headObject: async () => ({ contentLength: 100 }),
    getObject: async () => Buffer.from("x"),
    putObject: async () => ({ key: "x" }),
    deleteObject: async () => {},
    createPresignedUpload: async () => {
      throw new Error("not implemented");
    },
    createPresignedDownload: async (input: { key: string; expiresInSeconds?: number }) => ({
      url: `https://signed.example/${input.key}?sig=secret`,
      key: input.key,
      bucket: "private" as const,
      expiresAt: new Date(Date.now() + (input.expiresInSeconds ?? 300) * 1000),
    }),
    publicUrl: () => null,
  };
}

function artifactDownloadDb(
  release: typeof releaseRow | (typeof releaseRow & { status: "draft" }) = releaseRow,
  artifact: typeof artifactRow | null = artifactRow,
) {
  let selectCall = 0;
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            selectCall += 1;
            const phase = ((selectCall - 1) % 3) + 1;
            if (phase === 1) return [release];
            if (phase === 2) {
              if (!artifact || artifact.releaseId !== release.id) return [];
              return [artifact];
            }
            return [mediaRow];
          },
        }),
      }),
    }),
  };
}

describe("DownloadService.authorizeReleaseArtifactDownload", () => {
  it("denies download without entitlement or public update authorization", async () => {
    const service = new DownloadService(artifactDownloadDb() as never, mockStorage());

    await expect(
      service.authorizeReleaseArtifactDownload({
        releasePublicId: releaseRow.publicId,
        artifactPublicId: artifactRow.publicId,
        context: { purpose: "desktop", actorUserId: "user-1" },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects draft releases for non-admin callers", async () => {
    const service = new DownloadService(
      artifactDownloadDb({ ...releaseRow, status: "draft", publicId: "rel_draft" } as typeof releaseRow & {
        status: "draft";
      }) as never,
      mockStorage(),
    );

    await expect(
      service.authorizeReleaseArtifactDownload({
        releasePublicId: "rel_draft",
        artifactPublicId: artifactRow.publicId,
        context: { purpose: "desktop", entitled: true, actorUserId: "user-1" },
      }),
    ).rejects.toMatchObject({ code: "INVALID_INPUT" });
  });

  it("rejects artifact from another release", async () => {
    const service = new DownloadService(
      artifactDownloadDb(releaseRow, otherArtifact) as never,
      mockStorage(),
    );

    await expect(
      service.authorizeReleaseArtifactDownload({
        releasePublicId: releaseRow.publicId,
        artifactPublicId: otherArtifact.publicId,
        context: { purpose: "desktop", entitled: true, actorUserId: "user-1" },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("issues short-lived scoped download without object key in response shape", async () => {
    const ticketStore = new MemoryDownloadTicketStore();
    const service = new DownloadService(
      artifactDownloadDb() as never,
      mockStorage(),
      undefined,
      ticketStore,
    );

    const result = await service.authorizeReleaseArtifactDownload({
      releasePublicId: releaseRow.publicId,
      artifactPublicId: artifactRow.publicId,
      context: { purpose: "desktop", entitled: true, actorUserId: "user-1" },
      ticketId: "dlt_test_ticket",
      expiresInSeconds: DESKTOP_RELEASE_DOWNLOAD_TTL_SECONDS,
    });

    expect(result.productId).toBe(PRODUCT_ID);
    expect(result.artifactPublicId).toBe(artifactRow.publicId);
    expect(result.ticketId).toBe("dlt_test_ticket");
    expect(result.downloadUrl).toContain("signed.example");
    expect(result).not.toHaveProperty("objectKey");
    expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("rejects replay of the same download ticket id", async () => {
    const ticketStore = new MemoryDownloadTicketStore();
    const service = new DownloadService(
      artifactDownloadDb() as never,
      mockStorage(),
      undefined,
      ticketStore,
    );
    const input = {
      releasePublicId: releaseRow.publicId,
      artifactPublicId: artifactRow.publicId,
      context: { purpose: "desktop", publicUpdateAuthorized: true, actorUserId: "user-1" },
      ticketId: "dlt_replay_once",
    };

    await service.authorizeReleaseArtifactDownload(input);
    await expect(service.authorizeReleaseArtifactDownload(input)).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("allows public update authorization without entitled flag", async () => {
    const service = new DownloadService(artifactDownloadDb() as never, mockStorage());

    const result = await service.authorizeReleaseArtifactDownload({
      releasePublicId: releaseRow.publicId,
      artifactPublicId: artifactRow.publicId,
      context: {
        purpose: "desktop",
        publicUpdateAuthorized: true,
        actorUserId: "user-1",
      },
      ticketId: "dlt_public_ok",
    });

    expect(result.downloadUrl).toBeTruthy();
  });
});

describe("DownloadService.authorizeReleaseDownload legacy path", () => {
  it("maps not found to CatalogError", async () => {
    const service = new DownloadService(
      {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [],
            }),
          }),
        }),
      } as never,
      mockStorage(),
    );

    await expect(
      service.authorizeReleaseDownload({
        releasePublicId: "missing",
        context: { purpose: "account", entitled: true },
      }),
    ).rejects.toBeInstanceOf(CatalogError);
  });
});
