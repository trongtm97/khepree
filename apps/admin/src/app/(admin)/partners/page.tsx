import { ADMIN_PAGE_SIZE, listAdminPartners } from "@khepree/db";
import { DEFAULT_CURRENCY } from "@khepree/config";
import { hasPermission } from "@khepree/security";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader, AdminStatusBadge, AdminTable, AdminTd, statusTone } from "@/components/admin";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdminAny } from "@/lib/admin-session";
import { labelStatus } from "@/lib/labels";
import { formatDate, formatMoney, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Đại lý" };

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requireAdminAny(["partner.admin", "support.read", "finance.read"]);
  const canOpen =
    hasPermission({ globalRole: session.globalRole }, "partner.admin") ||
    hasPermission({ globalRole: session.globalRole }, "finance.write");
  const params = await searchParams;
  const page = parsePage(params.page);
  const q = params.q?.trim() ?? "";
  const rows = await listAdminPartners({ q, page });

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Đại lý" description="Quản lý đối tác và ví hoa hồng." />
      <SearchForm q={q} />
      <AdminTable headers={["Đại lý", "Trạng thái", "Ví", "Ngày tạo"]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <AdminTd>
              {canOpen ? (
                <Link className="text-khepree-teal underline" href={`/partners/${row.id}`}>
                  {row.name}
                </Link>
              ) : (
                row.name
              )}
              <div className="text-xs text-khepree-slate/70">{row.slug}</div>
            </AdminTd>
            <AdminTd>
              <AdminStatusBadge label={labelStatus(row.status)} tone={statusTone(row.status)} />
            </AdminTd>
            <AdminTd>
              {row.balanceMinor != null
                ? formatMoney(row.balanceMinor, row.currency ?? DEFAULT_CURRENCY)
                : "—"}
            </AdminTd>
            <AdminTd>{formatDate(row.createdAt)}</AdminTd>
          </tr>
        ))}
      </AdminTable>
      <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} q={q} />
    </div>
  );
}
