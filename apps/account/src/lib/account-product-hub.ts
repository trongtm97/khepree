import {
  createProductService,
  createReleaseService,
  type PublicPlan,
  type PublicProductDetail,
} from "@khepree/catalog";
import { DEFAULT_CURRENCY, DEFAULT_MARKET_REGION, marketingPublicUrl } from "@khepree/config";
import { hasHonestProviderSubscription, honestAccessTermLabel } from "@khepree/commerce";
import { createDrizzleAuditService, getDb, isEntitlementActive } from "@khepree/db";
import { pickDesktopAppReturnUri } from "@khepree/desktop-auth";
import type { ResolvedEntitlement } from "@khepree/entitlement";
import { buildManageDevicesUrl } from "@khepree/licensing";
import type { createKhepreePlatform } from "@khepree/platform";
import type { SupportedLocale } from "@khepree/config";

type Platform = ReturnType<typeof createKhepreePlatform>;

export interface AccountProductHubActions {
  checkout: boolean;
  upgrade: boolean;
  manageDevices: boolean;
  manageBilling: boolean;
  download: boolean;
}

export interface AccountProductHubRelease {
  platform: string;
  version: string;
  releasePublicId: string;
  fileName: string;
}

export interface AccountProductHubView {
  product: PublicProductDetail;
  productId: string;
  entitlement: ResolvedEntitlement | null;
  entitlementActive: boolean;
  planLabel: string | null;
  accessTermLabel: string | null;
  expiresAt: string | null;
  hasActiveSubscription: boolean;
  pendingPayment: boolean;
  pendingCheckoutPublicId: string | null;
  deviceUsage: { slotsUsed: number; slotsMax: number } | null;
  features: Array<{ key: string; label: string; value: string }>;
  allowedActions: AccountProductHubActions;
  upgradeCheckoutHref: string | null;
  purchaseCheckoutHref: string | null;
  pendingCheckoutHref: string | null;
  manageDevicesUrl: string;
  billingUrl: string;
  marketingProductUrl: string;
  releases: AccountProductHubRelease[];
  desktopReturn: { displayName: string; returnUri: string } | null;
}

function formatFeatureValue(value: ResolvedEntitlement["features"][number]["value"]): string {
  if (value.valueType === "boolean") return value.booleanValue ? "Yes" : "No";
  if (value.valueType === "integer") return String(value.integerValue);
  return value.stringValue;
}

function pickPurchasableOffer(
  plans: PublicPlan[],
  currentPlanSlug: string | null,
  mode: "purchase" | "upgrade",
): { planPublicId: string; pricePublicId: string } | null {
  for (const plan of plans) {
    if (plan.status !== "active") continue;
    const price = plan.prices.find((row) => row.isActive);
    if (!price) continue;
    if (mode === "purchase" && !currentPlanSlug) {
      return { planPublicId: plan.publicId, pricePublicId: price.publicId };
    }
    if (mode === "upgrade" && currentPlanSlug && plan.slug !== currentPlanSlug) {
      return { planPublicId: plan.publicId, pricePublicId: price.publicId };
    }
  }
  return null;
}

function checkoutHref(offer: { planPublicId: string; pricePublicId: string } | null): string | null {
  if (!offer) return null;
  const params = new URLSearchParams({
    plan: offer.planPublicId,
    price: offer.pricePublicId,
  });
  return `/checkout?${params.toString()}`;
}

export function buildAccountProductHubActions(input: {
  entitlementActive: boolean;
  pendingPayment: boolean;
  checkoutAvailable: boolean;
  hasPurchasablePlan: boolean;
  hasUpgradePlan: boolean;
  hasBillingHistory: boolean;
  hasDownload: boolean;
}): AccountProductHubActions {
  return {
    checkout:
      input.checkoutAvailable &&
      input.hasPurchasablePlan &&
      !input.entitlementActive &&
      !input.pendingPayment,
    upgrade:
      input.checkoutAvailable &&
      input.hasUpgradePlan &&
      input.entitlementActive &&
      !input.pendingPayment,
    manageDevices: input.entitlementActive,
    manageBilling: input.hasBillingHistory || input.pendingPayment || input.entitlementActive,
    download: input.entitlementActive && input.hasDownload,
  };
}

export async function buildAccountProductHubView(
  platform: Platform,
  input: {
    userId: string;
    slug: string;
    locale: SupportedLocale;
    accountUrl: string;
    validatedDesktopClientId?: string;
  },
): Promise<AccountProductHubView | null> {
  const productService = createProductService();
  const [product, productId] = await Promise.all([
    productService.getPublicProductBySlug(input.slug, {
      locale: input.locale,
      market: { currency: DEFAULT_CURRENCY, region: DEFAULT_MARKET_REGION },
    }),
    productService.resolveProductIdBySlug(input.slug),
  ]);
  if (!product || !productId) return null;

  const owner = { type: "user" as const, userId: input.userId };
  const principal = { type: "USER" as const, id: input.userId };

  const [entitlementRows, billing, managedDevices, desktopClient] = await Promise.all([
    platform.entitlement.resolveEntitlementsForPrincipal(principal),
    platform.commerce.getBillingAccount(owner),
    platform.licensing.listManagedDevices(principal),
    platform.desktopAuth.findActiveClientForProduct(productId),
  ]);

  const entitlement =
    entitlementRows.find((row) => row.entitlement.productId === productId) ?? null;
  const entitlementActive =
    entitlement != null &&
    isEntitlementActive({ ...entitlement.entitlement, now: new Date() }) &&
    entitlement.entitlement.status === "active";

  const productOrders = billing.orders.filter((order) =>
    order.items.some((item) => item.productId === productId),
  );
  const pendingOrder = productOrders.find((order) => order.status === "pending_payment");
  const checkoutAvailable = !pendingOrder;
  const pendingPayment = Boolean(pendingOrder);

  const deviceProduct = managedDevices.products.find((row) => row.productId === productId);
  const purchaseOffer = pickPurchasableOffer(product.plans, entitlement?.planSlug ?? null, "purchase");
  const upgradeOffer = pickPurchasableOffer(product.plans, entitlement?.planSlug ?? null, "upgrade");

  const db = getDb();
  const releases: AccountProductHubRelease[] = [];
  if (db && entitlementActive) {
    const releaseService = createReleaseService(db, createDrizzleAuditService(db));
    const rows = await releaseService.listForProduct(productId);
    const latestByPlatform = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      if (row.status !== "published" || !row.publishedAt) continue;
      const existing = latestByPlatform.get(row.platform);
      if (!existing?.publishedAt || row.publishedAt > existing.publishedAt) {
        latestByPlatform.set(row.platform, row);
      }
    }
    for (const row of latestByPlatform.values()) {
      releases.push({
        platform: row.platform,
        version: row.version,
        releasePublicId: row.publicId,
        fileName: row.fileName,
      });
    }
  }

  const expiresAt = entitlement?.entitlement.expiresAt?.toISOString() ?? null;
  const planLabel = entitlement
    ? (product.plans.find((plan) => plan.slug === entitlement.planSlug)?.name ??
      entitlement.planSlug)
    : null;
  const billingType = entitlement?.entitlement.expiresAt ? "one_time" : "perpetual";
  const accessTermDays = entitlement?.entitlement.expiresAt
    ? Math.ceil(
        (entitlement.entitlement.expiresAt.getTime() -
          entitlement.entitlement.startsAt.getTime()) /
          86_400_000,
      )
    : null;

  const allowedActions = buildAccountProductHubActions({
    entitlementActive,
    pendingPayment,
    checkoutAvailable,
    hasPurchasablePlan: purchaseOffer != null,
    hasUpgradePlan: upgradeOffer != null,
    hasBillingHistory: productOrders.length > 0,
    hasDownload: releases.length > 0,
  });

  let desktopReturn: AccountProductHubView["desktopReturn"] = null;
  if (desktopClient) {
    const returnUri = pickDesktopAppReturnUri(desktopClient.allowedRedirectUris);
    if (returnUri) {
      if (!input.validatedDesktopClientId || input.validatedDesktopClientId === desktopClient.clientId) {
        desktopReturn = { displayName: desktopClient.displayName, returnUri };
      }
    }
  }

  const features =
    entitlement?.features.map((row) => ({
      key: row.key,
      label: row.key,
      value: formatFeatureValue(row.value),
    })) ?? [];

  return {
    product,
    productId,
    entitlement,
    entitlementActive,
    planLabel: entitlement?.planSlug ?? planLabel,
    accessTermLabel: entitlement
      ? expiresAt
        ? `Access until ${expiresAt.slice(0, 10)}`
        : honestAccessTermLabel(billingType, accessTermDays)
      : null,
    expiresAt,
    hasActiveSubscription: hasHonestProviderSubscription(billing.subscriptions, productId),
    pendingPayment,
    pendingCheckoutPublicId: pendingOrder?.publicId ?? null,
    deviceUsage: deviceProduct
      ? { slotsUsed: deviceProduct.slotsUsed, slotsMax: deviceProduct.slotsMax }
      : null,
    features,
    allowedActions,
    upgradeCheckoutHref: checkoutHref(upgradeOffer),
    purchaseCheckoutHref: checkoutHref(purchaseOffer),
    pendingCheckoutHref: pendingOrder
      ? `${input.accountUrl}/desktop/checkout/${pendingOrder.publicId}`
      : null,
    manageDevicesUrl: buildManageDevicesUrl(),
    billingUrl: "/billing",
    marketingProductUrl: `${marketingPublicUrl()}/${input.locale}/products/${product.slug}`,
    releases,
    desktopReturn,
  };
}
