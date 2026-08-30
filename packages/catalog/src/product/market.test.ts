import { describe, expect, it } from "vitest";
import { defaultMarket, isPriceAllowedForMarket } from "./market";

describe("isPriceAllowedForMarket", () => {
  it("defaults to VN / VND", () => {
    expect(defaultMarket()).toEqual({ currency: "VND", region: "VN" });
  });

  it("rejects an active USD price on the default Vietnam market", () => {
    expect(
      isPriceAllowedForMarket({ currency: "USD", region: null, isActive: true }),
    ).toBe(false);
  });

  it("accepts VND with null or VN region", () => {
    expect(isPriceAllowedForMarket({ currency: "VND", region: null, isActive: true })).toBe(true);
    expect(isPriceAllowedForMarket({ currency: "VND", region: "VN", isActive: true })).toBe(true);
  });

  it("rejects inactive prices even when currency matches", () => {
    expect(isPriceAllowedForMarket({ currency: "VND", region: null, isActive: false })).toBe(false);
  });

  it("allows USD only when market is explicitly USD", () => {
    expect(
      isPriceAllowedForMarket(
        { currency: "USD", region: null, isActive: true },
        { currency: "USD", region: null },
      ),
    ).toBe(true);
  });
});
