import {
  archiveAnnouncementAction,
  clonePublishedAnnouncementAction,
  expireAnnouncementAction,
  publishAnnouncementAction,
  saveAnnouncementDraftAction,
} from "@/app/(admin)/announcements/announcement-actions";
import {
  AdminDangerZone,
  AdminFormSection,
  AdminPageHeader,
  AdminSection,
  AdminStatusBadge,
  AdminTechnicalDetails,
  statusTone,
} from "@/components/admin";
import { AnnouncementFormFields } from "@/components/announcement/announcement-form-fields";
import { AnnouncementPreview } from "@/components/announcement/announcement-preview";
import { ActionForm } from "@/components/action-form";
import { DangerFields } from "@/components/danger-fields";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate } from "@/lib/format";
import { labelStatus } from "@/lib/labels";
import { getAnnouncementService } from "@/lib/announcement-service";
import {
  buildAnnouncementTargetingSummary,
  formatUtcDateTimeLocal,
  renderAnnouncementBodyHtml,
  resolveAnnouncementCopy,
} from "@khepree/catalog";
import { listAdminProductsForPicker, listAdminReleases } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

function ctaPreviewLabel(
  ctaKind: string,
  payload: Record<string, unknown> | null,
): string | null {
  if (ctaKind === "open_url" && payload?.url) return `Mở liên kết: ${String(payload.url)}`;
  if (ctaKind === "open_path" && payload?.path) return `Mở: ${String(payload.path)}`;
  if (ctaKind === "software_update" && payload?.releasePublicId) {
    return `Cập nhật phần mềm: ${String(payload.releasePublicId)}`;
  }
  return null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicId: string }>;
}): Promise<Metadata> {
  const { publicId } = await params;
  return { title: `Thông báo ${publicId}` };
}

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const session = await requireAdmin("catalog.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "catalog.write");
  const { publicId } = await params;
  const record = await getAnnouncementService().getByPublicId(publicId);
  if (!record) notFound();

  const products = await listAdminProductsForPicker();
  const releases = await listAdminReleases({ page: 1 });
  const publishedReleases = releases
    .filter((r) => r.status === "published")
    .map((r) => ({
      publicId: r.publicId,
      label: `${r.nameVi ?? r.productSlug} · ${r.version} · ${r.platform}/${r.architecture} · ${r.channel}`,
    }));
  const productLabel =
    products.find((p) => p.id === record.productId)?.nameVi ??
    products.find((p) => p.id === record.productId)?.slug ??
    null;

  const vi = record.translations.find((t) => t.locale === "vi");
  const en = record.translations.find((t) => t.locale === "en");
  const previewCopy = resolveAnnouncementCopy("vi", record.translations.map((t) => ({
    locale: t.locale,
    title: t.title,
    body: t.body ?? null,
  })));

  const targetingSummary = buildAnnouncementTargetingSummary({
    productLabel,
    targetPlatform: record.targetPlatform,
    targetArchitecture: record.targetArchitecture,
    releaseChannel: record.releaseChannel,
    minimumAppVersion: record.minimumAppVersion,
    maximumAppVersion: record.maximumAppVersion,
    startsAt: record.startsAt,
    expiresAt: record.expiresAt,
  });

  const ctaPayload = record.ctaPayload as Record<string, unknown> | null;
  const isDraft = record.status === "draft";
  const isPublished = record.status === "published";

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={previewCopy?.title ?? record.publicId}
        description={`${record.publicId} · cập nhật ${formatDate(record.updatedAt)}`}
        actions={
          <AdminStatusBadge label={labelStatus(record.status)} tone={statusTone(record.status)} />
        }
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <AnnouncementPreview
          title={previewCopy?.title ?? ""}
          bodyHtml={renderAnnouncementBodyHtml(previewCopy?.body)}
          severity={record.severity}
          ctaKind={record.ctaKind}
          ctaLabel={ctaPreviewLabel(record.ctaKind, ctaPayload)}
        />

        <AdminSection title="Đối tượng nhận">
          <ul className="space-y-1 text-sm text-khepree-slate">
            {targetingSummary.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </AdminSection>
      </div>

      {canWrite && isDraft ? (
        <AdminFormSection title="Soạn thảo nháp">
          <ActionForm action={saveAnnouncementDraftAction} submitLabel="Lưu nháp">
            <input type="hidden" name="announcementId" value={record.id} />
            <input type="hidden" name="publicId" value={record.publicId} />
            <AnnouncementFormFields
              products={products.map((p) => ({ id: p.id, label: p.nameVi ?? p.slug }))}
              releases={publishedReleases}
              defaultProductId={record.productId ?? ""}
              defaultSeverity={record.severity}
              defaultPlatform={record.targetPlatform ?? ""}
              defaultArchitecture={record.targetArchitecture ?? ""}
              defaultChannel={record.releaseChannel ?? ""}
              defaultMinimumAppVersion={record.minimumAppVersion ?? ""}
              defaultMaximumAppVersion={record.maximumAppVersion ?? ""}
              defaultStartsAt={formatUtcDateTimeLocal(record.startsAt)}
              defaultExpiresAt={formatUtcDateTimeLocal(record.expiresAt)}
              defaultCtaKind={record.ctaKind}
              defaultCtaUrl={ctaPayload?.url ? String(ctaPayload.url) : ""}
              defaultCtaPath={ctaPayload?.path ? String(ctaPayload.path) : ""}
              defaultCtaReleasePublicId={
                ctaPayload?.releasePublicId ? String(ctaPayload.releasePublicId) : ""
              }
              defaultType={record.type}
              defaultTitleVi={vi?.title ?? ""}
              defaultTitleEn={en?.title ?? ""}
              defaultBodyVi={vi?.body ?? ""}
              defaultBodyEn={en?.body ?? ""}
              defaultCtaLabelVi={vi?.ctaLabel ?? ""}
              defaultCtaLabelEn={en?.ctaLabel ?? ""}
            />
          </ActionForm>

          <AdminDangerZone title="Xuất bản">
            <p className="text-sm text-red-900">
              Thông báo sẽ hiển thị cho desktop client khớp targeting bên dưới. Hành động không thể hoàn tác — chỉ
              expire/archive hoặc tạo bản nháp mới từ bản published.
            </p>
            <ul className="list-disc pl-5 text-sm text-red-900">
              {targetingSummary.map((line) => (
                <li key={`pub-${line}`}>{line}</li>
              ))}
            </ul>
            <ActionForm action={publishAnnouncementAction} submitLabel="Xuất bản" danger>
              <input type="hidden" name="announcementId" value={record.id} />
              <input type="hidden" name="publicId" value={record.publicId} />
              <DangerFields reasonLabel="Lý do xuất bản" />
            </ActionForm>
          </AdminDangerZone>
        </AdminFormSection>
      ) : null}

      {canWrite && isPublished ? (
        <AdminSection title="Đã xuất bản — không sửa trực tiếp">
          <p className="text-sm text-khepree-slate/80">
            Nội dung published không thể chỉnh sửa âm thầm. Tạo bản nháp mới để thay đổi.
          </p>
          <ActionForm action={clonePublishedAnnouncementAction} submitLabel="Tạo bản nháp mới">
            <input type="hidden" name="announcementId" value={record.id} />
          </ActionForm>
          <AdminDangerZone title="Kết thúc thông báo">
            <ActionForm action={expireAnnouncementAction} submitLabel="Đánh dấu hết hạn" danger>
              <input type="hidden" name="announcementId" value={record.id} />
              <input type="hidden" name="publicId" value={record.publicId} />
              <DangerFields reasonLabel="Lý do hết hạn" />
            </ActionForm>
            <ActionForm action={archiveAnnouncementAction} submitLabel="Lưu trữ" danger>
              <input type="hidden" name="announcementId" value={record.id} />
              <input type="hidden" name="publicId" value={record.publicId} />
              <DangerFields reasonLabel="Lý do lưu trữ" />
            </ActionForm>
          </AdminDangerZone>
        </AdminSection>
      ) : null}

      {!canWrite ? (
        <p className="text-sm text-khepree-slate/60">Chế độ chỉ xem — cần quyền catalog.write để chỉnh sửa.</p>
      ) : null}

      {!isDraft && !isPublished ? (
        <AdminSection title="Chỉ xem">
          <p className="text-sm">Trạng thái {labelStatus(record.status)} — không thể chỉnh sửa.</p>
        </AdminSection>
      ) : null}

      <AdminTechnicalDetails>
        <dl className="space-y-1">
          <div>
            <dt className="inline font-semibold">Public ID: </dt>
            <dd className="inline">{record.publicId}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Published at: </dt>
            <dd className="inline">{record.publishedAt ? formatDate(record.publishedAt) : "—"}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Created by: </dt>
            <dd className="inline">{record.createdBy ?? "—"}</dd>
          </div>
          <div>
            <dt className="inline font-semibold">Updated by: </dt>
            <dd className="inline">{record.updatedBy ?? "—"}</dd>
          </div>
        </dl>
      </AdminTechnicalDetails>
    </div>
  );
}
