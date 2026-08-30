import { listAdminContentCategories } from "@khepree/db";
import { DEFAULT_LOCALE } from "@khepree/config";
import { hasPermission } from "@khepree/security";
import { Input, Select, Textarea } from "@khepree/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createContentArticleAction } from "@/app/(admin)/content/content-actions";
import { AdminFormSection, AdminPageHeader } from "@/components/admin";
import { ActionForm } from "@/components/action-form";
import { ContentMarkdownEditor } from "@/components/content/content-markdown-editor";
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
      <AdminPageHeader title="Tạo nội dung mới" description="Mặc định tiếng Việt. Markdown + SEO." />
      <AdminFormSection title="Bài viết mới">
        <ActionForm action={createContentArticleAction} submitLabel="Tạo & mở Studio">
          <input type="hidden" name="contentType" value={contentType} />
          <Input name="title" label="Tiêu đề (VI)" required />
          <Input name="slug" label="Slug (tự gợi ý nếu trống)" placeholder="huong-dan-khepree" />
          <Textarea name="excerpt" label="Tóm tắt" />
          <ContentMarkdownEditor />
          <Input name="featuredMediaPublicId" label="Ảnh đại diện (media public ID)" />
          <Select
            name="categoryId"
            label="Danh mục"
            options={[{ value: "", label: "—" }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
          />
          <Input name="seoTitle" label="SEO Title" />
          <Textarea name="seoDescription" label="Meta Description" />
        </ActionForm>
      </AdminFormSection>
    </div>
  );
}
