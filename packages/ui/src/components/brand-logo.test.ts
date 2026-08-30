import { describe, expect, it } from "vitest";
import { BRAND_LOGO_ASPECT_RATIO } from "./brand-logo";

describe("BrandLogo constants", () => {
  it("keeps aspect ratio aligned with 333×300 artwork", () => {
    expect(BRAND_LOGO_ASPECT_RATIO).toBeCloseTo(333 / 300, 5);
  });
});
