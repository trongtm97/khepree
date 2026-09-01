import { describe, expect, it } from "vitest";
import {
  deriveSeoFields,
  mergeFullDescription,
  parseProductCategory,
  parseProductType,
  PRODUCT_DESCRIPTION_TEMPLATE,
} from "./studio-field-policy";

describe("studio-field-policy", () => {
  it("parses metadata category and type", () => {
    expect(parseProductCategory({ productCategory: "ai-tools" })).toBe("ai-tools");
    expect(parseProductCategory({ productCategory: "invalid" })).toBeNull();
    expect(parseProductType({ productType: "desktop-software" })).toBe("desktop-software");
  });

  it("derives SEO defaults with overrides", () => {
    const derived = deriveSeoFields({
      name: "Novel AI",
      slug: "novel-ai",
      shortDescription: "Viết truyện bằng AI",
      hasCover: true,
      hasIcon: true,
    });
    expect(derived.seoTitle).toBe("Novel AI | Khepree");
    expect(derived.seoDescription).toBe("Viết truyện bằng AI");
    expect(derived.canonicalPath).toBe("/vi/products/novel-ai");
    expect(derived.openGraph.image).toBe("cover");

    const overridden = deriveSeoFields({
      name: "Novel AI",
      slug: "novel-ai",
      shortDescription: "Short",
      seoTitleOverride: "Custom title",
      seoDescriptionOverride: "Custom desc",
      hasCover: false,
      hasIcon: true,
    });
    expect(overridden.seoTitle).toBe("Custom title");
    expect(overridden.openGraph.image).toBe("icon");
  });

  it("merges description and content", () => {
    expect(mergeFullDescription("A", "B")).toBe("A\n\nB");
    expect(mergeFullDescription(null, "B")).toBe("B");
    expect(mergeFullDescription("A", null)).toBe("A");
  });

  it("exposes description template sections", () => {
    expect(PRODUCT_DESCRIPTION_TEMPLATE).toContain("## Giới thiệu");
    expect(PRODUCT_DESCRIPTION_TEMPLATE).toContain("## Câu hỏi thường gặp");
  });
});
