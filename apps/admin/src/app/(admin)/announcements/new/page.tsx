import {
  createAnnouncementDraftAction,
} from "@/app/(admin)/announcements/announcement-actions";
import { AdminFormSection, AdminPageHeader } from "@/components/admin";
import { AnnouncementFormFields } from "@/components/announcement/announcement-form-fields";
import { ActionForm } from "@/components/action-form";
import { requireAdmin } from "@/lib/admin-session";
import { listAdminProductsForPicker } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "Tạo thông báo hệ thống" };

export default async function NewAnnouncementPage() {
  const session = await requireAdmin("catalog.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "catalog.write");
  if (!canWrite) redirect("/forbidden");

  const products = await listAdminProductsForPicker();

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Tạo thông báo hệ thống"
        description="Lưu nháp trước. Xuất bản yêu cầu xác nhận riêng — không gửi ngay khi tạo."
      />
      <AdminFormSection title="Nội dung & targeting">
        <ActionForm action={createAnnouncementDraftAction} submitLabel="Lưu nháp">
          <AnnouncementFormFields
            products={products.map((p) => ({
              id: p.id,
              label: p.nameVi ?? p.slug,
            }))}
          />
        </ActionForm>
      </AdminFormSection>
    </div>
  );
}
