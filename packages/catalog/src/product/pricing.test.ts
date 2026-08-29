import { describe, expect, it } from "vitest";
import { selectDisplayPrice } from "./pricing";
import type { PublicPrice } from "./types";

function price(
  overrides: Partial<PublicPrice> & Pick<PublicPrice, "currency" | "amountMinorNumber">,
): PublicPrice {
  return {
    publicId: overrides.publicId ?? "price_test",
    region: overrides.region ?? null,
    amountMinor: String(overrides.amountMinorNumber),
    interval: overrides.interval ?? "month",
    isActive: overrides.isActive ?? true,
    ...overrides,
  };
}

describe("selectDisplayPrice", () => {
  const prices: PublicPrice[] = [
    price({ publicId: "p1", currency: "EUR", amountMinorNumber: 1000, region: "EU" }),
    price({ publicId: "p2", currency: "USD", amountMinorNumber: 900, region: null }),
    price({ publicId: "p3", currency: "VND", amountMinorNumber: 20000, region: "VN" }),
  ];

  it("prefers exact currency + region match", () => {
    const selected = selectDisplayPrice(prices, { currency: "EUR", region: "EU" });
    expect(selected?.publicId).toBe("p1");
  });

  it("prefers currency match without region over default currency", () => {
    const selected = selectDisplayPrice(prices, { currency: "VND", region: "US" });
    expect(selected?.publicId).toBe("p3");
  });

  it("falls back to default currency when requested currency unavailable", () => {
    const selected = selectDisplayPrice(prices, { currency: "GBP", defaultCurrency: "USD" });
    expect(selected?.publicId).toBe("p2");
  });

  it("never picks inactive prices", () => {
    const inactive = price({
      publicId: "inactive",
      currency: "USD",
      amountMinorNumber: 1,
      isActive: false,
    });
    const selected = selectDisplayPrice([inactive, ...prices], { currency: "USD" });
    expect(selected?.publicId).toBe("p2");
  });

  it("is deterministic for equal-ranked prices", () => {
    const tie: PublicPrice[] = [
      price({ publicId: "b", currency: "USD", amountMinorNumber: 100, region: null }),
      price({ publicId: "a", currency: "USD", amountMinorNumber: 200, region: null }),
    ];
    expect(selectDisplayPrice(tie, { currency: "USD" })?.publicId).toBe("a");
  });
});
