import { getAdminMediaByPublicId } from "@khepree/db";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  deleteMediaAction,
  updateMediaAltAction,
} from "@/app/(admin)/media/media-actions";
import { signDownloadAction } from "@/app/(admin)/actions";
import {
  AdminDangerZone,
  AdminFormSection,
  AdminPageHeader,
  AdminSection,
  AdminStatusBadge,
  AdminTechnicalDetails,
} from "@/components/admin";
import { ActionForm } from "@/components/action-form";
import { DangerFields } from "@/components/danger-fields";
import { requireAdmin } from "@/lib/admin-session";
import { getMediaService } from "@/lib/media-service";
import { formatDate } from "@/lib/format";
import { hasPermission } from "@khepree/security";
import { Input } from "@khepree/ui";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicId: string }>;
}): Promise<Metadata> {
  const { publicId } = await params;
  return { title: `Media ${publicId}` };
}

export default async function MediaDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const session = await requireAdmin("content.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "content.write");
  const { publicId } = await params;
  const row = await getAdminMediaByPublicId(publicId);
  if (!row) notFound();

  const media = await getMediaService().getByPublicId(publicId);
  const refs = await getMediaService().getReferenceCounts(row.id);
  const inUse = refs.productIcons + refs.releases > 0;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={row.publicId}
        description="Chi tiết media"
        actions={
          <Link href="/media" className="text-sm text-khepree-teal underline">
            ← Thư viện
          </Link>
        }
      />
      <AdminSection title="Thông tin tệp">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-khepree-slate/60">MIME</dt>
            <dd>{row.mimeType}</dd>
          </div>
          <div>
            <dt className="text-khepree-slate/60">Kích thước</dt>
            <dd>{Math.round(row.sizeBytes / 1024)} KB</dd>
          </div>
          <div>
            <dt className="text-khepree-slate/60">Kích thước ảnh</dt>
            <dd>{row.width && row.height ? `${row.width}×${row.height}` : "—"}</dd>
          </div>
          <div>
            <dt className="text-khepree-slate/60">Hiển thị</dt>
            <dd>
              <AdminStatusBadge label={row.visibility} tone={row.visibility === "public" ? "success" : "muted"} />
            </dd>
          </div>
          <div>
            <dt className="text-khepree-slate/60">Ngữ cảnh</dt>
            <dd>{row.context ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-khepree-slate/60">Tạo lúc</dt>
            <dd>{formatDate(row.createdAt)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-khepree-slate/60">Alt text</dt>
            <dd>{row.altText ?? "—"}</dd>
          </div>
        </dl>
        <AdminTechnicalDetails>{row.objectKey}</AdminTechnicalDetails>
        {media?.publicUrl ? (
          <p className="mt-3 text-sm">
            URL public:{" "}
            <a className="text-khepree-teal underline" href={media.publicUrl} target="_blank" rel="noreferrer">
              {media.publicUrl}
            </a>
          </p>
        ) : null}
      </AdminSection>

      {inUse ? (
        <AdminSection title="Đang được dùng">
          <ul className="text-sm">
            {refs.productIcons ? <li>Icon sản phẩm: {refs.productIcons}</li> : null}
            {refs.releases ? <li>Release: {refs.releases}</li> : null}
          </ul>
        </AdminSection>
      ) : null}

      {canWrite ? (
        <>
          <AdminFormSection title="Sửa alt text">
            <ActionForm action={updateMediaAltAction} submitLabel="Lưu alt">
              <input type="hidden" name="publicId" value={publicId} />
              <Input name="altText" label="Alt text" defaultValue={row.altText ?? ""} />
            </ActionForm>
          </AdminFormSection>
          {row.visibility === "private" ? (
            <AdminFormSection title="Tải xuống (admin)">
              <ActionForm action={signDownloadAction} submitLabel="Tạo URL có chữ ký">
                <input type="hidden" name="mediaPublicId" value={publicId} />
              </ActionForm>
            </AdminFormSection>
          ) : null}
          {!inUse ? (
            <AdminDangerZone>
              <ActionForm action={deleteMediaAction} submitLabel="Xóa media" danger>
                <input type="hidden" name="publicId" value={publicId} />
                <DangerFields reasonLabel="Lý do (tùy chọn)" />
              </ActionForm>
            </AdminDangerZone>
          ) : (
            <p className="text-sm text-amber-800">Media đang được tham chiếu — không thể xóa.</p>
          )}
        </>
      ) : null}
    </div>
  );
}
