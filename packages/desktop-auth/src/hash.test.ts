import { describe, expect, it } from "vitest";
import { generateSecureToken, hashSecret, secretsEqual } from "./hash";

describe("desktop auth hash helpers", () => {
  it("hashes tokens as hex sha256", () => {
    expect(hashSecret("abc")).toMatch(/^[a-f0-9]{64}$/);
  });

  it("generates url-safe tokens", () => {
    const token = generateSecureToken();
    expect(token.length).toBeGreaterThan(20);
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("compares secrets in constant time", () => {
    expect(secretsEqual("same", "same")).toBe(true);
    expect(secretsEqual("same", "other")).toBe(false);
  });
});
