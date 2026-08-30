import { describe, expect, it } from "vitest";
import type { PublicProductDetail } from "@khepree/catalog";
import { getMessages } from "@/lib/i18n/get-messages";
import { resolveProductPrimaryCta } from "./product-cta";

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

describe("resolveProductPrimaryCta", () => {
  const messages = getMessages("vi");

  it("anchors to #pricing when purchasable plans exist", () => {
    const cta = resolveProductPrimaryCta(
      {
        ...baseProduct,
        plans: [
          {
            publicId: "plan1",
            slug: "pro",
            name: "Pro",
            billingType: "recurring",
            status: "active",
            features: [],
            pricingMode: "recurring",
            prices: [
              {
                publicId: "price1",
                currency: "VND",
                region: null,
                amountMinor: "99000",
                amountMinorNumber: 99000,
                interval: "month",
                isActive: true,
              },
            ],
          },
        ],
      },
      "vi",
      messages,
    );
    expect(cta.href).toBe("#pricing");
    expect(cta.label).toBe(messages.catalog.viewPlans);
  });

  it("never uses global /pricing", () => {
    const cta = resolveProductPrimaryCta(baseProduct, "vi", messages);
    expect(cta.href).not.toContain("/pricing");
  });
});
