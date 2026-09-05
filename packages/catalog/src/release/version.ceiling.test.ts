import { describe, expect, it } from "vitest";
import { versionCeilingBelow } from "./version";

describe("versionCeilingBelow", () => {
  it("decrements patch when patch > 0", () => {
    expect(versionCeilingBelow("1.2.3")).toBe("1.2.2");
  });

  it("uses high patch when only minor can decrement", () => {
    expect(versionCeilingBelow("2.1.0")).toBe("2.0.9999");
  });

  it("uses high minor.patch when only major can decrement", () => {
    expect(versionCeilingBelow("1.0.0")).toBe("0.9999.9999");
  });

  it("returns null for invalid or 0.0.0", () => {
    expect(versionCeilingBelow("not-a-version")).toBeNull();
    expect(versionCeilingBelow("0.0.0")).toBeNull();
  });
});
