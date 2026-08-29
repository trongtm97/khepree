import { describe, expect, it } from "vitest";
import { buildProductRevalidationPlan, productRevalidationTags } from "./revalidation";

describe("product revalidation", () => {
  it("builds cache tags for catalog products", () => {
    const tags = productRevalidationTags({ slug: "khepree-studio", locale: "en" });
    expect(tags).toContain("product:en:khepree-studio");
    expect(tags).toContain("product-locale:en");
    expect(tags).toContain("products");
  });

  it("includes product and pricing paths", () => {
    const plan = buildProductRevalidationPlan({ slug: "khepree-studio", locale: "vi" });
    expect(plan.paths).toContain("/vi/products/khepree-studio");
    expect(plan.paths).toContain("/vi/pricing");
  });
});
