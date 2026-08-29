import { ADMIN_PAGE_SIZE, listAdminPayments } from "@khepree/db";
import type { Metadata } from "next";
import { DataTable, Td } from "@/components/data-table";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate, formatMoney, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Payments" };

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
      <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
      <SearchForm q={q} />
      <DataTable headers={["Payment", "Status", "Amount", "Provider", "Created"]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <Td>{row.publicId}</Td>
            <Td>{row.status}</Td>
            <Td>{formatMoney(row.amountMinor, row.currency)}</Td>
            <Td>{row.provider}</Td>
            <Td>{formatDate(row.createdAt)}</Td>
          </tr>
        ))}
      </DataTable>
      <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} q={q} />
    </div>
  );
}
