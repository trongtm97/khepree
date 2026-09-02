import { describe, expect, it } from "vitest";

/** Mirrors apps/web/src/app/pub/[...path]/route.ts key assembly. */
function objectKeyFromPubRouteSegments(segments: string[]): string {
  return `pub/${segments.map((segment) => decodeURIComponent(segment)).join("/")}`;
}

describe("pub route object key", () => {
  it("prepends pub/ because the /pub URL prefix is outside the catch-all", () => {
    expect(
      objectKeyFromPubRouteSegments([
        "media",
        "628aec1da32e454883eccdffeac6e261",
        "3aa25c30888ac5259d0ca1d574e27c0e.webp",
      ]),
    ).toBe(
      "pub/media/628aec1da32e454883eccdffeac6e261/3aa25c30888ac5259d0ca1d574e27c0e.webp",
    );
  });
});
