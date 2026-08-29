import { listAdminUsers } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import type { Metadata } from "next";
import Link from "next/link";
import { DataTable, Td } from "@/components/data-table";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Users" };

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
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">Search, filter, and open a user record.</p>
      </header>
      <SearchForm q={q} extra={[{ name: "role", label: "Role", defaultValue: role }]} />
      <DataTable headers={["Email", "Role", "Status", "MFA", "Created"]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <Td>
              <Link className="text-khepree-teal underline" href={`/users/${row.id}`}>
                {row.email}
              </Link>
              <div className="text-xs text-khepree-slate/70">{row.name}</div>
            </Td>
            <Td>{row.globalRole}</Td>
            <Td>{row.suspendedAt ? "suspended" : "active"}</Td>
            <Td>{row.twoFactorEnabled ? "on" : "off"}</Td>
            <Td>{formatDate(row.createdAt)}</Td>
          </tr>
        ))}
      </DataTable>
      {canWrite ? null : <p className="text-xs text-khepree-slate/70">Read-only for your role.</p>}
      <Pagination page={page} hasMore={rows.length >= 50} q={q} />
    </div>
  );
}
