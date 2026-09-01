import { honestAccessTermLabel } from "@khepree/commerce";
import type { PublicPlan } from "@khepree/catalog";
import type { DesktopPurchasablePlan } from "@khepree/sdk";

export function buildDesktopPurchasablePlans(input: {
  plans: PublicPlan[];
  currentPlanSlug: string | null;
  entitlementActive: boolean;
}): DesktopPurchasablePlan[] {
  const result: DesktopPurchasablePlan[] = [];

  for (const plan of input.plans) {
    if (plan.status !== "active") continue;
    const price = plan.prices.find((row) => row.isActive);
    if (!price) continue;

    const isCurrent =
      input.currentPlanSlug != null && plan.slug === input.currentPlanSlug;
    const isUpgradeAvailable = input.entitlementActive ? !isCurrent : true;
    const billingType =
      plan.billingType === "recurring"
        ? "recurring"
        : plan.billingType === "perpetual"
          ? "perpetual"
          : "one_time";

    result.push({
      planPublicId: plan.publicId,
      pricePublicId: price.publicId,
      planSlug: plan.slug,
      name: plan.name,
      priceAmount: price.amountMinorNumber,
      currency: price.currency,
      accessTermLabel: honestAccessTermLabel(billingType, null),
      isCurrent,
      isUpgradeAvailable,
    });
  }

  return result;
}
