import type { ProductPlatform } from "@khepree/db";
import { isPurchasableBillingType } from "../types";
import type { ProductStudioSnapshot, ReadinessItem, ReadinessResult } from "./types";

function translation(snapshot: ProductStudioSnapshot, locale: string) {
  return snapshot.translations.find((row) => row.locale === locale) ?? null;
}

function hasSeo(snapshot: ProductStudioSnapshot): boolean {
  const vi = translation(snapshot, "vi");
  if (!vi) return false;
  const title = vi.seoTitle?.trim() || vi.name.trim();
  const desc = vi.seoDescription?.trim() || vi.shortDescription?.trim() || vi.description?.trim();
  return Boolean(title && desc);
}

export function computeProductReadiness(snapshot: ProductStudioSnapshot): ReadinessResult {
  const vi = translation(snapshot, "vi");
  const items: ReadinessItem[] = [];

  items.push({
    id: "name_vi",
    label: "Tên tiếng Việt",
    ok: Boolean(vi?.name.trim()),
    required: true,
  });
  items.push({
    id: "slug",
    label: "Slug",
    ok: Boolean(snapshot.slug.trim()),
    required: true,
  });
  items.push({
    id: "short_vi",
    label: "Mô tả ngắn (VI)",
    ok: Boolean(vi?.shortDescription?.trim()),
    required: false,
  });

  const activePlans = snapshot.plans.filter((plan) => plan.status === "active");
  const purchasablePlans = snapshot.plans.filter((plan) => isPurchasableBillingType(plan.billingType));
  const needsCommercial = purchasablePlans.length > 0;
  const hasSellableOffer =
    activePlans.some((plan) => isPurchasableBillingType(plan.billingType)) &&
    activePlans.some((plan) =>
      plan.prices.some((price) => price.isActive && price.amountMinor >= 0n),
    );

  items.push({
    id: "sellable_plan",
    label: "Ít nhất một gói bán được với giá hoạt động",
    ok: !needsCommercial || hasSellableOffer,
    required: needsCommercial,
  });

  items.push({
    id: "licensing",
    label: "Chế độ bản quyền",
    ok: Boolean(snapshot.licensingMode),
    required: true,
  });

  items.push({
    id: "seo",
    label: "SEO (tiêu đề + mô tả hoặc fallback)",
    ok: hasSeo(snapshot),
    required: true,
  });

  const needsRelease = (snapshot.platformCapabilities as ProductPlatform[]).includes("desktop");
  items.push({
    id: "release",
    label: "Tệp phát hành (sản phẩm desktop)",
    ok: !needsRelease || snapshot.publishedReleaseCount > 0,
    required: needsRelease,
  });

  const blockingCount = items.filter((item) => item.required && !item.ok).length;
  return {
    ready: blockingCount === 0,
    blockingCount,
    items,
  };
}
