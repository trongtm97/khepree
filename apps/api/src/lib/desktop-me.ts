import { accountPublicUrl } from "@khepree/config";
import {
  hasHonestProviderSubscription,
  honestAccessTermLabel,
  resolveDesktopCheckoutStatus,
} from "@khepree/commerce";
import { isEntitlementActive } from "@khepree/db";
import type { DesktopClientRecord, DesktopSessionRecord } from "@khepree/desktop-auth";
import type { createKhepreePlatform } from "@khepree/platform";
import type {
  DesktopAllowedActions,
  DesktopClient,
  DesktopDeviceUsage,
  DesktopMeResponse,
  DesktopMeUrls,
  DesktopPlanSummary,
} from "@khepree/sdk";
import { buildManageDevicesUrl } from "@khepree/licensing";

type Platform = ReturnType<typeof createKhepreePlatform>;

export async function buildDesktopMeResponse(
  platform: Platform,
  input: {
    session: DesktopSessionRecord;
    client: DesktopClientRecord;
  },
): Promise<DesktopMeResponse> {
  const principal = { type: "USER" as const, id: input.session.userId };
  const owner = { type: "user" as const, userId: input.session.userId };
  const accountUrl = accountPublicUrl();

  const [user, productSlug, entitlementRows, billing, managedDevices] = await Promise.all([
    platform.desktopAuth.findUserById(input.session.userId),
    platform.desktopAuth.findProductSlug(input.client.productId),
    platform.entitlement.resolveEntitlementsForPrincipal(principal),
    platform.commerce.getBillingAccount(owner),
    platform.licensing.listManagedDevices(principal, {
      currentDevicePublicId: undefined,
    }),
  ]);

  const entitlementRow = entitlementRows.find(
    (row) => row.entitlement.productId === input.client.productId,
  );
  const productDevices = managedDevices.products.find(
    (row) => row.productId === input.client.productId,
  );

  const pendingOrder = billing.orders.find(
    (order) =>
      order.status === "pending_payment" &&
      order.items.some((item) => item.productId === input.client.productId),
  );

  let device: DesktopMeResponse["device"] = null;
  if (input.session.deviceId) {
    const record = await platform.licensing.getDeviceById(input.session.deviceId);
    if (record) {
      device = {
        devicePublicId: record.publicId,
        platform: record.platform,
        name: record.name,
        status: record.status,
        lastSeenAt: record.lastSeenAt.toISOString(),
      };
    }
  }

  const entitlementActive =
    entitlementRow &&
    isEntitlementActive({ ...entitlementRow.entitlement, now: new Date() }) &&
    entitlementRow.entitlement.status === "active";

  const checkoutAvailable = !pendingOrder;
  const hasSubscription = hasHonestProviderSubscription(
    billing.subscriptions,
    input.client.productId,
  );

  const plan = await buildPlanSummary(platform, entitlementRow, pendingOrder?.items[0]);
  const deviceUsage = buildDeviceUsage(productDevices);
  const urls = buildUrls(accountUrl, pendingOrder?.publicId, device?.devicePublicId);
  const allowedActions = buildAllowedActions({
    checkoutAvailable,
    entitlementActive: Boolean(entitlementActive),
    pendingPayment: Boolean(pendingOrder),
  });

  const client: DesktopClient = {
    clientId: input.client.clientId,
    displayName: input.client.displayName,
    productSlug,
    status: input.client.status,
  };

  return {
    sessionPublicId: input.session.publicId,
    user: {
      publicId: input.session.userId,
      email: user?.email ?? "",
      name: user?.name ?? "",
    },
    client,
    product: {
      productId: input.client.productId,
      slug: productSlug,
    },
    entitlement: entitlementRow
      ? {
          entitlementPublicId: entitlementRow.entitlement.publicId,
          productSlug: entitlementRow.productSlug,
          planSlug: entitlementRow.planSlug,
          status: entitlementRow.entitlement.status,
          expiresAt: entitlementRow.entitlement.expiresAt?.toISOString() ?? null,
          features: entitlementRow.features.map((row) => ({ key: row.key, value: row.value })),
        }
      : null,
    plan,
    device,
    deviceUsage,
    billing: {
      hasActiveSubscription: hasSubscription,
      checkoutAvailable,
      pendingPayment: Boolean(pendingOrder),
      accessTermLabel: plan?.accessTermLabel ?? null,
    },
    allowedActions,
    urls,
    pendingCheckoutPublicId: pendingOrder?.publicId ?? null,
  };
}

async function buildPlanSummary(
  _platform: Platform,
  entitlementRow:
    | Awaited<ReturnType<Platform["entitlement"]["resolveEntitlementsForPrincipal"]>>[number]
    | undefined,
  pendingItem?: {
    planNameSnapshot: string;
    billingIntervalSnapshot: string | null;
    accessTermDaysSnapshot: number | null;
    planId: string;
  },
): Promise<DesktopPlanSummary | null> {
  if (entitlementRow) {
    const expiresAt = entitlementRow.entitlement.expiresAt;
    return {
      planPublicId: entitlementRow.entitlement.planId,
      planSlug: entitlementRow.planSlug,
      name: entitlementRow.planSlug ?? "Current plan",
      billingType: expiresAt ? "one_time" : "perpetual",
      accessTermDays: expiresAt
        ? Math.ceil((expiresAt.getTime() - entitlementRow.entitlement.startsAt.getTime()) / 86_400_000)
        : null,
      accessTermLabel: expiresAt
        ? `Access until ${expiresAt.toISOString().slice(0, 10)}`
        : honestAccessTermLabel("perpetual", null),
    };
  }
  if (!pendingItem) return null;
  const billingType = pendingItem.billingIntervalSnapshot ? "recurring" : "one_time";
  return {
    planPublicId: pendingItem.planId,
    planSlug: null,
    name: pendingItem.planNameSnapshot,
    billingType,
    accessTermDays: pendingItem.accessTermDaysSnapshot,
    accessTermLabel: honestAccessTermLabel(
      billingType as "one_time" | "recurring" | "perpetual",
      pendingItem.accessTermDaysSnapshot,
    ),
  };
}

function buildDeviceUsage(
  productDevices: { slotsUsed: number; slotsMax: number } | undefined,
): DesktopDeviceUsage | null {
  if (!productDevices) return null;
  return {
    slotsUsed: productDevices.slotsUsed,
    slotsMax: productDevices.slotsMax,
    manageDevicesUrl: buildManageDevicesUrl(),
  };
}

function buildUrls(
  accountUrl: string,
  pendingCheckoutPublicId?: string,
  currentDevicePublicId?: string,
): DesktopMeUrls {
  return {
    manageDevices: buildManageDevicesUrl(currentDevicePublicId),
    accountBilling: `${accountUrl}/billing`,
    checkout: pendingCheckoutPublicId
      ? `${accountUrl}/desktop/checkout/${pendingCheckoutPublicId}`
      : undefined,
  };
}

function buildAllowedActions(input: {
  checkoutAvailable: boolean;
  entitlementActive: boolean;
  pendingPayment: boolean;
}): DesktopAllowedActions {
  return {
    checkout: input.checkoutAvailable && !input.entitlementActive && !input.pendingPayment,
    upgrade: input.checkoutAvailable && input.entitlementActive && !input.pendingPayment,
    manageDevices: input.entitlementActive,
    refreshEntitlement: true,
  };
}

export async function resolveDesktopCheckoutStatusForOrder(
  platform: Platform,
  input: {
    userId: string;
    orderPublicId: string;
    productId: string;
  },
) {
  const owner = { type: "user" as const, userId: input.userId };
  const session = await platform.commerce.getCheckoutSession(input.orderPublicId, owner);
  if (!session) return null;

  const entitlements = await platform.entitlement.resolveEntitlementsForPrincipal({
    type: "USER",
    id: input.userId,
  });
  const entitlement = entitlements.find((row) => row.entitlement.productId === input.productId);

  return resolveDesktopCheckoutStatus({
    orderStatus: session.order.status,
    productId: input.productId,
    entitlement: entitlement
      ? {
          productId: entitlement.entitlement.productId,
          status: entitlement.entitlement.status,
          planId: entitlement.entitlement.planId,
        }
      : null,
  });
}

export function buildDesktopCheckoutHandoffUrl(
  orderPublicId: string,
  clientId: string,
): string {
  const accountUrl = accountPublicUrl();
  const url = new URL(`/desktop/checkout/${orderPublicId}`, accountUrl);
  url.searchParams.set("clientId", clientId);
  return url.toString();
}
