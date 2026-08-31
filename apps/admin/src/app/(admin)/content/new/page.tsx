import { listAdminContentCategories } from "@khepree/db";
import { DEFAULT_LOCALE } from "@khepree/config";
import { hasPermission } from "@khepree/security";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createContentArticleAction } from "@/app/(admin)/content/content-actions";
import { AdminFormSection, AdminPageHeader } from "@/components/admin";
import { ActionForm } from "@/components/action-form";
import { ContentDraftFormFields } from "@/components/content/content-draft-form-fields";
import { requireAdmin } from "@/lib/admin-session";

export const metadata: Metadata = { title: "Tạo nội dung" };

export default async function NewContentPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const session = await requireAdmin("content.write");
  if (!hasPermission({ globalRole: session.globalRole }, "content.write")) notFound();
  const params = await searchParams;
  const contentType = (params.type ?? "article") as "article" | "page" | "doc";
  const categories = await listAdminContentCategories(DEFAULT_LOCALE);

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Tạo nội dung mới" description="TipTap WYSIWYG + SEO checklist." />
      <AdminFormSection title="Bài viết mới">
        <ActionForm action={createContentArticleAction} submitLabel="Tạo & mở Studio">
          <input type="hidden" name="contentType" value={contentType} />
          <ContentDraftFormFields
            contentType={contentType}
            showSlug
            categories={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
        </ActionForm>
      </AdminFormSection>
    </div>
  );
}
