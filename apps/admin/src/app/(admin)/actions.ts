"use server";

import { isIdentityError } from "@khepree/auth";
import { isCatalogError } from "@khepree/catalog";
import { isEntitlementError } from "@khepree/entitlement";
import { isLicensingError } from "@khepree/licensing";
import { isPartnerError } from "@khepree/reseller";
import { hasPermission, parseAdminReason, publicActionError, type Permission } from "@khepree/security";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/action-form";
import {
  getCatalogAdmin,
  getContentService,
  getDownloadService,
  getIdentityDirectory,
  getPlatform,
} from "@/lib/admin";
import { requireAdmin } from "@/lib/admin-session";

function isKnownActionError(error: unknown): error is { message: string } {
  return (
    isIdentityError(error) ||
    isCatalogError(error) ||
    isEntitlementError(error) ||
    isLicensingError(error) ||
    isPartnerError(error)
  );
}

function fail(error: unknown): ActionState {
  return { error: publicActionError(error, isKnownActionError) };
}

async function actor(permission: Permission) {
  const session = await requireAdmin(permission);
  return session;
}

function confirm(formData: FormData): string {
  if (String(formData.get("confirm") ?? "") !== "CONFIRM") {
    throw new Error("Type CONFIRM to proceed");
  }
  const reason = parseAdminReason(formData.get("reason"));
  if (!reason) throw new Error("Reason is required");
  return reason;
}

export async function setUserRoleAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("admin.users.write");
    const reason = confirm(formData);
    await getIdentityDirectory().setGlobalRole({
      actorUserId: session.user.id,
      actorRole: session.globalRole,
      targetUserId: String(formData.get("userId") ?? ""),
      nextRole: String(formData.get("role") ?? ""),
      reason,
    });
    revalidatePath("/users");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function setUserSuspendedAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("admin.users.write");
    const reason = confirm(formData);
    await getIdentityDirectory().setSuspended({
      actorUserId: session.user.id,
      targetUserId: String(formData.get("userId") ?? ""),
      suspended: String(formData.get("suspended") ?? "") === "1",
      reason,
    });
    revalidatePath("/users");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function revokeUserSessionAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("admin.users.write");
    const reason = confirm(formData);
    await getIdentityDirectory().revokeSession({
      actorUserId: session.user.id,
      targetUserId: String(formData.get("userId") ?? ""),
      sessionId: String(formData.get("sessionId") ?? ""),
      reason,
    });
    revalidatePath("/users");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function createProductAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    await getCatalogAdmin().createProduct({
      slug: String(formData.get("slug") ?? ""),
      nameEn: String(formData.get("nameEn") ?? ""),
      nameVi: String(formData.get("nameVi") ?? "") || undefined,
      actorUserId: session.user.id,
    });
    revalidatePath("/products");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function setProductStatusAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    await getCatalogAdmin().setProductStatus({
      productId: String(formData.get("productId") ?? ""),
      status: String(formData.get("status") ?? "retired") as "draft" | "active" | "hidden" | "retired",
      actorUserId: session.user.id,
    });
    revalidatePath("/products");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function deleteProductAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    confirm(formData);
    await getCatalogAdmin().deleteProduct({
      productId: String(formData.get("productId") ?? ""),
      actorUserId: session.user.id,
    });
    revalidatePath("/products");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function createPlanAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    await getCatalogAdmin().createPlan({
      productId: String(formData.get("productId") ?? ""),
      slug: String(formData.get("slug") ?? ""),
      billingType: String(formData.get("billingType") ?? "free") as
        | "free"
        | "one_time"
        | "recurring"
        | "perpetual"
        | "custom",
      nameEn: String(formData.get("nameEn") ?? ""),
      nameVi: String(formData.get("nameVi") ?? "") || undefined,
      actorUserId: session.user.id,
    });
    revalidatePath("/plans");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function setPlanStatusAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    await getCatalogAdmin().setPlanStatus({
      planId: String(formData.get("planId") ?? ""),
      status: String(formData.get("status") ?? "archived") as "draft" | "active" | "archived",
      actorUserId: session.user.id,
    });
    revalidatePath("/plans");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function deletePlanAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    confirm(formData);
    await getCatalogAdmin().deletePlan({
      planId: String(formData.get("planId") ?? ""),
      actorUserId: session.user.id,
    });
    revalidatePath("/plans");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function createFeatureAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    await getCatalogAdmin().createFeature({
      key: String(formData.get("key") ?? ""),
      valueType: String(formData.get("valueType") ?? "boolean") as "boolean" | "integer" | "string",
      nameEn: String(formData.get("nameEn") ?? ""),
      nameVi: String(formData.get("nameVi") ?? "") || undefined,
      actorUserId: session.user.id,
    });
    revalidatePath("/features");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function deleteFeatureAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    confirm(formData);
    await getCatalogAdmin().deleteFeature({
      featureId: String(formData.get("featureId") ?? ""),
      actorUserId: session.user.id,
    });
    revalidatePath("/features");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function createPriceAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    await getCatalogAdmin().createPrice({
      planId: String(formData.get("planId") ?? ""),
      currency: String(formData.get("currency") ?? "USD"),
      amountMinor: BigInt(String(formData.get("amountMinor") ?? "0")),
      interval: String(formData.get("interval") ?? "") || null,
      actorUserId: session.user.id,
    });
    revalidatePath("/prices");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function setPriceActiveAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    await getCatalogAdmin().setPriceActive({
      priceId: String(formData.get("priceId") ?? ""),
      isActive: String(formData.get("isActive") ?? "") === "1",
      actorUserId: session.user.id,
    });
    revalidatePath("/prices");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function deletePriceAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    confirm(formData);
    await getCatalogAdmin().deletePrice({
      priceId: String(formData.get("priceId") ?? ""),
      actorUserId: session.user.id,
    });
    revalidatePath("/prices");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function grantEntitlementAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("entitlement.admin");
    const reason = confirm(formData);
    const startsAtRaw = String(formData.get("startsAt") ?? "");
    const endsAtRaw = String(formData.get("expiresAt") ?? "");
    const result = await getPlatform().entitlement.grantComplimentary({
      principal: {
        type: String(formData.get("principalType") ?? "USER") === "ORGANIZATION" ? "ORGANIZATION" : "USER",
        id: String(formData.get("principalId") ?? ""),
      },
      productId: String(formData.get("productId") ?? ""),
      planId: String(formData.get("planId") ?? ""),
      source: String(formData.get("source") ?? "complimentary") === "admin_grant" ? "admin_grant" : "complimentary",
      reason,
      actorUserId: session.user.id,
      startsAt: startsAtRaw ? new Date(startsAtRaw) : undefined,
      expiresAt: endsAtRaw ? new Date(endsAtRaw) : null,
    });
    revalidatePath("/entitlements");
    revalidatePath("/users");
    return {
      notice: result.licenseKey
        ? `Granted. New license key (shown once): ${result.licenseKey}`
        : "Granted.",
    };
  } catch (error) {
    return fail(error);
  }
}

export async function revokeEntitlementAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("entitlement.admin");
    const reason = confirm(formData);
    await getPlatform().entitlement.revokeEntitlement({
      entitlementId: String(formData.get("entitlementId") ?? ""),
      actorUserId: session.user.id,
      reason,
    });
    revalidatePath("/entitlements");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function suspendEntitlementAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("entitlement.admin");
    const reason = confirm(formData);
    await getPlatform().entitlement.suspendEntitlement({
      entitlementId: String(formData.get("entitlementId") ?? ""),
      actorUserId: session.user.id,
      reason,
    });
    revalidatePath("/entitlements");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function reissueLicenseAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("entitlement.admin");
    const reason = confirm(formData);
    const result = await getPlatform().entitlement.reissueLicense({
      entitlementId: String(formData.get("entitlementId") ?? ""),
      actorUserId: session.user.id,
      reason,
    });
    revalidatePath("/licenses");
    return { notice: result.licenseKey ? `Reissued (shown once): ${result.licenseKey}` : "Reissued." };
  } catch (error) {
    return fail(error);
  }
}

export async function blockDeviceAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("entitlement.admin");
    confirm(formData);
    await getPlatform().licensing.blockDevice(String(formData.get("devicePublicId") ?? ""), session.user.id);
    revalidatePath("/devices");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function setPartnerStatusAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("partner.admin");
    confirm(formData);
    await getPlatform().partner.setPartnerStatus({
      partnerId: String(formData.get("partnerId") ?? ""),
      status: String(formData.get("status") ?? "pending") as "pending" | "active" | "suspended" | "rejected",
      actorUserId: session.user.id,
    });
    revalidatePath("/partners");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function setPartnerTierAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("partner.admin");
    await getPlatform().partner.setPartnerTier({
      partnerId: String(formData.get("partnerId") ?? ""),
      tierId: String(formData.get("tierId") ?? "") || null,
      actorUserId: session.user.id,
    });
    revalidatePath("/partners");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function setPartnerPriceAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("partner.admin");
    await getPlatform().partner.setPartnerPrice({
      partnerId: String(formData.get("partnerId") ?? ""),
      planId: String(formData.get("planId") ?? ""),
      amountMinor: BigInt(String(formData.get("amountMinor") ?? "0")),
      currency: String(formData.get("currency") ?? "USD"),
      actorUserId: session.user.id,
    });
    revalidatePath("/partners");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function adjustWalletAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("finance.write");
    const reason = confirm(formData);
    await getPlatform().partner.postLedger({
      partnerId: String(formData.get("partnerId") ?? ""),
      type: "ADJUSTMENT",
      amountMinor: BigInt(String(formData.get("amountMinor") ?? "0")),
      idempotencyKey: String(formData.get("idempotencyKey") ?? crypto.randomUUID()),
      privileged: true,
      actorUserId: session.user.id,
      reason,
      adjustmentNegative: String(formData.get("negative") ?? "") === "1",
    });
    revalidatePath("/partners");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function commissionAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("finance.write");
    const id = String(formData.get("commissionId") ?? "");
    const op = String(formData.get("op") ?? "");
    const partner = getPlatform().partner;
    if (op === "approve") await partner.approveCommission({ commissionId: id, actorUserId: session.user.id });
    else if (op === "release") await partner.releaseCommission({ commissionId: id, actorUserId: session.user.id });
    else if (op === "pay") await partner.payCommission({ commissionId: id, actorUserId: session.user.id });
    else throw new Error("Unknown commission action");
    revalidatePath("/commissions");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function createDraftAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await actor("content.write");
    const slug = String(formData.get("slug") ?? "").trim();
    const title = String(formData.get("title") ?? "").trim();
    if (!slug || !title) throw new Error("Slug and title are required");
    await getContentService().createDraft({
      slug,
      contentType: String(formData.get("contentType") ?? "article") as
        | "page"
        | "article"
        | "doc"
        | "product_page"
        | "legal",
      locale: String(formData.get("locale") ?? "en").trim() || "en",
      title,
      excerpt: String(formData.get("excerpt") ?? "") || null,
      body: String(formData.get("body") ?? "") || null,
    });
    revalidatePath("/content");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function publishDraftAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await actor("content.write");
    await getContentService().publish(String(formData.get("versionId") ?? ""));
    revalidatePath("/content");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function archiveDraftAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await actor("content.write");
    await getContentService().archive(String(formData.get("versionId") ?? ""));
    revalidatePath("/content");
    return {};
  } catch (error) {
    return fail(error);
  }
}

export async function signDownloadAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await requireAdmin();
    if (
      !hasPermission({ globalRole: session.globalRole }, "content.read") &&
      !hasPermission({ globalRole: session.globalRole }, "content.write")
    ) {
      throw new Error("Forbidden");
    }
    const result = await getDownloadService().authorizePrivateDownload({
      mediaPublicId: String(formData.get("mediaPublicId") ?? ""),
      context: {
        purpose: "admin",
        actorUserId: session.user.id,
        adminAuthorized: true,
      },
    });
    return { notice: `Signed URL (expires ${result.expiresAt.toISOString()}): ${result.url}` };
  } catch (error) {
    return fail(error);
  }
}
