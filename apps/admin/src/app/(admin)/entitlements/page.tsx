import { ADMIN_PAGE_SIZE, listAdminEntitlements, listAdminPlans, listAdminProducts } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import { Input, Select } from "@khepree/ui";
import type { Metadata } from "next";
import {
  grantEntitlementAction,
  revokeEntitlementAction,
  suspendEntitlementAction,
} from "@/app/(admin)/actions";
import {
  AdminFormSection,
  AdminPageHeader,
  AdminStatusBadge,
  AdminTable,
  AdminTd,
  AdminTechnicalDetails,
  statusTone,
} from "@/components/admin";
import { ActionForm } from "@/components/action-form";
import { DangerFields } from "@/components/danger-fields";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { labelStatus } from "@/lib/labels";
import { formatDate, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Quyền sử dụng" };

export default async function EntitlementsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requireAdmin("entitlement.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "entitlement.admin");
  const params = await searchParams;
  const page = parsePage(params.page);
  const q = params.q?.trim() ?? "";
  const [rows, products, plans] = await Promise.all([
    listAdminEntitlements({ q, page }),
    listAdminProducts({ page: 1 }),
    listAdminPlans({ page: 1 }),
  ]);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title="Quyền sử dụng"
        description="Cấp quyền qua dịch vụ entitlement. Giao diện không ghi trực tiếp vào bảng entitlements."
      />
      {canWrite ? (
        <AdminFormSection title="Cấp quyền miễn phí">
          <ActionForm action={grantEntitlementAction} submitLabel="Cấp quyền">
            <Select
              name="principalType"
              label="Đối tượng"
              options={[
                { value: "USER", label: "Người dùng" },
                { value: "ORGANIZATION", label: "Tổ chức" },
              ]}
            />
            <Input name="principalId" label="ID đối tượng" required />
            <Select
              name="productId"
              label="Sản phẩm"
              options={products.map((row) => ({ value: row.id, label: row.slug }))}
            />
            <Select
              name="planId"
              label="Gói"
              options={plans.map((row) => ({ value: row.id, label: `${row.productSlug}/${row.slug}` }))}
            />
            <Select
              name="source"
              label="Nguồn"
              options={[
                { value: "complimentary", label: "complimentary" },
                { value: "admin_grant", label: "admin_grant" },
              ]}
            />
            <Input name="startsAt" label="Bắt đầu (ISO)" type="datetime-local" />
            <Input name="expiresAt" label="Kết thúc (ISO)" type="datetime-local" />
            <DangerFields reasonLabel="Lý do cấp quyền" />
          </ActionForm>
        </AdminFormSection>
      ) : null}
      <SearchForm q={q} />
      <AdminTable headers={["Mã", "Đối tượng", "Trạng thái", "Nguồn", "Hết hạn", ""]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <AdminTd>{row.publicId}</AdminTd>
            <AdminTd>
              {row.principalType}
              <AdminTechnicalDetails>{row.principalId}</AdminTechnicalDetails>
            </AdminTd>
            <AdminTd>
              <AdminStatusBadge label={labelStatus(row.status)} tone={statusTone(row.status)} />
            </AdminTd>
            <AdminTd>{row.source}</AdminTd>
            <AdminTd>{formatDate(row.expiresAt)}</AdminTd>
            <AdminTd>
              {canWrite ? (
                <div className="space-y-3">
                  <ActionForm action={suspendEntitlementAction} submitLabel="Tạm dừng" danger>
                    <input type="hidden" name="entitlementId" value={row.id} />
                    <DangerFields />
                  </ActionForm>
                  <ActionForm action={revokeEntitlementAction} submitLabel="Thu hồi" danger>
                    <input type="hidden" name="entitlementId" value={row.id} />
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
