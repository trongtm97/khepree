import { describe, expect, it } from "vitest";
import { isSafeRedirectPath, normalizeRedirectPath } from "./redirect-path";

describe("redirect paths", () => {
  it("accepts site-relative paths", () => {
    expect(isSafeRedirectPath("/vi/products/old")).toBe(true);
  });

  it("rejects open redirects", () => {
    expect(isSafeRedirectPath("https://evil.example")).toBe(false);
    expect(isSafeRedirectPath("//evil.example")).toBe(false);
    expect(isSafeRedirectPath("/x javascript:alert(1)")).toBe(false);
  });

  it("strips a trailing slash except root", () => {
    expect(normalizeRedirectPath("/vi/old/")).toBe("/vi/old");
    expect(normalizeRedirectPath("/")).toBe("/");
  });
});
