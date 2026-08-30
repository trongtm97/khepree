import { computeProductReadiness, parseOperatingSystems, parseProductMarketingMetadata } from "@khepree/catalog";
import type { ProductPlatform } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import { Input, Select, Textarea } from "@khepree/ui";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  archiveStudioProductAction,
  createStudioFeatureAction,
  publishProductAction,
  saveContentAction,
  saveOverviewAction,
  savePlanAction,
  savePlanFeatureAction,
  saveSeoAction,
} from "@/app/(admin)/products/studio-actions";
import { publishReleaseAction } from "@/app/(admin)/products/release-actions";
import {
  AdminDangerZone,
  AdminFormSection,
  AdminSection,
  AdminStatusBadge,
  AdminTable,
  AdminTd,
  statusTone,
} from "@/components/admin";
import { ReleaseUploadForm } from "@/components/release/release-upload-form";
import { getReleaseService } from "@/lib/release-service";
import { formatDate } from "@/lib/format";
import { labelStatus } from "@/lib/labels";
import { ActionForm } from "@/components/action-form";
import { DangerFields } from "@/components/danger-fields";
import { ProductMarketingForm } from "@/components/product-studio/product-marketing-form";
import { resolveStudioTab } from "@/components/product-studio/product-studio-tabs";
import { requireAdmin } from "@/lib/admin-session";
import { getProductStudio } from "@/lib/product-studio";
import { formatPriceAmount } from "@khepree/catalog";
import { DEFAULT_CURRENCY, DEFAULT_LOCALE } from "@khepree/config";

const LICENSING_OPTIONS = [
  { value: "NONE", label: "Không cần bản quyền — truy cập không qua license key" },
  { value: "ACCOUNT", label: "Theo tài khoản — gắn quyền với user/org" },
  { value: "DEVICE_LEASE", label: "Theo thiết bị — kích hoạt thiết bị, không cần key" },
  { value: "LICENSE_KEY_DEVICE", label: "License key + thiết bị — key và giới hạn thiết bị" },
];

export default async function ProductStudioPage({
  params,
  searchParams,
}: {
  params: Promise<{ productId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await requireAdmin("catalog.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "catalog.write");
  const { productId } = await params;
  const tab = resolveStudioTab((await searchParams).tab);
  const studio = getProductStudio();
  const snapshot = await studio.getSnapshot(productId);
  if (!snapshot) notFound();

  const vi = snapshot.translations.find((t) => t.locale === "vi");
  const en = snapshot.translations.find((t) => t.locale === "en");
  const readiness = computeProductReadiness(snapshot);
  const features = await studio.listFeatureOptions();

  if (tab === "overview") {
    return (
      <AdminFormSection title="Tổng quan">
        {canWrite ? (
          <ActionForm action={saveOverviewAction} submitLabel="Lưu tổng quan">
            <input type="hidden" name="productId" value={productId} />
            <Input name="nameVi" label="Tên (VI)" defaultValue={vi?.name ?? ""} required />
            <Input name="nameEn" label="Tên (EN)" defaultValue={en?.name ?? ""} />
            <Input name="slug" label="Slug" defaultValue={snapshot.slug} required />
            <Textarea name="shortDescriptionVi" label="Mô tả ngắn (VI)" defaultValue={vi?.shortDescription ?? ""} />
            <Textarea name="shortDescriptionEn" label="Mô tả ngắn (EN)" defaultValue={en?.shortDescription ?? ""} />
            <Select
              name="licensingMode"
              label="Chế độ bản quyền"
              defaultValue={snapshot.licensingMode}
              options={LICENSING_OPTIONS.map((o) => ({ value: o.value, label: o.label.split(" — ")[0] ?? o.label }))}
            />
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Nền tảng</legend>
              {(
                [
                  { value: "web", label: "Web" },
                  { value: "desktop", label: "Desktop" },
                  { value: "mobile", label: "Android / iOS" },
                ] as const
              ).map((p) => (
                <label key={p.value} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="platforms"
                    value={p.value}
                    defaultChecked={snapshot.platformCapabilities.includes(p.value as ProductPlatform)}
                  />
                  {p.label}
                </label>
              ))}
            </fieldset>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Hệ điều hành (khi biết chính xác)</legend>
              {(["Windows", "macOS", "Linux", "iOS", "Android", "Web"] as const).map((os) => (
                <label key={os} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="operatingSystems"
                    value={os}
                    defaultChecked={parseOperatingSystems(snapshot.metadata).includes(os)}
                  />
                  {os}
                </label>
              ))}
            </fieldset>
            <Input
              name="iconMediaPublicId"
              label="Icon (media public ID)"
              defaultValue={snapshot.iconMediaPublicId ?? ""}
            />
          </ActionForm>
        ) : (
          <p className="text-sm">Chế độ chỉ xem.</p>
        )}
      </AdminFormSection>
    );
  }

  if (tab === "content") {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        {(["vi", "en"] as const).map((locale) => {
          const tr = snapshot.translations.find((t) => t.locale === locale);
          return (
            <AdminFormSection key={locale} title={locale === "vi" ? "Tiếng Việt" : "English"}>
              {canWrite ? (
                <ActionForm action={saveContentAction} submitLabel="Lưu nội dung">
                  <input type="hidden" name="productId" value={productId} />
                  <input type="hidden" name="locale" value={locale} />
                  <Textarea name="description" label="Mô tả dài" defaultValue={tr?.description ?? ""} />
                  <Textarea name="content" label="Nội dung (markdown/HTML)" defaultValue={tr?.content ?? ""} />
                </ActionForm>
              ) : null}
            </AdminFormSection>
          );
        })}
      </div>
    );
  }

  if (tab === "marketing") {
    const marketing = parseProductMarketingMetadata(snapshot.metadata);
    return (
      <AdminFormSection title="Trang thương mại" description="Giải pháp, tính năng, FAQ, hướng dẫn và CTA — hiển thị trên /products/[slug]">
        <ProductMarketingForm productId={productId} marketing={marketing} canWrite={canWrite} />
      </AdminFormSection>
    );
  }

  if (tab === "plans") {
    return (
      <div className="space-y-8">
        {snapshot.plans.map((plan) => (
          <AdminFormSection key={plan.id} title={`Gói: ${plan.nameVi ?? plan.slug}`}>
            {canWrite ? (
              <ActionForm action={savePlanAction} submitLabel="Lưu gói">
                <input type="hidden" name="productId" value={productId} />
                <input type="hidden" name="planId" value={plan.id} />
                <Input name="nameVi" label="Tên (VI)" defaultValue={plan.nameVi ?? ""} required />
                <Input name="nameEn" label="Tên (EN)" defaultValue={plan.nameEn ?? ""} />
                <Input name="slug" label="Slug" defaultValue={plan.slug} required />
                <Select
                  name="billingType"
                  label="Loại thanh toán"
                  defaultValue={plan.billingType}
                  options={["free", "one_time", "recurring", "perpetual", "custom"].map((v) => ({
                    value: v,
                    label: v,
                  }))}
                />
                <Input
                  name="accessTermDays"
                  label="Thời hạn (ngày, trống = vĩnh viễn)"
                  defaultValue={plan.accessTermDays?.toString() ?? ""}
                />
                <Select
                  name="status"
                  label="Trạng thái"
                  defaultValue={plan.status}
                  options={[
                    { value: "draft", label: "Nháp" },
                    { value: "active", label: "Hoạt động" },
                    { value: "archived", label: "Lưu trữ" },
                  ]}
                />
                {plan.prices[0] ? (
                  <>
                    <input type="hidden" name="priceId" value={plan.prices[0].id} />
                    <Input
                      name="amount"
                      label={`Giá (${plan.prices[0].currency})`}
                      defaultValue={plan.prices[0].amountMinor.toString()}
                    />
                  </>
                ) : (
                  <Input name="amount" label={`Giá (${DEFAULT_CURRENCY})`} placeholder="599000" />
                )}
                <Input name="currency" label="Tiền tệ" defaultValue={plan.prices[0]?.currency ?? DEFAULT_CURRENCY} />
                <Input name="interval" label="Chu kỳ (recurring)" defaultValue={plan.prices[0]?.interval ?? ""} />
                <input type="hidden" name="priceActive" value="1" />
              </ActionForm>
            ) : (
              <ul className="text-sm">
                {plan.prices.map((price) => (
                  <li key={price.id}>
                    {formatPriceAmount(price.amountMinor, price.currency, DEFAULT_LOCALE)}
                    {price.interval ? ` / ${price.interval}` : ""}
                  </li>
                ))}
              </ul>
            )}
          </AdminFormSection>
        ))}
        {canWrite ? (
          <AdminFormSection title="Thêm gói mới">
            <ActionForm action={savePlanAction} submitLabel="Tạo gói">
              <input type="hidden" name="productId" value={productId} />
              <Input name="nameVi" label="Tên (VI)" required />
              <Input name="slug" label="Slug" required />
              <Select
                name="billingType"
                label="Loại thanh toán"
                defaultValue="one_time"
                options={["free", "one_time", "recurring", "perpetual"].map((v) => ({ value: v, label: v }))}
              />
              <Input name="accessTermDays" label="Thời hạn (ngày)" placeholder="30 hoặc 365" />
              <Input name="amount" label="Giá VND" placeholder="599000" />
              <Input name="currency" label="Tiền tệ" defaultValue={DEFAULT_CURRENCY} />
              <input type="hidden" name="status" value="draft" />
              <input type="hidden" name="priceActive" value="1" />
            </ActionForm>
          </AdminFormSection>
        ) : null}
      </div>
    );
  }

  if (tab === "features") {
    return (
      <div className="space-y-8">
        {snapshot.plans.map((plan) => (
          <AdminSection key={plan.id} title={`Tính năng — ${plan.nameVi ?? plan.slug}`}>
            <ul className="mb-4 space-y-1 text-sm">
              {plan.features.map((f) => (
                <li key={f.featureId}>
                  {f.name} ({f.key}):{" "}
                  {f.valueType === "boolean"
                    ? String(f.booleanValue)
                    : f.valueType === "integer"
                      ? String(f.integerValue)
                      : f.stringValue}
                </li>
              ))}
            </ul>
            {canWrite ? (
              <ActionForm action={savePlanFeatureAction} submitLabel="Gán tính năng">
                <input type="hidden" name="productId" value={productId} />
                <input type="hidden" name="planId" value={plan.id} />
                <Select
                  name="featureId"
                  label="Tính năng"
                  options={features.map((f) => ({
                    value: f.id,
                    label: `${f.nameVi ?? f.key} (${f.valueType})`,
                  }))}
                />
                <Select
                  name="valueType"
                  label="Kiểu"
                  options={[
                    { value: "boolean", label: "boolean" },
                    { value: "integer", label: "integer" },
                    { value: "string", label: "string" },
                  ]}
                />
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="booleanValue" /> Bật (boolean)
                </label>
                <Input name="integerValue" label="Giá trị số" defaultValue="0" />
                <Input name="stringValue" label="Giá trị chuỗi" />
              </ActionForm>
            ) : null}
          </AdminSection>
        ))}
        {canWrite ? (
          <AdminFormSection title="Tạo tính năng mới">
            <ActionForm action={createStudioFeatureAction} submitLabel="Tạo">
              <input type="hidden" name="productId" value={productId} />
              <Input name="key" label="Khóa" required />
              <Input name="nameVi" label="Tên (VI)" required />
              <Select
                name="valueType"
                label="Kiểu"
                options={[
                  { value: "boolean", label: "boolean" },
                  { value: "integer", label: "integer" },
                  { value: "string", label: "string" },
                ]}
              />
            </ActionForm>
          </AdminFormSection>
        ) : null}
      </div>
    );
  }

  if (tab === "licensing") {
    return (
      <AdminSection title="Bản quyền" description="Cấu hình tại tab Tổng quan. Giải thích các chế độ:">
        <ul className="space-y-2 text-sm">
          {LICENSING_OPTIONS.map((o) => (
            <li key={o.value}>
              <strong>{o.label.split(" — ")[0]}</strong>
              {o.label.includes(" — ") ? ` — ${o.label.split(" — ")[1]}` : ""}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm">
          Hiện tại: <AdminStatusBadge label={snapshot.licensingMode} tone="muted" />
        </p>
      </AdminSection>
    );
  }

  if (tab === "media") {
    return (
      <AdminSection title="Media" description="Gán icon qua public ID tại tab Tổng quan. Thư viện media:">
        <Link className="text-khepree-teal underline" href="/media">
          Mở thư viện Media
        </Link>
      </AdminSection>
    );
  }

  if (tab === "releases") {
    const releases = await getReleaseService().listForProduct(productId);
    return (
      <div className="space-y-8">
        <AdminSection
          title="Phiên bản"
          description={`${releases.length} bản phát hành · ${snapshot.publishedReleaseCount} đã xuất bản`}
        >
          <AdminTable
            headers={["Version", "Nền tảng", "Arch", "Kênh", "Kích thước", "Trạng thái", "Ngày PB", ""]}
            empty={releases.length === 0}
          >
            {releases.map((release) => (
              <tr key={release.id}>
                <AdminTd>{release.version}</AdminTd>
                <AdminTd>{release.platform}</AdminTd>
                <AdminTd>{release.architecture}</AdminTd>
                <AdminTd>{release.channel}</AdminTd>
                <AdminTd>{Math.round(release.fileSize / 1024 / 1024)} MB</AdminTd>
                <AdminTd>
                  <AdminStatusBadge label={labelStatus(release.status)} tone={statusTone(release.status)} />
                </AdminTd>
                <AdminTd>{release.publishedAt ? formatDate(release.publishedAt) : "—"}</AdminTd>
                <AdminTd>
                  {canWrite && release.status === "draft" ? (
                    <ActionForm action={publishReleaseAction} submitLabel="Publish">
                      <input type="hidden" name="releaseId" value={release.id} />
                      <input type="hidden" name="productId" value={productId} />
                    </ActionForm>
                  ) : null}
                </AdminTd>
              </tr>
            ))}
          </AdminTable>
        </AdminSection>
        {canWrite ? (
          <AdminFormSection title="Phiên bản mới">
            <ReleaseUploadForm productId={productId} />
          </AdminFormSection>
        ) : null}
      </div>
    );
  }

  if (tab === "seo") {
    return (
      <AdminFormSection title="SEO">
        {canWrite ? (
          <ActionForm action={saveSeoAction} submitLabel="Lưu SEO">
            <input type="hidden" name="productId" value={productId} />
            <Input name="seoTitle_vi" label="SEO Title (VI)" defaultValue={vi?.seoTitle ?? ""} />
            <Textarea name="seoDescription_vi" label="Meta Description (VI)" defaultValue={vi?.seoDescription ?? ""} />
            <Input name="seoTitle_en" label="SEO Title (EN)" defaultValue={en?.seoTitle ?? ""} />
            <Textarea name="seoDescription_en" label="Meta Description (EN)" defaultValue={en?.seoDescription ?? ""} />
          </ActionForm>
        ) : null}
      </AdminFormSection>
    );
  }

  return (
    <div className="space-y-6">
      <AdminSection title="Kiểm tra sẵn sàng">
        <ul className="space-y-2 text-sm">
          {readiness.items.map((item) => (
            <li key={item.id} className="flex items-center gap-2">
              <AdminStatusBadge
                label={item.ok ? "OK" : "Thiếu"}
                tone={item.ok ? "success" : item.required ? "danger" : "warning"}
              />
              {item.label}
              {!item.required ? <span className="text-xs text-khepree-slate/60">(khuyến nghị)</span> : null}
            </li>
          ))}
        </ul>
        <p className="mt-3 font-medium">
          {readiness.ready
            ? "Sẵn sàng xuất bản"
            : `Còn ${readiness.blockingCount} mục cần hoàn thiện`}
        </p>
      </AdminSection>
      {canWrite ? (
        <>
          <ActionForm action={publishProductAction} submitLabel="Xuất bản">
            <input type="hidden" name="productId" value={productId} />
          </ActionForm>
          <AdminDangerZone>
            <ActionForm action={archiveStudioProductAction} submitLabel="Lưu trữ sản phẩm" danger>
              <input type="hidden" name="productId" value={productId} />
              <DangerFields reasonLabel="Lý do lưu trữ" />
            </ActionForm>
          </AdminDangerZone>
        </>
      ) : null}
    </div>
  );
}
