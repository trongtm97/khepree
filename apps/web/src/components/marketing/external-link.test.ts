import { describe, expect, it } from "vitest";
import { getOutboundLinkAttributes } from "@khepree/config";

describe("ExternalLink policy (render contract)", () => {
  it("third-party links include nofollow, noopener, and noreferrer", () => {
    const attrs = getOutboundLinkAttributes("https://www.facebook.com/KhepreeLabs");
    expect(attrs).toEqual({
      target: "_blank",
      rel: "nofollow noopener noreferrer",
    });
  });
});
