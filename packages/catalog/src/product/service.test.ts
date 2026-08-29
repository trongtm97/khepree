import { describe, expect, it } from "vitest";
import { PlanFeatureSet, mapPlanFeatureRow } from "./features";
import {
  formatPriceAmount,
  resolvePricingDisplayMode,
  selectDisplayPrice,
} from "./pricing";
import { parseProductMarketingMetadata } from "./metadata";

describe("PlanFeatureSet", () => {
  const features = [
    mapPlanFeatureRow({
      key: "api_access",
      name: "API access",
      valueType: "boolean",
      booleanValue: true,
      integerValue: null,
      stringValue: null,
    }),
    mapPlanFeatureRow({
      key: "team_members",
      name: "Team members",
      valueType: "integer",
      booleanValue: null,
      integerValue: 5,
      stringValue: null,
    }),
  ];

  it("checks boolean features", () => {
    const set = PlanFeatureSet.fromPublicFeatures(features);
    expect(set.hasFeature("api_access")).toBe(true);
    expect(set.hasFeature("missing")).toBe(false);
  });

  it("returns integer limits", () => {
    const set = PlanFeatureSet.fromPublicFeatures(features);
    expect(set.getFeatureLimit("team_members")).toBe(5);
    expect(set.getFeatureLimit("api_access")).toBeNull();
  });
});

describe("pricing helpers", () => {
  it("maps billing types to display modes", () => {
    expect(resolvePricingDisplayMode("free")).toBe("free");
    expect(resolvePricingDisplayMode("custom")).toBe("contact_sales");
  });

  it("formats USD and VND minor amounts", () => {
    expect(formatPriceAmount(999, "USD", "en")).toContain("9.99");
    expect(formatPriceAmount(99000, "VND", "vi")).toMatch(/99/);
  });

  it("prefers currency and region specific prices", () => {
    const selected = selectDisplayPrice(
      [
        {
          publicId: "price_us",
          currency: "USD",
          region: "US",
          amountMinor: 1000,
          interval: "month",
          isActive: true,
        },
        {
          publicId: "price_global",
          currency: "USD",
          region: null,
          amountMinor: 1200,
          interval: "month",
          isActive: true,
        },
      ],
      { currency: "USD", region: "US" },
    );

    expect(selected?.publicId).toBe("price_us");
  });
});

describe("parseProductMarketingMetadata", () => {
  it("extracts structured marketing sections", () => {
    const marketing = parseProductMarketingMetadata({
      marketing: {
        benefits: [{ title: "Fast", description: "Ship quickly" }],
        faq: [{ question: "Is this real?", answer: "Dev sample only." }],
      },
    });

    expect(marketing.benefits?.[0]?.title).toBe("Fast");
    expect(marketing.faq?.[0]?.question).toBe("Is this real?");
  });
});
