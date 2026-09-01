"use client";

import type { ProductStudioSnapshot } from "@khepree/catalog/product/studio/types";
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  PRODUCT_TYPES,
  PRODUCT_TYPE_LABELS,
  parseCoverMediaPublicId,
  parseProductCategory,
  parseProductType,
  parseRecommendedPlanPublicId,
  productTypeNeedsRelease,
} from "@khepree/catalog/product/studio-field-policy";
import { Input, Select, Textarea } from "@khepree/ui";
import { useMemo, useState } from "react";
import { saveStudioDraftAction } from "@/app/(admin)/products/studio-actions";
import { ActionForm } from "@/components/action-form";
import { ReleaseUploadForm } from "@/components/release/release-upload-form";
import { ProductDescriptionEditor } from "@/components/product-studio/product-description-editor";
import { ProductMediaField } from "@/components/product-studio/product-media-field";
import { ProductPlanBuilder, mergedDescriptionForLocale } from "@/components/product-studio/product-plan-builder";
import { StudioActionBar } from "@/components/product-studio/studio-action-bar";

type Locale = "vi" | "en";

type LocaleFields = {
  name: string;
  shortDescription: string;
  fullDescription: string;
  seoTitle: string;
  seoDescription: string;
};

function readLocale(snapshot: ProductStudioSnapshot, locale: Locale): LocaleFields {
  const tr = snapshot.translations.find((t) => t.locale === locale);
  return {
    name: tr?.name ?? "",
    shortDescription: tr?.shortDescription ?? "",
    fullDescription: mergedDescriptionForLocale(snapshot.translations, locale),
    seoTitle: tr?.seoTitle ?? "",
    seoDescription: tr?.seoDescription ?? "",
  };
}

type Props = {
  snapshot: ProductStudioSnapshot;
  previewUrl: string;
  canWrite: boolean;
  releases: Array<{
    id: string;
    version: string;
    platform: string;
    status: string;
    publishedAt: Date | null;
  }>;
};

const LICENSING_OPTIONS = [
  { value: "NONE", label: "Không cần bản quyền" },
  { value: "ACCOUNT", label: "Theo tài khoản" },
  { value: "DEVICE_LEASE", label: "Theo thiết bị" },
  { value: "LICENSE_KEY_DEVICE", label: "License key + thiết bị" },
] as const;

export function ProductStudioWorkspace({ snapshot, previewUrl, canWrite, releases }: Props) {
  const [locale, setLocale] = useState<Locale>("vi");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [vi, setVi] = useState(() => readLocale(snapshot, "vi"));
  const [en, setEn] = useState(() => readLocale(snapshot, "en"));

  const productType = parseProductType(snapshot.metadata);
  const showReleases = productTypeNeedsRelease(productType);
  const coverId = parseCoverMediaPublicId(snapshot.metadata);
  const galleryIds = Array.isArray(snapshot.metadata.galleryMediaPublicIds)
    ? (snapshot.metadata.galleryMediaPublicIds as string[])
    : [];
  const recommendedPlanPublicId = parseRecommendedPlanPublicId(snapshot.metadata);

  const active = locale === "vi" ? vi : en;
  const setActive = locale === "vi" ? setVi : setEn;

  const categoryOptions = useMemo(
    () => PRODUCT_CATEGORIES.map((v) => ({ value: v, label: PRODUCT_CATEGORY_LABELS[v] })),
    [],
  );
  const typeOptions = useMemo(
    () => PRODUCT_TYPES.map((v) => ({ value: v, label: PRODUCT_TYPE_LABELS[v] })),
    [],
  );

  if (!canWrite) {
    return <p className="text-sm text-khepree-slate/70">Chế độ chỉ xem.</p>;
  }

  return (
    <div className="pb-24">
      <ActionForm action={saveStudioDraftAction} submitLabel="Lưu nháp" formId="studio-save-form" hideSubmit>
        <input type="hidden" name="productId" value={snapshot.id} />
        <input type="hidden" name="autoSlug" value="1" />
        <input type="hidden" name="autoSeo" value="1" />

        <input type="hidden" name="name_vi" value={vi.name} />
        <input type="hidden" name="shortDescription_vi" value={vi.shortDescription} />
        <input type="hidden" name="fullDescription_vi" value={vi.fullDescription} />
        <input type="hidden" name="seoTitle_vi" value={vi.seoTitle} />
        <input type="hidden" name="seoDescription_vi" value={vi.seoDescription} />
        <input type="hidden" name="name_en" value={en.name} />
        <input type="hidden" name="shortDescription_en" value={en.shortDescription} />
        <input type="hidden" name="fullDescription_en" value={en.fullDescription} />
        <input type="hidden" name="seoTitle_en" value={en.seoTitle} />
        <input type="hidden" name="seoDescription_en" value={en.seoDescription} />

        <section id="info" className="scroll-mt-24 space-y-4 rounded-xl border border-khepree-mist bg-khepree-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Thông tin</h2>
            <div className="flex rounded-[var(--radius-control)] border border-khepree-mist p-0.5 text-sm">
              {(["vi", "en"] as const).map((loc) => (
                <button
                  key={loc}
                  type="button"
                  className={`rounded-[var(--radius-control)] px-3 py-1 ${
                    locale === loc ? "bg-khepree-teal text-white" : "text-khepree-slate"
                  }`}
                  onClick={() => setLocale(loc)}
                >
                  {loc === "vi" ? "Tiếng Việt" : "English"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              name="productCategory"
              label="Danh mục"
              defaultValue={parseProductCategory(snapshot.metadata) ?? ""}
              options={[{ value: "", label: "Chọn danh mục" }, ...categoryOptions]}
              required
            />
            <Select
              name="productType"
              label="Loại sản phẩm"
              defaultValue={productType ?? ""}
              options={[{ value: "", label: "Chọn loại" }, ...typeOptions]}
              required
            />
          </div>
          <Input
            label="Tên sản phẩm"
            value={active.name}
            required
            onChange={(e) => {
              const v = e.target.value;
              setActive((s) => ({ ...s, name: v }));
            }}
          />
          <Textarea
            label="Mô tả ngắn"
            value={active.shortDescription}
            required={locale === "vi"}
            onChange={(e) => {
              const v = e.target.value;
              setActive((s) => ({ ...s, shortDescription: v }));
            }}
          />
          <ProductDescriptionEditor
            name={`fullDescription_${locale}_editor`}
            locale={locale}
            defaultValue={active.fullDescription}
            onValueChange={(v) => setActive((s) => ({ ...s, fullDescription: v }))}
          />
          <button
            type="button"
            className="text-sm text-khepree-slate/70 underline"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? "Ẩn nâng cao" : "Nâng cao"}
          </button>
          {showAdvanced ? (
            <div className="space-y-3 rounded-lg border border-khepree-mist/80 bg-khepree-cloud/40 p-4">
              <Input name="slug" label="URL slug" defaultValue={snapshot.slug} />
              <Select
                name="licensingMode"
                label="Chế độ bản quyền"
                defaultValue={snapshot.licensingMode}
                options={LICENSING_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input name="seoTitle_vi_input" label="SEO Title (VI)" defaultValue={vi.seoTitle} />
                <Textarea name="seoDescription_vi_input" label="Meta (VI)" defaultValue={vi.seoDescription} />
                <Input name="seoTitle_en_input" label="SEO Title (EN)" defaultValue={en.seoTitle} />
                <Textarea name="seoDescription_en_input" label="Meta (EN)" defaultValue={en.seoDescription} />
              </div>
            </div>
          ) : null}
        </section>

        <section id="media" className="mt-8 scroll-mt-24 space-y-4">
          <h2 className="text-lg font-semibold">Hình ảnh</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <ProductMediaField
              label="Icon / Logo"
              name="iconMediaPublicId"
              productId={snapshot.id}
              defaultPublicId={snapshot.iconMediaPublicId}
              required
            />
            <ProductMediaField
              label="Cover / Hero"
              name="coverMediaPublicId"
              productId={snapshot.id}
              defaultPublicId={coverId}
            />
          </div>
          <ProductMediaField
            label="Gallery"
            name="galleryMediaPublicId"
            productId={snapshot.id}
            multiple
            defaultGalleryIds={galleryIds}
          />
        </section>

        <section id="plans" className="mt-8 scroll-mt-24 space-y-4">
          <h2 className="text-lg font-semibold">Gói & bản quyền</h2>
          <ProductPlanBuilder plans={snapshot.plans} recommendedPlanPublicId={recommendedPlanPublicId} />
        </section>

        {showReleases ? (
          <section id="releases" className="mt-8 scroll-mt-24 space-y-4">
            <h2 className="text-lg font-semibold">Phát hành</h2>
            {releases.length > 0 ? (
              <ul className="space-y-1 text-sm">
                {releases.map((r) => (
                  <li key={r.id}>
                    {r.version} · {r.platform} · {r.status}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-khepree-slate/60">Chưa có bản phát hành.</p>
            )}
            <ReleaseUploadForm productId={snapshot.id} />
          </section>
        ) : null}
      </ActionForm>
      <StudioActionBar productId={snapshot.id} previewUrl={previewUrl} formId="studio-save-form" />
    </div>
  );
}
