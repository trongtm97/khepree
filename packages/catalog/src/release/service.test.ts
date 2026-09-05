import { afterEach, describe, expect, it, vi } from "vitest";
import { ReleaseService } from "./service";

describe("ReleaseService construction", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not require private storage at construct time", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("S3_BUCKET_PRIVATE", "");
    vi.stubEnv("S3_ENDPOINT", "");
    expect(() => new ReleaseService({} as never, { record: async () => {} })).not.toThrow();
  });
});

describe("ReleaseService.findLatestCompatible", () => {
  it("rejects missing or invalid currentVersion", async () => {
    const service = new ReleaseService({} as never, { record: async () => {} });

    await expect(
      service.findLatestCompatible({
        productId: "product-1",
        platform: "windows",
        architecture: "x64",
        currentVersion: "",
      }),
    ).rejects.toMatchObject({
      name: "CatalogError",
      code: "INVALID_INPUT",
    });

    await expect(
      service.findLatestCompatible({
        productId: "product-1",
        platform: "windows",
        architecture: "x64",
        currentVersion: "1.2.3abc",
      }),
    ).rejects.toMatchObject({
      code: "INVALID_INPUT",
    });
  });
});

describe("ReleaseService.publish", () => {
  const releaseRow = {
    id: "release-1",
    publicId: "rel_test",
    productId: "product-1",
    version: "1.0.0",
    platform: "windows" as const,
    architecture: "x64" as const,
    channel: "stable" as const,
    mediaAssetId: "media-1",
    fileName: "setup.exe",
    fileSize: 100,
    checksumSha256: "a".repeat(64),
    signature: null,
    minimumSupportedVersion: null,
    mandatoryUpdate: false,
    status: "draft" as const,
    publishedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const publishedRow = {
    ...releaseRow,
    status: "published" as const,
    publishedAt: new Date("2026-01-01T00:00:00Z"),
  };

  it("blocks Windows publish without nupkg or RELEASES index", async () => {
    let selectCall = 0;
    const service = new ReleaseService(
      {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => {
                selectCall += 1;
                if (selectCall === 1) return [];
                return [releaseRow];
              },
            }),
          }),
        }),
      } as never,
      { record: async () => {} },
    );

    service.getPublishReadiness = async () => ({
      ready: false,
      artifacts: [],
      blockers: ["Missing required release artifacts for windows: full-nupkg, releases-index"],
    });

    await expect(service.publish(releaseRow.id)).rejects.toMatchObject({
      code: "INVALID_INPUT",
      message: expect.stringMatching(/full-nupkg/),
    });
  });

  it("returns existing release on idempotent retry when already published", async () => {
    const service = new ReleaseService(
      {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [publishedRow],
            }),
          }),
        }),
      } as never,
      { record: async () => {} },
    );

    const expected = {
      id: publishedRow.id,
      publicId: publishedRow.publicId,
      status: "published" as const,
    };
    service.getByPublicId = async () => expected as never;

    const result = await service.publish(releaseRow.id);
    expect(result).toEqual(expected);
  });

  it("throws CONFLICT when concurrent publish wins the draft guard", async () => {
    const service = new ReleaseService(
      {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [],
            }),
          }),
        }),
        transaction: async (fn: (tx: never) => Promise<unknown>) => {
          const tx = {
            select: () => ({
              from: () => ({
                where: () => ({
                  limit: async () => [releaseRow],
                }),
              }),
            }),
            update: () => ({
              set: () => ({
                where: () => ({
                  returning: async () => [],
                }),
              }),
            }),
          };
          return fn(tx as never);
        },
      } as never,
      { record: async () => {} },
    );

    service.getPublishReadiness = async () => ({
      ready: true,
      artifacts: [{ artifactPublicId: "rart_1", kind: "installer", fileName: "setup.exe", state: "verified" }],
      blockers: [],
    });

    await expect(service.publish(releaseRow.id)).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringMatching(/đồng thời/i),
    });
  });

  it("publishes draft once when readiness passes", async () => {
    const auditCalls: unknown[] = [];
    let publishedCheck = false;

    const service = new ReleaseService(
      {
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => {
                if (!publishedCheck) {
                  publishedCheck = true;
                  return [];
                }
                return [{ publicId: "med_installer" }];
              },
              then: (resolve: (value: unknown[]) => void) => {
                resolve([]);
                return Promise.resolve([]);
              },
            }),
          }),
        }),
        transaction: async (fn: (tx: never) => Promise<unknown>) => {
          const tx = {
            select: () => ({
              from: () => ({
                where: () => ({
                  limit: async () => [releaseRow],
                }),
              }),
            }),
            update: () => ({
              set: () => ({
                where: () => ({
                  returning: async () => [publishedRow],
                }),
              }),
            }),
          };
          return fn(tx as never);
        },
      } as never,
      {
        record: async (entry) => {
          auditCalls.push(entry);
        },
      },
    );

    service.getPublishReadiness = async () => ({
      ready: true,
      artifacts: [
        { artifactPublicId: "rart_1", kind: "installer", fileName: "setup.exe", state: "verified" },
        { artifactPublicId: "rart_2", kind: "full-nupkg", fileName: "app.nupkg", state: "verified" },
        { artifactPublicId: "rart_3", kind: "releases-index", fileName: "RELEASES", state: "verified" },
      ],
      blockers: [],
    });
    service.listArtifacts = async () => [
      { publicId: "rart_1" },
      { publicId: "rart_2" },
      { publicId: "rart_3" },
    ] as never;

    const result = await service.publish(releaseRow.id, "admin-1");

    expect(result.status).toBe("published");
    expect(result.publicId).toBe(publishedRow.publicId);
    expect(auditCalls).toHaveLength(1);
    expect(auditCalls[0]).toMatchObject({
      actorUserId: "admin-1",
      action: "catalog.release.publish",
      resourceId: publishedRow.publicId,
      metadata: { result: "published", artifactCount: 3, verifiedArtifactCount: 3 },
    });
  });
});
