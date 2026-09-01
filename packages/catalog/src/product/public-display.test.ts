import { describe, expect, it } from "vitest";
import { resolvePublicSeoFields } from "./public-display";

describe("resolvePublicSeoFields", () => {
  it("falls back SEO title to product name and publisher suffix", () => {
    const seo = resolvePublicSeoFields({
      name: "Khepree Novel AI",
      slug: "khepree-novel-ai",
      shortDescription: "AI writing assistant",
      seoTitle: null,
      seoDescription: null,
      metadata: {},
      hasIcon: true,
    });
    expect(seo.seoTitle).toBe("Khepree Novel AI | Khepree");
    expect(seo.seoDescription).toBe("AI writing assistant");
    expect(seo.canonicalPath).toBe("/vi/products/khepree-novel-ai");
    expect(seo.openGraph.image).toBe("icon");
  });

  it("prefers cover for OG image when cover media exists", () => {
    const seo = resolvePublicSeoFields({
      name: "Demo",
      slug: "demo",
      shortDescription: null,
      seoTitle: null,
      seoDescription: null,
      metadata: { coverMediaPublicId: "med_cover123" },
      hasIcon: true,
    });
    expect(seo.openGraph.image).toBe("cover");
  });

  it("respects explicit SEO overrides", () => {
    const seo = resolvePublicSeoFields({
      name: "Demo",
      slug: "demo",
      shortDescription: "Short",
      seoTitle: "Custom title",
      seoDescription: "Custom meta",
      metadata: {},
      hasIcon: false,
    });
    expect(seo.seoTitle).toBe("Custom title");
    expect(seo.seoDescription).toBe("Custom meta");
  });
});
