import { hasPermission } from "@khepree/security";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AdminFormSection,
  AdminPageHeader,
  AdminSection,
  AdminStatusBadge,
  statusTone,
} from "@/components/admin";
import { ActionForm } from "@/components/action-form";
import { ReleaseArtifactVerificationList } from "@/components/release/release-artifact-verification-list";
import { ReleaseArtifactUploadForm } from "@/components/release/release-artifact-upload-form";
import { publishReleaseAction } from "@/app/(admin)/products/release-actions";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate } from "@/lib/format";
import { labelStatus } from "@/lib/labels";
import { getReleaseService } from "@/lib/release-service";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ publicId: string }>;
}): Promise<Metadata> {
  const { publicId } = await params;
  return { title: `Release ${publicId}` };
}

export default async function ReleaseDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const session = await requireAdmin("content.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "catalog.write");
  const { publicId } = await params;
  const release = await getReleaseService().getByPublicId(publicId);
  if (!release) notFound();

  const readiness =
    release.status === "draft"
      ? await getReleaseService().getPublishReadiness(release.id)
      : { ready: false, artifacts: [], blockers: [] };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={`${release.version} · ${release.platform}/${release.architecture}`}
        description={`${release.publicId} · ${release.channel}`}
        actions={
          <AdminStatusBadge label={labelStatus(release.status)} tone={statusTone(release.status)} />
        }
      />

      <AdminSection title="Trạng thái verified artifact">
        <ReleaseArtifactVerificationList items={readiness.artifacts} />
        {readiness.blockers.length > 0 ? (
          <ul className="mt-3 list-disc pl-5 text-sm text-red-800">
            {readiness.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        ) : null}
      </AdminSection>

      {canWrite && release.status === "draft" ? (
        <>
          <AdminFormSection title="Thêm artifact (CI manifest)">
            <ReleaseArtifactUploadForm
              releaseId={release.id}
              releasePublicId={release.publicId}
              productId={release.productId}
            />
          </AdminFormSection>
          {readiness.ready ? (
            <ActionForm action={publishReleaseAction} submitLabel="Xuất bản">
              <input type="hidden" name="releaseId" value={release.id} />
              <input type="hidden" name="productId" value={release.productId} />
              <input type="hidden" name="releasePublicId" value={release.publicId} />
              <label className="mt-3 flex items-start gap-2 text-sm text-khepree-slate">
                <input type="checkbox" name="notifyDesktop" className="mt-1" />
                <span>
                  Tạo thông báo desktop (what&apos;s new) — bỏ chọn nếu muốn thông báo thủ công sau
                  tại /announcements
                </span>
              </label>
            </ActionForm>
          ) : (
            <p className="text-sm text-khepree-slate/70">
              Publish bị khóa cho đến khi mọi artifact verified và đủ bộ bắt buộc.
            </p>
          )}
        </>
      ) : null}

      <p className="text-sm text-khepree-slate/60">
        Published: {release.publishedAt ? formatDate(release.publishedAt) : "—"} ·{" "}
        <Link className="text-khepree-teal underline" href="/releases">
          Quay lại danh sách
        </Link>
      </p>
    </div>
  );
}
