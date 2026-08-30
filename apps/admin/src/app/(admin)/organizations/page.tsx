import { listAdminOrganizations } from "@khepree/db";
import type { Metadata } from "next";
import { AdminPageHeader, AdminTable, AdminTd } from "@/components/admin";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Tổ chức" };

export default async function OrganizationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdmin("admin.users.read");
  const params = await searchParams;
  const page = parsePage(params.page);
  const q = params.q?.trim() ?? "";
  const rows = await listAdminOrganizations({ q, page });

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Tổ chức" description="Tổ chức khách hàng doanh nghiệp." />
      <SearchForm q={q} />
      <AdminTable headers={["Tên", "Slug", "Ngày tạo"]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <AdminTd>{row.name}</AdminTd>
            <AdminTd>{row.slug}</AdminTd>
            <AdminTd>{formatDate(row.createdAt)}</AdminTd>
          </tr>
        ))}
      </AdminTable>
      <Pagination page={page} hasMore={rows.length >= 50} q={q} />
    </div>
  );
}
