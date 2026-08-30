import { listAdminUsers } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader, AdminStatusBadge, AdminTable, AdminTd } from "@/components/admin";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { adminUi } from "@/lib/labels";
import { formatDate, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Người dùng" };

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}) {
  const session = await requireAdmin("admin.users.read");
  const params = await searchParams;
  const page = parsePage(params.page);
  const q = params.q?.trim() ?? "";
  const role = params.role?.trim() ?? "";
  const rows = await listAdminUsers({ q, role: role || undefined, page });
  const canWrite = hasPermission({ globalRole: session.globalRole }, "admin.users.write");

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Người dùng" description="Tìm kiếm, lọc và mở hồ sơ người dùng." />
      <SearchForm q={q} extra={[{ name: "role", label: "Vai trò", defaultValue: role }]} />
      <AdminTable headers={["Email", "Vai trò", "Trạng thái", "MFA", "Ngày tạo"]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <AdminTd>
              <Link className="text-khepree-teal underline" href={`/users/${row.id}`}>
                {row.email}
              </Link>
              <div className="text-xs text-khepree-slate/70">{row.name}</div>
            </AdminTd>
            <AdminTd>{row.globalRole}</AdminTd>
            <AdminTd>
              <AdminStatusBadge
                label={row.suspendedAt ? "Tạm dừng" : "Hoạt động"}
                tone={row.suspendedAt ? "danger" : "success"}
              />
            </AdminTd>
            <AdminTd>{row.twoFactorEnabled ? "Bật" : "Tắt"}</AdminTd>
            <AdminTd>{formatDate(row.createdAt)}</AdminTd>
          </tr>
        ))}
      </AdminTable>
      {!canWrite ? <p className="text-xs text-khepree-slate/70">{adminUi.readOnly}</p> : null}
      <Pagination page={page} hasMore={rows.length >= 50} params={{ q, role }} />
    </div>
  );
}
