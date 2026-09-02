import { describe, expect, it } from "vitest";
import { serializeDesktopLatestUpdate } from "@khepree/catalog";
import type { ReleaseRecord } from "@khepree/catalog";
import {
  buildReleaseDownloadContext,
  desktopUpdateDownloadBodyErrorMessage,
  desktopUpdatesQueryErrorMessage,
  parseDesktopUpdateDownloadBody,
  parseDesktopUpdatesQuery,
  serializeDesktopLatestUpdateResponse,
} from "./desktop-updates";
import { desktopActivateErrorResponse } from "./desktop-http";
import { CatalogError } from "@khepree/catalog";

function params(input: Record<string, string>) {
  return new URLSearchParams(input);
}

const releaseFixture = {
  id: "release-1",
  publicId: "rel_test",
  productId: "11111111-1111-4111-8111-111111111111",
  version: "2.0.0",
  platform: "windows",
  architecture: "x64",
  channel: "stable",
  mediaAssetId: "media-1",
  mediaPublicId: "med_1",
  fileName: "setup.exe",
  fileSize: 100,
  checksumSha256: "a".repeat(64),
  signature: null,
  artifacts: [
    {
      id: "art-1",
      publicId: "rart_installer",
      releaseId: "release-1",
      kind: "installer",
      mediaAssetId: "media-1",
      mediaPublicId: "med_1",
      fileName: "setup.exe",
      contentType: "application/octet-stream",
      sizeBytes: 100,
      sha256: "a".repeat(64),
      signature: "sig",
      signingKeyId: "key",
      createdAt: new Date(),
    },
  ],
  minimumSupportedVersion: "1.5.0",
  mandatoryUpdate: false,
  status: "published",
  publishedAt: new Date("2026-09-01T00:00:00.000Z"),
  releaseNotesVi: "Sửa lỗi",
  releaseNotesEn: "Bug fixes",
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies ReleaseRecord;

describe("parseDesktopUpdatesQuery", () => {
  it("parses required desktop update query", () => {
    const parsed = parseDesktopUpdatesQuery(
      params({
        clientId: "desktop-client",
        currentVersion: "1.0.0",
        platform: "windows",
        architecture: "x64",
        channel: "stable",
        locale: "vi",
      }),
    );
    expect(parsed).toMatchObject({
      clientId: "desktop-client",
      currentVersion: "1.0.0",
      platform: "windows",
      architecture: "x64",
      channel: "stable",
      locale: "vi",
    });
  });

  it("returns stable error codes for malformed query", () => {
    expect(parseDesktopUpdatesQuery(params({}))).toBe("CLIENT_ID_REQUIRED");
    expect(parseDesktopUpdatesQuery(params({ clientId: "x" }))).toBe("CURRENT_VERSION_REQUIRED");
    expect(
      parseDesktopUpdatesQuery(
        params({
          clientId: "x",
          currentVersion: "1.0.0",
          platform: "dos",
          architecture: "x64",
        }),
      ),
    ).toBe("PLATFORM_INVALID");
    expect(desktopUpdatesQueryErrorMessage("PLATFORM_INVALID")).toMatch(/windows/);
  });
});

describe("parseDesktopUpdateDownloadBody", () => {
  it("requires client, release and artifact ids", () => {
    expect(parseDesktopUpdateDownloadBody({})).toBe("CLIENT_ID_REQUIRED");
    expect(parseDesktopUpdateDownloadBody({ clientId: "c" })).toBe("RELEASE_PUBLIC_ID_REQUIRED");
    expect(
      parseDesktopUpdateDownloadBody({ clientId: "c", releasePublicId: "rel_x" }),
    ).toBe("ARTIFACT_PUBLIC_ID_REQUIRED");
    expect(desktopUpdateDownloadBodyErrorMessage("ARTIFACT_PUBLIC_ID_REQUIRED")).toMatch(
      /artifactPublicId/,
    );
  });
});

describe("serializeDesktopLatestUpdateResponse", () => {
  it("omits storage keys and internal media ids", () => {
    const update = serializeDesktopLatestUpdate(releaseFixture, "vi");
    const payload = serializeDesktopLatestUpdateResponse(update);
    expect(payload.update?.releasePublicId).toBe("rel_test");
    expect(payload.update?.artifacts[0]?.artifactPublicId).toBe("rart_installer");
    expect(payload.update).not.toHaveProperty("mediaAssetId");
    expect(payload.update?.artifacts[0]).not.toHaveProperty("mediaPublicId");
    expect(JSON.stringify(payload)).not.toMatch(/objectKey|storage/);
  });

  it("returns null update without treating it as an error shape", () => {
    expect(serializeDesktopLatestUpdateResponse(null)).toEqual({ update: null });
  });
});

describe("buildReleaseDownloadContext", () => {
  it("marks public update honestly without entitled flag", () => {
    const context = buildReleaseDownloadContext({
      access: { entitled: false, publicUpdateAuthorized: true, canAccessUpdates: true },
      actorUserId: "user-1",
    });
    expect(context.entitled).toBeUndefined();
    expect(context.publicUpdateAuthorized).toBe(true);
  });

  it("prefers entitled when user has active entitlement", () => {
    const context = buildReleaseDownloadContext({
      access: { entitled: true, publicUpdateAuthorized: true, canAccessUpdates: true },
      actorUserId: "user-1",
    });
    expect(context.entitled).toBe(true);
    expect(context.publicUpdateAuthorized).toBeUndefined();
  });
});

describe("desktopActivateErrorResponse release download mapping", () => {
  it("maps release and artifact not found codes", async () => {
    const releaseResponse = desktopActivateErrorResponse(
      new CatalogError("NOT_FOUND", "Release not found"),
      "req_release",
    );
    expect(releaseResponse.status).toBe(404);
    await expect(releaseResponse.json()).resolves.toMatchObject({
      error: { code: "RELEASE_NOT_FOUND" },
    });

    const artifactResponse = desktopActivateErrorResponse(
      new CatalogError("NOT_FOUND", "Artifact not found"),
      "req_art",
    );
    await expect(artifactResponse.json()).resolves.toMatchObject({
      error: { code: "ARTIFACT_NOT_FOUND" },
    });
  });

  it("maps download replay to stable conflict code", async () => {
    const response = desktopActivateErrorResponse(
      new CatalogError("CONFLICT", "Download ticket already used or expired"),
      "req_replay",
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "DOWNLOAD_TICKET_REPLAY" },
    });
  });
});
