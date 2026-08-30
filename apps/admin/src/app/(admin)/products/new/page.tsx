import { suggestProductSlug } from "@khepree/catalog";
import { Input, Select } from "@khepree/ui";
import type { Metadata } from "next";
import { createStudioProductAction } from "@/app/(admin)/products/studio-actions";
import { AdminFormSection, AdminPageHeader } from "@/components/admin";
import { ActionForm } from "@/components/action-form";
import { requireAdmin } from "@/lib/admin-session";

export const metadata: Metadata = { title: "Tạo sản phẩm" };

const LICENSING_OPTIONS = [
  { value: "NONE", label: "Không cần bản quyền" },
  { value: "ACCOUNT", label: "Theo tài khoản" },
  { value: "DEVICE_LEASE", label: "Theo thiết bị" },
  { value: "LICENSE_KEY_DEVICE", label: "License key + thiết bị" },
];

export default async function NewProductPage() {
  await requireAdmin("catalog.write");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <AdminPageHeader
        title="Tạo sản phẩm"
        description="Chỉ cần tên tiếng Việt. Slug được gợi ý tự động. Sau khi tạo bạn sẽ vào Product Studio."
      />
      <AdminFormSection title="Thông tin cơ bản">
        <ActionForm action={createStudioProductAction} submitLabel="Tạo & mở Studio">
          <Input name="nameVi" label="Tên (VI)" required />
          <Input name="nameEn" label="Tên (EN)" />
          <Input name="slug" label="Slug" placeholder={suggestProductSlug("ten-san-pham")} />
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Nền tảng (tùy chọn)</legend>
            {[
              { value: "web", label: "Web" },
              { value: "desktop", label: "Windows / macOS / Linux" },
              { value: "mobile", label: "Android / iOS" },
            ].map((p) => (
              <label key={p.value} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="platforms" value={p.value} />
                {p.label}
              </label>
            ))}
          </fieldset>
          <Select name="licensingMode" label="Bản quyền (nâng cao)" options={LICENSING_OPTIONS} />
        </ActionForm>
      </AdminFormSection>
    </div>
  );
}
