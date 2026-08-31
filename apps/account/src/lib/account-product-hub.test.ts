import { describe, expect, it } from "vitest";
import { buildAccountProductHubActions } from "./account-product-hub";

describe("buildAccountProductHubActions", () => {
  it("shows checkout only without active entitlement", () => {
    expect(
      buildAccountProductHubActions({
        entitlementActive: false,
        pendingPayment: false,
        checkoutAvailable: true,
        hasPurchasablePlan: true,
        hasUpgradePlan: false,
        hasBillingHistory: false,
        hasDownload: false,
      }),
    ).toMatchObject({ checkout: true, upgrade: false, manageDevices: false });
  });

  it("shows upgrade when entitled and another plan exists", () => {
    expect(
      buildAccountProductHubActions({
        entitlementActive: true,
        pendingPayment: false,
        checkoutAvailable: true,
        hasPurchasablePlan: true,
        hasUpgradePlan: true,
        hasBillingHistory: true,
        hasDownload: true,
      }),
    ).toMatchObject({
      checkout: false,
      upgrade: true,
      manageDevices: true,
      manageBilling: true,
      download: true,
    });
  });

  it("hides checkout and upgrade while payment is pending", () => {
    expect(
      buildAccountProductHubActions({
        entitlementActive: false,
        pendingPayment: true,
        checkoutAvailable: false,
        hasPurchasablePlan: true,
        hasUpgradePlan: true,
        hasBillingHistory: true,
        hasDownload: false,
      }),
    ).toMatchObject({ checkout: false, upgrade: false, manageBilling: true });
  });
});
