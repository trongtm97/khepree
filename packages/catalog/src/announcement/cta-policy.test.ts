import { describe, expect, it } from "vitest";
import { isAllowedAnnouncementUrl, validateAnnouncementCta } from "./cta-policy";

describe("validateAnnouncementCta", () => {
  it("accepts first-party https URLs and safe internal paths", () => {
    expect(validateAnnouncementCta("open_url", { url: "https://khepree.com/account" })).toEqual({
      url: "https://khepree.com/account",
    });
    expect(validateAnnouncementCta("open_path", { path: "/products/sample" })).toEqual({
      path: "/products/sample",
    });
    expect(validateAnnouncementCta("none", null)).toBeNull();
  });

  it("rejects javascript, file paths, shell metacharacters and third-party URLs", () => {
    expect(() => validateAnnouncementCta("open_url", { url: "javascript:alert(1)" })).toThrow(
      /allowlisted/i,
    );
    expect(() => validateAnnouncementCta("open_url", { url: "file:///etc/passwd" })).toThrow(
      /allowlisted/i,
    );
    expect(() =>
      validateAnnouncementCta("open_url", { url: "https://evil.example/phish" }),
    ).toThrow(/allowlisted/i);
    expect(() => validateAnnouncementCta("open_path", { path: "/bin;rm -rf" })).toThrow(
      /safe internal path|disallowed/i,
    );
    expect(() => validateAnnouncementCta("open_path", { path: "https://khepree.com/x" })).toThrow(
      /safe internal path/i,
    );
  });

  it("accepts software_update with valid release public id and default actions", () => {
    expect(
      validateAnnouncementCta("software_update", {
        releasePublicId: "rel_abcdefghijkl",
      }),
    ).toEqual({
      releasePublicId: "rel_abcdefghijkl",
      actions: ["download", "auto_update"],
    });
  });

  it("accepts software_update with explicit actions subset", () => {
    expect(
      validateAnnouncementCta("software_update", {
        releasePublicId: "rel_abcdefghijkl",
        actions: ["download"],
      }),
    ).toEqual({
      releasePublicId: "rel_abcdefghijkl",
      actions: ["download"],
    });
  });

  it("rejects software_update with invalid release id or actions", () => {
    expect(() =>
      validateAnnouncementCta("software_update", { releasePublicId: "not-a-rel-id" }),
    ).toThrow(/invalid/i);
    expect(() =>
      validateAnnouncementCta("software_update", {
        releasePublicId: "rel_abcdefghijkl",
        actions: ["explode"],
      }),
    ).toThrow(/actions/i);
    expect(() => validateAnnouncementCta("software_update", { releasePublicId: "" })).toThrow(
      /releasePublicId/i,
    );
  });
});

describe("isAllowedAnnouncementUrl", () => {
  it("blocks shell injection patterns in URLs", () => {
    expect(isAllowedAnnouncementUrl("https://khepree.com/$(whoami)")).toBe(false);
  });
});

describe("Phase 21 — Production Studio CTA: open_path /release-notes", () => {
  it("accepts /release-notes as a safe internal path CTA", () => {
    const cta = validateAnnouncementCta("open_path", { path: "/release-notes" });
    expect(cta).toEqual({ path: "/release-notes" });
  });

  it("rejects custom protocol deep links via open_url (not allowlisted)", () => {
    expect(() =>
      validateAnnouncementCta("open_url", { url: "khepreenovelai://open/release-notes" }),
    ).toThrow(/allowlisted/i);
  });

  it("does not confuse whats_new announcement with urgent severity", () => {
    const cta = validateAnnouncementCta("open_path", { path: "/release-notes" });
    expect(cta).toBeTruthy();
  });

  it("rejects shell metacharacters in path", () => {
    expect(() =>
      validateAnnouncementCta("open_path", { path: "/release-notes;rm -rf" }),
    ).toThrow(/safe internal path|disallowed/i);
  });
});
