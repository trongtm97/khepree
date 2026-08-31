import { listAdminContentCategories } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  archiveContentDraftAction,
  forkPublishedContentAction,
  getContentPreviewLink,
  publishContentDraftAction,
  saveContentDraftAction,
} from "@/app/(admin)/content/content-actions";
import {
  AdminFormSection,
  AdminPageHeader,
  AdminSection,
  AdminStatusBadge,
  statusTone,
} from "@/components/admin";
import { ActionForm } from "@/components/action-form";
import { ContentDraftFormFields } from "@/components/content/content-draft-form-fields";
import { requireAdmin } from "@/lib/admin-session";
import { getContentService } from "@/lib/admin";
import { labelStatus } from "@/lib/labels";
import { formatDate } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ entryId: string }>;
}): Promise<Metadata> {
  const { entryId } = await params;
  return { title: `CMS ${entryId.slice(0, 8)}` };
}

export default async function ContentEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ entryId: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const session = await requireAdmin("content.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "content.write");
  const { entryId } = await params;
  const sp = await searchParams;
  const versions = await getContentService().listEntryVersions(entryId);
  if (versions.length === 0) notFound();

  const draft =
    (sp.version ? versions.find((v) => v.id === sp.version) : null) ??
    versions.find((v) => v.status === "DRAFT") ??
    versions[0]!;
  const body = draft.bodyObjectKey ? await getContentService().getBody(draft) : "";
  const categories = await listAdminContentCategories(draft.locale);
  const previewUrl =
    draft.status === "DRAFT" || draft.status === "PUBLISHED"
      ? await getContentPreviewLink(draft.id, draft.locale, draft.slug, draft.contentType)
      : null;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={draft.title}
        description={`${draft.contentType} · ${draft.locale.toUpperCase()} · v${draft.versionNumber}`}
        actions={
          previewUrl ? (
            <Link href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-khepree-teal underline">
              Xem trước
            </Link>
          ) : null
        }
      />

      <AdminSection title="Lịch sử phiên bản">
        <ul className="space-y-1 text-sm">
          {versions.map((version) => (
            <li key={version.id} className="flex flex-wrap items-center gap-2">
              <Link className="underline" href={`/content/${entryId}?version=${version.id}`}>
                v{version.versionNumber}
              </Link>
              <AdminStatusBadge label={labelStatus(version.status.toLowerCase())} tone={statusTone(version.status.toLowerCase())} />
              <span className="text-khepree-slate/60">{formatDate(version.updatedAt)}</span>
              {version.status === "PUBLISHED" && canWrite ? (
                <ActionForm action={forkPublishedContentAction} submitLabel="Tạo draft mới">
                  <input type="hidden" name="entryId" value={entryId} />
                  <input type="hidden" name="locale" value={version.locale} />
                </ActionForm>
              ) : null}
            </li>
          ))}
        </ul>
      </AdminSection>

      {canWrite && draft.status === "DRAFT" ? (
        <AdminFormSection title="Soạn thảo">
          <ActionForm action={saveContentDraftAction} submitLabel="Lưu nháp">
            <input type="hidden" name="versionId" value={draft.id} />
            <input type="hidden" name="entryId" value={entryId} />
            <ContentDraftFormFields
              contentType={draft.contentType}
              slug={draft.slug}
              defaultTitle={draft.title}
              defaultExcerpt={draft.excerpt ?? ""}
              defaultBody={body ?? ""}
              defaultSeoTitle={draft.seoTitle ?? ""}
              defaultSeoDescription={draft.seoDescription ?? ""}
              defaultFeaturedMediaPublicId={draft.featuredMediaPublicId ?? ""}
              defaultCategoryId={draft.categoryId ?? ""}
              categories={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
            <p className="text-xs text-khepree-slate/60">
              Lên lịch xuất bản: chưa hỗ trợ tự động — cột scheduled_at chỉ chuẩn bị schema.
            </p>
          </ActionForm>
          <div className="mt-4 flex flex-wrap gap-3">
            <ActionForm action={publishContentDraftAction} submitLabel="Xuất bản">
              <input type="hidden" name="versionId" value={draft.id} />
              <input type="hidden" name="entryId" value={entryId} />
            </ActionForm>
            <ActionForm action={archiveContentDraftAction} submitLabel="Lưu trữ" danger>
              <input type="hidden" name="versionId" value={draft.id} />
              <input type="hidden" name="entryId" value={entryId} />
            </ActionForm>
          </div>
        </AdminFormSection>
      ) : (
        <AdminSection title="Chỉ xem">
          <p className="text-sm">Phiên bản {draft.status} — chọn bản DRAFT hoặc tạo draft mới từ published.</p>
        </AdminSection>
      )}
    </div>
  );
}
