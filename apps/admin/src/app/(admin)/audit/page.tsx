import { ADMIN_PAGE_SIZE, listAdminAudit } from "@khepree/db";
import type { Metadata } from "next";
import { DataTable, Td } from "@/components/data-table";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdminAny } from "@/lib/admin-session";
import { formatDate, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Audit logs" };

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdminAny(["support.read", "finance.read"]);
  const params = await searchParams;
  const page = parsePage(params.page);
  const q = params.q?.trim() ?? "";
  const rows = await listAdminAudit({ q, page });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Audit logs</h1>
      <p className="text-sm text-khepree-slate/70">Append-only. This page cannot edit or delete rows.</p>
      <SearchForm q={q} />
      <DataTable headers={["When", "Actor", "Action", "Resource", "IP"]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <Td>{formatDate(row.createdAt)}</Td>
            <Td>{row.actorUserId ?? "—"}</Td>
            <Td>{row.action}</Td>
            <Td>
              {row.resourceType} {row.resourceId ?? ""}
            </Td>
            <Td>{row.ipAddress ?? "—"}</Td>
          </tr>
        ))}
      </DataTable>
      <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} q={q} />
    </div>
  );
}
