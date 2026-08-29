import { describe, expect, it } from "vitest";
import { safeReturnPath } from "./safe-return-path";

describe("safeReturnPath", () => {
  it("allows protected relative paths", () => {
    expect(safeReturnPath("/dashboard")).toBe("/dashboard");
    expect(safeReturnPath("/products")).toBe("/products");
    expect(safeReturnPath("/checkout?plan=abc&price=def")).toBe("/checkout?plan=abc&price=def");
  });

  it("rejects protocol and protocol-relative URLs", () => {
    expect(safeReturnPath("https://evil.test")).toBe("/dashboard");
    expect(safeReturnPath("//evil.test/phish")).toBe("/dashboard");
  });

  it("rejects paths outside account protected roots", () => {
    expect(safeReturnPath("/sign-in")).toBe("/dashboard");
    expect(safeReturnPath("/admin/secret")).toBe("/dashboard");
  });

  it("falls back when empty", () => {
    expect(safeReturnPath(null)).toBe("/dashboard");
    expect(safeReturnPath(undefined, "/profile")).toBe("/profile");
  });
});
