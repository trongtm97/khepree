import { describe, expect, it } from "vitest";
import type { PublicProductDetail } from "@khepree/catalog";
import { hasSolutionsContent, listProductPageSections, listSolutionCards } from "./product-page-sections";

const baseProduct = {
  publicId: "p1",
  slug: "demo",
  name: "Demo",
  shortDescription: "Short",
  description: null,
  platforms: [],
  operatingSystems: [],
  status: "active" as const,
  seoTitle: null,
  seoDescription: null,
  locale: "vi",
  availableLocales: ["vi"],
  icon: null,
  gallery: [],
  startingPrice: null,
  updatedAt: new Date(),
  content: null,
  marketing: {},
  plans: [],
} satisfies PublicProductDetail;

describe("listProductPageSections", () => {
  it("always includes overview and only sections with content", () => {
    const sections = listProductPageSections({
      ...baseProduct,
      marketing: {
        highlights: [{ title: "Fast", description: "Ship quickly" }],
        faq: [{ question: "Q?", answer: "A." }],
      },
      plans: [
        {
          publicId: "plan1",
          slug: "pro",
          name: "Pro",
          billingType: "recurring",
          status: "active",
          features: [],
          pricingMode: "recurring",
          prices: [],
        },
      ],
    });

    expect(sections.map((s) => s.id)).toEqual(["overview", "features", "pricing", "faq"]);
  });
});

describe("listSolutionCards", () => {
  it("prefers solutions over benefits fallback", () => {
    const cards = listSolutionCards({
      solutions: [{ problem: "P", helps: "H", result: "R" }],
      benefits: [{ title: "B", description: "D" }],
    });
    expect(cards).toEqual([{ problem: "P", helps: "H", result: "R" }]);
  });

  it("falls back to benefits when solutions empty", () => {
    expect(hasSolutionsContent({ benefits: [{ title: "B", description: "D" }] })).toBe(true);
    expect(listSolutionCards({ benefits: [{ title: "B", description: "D" }] })).toEqual([
      { problem: "B", helps: "D", result: null },
    ]);
  });
});
