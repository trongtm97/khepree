import { ADMIN_PAGE_SIZE, listAdminFeatures } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import { Input, Select } from "@khepree/ui";
import type { Metadata } from "next";
import { createFeatureAction, deleteFeatureAction } from "@/app/(admin)/actions";
import { AdminFormSection, AdminPageHeader, AdminTable, AdminTd } from "@/components/admin";
import { ActionForm } from "@/components/action-form";
import { DangerFields } from "@/components/danger-fields";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Tính năng" };

export default async function FeaturesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requireAdmin("catalog.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "catalog.write");
  const params = await searchParams;
  const page = parsePage(params.page);
  const q = params.q?.trim() ?? "";
  const rows = await listAdminFeatures({ q, page });

  return (
    <div className="space-y-8">
      <AdminPageHeader title="Tính năng" description="Khóa tính năng dùng cho quyền sử dụng theo gói." />
      {canWrite ? (
        <AdminFormSection title="Tạo tính năng">
          <ActionForm action={createFeatureAction} submitLabel="Tạo">
            <Input name="key" label="Khóa" required />
            <Input name="nameVi" label="Tên (VI)" required />
            <Input name="nameEn" label="Tên (EN)" />
            <Select
              name="valueType"
              label="Kiểu"
              options={["boolean", "integer", "string"].map((v) => ({ value: v, label: v }))}
            />
          </ActionForm>
        </AdminFormSection>
      ) : null}
      <SearchForm q={q} />
      <AdminTable headers={["Khóa", "Kiểu", ""]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <AdminTd>{row.key}</AdminTd>
            <AdminTd>{row.valueType}</AdminTd>
            <AdminTd>
              {canWrite ? (
                <ActionForm action={deleteFeatureAction} submitLabel="Xóa" danger>
                  <input type="hidden" name="featureId" value={row.id} />
                  <DangerFields />
                </ActionForm>
              ) : null}
            </AdminTd>
          </tr>
        ))}
      </AdminTable>
      <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} q={q} />
    </div>
  );
}
