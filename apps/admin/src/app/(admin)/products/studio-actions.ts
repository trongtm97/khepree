"use server";

import { isCatalogError, suggestProductSlug } from "@khepree/catalog";
import type { LicensingMode, ProductPlatform } from "@khepree/db";
import { hasPermission, type Permission } from "@khepree/security";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionState } from "@/components/action-form";
import { requireAdmin } from "@/lib/admin-session";
import { getProductStudio, webPreviewBaseUrl } from "@/lib/product-studio";

async function actor(permission: Permission) {
  const session = await requireAdmin(permission);
  if (!hasPermission({ globalRole: session.globalRole }, permission)) {
    throw new Error("Forbidden");
  }
  return session;
}

function fail(error: unknown): ActionState {
  if (isCatalogError(error)) return { error: error.message };
  if (error instanceof Error) return { error: error.message };
  return { error: "Unexpected error" };
}

function revalidateStudio(productId: string) {
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
}

export async function createStudioProductAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  let productId: string | undefined;
  try {
    const session = await actor("catalog.write");
    const nameVi = String(formData.get("nameVi") ?? "").trim();
    const nameEn = String(formData.get("nameEn") ?? "").trim() || undefined;
    const slugRaw = String(formData.get("slug") ?? "").trim();
    const slug = slugRaw || suggestProductSlug(nameVi);
    const licensingMode = String(formData.get("licensingMode") ?? "") as LicensingMode | "";
    const platforms = formData.getAll("platforms").map(String) as ProductPlatform[];

    const row = await getProductStudio().createDraft({
      nameVi,
      nameEn,
      slug,
      licensingMode: licensingMode || undefined,
      platformCapabilities: platforms.length ? platforms : undefined,
      actorUserId: session.user.id,
    });
    productId = row.id;
  } catch (error) {
    return fail(error);
  }
  redirect(`/products/${productId}?tab=overview`);
}

export async function saveOverviewAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    const productId = String(formData.get("productId") ?? "");
    const platforms = formData.getAll("platforms").map(String) as ProductPlatform[];
    const operatingSystems = formData.getAll("operatingSystems").map(String);
    await getProductStudio().updateOverview({
      productId,
      slug: String(formData.get("slug") ?? ""),
      licensingMode: String(formData.get("licensingMode") ?? "") as LicensingMode,
      platformCapabilities: platforms,
      iconMediaPublicId: String(formData.get("iconMediaPublicId") ?? "") || null,
      operatingSystems,
      actorUserId: session.user.id,
    });
    await getProductStudio().upsertTranslation({
      productId,
      locale: "vi",
      name: String(formData.get("nameVi") ?? ""),
      shortDescription: String(formData.get("shortDescriptionVi") ?? "") || null,
      actorUserId: session.user.id,
    });
    const nameEn = String(formData.get("nameEn") ?? "").trim();
    if (nameEn) {
      await getProductStudio().upsertTranslation({
        productId,
        locale: "en",
        name: nameEn,
        shortDescription: String(formData.get("shortDescriptionEn") ?? "") || null,
        actorUserId: session.user.id,
      });
    }
    revalidateStudio(productId);
    return { notice: "Đã lưu tổng quan" };
  } catch (error) {
    return fail(error);
  }
}

export async function saveContentAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    const productId = String(formData.get("productId") ?? "");
    const locale = String(formData.get("locale") ?? "vi") as "vi" | "en";
    await getProductStudio().upsertTranslation({
      productId,
      locale,
      description: String(formData.get("description") ?? "") || null,
      content: String(formData.get("content") ?? "") || null,
      actorUserId: session.user.id,
    });
    revalidateStudio(productId);
    return { notice: "Đã lưu nội dung" };
  } catch (error) {
    return fail(error);
  }
}

export async function saveSeoAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    const productId = String(formData.get("productId") ?? "");
    for (const locale of ["vi", "en"] as const) {
      const title = String(formData.get(`seoTitle_${locale}`) ?? "").trim();
      const desc = String(formData.get(`seoDescription_${locale}`) ?? "").trim();
      if (!title && !desc) continue;
      await getProductStudio().upsertTranslation({
        productId,
        locale,
        seoTitle: title || null,
        seoDescription: desc || null,
        actorUserId: session.user.id,
      });
    }
    revalidateStudio(productId);
    return { notice: "Đã lưu SEO" };
  } catch (error) {
    return fail(error);
  }
}

export async function savePlanAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    const productId = String(formData.get("productId") ?? "");
    const accessRaw = String(formData.get("accessTermDays") ?? "").trim();
    const plan = await getProductStudio().savePlan({
      productId,
      planId: String(formData.get("planId") ?? "") || undefined,
      slug: String(formData.get("slug") ?? ""),
      billingType: String(formData.get("billingType") ?? "free") as "free" | "one_time" | "recurring" | "perpetual" | "custom",
      accessTermDays: accessRaw ? Number(accessRaw) : null,
      nameVi: String(formData.get("nameVi") ?? ""),
      nameEn: String(formData.get("nameEn") ?? "") || undefined,
      status: String(formData.get("status") ?? "draft") as "draft" | "active" | "archived",
      actorUserId: session.user.id,
    });

    const amount = String(formData.get("amount") ?? "").trim();
    if (amount) {
      await getProductStudio().savePrice({
        planId: plan.id,
        priceId: String(formData.get("priceId") ?? "") || undefined,
        currency: String(formData.get("currency") ?? "VND"),
        amountMajor: amount.replace(/\./g, ""),
        interval: String(formData.get("interval") ?? "") || null,
        isActive: String(formData.get("priceActive") ?? "1") === "1",
        actorUserId: session.user.id,
      });
    }
    revalidateStudio(productId);
    return { notice: "Đã lưu gói & giá" };
  } catch (error) {
    return fail(error);
  }
}

export async function savePlanFeatureAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    const productId = String(formData.get("productId") ?? "");
    const valueType = String(formData.get("valueType") ?? "boolean") as "boolean" | "integer" | "string";
    await getProductStudio().upsertPlanFeature({
      planId: String(formData.get("planId") ?? ""),
      featureId: String(formData.get("featureId") ?? ""),
      valueType,
      booleanValue: formData.get("booleanValue") === "on",
      integerValue: Number(formData.get("integerValue") ?? 0),
      stringValue: String(formData.get("stringValue") ?? ""),
      actorUserId: session.user.id,
    });
    revalidateStudio(productId);
    return { notice: "Đã gán tính năng" };
  } catch (error) {
    return fail(error);
  }
}

export async function createStudioFeatureAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    const productId = String(formData.get("productId") ?? "");
    await getProductStudio().createFeature({
      key: String(formData.get("key") ?? ""),
      valueType: String(formData.get("valueType") ?? "boolean") as "boolean" | "integer" | "string",
      nameVi: String(formData.get("nameVi") ?? ""),
      nameEn: String(formData.get("nameEn") ?? "") || undefined,
      actorUserId: session.user.id,
    });
    revalidateStudio(productId);
    return { notice: "Đã tạo tính năng" };
  } catch (error) {
    return fail(error);
  }
}

export async function publishProductAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    const productId = String(formData.get("productId") ?? "");
    await getProductStudio().publish(productId, session.user.id);
    revalidateStudio(productId);
    return { notice: "Đã xuất bản sản phẩm" };
  } catch (error) {
    return fail(error);
  }
}

export async function archiveStudioProductAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    const productId = String(formData.get("productId") ?? "");
    const reason = String(formData.get("reason") ?? "").trim();
    if (String(formData.get("confirm") ?? "") !== "CONFIRM") {
      return { error: "Nhập CONFIRM để lưu trữ" };
    }
    await getProductStudio().archive({ productId, reason, actorUserId: session.user.id });
    revalidateStudio(productId);
    return { notice: "Đã lưu trữ sản phẩm" };
  } catch (error) {
    return fail(error);
  }
}

export async function getPreviewUrl(productId: string): Promise<string> {
  await requireAdmin("catalog.read");
  const snapshot = await getProductStudio().getSnapshot(productId);
  if (!snapshot) throw new Error("Not found");
  return getProductStudio().previewUrl({ id: snapshot.id, slug: snapshot.slug }, webPreviewBaseUrl());
}
