import { describe, expect, it } from "vitest";
import { safeAccountNextPath } from "./safe-account-next-path";

describe("safeAccountNextPath", () => {
  it("allows protected relative paths", () => {
    expect(safeAccountNextPath("/dashboard")).toBe("/dashboard");
    expect(safeAccountNextPath("/checkout?plan=abc&price=def")).toBe("/checkout?plan=abc&price=def");
  });

  it("rejects protocol, protocol-relative, and script URLs", () => {
    expect(safeAccountNextPath("https://evil.test")).toBe("/dashboard");
    expect(safeAccountNextPath("//evil.test/phish")).toBe("/dashboard");
    expect(safeAccountNextPath("javascript:alert(1)")).toBe("/dashboard");
    expect(safeAccountNextPath("/checkout\\evil")).toBe("/dashboard");
  });

  it("rejects paths outside account protected roots", () => {
    expect(safeAccountNextPath("/sign-in")).toBe("/dashboard");
    expect(safeAccountNextPath("/admin/secret")).toBe("/dashboard");
  });

  it("allows desktop authorize return paths", () => {
    expect(safeAccountNextPath("/desktop/authorize?client_id=dev")).toBe(
      "/desktop/authorize?client_id=dev",
    );
  });

  it("falls back when empty", () => {
    expect(safeAccountNextPath(null)).toBe("/dashboard");
    expect(safeAccountNextPath(undefined, "/profile")).toBe("/profile");
  });
});
