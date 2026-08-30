import { describe, expect, it } from "vitest";
import { BRAND_LOGO_ASPECT_RATIO } from "./brand-logo";

describe("BrandLogo constants", () => {
  it("keeps aspect ratio aligned with 842×200 artwork", () => {
    expect(BRAND_LOGO_ASPECT_RATIO).toBeCloseTo(842 / 200, 5);
  });
});
