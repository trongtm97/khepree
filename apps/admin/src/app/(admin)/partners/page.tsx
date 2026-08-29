import { ADMIN_PAGE_SIZE, listAdminPartners } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import type { Metadata } from "next";
import Link from "next/link";
import { DataTable, Td } from "@/components/data-table";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdminAny } from "@/lib/admin-session";
import { formatDate, formatMoney, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Partners" };

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requireAdminAny(["partner.admin", "support.read", "finance.read"]);
  const canOpen = hasPermission({ globalRole: session.globalRole }, "partner.admin") ||
    hasPermission({ globalRole: session.globalRole }, "finance.write");
  const params = await searchParams;
  const page = parsePage(params.page);
  const q = params.q?.trim() ?? "";
  const rows = await listAdminPartners({ q, page });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Partners</h1>
      <SearchForm q={q} />
      <DataTable headers={["Partner", "Status", "Wallet", "Created"]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <Td>
              {canOpen ? (
                <Link className="text-khepree-teal underline" href={`/partners/${row.id}`}>
                  {row.name}
                </Link>
              ) : (
                row.name
              )}
              <div className="text-xs text-khepree-slate/70">{row.slug}</div>
            </Td>
            <Td>{row.status}</Td>
            <Td>{row.balanceMinor != null ? formatMoney(row.balanceMinor, row.currency ?? "USD") : "—"}</Td>
            <Td>{formatDate(row.createdAt)}</Td>
          </tr>
        ))}
      </DataTable>
      <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} q={q} />
    </div>
  );
}
