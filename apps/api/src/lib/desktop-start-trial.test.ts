import { describe, expect, it, vi } from "vitest";
import { LicensingError } from "@khepree/licensing";
import {
  isEligibleForFreeTrial,
  isEntitlementMissingError,
  pickFreeTrialPlan,
  tryGrantFreeTrialOnce,
} from "./desktop-start-trial";

describe("isEligibleForFreeTrial", () => {
  it("allows when product never entitled", () => {
    expect(isEligibleForFreeTrial([{ productId: "other" }], "prod-1")).toBe(true);
    expect(isEligibleForFreeTrial([], "prod-1")).toBe(true);
  });

  it("blocks when any prior entitlement exists for product", () => {
    expect(isEligibleForFreeTrial([{ productId: "prod-1" }], "prod-1")).toBe(false);
  });
});

describe("pickFreeTrialPlan", () => {
  it("prefers slug trial among active free plans", () => {
    const picked = pickFreeTrialPlan([
      { id: "a", slug: "promo", billingType: "free", status: "active" },
      { id: "b", slug: "trial", billingType: "free", status: "active" },
      { id: "c", slug: "month", billingType: "one_time", status: "active" },
    ]);
    expect(picked?.id).toBe("b");
  });

  it("falls back to first active free plan", () => {
    const picked = pickFreeTrialPlan([
      { id: "a", slug: "promo", billingType: "free", status: "active" },
    ]);
    expect(picked?.id).toBe("a");
  });

  it("returns null when no free active plan", () => {
    expect(
      pickFreeTrialPlan([{ id: "m", slug: "month", billingType: "one_time", status: "active" }]),
    ).toBeNull();
  });
});

describe("isEntitlementMissingError", () => {
  it("detects licensing ENTITLEMENT_MISSING", () => {
    expect(isEntitlementMissingError(new LicensingError("ENTITLEMENT_MISSING", "x"))).toBe(true);
    expect(isEntitlementMissingError(new LicensingError("DEVICE_BLOCKED", "x"))).toBe(false);
    expect(isEntitlementMissingError(new Error("ENTITLEMENT_MISSING"))).toBe(false);
  });
});

describe("tryGrantFreeTrialOnce", () => {
  it("grants trial for fresh user", async () => {
    const grantEntitlement = vi.fn().mockResolvedValue({});
    const entitlement = {
      resolveEntitlementsForPrincipal: vi.fn().mockResolvedValue([]),
      grantEntitlement,
    };
    const db = {
      select: () => ({
        from: () => ({
          where: async () => [
            { id: "plan-trial", slug: "trial", billingType: "free", status: "active" },
          ],
        }),
      }),
    };

    const granted = await tryGrantFreeTrialOnce({
      entitlement: entitlement as never,
      principal: { type: "USER", id: "user-1" },
      productId: "prod-1",
      db: db as never,
    });

    expect(granted).toBe(true);
    expect(grantEntitlement).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "prod-1",
        planId: "plan-trial",
        source: "trial",
      }),
    );
  });

  it("does not grant when user already had entitlement", async () => {
    const grantEntitlement = vi.fn();
    const entitlement = {
      resolveEntitlementsForPrincipal: vi.fn().mockResolvedValue([
        { entitlement: { productId: "prod-1", status: "expired" } },
      ]),
      grantEntitlement,
    };

    const granted = await tryGrantFreeTrialOnce({
      entitlement: entitlement as never,
      principal: { type: "USER", id: "user-1" },
      productId: "prod-1",
      db: { select: () => ({ from: () => ({ where: async () => [] }) }) } as never,
    });

    expect(granted).toBe(false);
    expect(grantEntitlement).not.toHaveBeenCalled();
  });

  it("does not grant when product has no free plan", async () => {
    const grantEntitlement = vi.fn();
    const entitlement = {
      resolveEntitlementsForPrincipal: vi.fn().mockResolvedValue([]),
      grantEntitlement,
    };
    const db = {
      select: () => ({
        from: () => ({
          where: async () => [],
        }),
      }),
    };

    const granted = await tryGrantFreeTrialOnce({
      entitlement: entitlement as never,
      principal: { type: "USER", id: "user-1" },
      productId: "prod-1",
      db: db as never,
    });

    expect(granted).toBe(false);
    expect(grantEntitlement).not.toHaveBeenCalled();
  });
});
