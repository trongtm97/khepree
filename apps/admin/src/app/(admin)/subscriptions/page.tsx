import { ADMIN_PAGE_SIZE, listAdminSubscriptions } from "@khepree/db";
import type { Metadata } from "next";
import { AdminPageHeader, AdminStatusBadge, AdminTable, AdminTd, statusTone } from "@/components/admin";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { labelStatus } from "@/lib/labels";
import { formatDate, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Đăng ký" };

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdmin("finance.read");
  const params = await searchParams;
  const page = parsePage(params.page);
  const q = params.q?.trim() ?? "";
  const rows = await listAdminSubscriptions({ q, page });

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Đăng ký" description="Đăng ký định kỳ đang hoạt động và lịch sử." />
      <SearchForm q={q} />
      <AdminTable headers={["Mã", "Trạng thái", "Cổng", "Chu kỳ"]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <AdminTd>{row.publicId}</AdminTd>
            <AdminTd>
              <AdminStatusBadge label={labelStatus(row.status)} tone={statusTone(row.status)} />
            </AdminTd>
            <AdminTd>{row.provider ?? "—"}</AdminTd>
            <AdminTd>
              {formatDate(row.currentPeriodStart)} → {formatDate(row.currentPeriodEnd)}
            </AdminTd>
          </tr>
        ))}
      </AdminTable>
      <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} q={q} />
    </div>
  );
}
