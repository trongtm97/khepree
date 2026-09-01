import { describe, expect, it } from "vitest";
import { buildDesktopPurchasablePlans } from "./desktop-plans";
import type { PublicPlan } from "@khepree/catalog";

function plan(overrides: Partial<PublicPlan> & Pick<PublicPlan, "publicId" | "slug" | "name">): PublicPlan {
  return {
    billingType: "one_time",
    status: "active",
    features: [],
    pricingMode: "one_time",
    prices: [
      {
        publicId: `price_${overrides.slug}`,
        currency: "VND",
        region: null,
        amountMinor: "9900000",
        amountMinorNumber: 99_000,
        interval: null,
        isActive: true,
      },
    ],
    ...overrides,
  };
}

describe("buildDesktopPurchasablePlans", () => {
  it("returns active plans with composite ids for checkout", () => {
    const plans = buildDesktopPurchasablePlans({
      plans: [
        plan({ publicId: "plan_trial", slug: "free-trial", name: "Free Trial" }),
        plan({ publicId: "plan_month", slug: "monthly", name: "1 Tháng" }),
      ],
      currentPlanSlug: null,
      entitlementActive: false,
    });

    expect(plans).toHaveLength(2);
    expect(plans[0]?.planPublicId).toBe("plan_trial");
    expect(plans[0]?.isUpgradeAvailable).toBe(true);
    expect(plans[0]?.isCurrent).toBe(false);
  });

  it("marks current plan when entitlement is active", () => {
    const plans = buildDesktopPurchasablePlans({
      plans: [
        plan({ publicId: "plan_month", slug: "monthly", name: "1 Tháng" }),
        plan({ publicId: "plan_year", slug: "yearly", name: "1 Năm" }),
      ],
      currentPlanSlug: "monthly",
      entitlementActive: true,
    });

    const current = plans.find((row) => row.isCurrent);
    expect(current?.planSlug).toBe("monthly");
    expect(plans.find((row) => row.planSlug === "yearly")?.isUpgradeAvailable).toBe(true);
  });
});
