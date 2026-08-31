import { ADMIN_PAGE_SIZE, listAdminPayments } from "@khepree/db";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader, AdminStatusBadge, AdminTable, AdminTd, statusTone } from "@/components/admin";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { formatCommerceStatus, formatDate, formatMoney, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Thanh toán" };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdmin("finance.read");
  const params = await searchParams;
  const page = parsePage(params.page);
  const q = params.q?.trim() ?? "";
  const rows = await listAdminPayments({ q, page });

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Thanh toán" description="Danh sách thanh toán. Tìm theo mã thanh toán." />
      <p className="text-sm">
        <Link className="text-khepree-teal underline" href="/payments/sepay">
          Cấu hình SePay & IPN
        </Link>
      </p>
      <SearchForm q={q} />
      <AdminTable headers={["Thanh toán", "Trạng thái", "Số tiền", "Cổng", "Ngày tạo"]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <AdminTd>{row.publicId}</AdminTd>
            <AdminTd>
              <AdminStatusBadge label={formatCommerceStatus(row.status)} tone={statusTone(row.status)} />
            </AdminTd>
            <AdminTd>{formatMoney(row.amountMinor, row.currency)}</AdminTd>
            <AdminTd>{row.provider}</AdminTd>
            <AdminTd>{formatDate(row.createdAt)}</AdminTd>
          </tr>
        ))}
      </AdminTable>
      <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} q={q} />
    </div>
  );
}
