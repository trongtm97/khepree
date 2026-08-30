import { ADMIN_PAGE_SIZE, listAdminPlans, listAdminPrices } from "@khepree/db";
import { DEFAULT_CURRENCY } from "@khepree/config";
import { hasPermission } from "@khepree/security";
import { Input, Select } from "@khepree/ui";
import type { Metadata } from "next";
import { createPriceAction, deletePriceAction, setPriceActiveAction } from "@/app/(admin)/actions";
import {
  AdminFormSection,
  AdminPageHeader,
  AdminStatusBadge,
  AdminTable,
  AdminTd,
  AdminTechnicalDetails,
} from "@/components/admin";
import { ActionForm } from "@/components/action-form";
import { DangerFields } from "@/components/danger-fields";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { formatMoney, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Giá" };

export default async function PricesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requireAdmin("catalog.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "catalog.write");
  const params = await searchParams;
  const page = parsePage(params.page);
  const q = params.q?.trim() ?? "";
  const [rows, plans] = await Promise.all([listAdminPrices({ q, page }), listAdminPlans({ page: 1 })]);

  return (
    <div className="space-y-8">
      <AdminPageHeader title="Giá" description="Giá theo gói. Mặc định tiền tệ VND." />
      {canWrite ? (
        <AdminFormSection title="Tạo giá">
          <ActionForm action={createPriceAction} submitLabel="Tạo giá">
            <Select
              name="planId"
              label="Gói"
              options={plans.map((row) => ({ value: row.id, label: `${row.productSlug}/${row.slug}` }))}
            />
            <Input name="currency" label="Tiền tệ" defaultValue={DEFAULT_CURRENCY} required />
            <Input name="amountMinor" label="Số tiền (đơn vị nhỏ nhất)" required />
            <Input name="interval" label="Chu kỳ" placeholder="month" />
          </ActionForm>
        </AdminFormSection>
      ) : null}
      <SearchForm q={q} />
      <AdminTable headers={["Gói", "Số tiền", "Hoạt động", ""]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <AdminTd>
              {row.planSlug}
              <AdminTechnicalDetails>{row.publicId}</AdminTechnicalDetails>
            </AdminTd>
            <AdminTd>
              {formatMoney(row.amountMinor, row.currency)} {row.interval ?? ""}
            </AdminTd>
            <AdminTd>
              <AdminStatusBadge label={row.isActive ? "Hoạt động" : "Tắt"} tone={row.isActive ? "success" : "muted"} />
            </AdminTd>
            <AdminTd>
              {canWrite ? (
                <div className="space-y-3">
                  <ActionForm action={setPriceActiveAction} submitLabel={row.isActive ? "Tắt" : "Bật"}>
                    <input type="hidden" name="priceId" value={row.id} />
                    <input type="hidden" name="isActive" value={row.isActive ? "0" : "1"} />
                  </ActionForm>
                  <ActionForm action={deletePriceAction} submitLabel="Xóa" danger>
                    <input type="hidden" name="priceId" value={row.id} />
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
