import { describe, expect, it } from "vitest";
import { resolveDesktopCheckoutStatus } from "./desktop-checkout";

describe("resolveDesktopCheckoutStatus", () => {
  const productId = "prod-1";

  it("maps pending payment to PENDING", () => {
    expect(
      resolveDesktopCheckoutStatus({
        orderStatus: "pending_payment",
        productId,
        entitlement: null,
      }),
    ).toBe("PENDING");
  });

  it("maps paid without entitlement to PAID_PROCESSING_ACCESS", () => {
    expect(
      resolveDesktopCheckoutStatus({
        orderStatus: "paid",
        productId,
        entitlement: null,
      }),
    ).toBe("PAID_PROCESSING_ACCESS");
  });

  it("maps paid with active entitlement to ACCESS_ACTIVE", () => {
    expect(
      resolveDesktopCheckoutStatus({
        orderStatus: "paid",
        productId,
        entitlement: { productId, status: "active", planId: "plan-1" },
      }),
    ).toBe("ACCESS_ACTIVE");
  });

  it("maps cancelled orders to CANCELLED", () => {
    expect(
      resolveDesktopCheckoutStatus({
        orderStatus: "cancelled",
        productId,
        entitlement: null,
      }),
    ).toBe("CANCELLED");
  });

  it("maps voided/refunded to FAILED", () => {
    expect(
      resolveDesktopCheckoutStatus({
        orderStatus: "voided",
        productId,
        entitlement: { productId, status: "suspended", planId: "plan-1" },
      }),
    ).toBe("FAILED");
  });
});
