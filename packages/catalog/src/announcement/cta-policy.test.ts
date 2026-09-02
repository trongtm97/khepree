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
});

describe("isAllowedAnnouncementUrl", () => {
  it("blocks shell injection patterns in URLs", () => {
    expect(isAllowedAnnouncementUrl("https://khepree.com/$(whoami)")).toBe(false);
  });
});
