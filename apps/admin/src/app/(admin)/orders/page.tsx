import { ADMIN_PAGE_SIZE, listAdminOrders } from "@khepree/db";
import type { Metadata } from "next";
import {
  AdminPageHeader,
  AdminStatusBadge,
  AdminTable,
  AdminTd,
  AdminTechnicalDetails,
  statusTone,
} from "@/components/admin";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdminAny } from "@/lib/admin-session";
import { formatCommerceStatus, formatDate, formatMoney, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Đơn hàng" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdminAny(["finance.read", "support.read"]);
  const params = await searchParams;
  const page = parsePage(params.page);
  const q = params.q?.trim() ?? "";
  const rows = await listAdminOrders({ q, page });

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Đơn hàng" description="Danh sách đơn hàng. Tìm theo mã đơn công khai." />
      <SearchForm q={q} />
      <AdminTable headers={["Đơn hàng", "Trạng thái", "Tổng", "Khách hàng", "Ngày tạo"]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <AdminTd>{row.publicId}</AdminTd>
            <AdminTd>
              <AdminStatusBadge label={formatCommerceStatus(row.status)} tone={statusTone(row.status)} />
            </AdminTd>
            <AdminTd>{formatMoney(row.totalMinor, row.currency)}</AdminTd>
            <AdminTd>
              {row.customerPublicId ?? "—"}
              {row.userId ? <AdminTechnicalDetails>{row.userId}</AdminTechnicalDetails> : null}
            </AdminTd>
            <AdminTd>{formatDate(row.createdAt)}</AdminTd>
          </tr>
        ))}
      </AdminTable>
      <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} q={q} />
    </div>
  );
}
