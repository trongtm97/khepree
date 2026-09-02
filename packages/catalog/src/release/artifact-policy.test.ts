import { describe, expect, it } from "vitest";
import {
  assertPublishableArtifacts,
  hasRequiredArtifacts,
  mediaContextMatchesRelease,
  requiredArtifactKinds,
  WINDOWS_SQUIRREL_REQUIRED_KINDS,
} from "./artifact-policy";
import type { ReleaseArtifactKind } from "@khepree/db";

describe("requiredArtifactKinds", () => {
  it("requires Squirrel artifacts on Windows", () => {
    expect(requiredArtifactKinds("windows")).toEqual([...WINDOWS_SQUIRREL_REQUIRED_KINDS]);
  });

  it("requires installer on other platforms", () => {
    expect(requiredArtifactKinds("macos")).toEqual(["installer"]);
    expect(requiredArtifactKinds("linux")).toEqual(["installer"]);
  });
});

describe("assertPublishableArtifacts", () => {
  it("blocks Windows publish without nupkg or RELEASES index", () => {
    expect(() =>
      assertPublishableArtifacts("windows", ["installer"]),
    ).toThrow(/full-nupkg/);
    expect(() =>
      assertPublishableArtifacts("windows", ["full-nupkg", "installer"]),
    ).toThrow(/releases-index/);
  });

  it("allows Windows publish with all Squirrel artifacts", () => {
    expect(() =>
      assertPublishableArtifacts("windows", [
        "installer",
        "full-nupkg",
        "releases-index",
      ]),
    ).not.toThrow();
    expect(
      hasRequiredArtifacts("windows", ["installer", "full-nupkg", "releases-index"]),
    ).toBe(true);
  });
});

describe("mediaContextMatchesRelease", () => {
  const productId = "11111111-1111-4111-8111-111111111111";
  const releasePublicId = "rel_sample123";

  it("accepts product-scoped and release-scoped media", () => {
    expect(
      mediaContextMatchesRelease({
        productId,
        releasePublicId,
        mediaContext: `product:${productId}`,
      }),
    ).toBe(true);
    expect(
      mediaContextMatchesRelease({
        productId,
        releasePublicId,
        mediaContext: `release:${releasePublicId}`,
      }),
    ).toBe(true);
  });

  it("rejects media from another product", () => {
    expect(
      mediaContextMatchesRelease({
        productId,
        releasePublicId,
        mediaContext: "product:22222222-2222-4222-8222-222222222222",
      }),
    ).toBe(false);
    expect(
      mediaContextMatchesRelease({
        productId,
        releasePublicId,
        mediaContext: "release:rel_other",
      }),
    ).toBe(false);
  });
});

describe("artifact kind sets", () => {
  it("treats delta-nupkg as optional for publish gate", () => {
    const kinds: ReleaseArtifactKind[] = [
      "installer",
      "full-nupkg",
      "releases-index",
      "delta-nupkg",
    ];
    expect(hasRequiredArtifacts("windows", kinds)).toBe(true);
  });
});
