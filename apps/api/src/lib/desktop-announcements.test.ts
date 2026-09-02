import { describe, expect, it } from "vitest";
import { CatalogError } from "@khepree/catalog";
import {
  desktopAnnouncementsQueryErrorMessage,
  parseDesktopAnnouncementsQuery,
  serializeDesktopAnnouncement,
} from "./desktop-announcements";
import { desktopActivateErrorResponse } from "./desktop-http";

function params(input: Record<string, string>) {
  return new URLSearchParams(input);
}

describe("parseDesktopAnnouncementsQuery", () => {
  it("parses required desktop targeting query", () => {
    const parsed = parseDesktopAnnouncementsQuery(
      params({
        clientId: "desktop-client",
        appVersion: "2.1.0",
        platform: "windows",
        architecture: "x64",
        channel: "stable",
        locale: "en",
        limit: "10",
      }),
    );
    expect(parsed).toMatchObject({
      clientId: "desktop-client",
      appVersion: "2.1.0",
      platform: "windows",
      architecture: "x64",
      channel: "stable",
      locale: "en",
      limit: 10,
    });
  });

  it("returns stable error codes for malformed query", () => {
    expect(parseDesktopAnnouncementsQuery(params({}))).toBe("CLIENT_ID_REQUIRED");
    expect(parseDesktopAnnouncementsQuery(params({ clientId: "x" }))).toBe("APP_VERSION_REQUIRED");
    expect(
      parseDesktopAnnouncementsQuery(
        params({
          clientId: "x",
          appVersion: "1.0.0",
          platform: "dos",
          architecture: "x64",
        }),
      ),
    ).toBe("PLATFORM_INVALID");
    expect(
      parseDesktopAnnouncementsQuery(
        params({
          clientId: "x",
          appVersion: "1.0.0",
          platform: "windows",
          architecture: "x64",
          channel: "nightly",
        }),
      ),
    ).toBe("CHANNEL_INVALID");
    expect(
      parseDesktopAnnouncementsQuery(
        params({
          clientId: "x",
          appVersion: "1.0.0",
          platform: "windows",
          architecture: "x64",
          limit: "0",
        }),
      ),
    ).toBe("LIMIT_INVALID");
    expect(desktopAnnouncementsQueryErrorMessage("PLATFORM_INVALID")).toMatch(/windows/);
  });

  it("falls back to default locale for unsupported locale", () => {
    const parsed = parseDesktopAnnouncementsQuery(
      params({
        clientId: "desktop-client",
        appVersion: "2.1.0",
        platform: "windows",
        architecture: "x64",
        locale: "fr",
      }),
    );
    expect(typeof parsed).not.toBe("string");
    if (typeof parsed !== "string") {
      expect(parsed.locale).toBe("vi");
    }
  });
});

describe("serializeDesktopAnnouncement", () => {
  it("omits admin-only fields and ISO-serializes timestamps", () => {
    const serialized = serializeDesktopAnnouncement({
      publicId: "ann_sample",
      severity: "warning",
      title: "Maintenance",
      body: "Scheduled downtime",
      ctaKind: "open_url",
      ctaPayload: { url: "https://khepree.com/support" },
      publishedAt: new Date("2026-09-03T08:00:00.000Z"),
      expiresAt: new Date("2026-09-04T08:00:00.000Z"),
      readAt: null,
      dismissedAt: null,
    });
    expect(serialized).toEqual({
      publicId: "ann_sample",
      severity: "warning",
      title: "Maintenance",
      body: "Scheduled downtime",
      publishedAt: "2026-09-03T08:00:00.000Z",
      expiresAt: "2026-09-04T08:00:00.000Z",
      cta: { kind: "open_url", payload: { url: "https://khepree.com/support" } },
      readAt: null,
      dismissedAt: null,
    });
    expect(serialized).not.toHaveProperty("productId");
    expect(serialized).not.toHaveProperty("createdBy");
  });
});

describe("desktopActivateErrorResponse catalog mapping", () => {
  it("maps announcement not found to stable desktop code", async () => {
    const response = desktopActivateErrorResponse(
      new CatalogError("NOT_FOUND", "missing"),
      "req_test",
    );
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "ANNOUNCEMENT_NOT_FOUND", requestId: "req_test" },
    });
  });

  it("maps invalid input to 400 with requestId", async () => {
    const response = desktopActivateErrorResponse(
      new CatalogError("INVALID_INPUT", "cursor không hợp lệ"),
      "req_bad_cursor",
    );
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_INPUT", requestId: "req_bad_cursor" },
    });
  });
});
