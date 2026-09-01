"use server";

import {
  isCatalogError,
  suggestProductSlug,
  type AccessTermKind,
  type ProductCategory,
  type ProductType,
} from "@khepree/catalog";
import type { LicensingMode, ProductPlatform } from "@khepree/db";
import { hasPermission, type Permission } from "@khepree/security";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/action-form";
import { requireAdmin } from "@/lib/admin-session";
import { getProductStudio, webPreviewBaseUrl } from "@/lib/product-studio";
import { revalidateMarketingProduct } from "@/lib/revalidate-marketing";

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

export async function createEmptyStudioProductAction(): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    const row = await getProductStudio().createEmptyDraft(session.user.id);
    return { redirectTo: `/products/${row.id}` };
  } catch (error) {
    return fail(error);
  }
}

function readLocaleField(formData: FormData, field: string, locale: "vi" | "en") {
  return String(formData.get(`${field}_${locale}`) ?? "").trim();
}

function parsePlansFromForm(formData: FormData) {
  const count = Number(formData.get("planCount") ?? 0);
  const plans = [];
  for (let index = 0; index < count; index += 1) {
    const nameVi = String(formData.get(`plan_${index}_nameVi`) ?? "").trim();
    const remove = String(formData.get(`plan_${index}_remove`) ?? "") === "1";
    if (!nameVi && !remove) continue;
    plans.push({
      planId: String(formData.get(`plan_${index}_id`) ?? "") || undefined,
      slug: String(formData.get(`plan_${index}_slug`) ?? "") || undefined,
      internalPlanCode: String(formData.get(`plan_${index}_internalCode`) ?? "") || undefined,
      nameVi,
      amountMajor: String(formData.get(`plan_${index}_amount`) ?? "0"),
      termKind: String(formData.get(`plan_${index}_termKind`) ?? "month") as AccessTermKind,
      termCount: Number(formData.get(`plan_${index}_termCount`) ?? 1),
      accountRequired: String(formData.get(`plan_${index}_accountRequired`) ?? "") === "on",
      deviceLimit: Number(formData.get(`plan_${index}_deviceLimit`) ?? 1),
      useDefaultDevicePolicy: String(formData.get(`plan_${index}_useDefaultDevicePolicy`) ?? "on") === "on",
      selfServiceDeviceRemoval: String(formData.get(`plan_${index}_selfServiceRemoval`) ?? "on") === "on",
      deviceTransferMax: Number(formData.get(`plan_${index}_transferMax`) ?? 5),
      deviceTransferWindowDays: Number(formData.get(`plan_${index}_transferWindow`) ?? 30),
      recommended: String(formData.get("recommendedPlan") ?? "") === String(index),
      remove,
    });
  }
  return plans;
}

function parseGalleryFromForm(formData: FormData): string[] {
  const count = Number(formData.get("galleryMediaPublicId_count") ?? 0);
  const ids: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const id = String(formData.get(`galleryMediaPublicId_${i}`) ?? "").trim();
    if (id) ids.push(id);
  }
  return ids;
}

export async function saveStudioDraftAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    const productId = String(formData.get("productId") ?? "");
    const categoryRaw = String(formData.get("productCategory") ?? "").trim();
    const typeRaw = String(formData.get("productType") ?? "").trim();

    const seoTitleVi =
      String(formData.get("seoTitle_vi_input") ?? "").trim() || readLocaleField(formData, "seoTitle", "vi") || null;
    const seoDescVi =
      String(formData.get("seoDescription_vi_input") ?? "").trim() ||
      readLocaleField(formData, "seoDescription", "vi") ||
      null;
    const seoTitleEn =
      String(formData.get("seoTitle_en_input") ?? "").trim() || readLocaleField(formData, "seoTitle", "en") || null;
    const seoDescEn =
      String(formData.get("seoDescription_en_input") ?? "").trim() ||
      readLocaleField(formData, "seoDescription", "en") ||
      null;

    const result = await getProductStudio().saveStudioDraft({
      productId,
      actorUserId: session.user.id,
      slug: String(formData.get("slug") ?? "").trim() || undefined,
      productCode: String(formData.get("productCode") ?? "").trim() || undefined,
      accessFeatureKey: String(formData.get("accessFeatureKey") ?? "").trim() || undefined,
      desktopClientId: String(formData.get("desktopClientId") ?? "").trim() || undefined,
      desktopProtocol: String(formData.get("desktopProtocol") ?? "").trim() || undefined,
      licensingMode: (String(formData.get("licensingMode") ?? "") || undefined) as LicensingMode | undefined,
      productCategory: (categoryRaw || null) as ProductCategory | null,
      productType: (typeRaw || null) as ProductType | null,
      iconMediaPublicId: String(formData.get("iconMediaPublicId") ?? "") || null,
      coverMediaPublicId: String(formData.get("coverMediaPublicId") ?? "") || null,
      galleryMediaPublicIds: parseGalleryFromForm(formData),
      autoSlugFromName: String(formData.get("autoSlug") ?? "") === "1",
      autoSeo: String(formData.get("autoSeo") ?? "") === "1",
      translations: [
        {
          locale: "vi",
          name: readLocaleField(formData, "name", "vi"),
          shortDescription: readLocaleField(formData, "shortDescription", "vi") || null,
          fullDescription: readLocaleField(formData, "fullDescription", "vi") || null,
          seoTitle: seoTitleVi,
          seoDescription: seoDescVi,
        },
        {
          locale: "en",
          name: readLocaleField(formData, "name", "en") || readLocaleField(formData, "name", "vi"),
          shortDescription: readLocaleField(formData, "shortDescription", "en") || null,
          fullDescription: readLocaleField(formData, "fullDescription", "en") || null,
          seoTitle: seoTitleEn,
          seoDescription: seoDescEn,
        },
      ],
      plans: parsePlansFromForm(formData),
    });

    revalidateStudio(productId);
    if (!result.ok) {
      return { error: result.errors.join(" · ") };
    }
    const notice = result.warnings.length
      ? `Đã lưu nháp. Lưu ý: ${result.warnings.join(" · ")}`
      : "Đã lưu nháp";
    return { notice };
  } catch (error) {
    return fail(error);
  }
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
  return { redirectTo: `/products/${productId}` };
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

function readIndexedRows(
  formData: FormData,
  prefix: string,
  fields: string[],
  max: number,
): Array<Record<string, string>> {
  const rows: Array<Record<string, string>> = [];
  for (let index = 0; index < max; index += 1) {
    const row: Record<string, string> = {};
    for (const field of fields) {
      row[field] = String(formData.get(`${prefix}_${index}_${field}`) ?? "").trim();
    }
    if (Object.values(row).some(Boolean)) rows.push(row);
  }
  return rows;
}

export async function saveMarketingAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    const productId = String(formData.get("productId") ?? "");
    const snapshot = await getProductStudio().getSnapshot(productId);
    if (!snapshot) return { error: "Không tìm thấy sản phẩm" };

    const existing =
      snapshot.metadata.marketing && typeof snapshot.metadata.marketing === "object"
        ? (snapshot.metadata.marketing as Record<string, unknown>)
        : {};

    const solutions = readIndexedRows(formData, "solution", ["problem", "helps", "result"], 4)
      .filter((row) => row.problem && row.helps)
      .map((row) => ({ problem: row.problem, helps: row.helps, result: row.result ?? "" }));

    const highlights = readIndexedRows(formData, "highlight", ["title", "description"], 6)
      .filter((row) => row.title && row.description)
      .map((row) => ({ title: row.title, description: row.description }));

    const relatedContent = readIndexedRows(formData, "related", ["title", "href"], 6)
      .filter((row) => row.title && row.href)
      .map((row) => ({ title: row.title, href: row.href }));

    const faq = readIndexedRows(formData, "faq", ["question", "answer"], 6)
      .filter((row) => row.question && row.answer)
      .map((row) => ({ question: row.question, answer: row.answer }));

    const ctaHeadline = String(formData.get("cta_headline") ?? "").trim();
    const ctaButtonLabel = String(formData.get("cta_buttonLabel") ?? "").trim();
    const ctaButtonHref = String(formData.get("cta_buttonHref") ?? "").trim();
    const ctaDescription = String(formData.get("cta_description") ?? "").trim();

    const marketing: Record<string, unknown> = { ...existing };
    if (solutions.length) marketing.solutions = solutions;
    else delete marketing.solutions;
    if (highlights.length) marketing.highlights = highlights;
    else delete marketing.highlights;
    if (relatedContent.length) marketing.relatedContent = relatedContent;
    else delete marketing.relatedContent;
    if (faq.length) marketing.faq = faq;
    else delete marketing.faq;
    if (ctaHeadline && ctaButtonLabel && ctaButtonHref) {
      marketing.cta = {
        headline: ctaHeadline,
        ...(ctaDescription ? { description: ctaDescription } : {}),
        buttonLabel: ctaButtonLabel,
        buttonHref: ctaButtonHref,
      };
    } else {
      delete marketing.cta;
    }

    await getProductStudio().updateMarketingMetadata({
      productId,
      marketing,
      actorUserId: session.user.id,
    });
    revalidateStudio(productId);
    return { notice: "Đã lưu trang thương mại" };
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
    const snapshot = await getProductStudio().getSnapshot(productId);
    await getProductStudio().publish(productId, session.user.id);
    revalidateStudio(productId);
    if (snapshot?.slug) {
      await revalidateMarketingProduct(snapshot.slug);
    }
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
    const snapshot = await getProductStudio().getSnapshot(productId);
    await getProductStudio().archive({ productId, reason, actorUserId: session.user.id });
    revalidateStudio(productId);
    if (snapshot?.slug) {
      await revalidateMarketingProduct(snapshot.slug);
    }
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
