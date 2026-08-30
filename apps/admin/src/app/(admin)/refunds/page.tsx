import { ADMIN_PAGE_SIZE, listAdminRefunds } from "@khepree/db";
import type { Metadata } from "next";
import { AdminPageHeader, AdminStatusBadge, AdminTable, AdminTd, statusTone } from "@/components/admin";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { formatCommerceStatus, formatDate, formatMoney, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Hoàn tiền" };

export default async function RefundsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdmin("finance.read");
  const params = await searchParams;
  const page = parsePage(params.page);
  const q = params.q?.trim() ?? "";
  const rows = await listAdminRefunds({ q, page });

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Hoàn tiền" description="Sổ hoàn tiền thật. Không có hoàn tiền giả lập." />
      <SearchForm q={q} />
      <AdminTable
        headers={["Hoàn tiền", "Thanh toán", "Trạng thái", "Số tiền", "Cổng", "Ngày"]}
        empty={rows.length === 0}
      >
        {rows.map((row) => (
          <tr key={row.id}>
            <AdminTd>{row.publicId}</AdminTd>
            <AdminTd>{row.paymentPublicId}</AdminTd>
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
