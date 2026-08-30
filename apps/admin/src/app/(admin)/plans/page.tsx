import { ADMIN_PAGE_SIZE, listAdminPlans, listAdminProducts } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import { Input, Select } from "@khepree/ui";
import type { Metadata } from "next";
import { createPlanAction, deletePlanAction, setPlanStatusAction } from "@/app/(admin)/actions";
import {
  AdminFormSection,
  AdminPageHeader,
  AdminStatusBadge,
  AdminTable,
  AdminTd,
  statusTone,
} from "@/components/admin";
import { ActionForm } from "@/components/action-form";
import { DangerFields } from "@/components/danger-fields";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { labelStatus } from "@/lib/labels";
import { parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Gói" };

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requireAdmin("catalog.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "catalog.write");
  const params = await searchParams;
  const page = parsePage(params.page);
  const q = params.q?.trim() ?? "";
  const [rows, products] = await Promise.all([listAdminPlans({ q, page }), listAdminProducts({ page: 1 })]);

  return (
    <div className="space-y-8">
      <AdminPageHeader title="Gói" description="Gói đăng ký và loại thanh toán theo sản phẩm." />
      {canWrite ? (
        <AdminFormSection title="Tạo gói mới">
          <ActionForm action={createPlanAction} submitLabel="Tạo gói">
            <Select
              name="productId"
              label="Sản phẩm"
              options={products.map((row) => ({ value: row.id, label: row.slug }))}
            />
            <Input name="slug" label="Slug" required />
            <Input name="nameVi" label="Tên (VI)" required />
            <Input name="nameEn" label="Tên (EN)" />
            <Select
              name="billingType"
              label="Thanh toán"
              options={["free", "one_time", "recurring", "perpetual", "custom"].map((v) => ({
                value: v,
                label: v,
              }))}
            />
          </ActionForm>
        </AdminFormSection>
      ) : null}
      <SearchForm q={q} />
      <AdminTable headers={["Sản phẩm", "Slug", "Thanh toán", "Trạng thái", ""]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <AdminTd>{row.productSlug}</AdminTd>
            <AdminTd>{row.slug}</AdminTd>
            <AdminTd>{row.billingType}</AdminTd>
            <AdminTd>
              <AdminStatusBadge label={labelStatus(row.status)} tone={statusTone(row.status)} />
            </AdminTd>
            <AdminTd>
              {canWrite ? (
                <div className="space-y-3">
                  <ActionForm action={setPlanStatusAction} submitLabel="Lưu trữ">
                    <input type="hidden" name="planId" value={row.id} />
                    <input type="hidden" name="status" value="archived" />
                  </ActionForm>
                  <ActionForm action={deletePlanAction} submitLabel="Xóa" danger>
                    <input type="hidden" name="planId" value={row.id} />
                    <DangerFields />
                  </ActionForm>
                </div>
              ) : null}
            </AdminTd>
          </tr>
        ))}
      </AdminTable>
      <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} q={q} />
    </div>
  );
}
