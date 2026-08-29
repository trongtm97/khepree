import { ADMIN_PAGE_SIZE, listAdminOrders } from "@khepree/db";
import type { Metadata } from "next";
import { DataTable, Td } from "@/components/data-table";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdminAny } from "@/lib/admin-session";
import { formatDate, formatMoney, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdminAny(["finance.read", "support.read"]);
  const params = await searchParams;
  const page = parsePage(params.page);
  const q = params.q?.trim() ?? "";
  const rows = await listAdminOrders({ q, page });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
      <SearchForm q={q} />
      <DataTable headers={["Order", "Status", "Total", "Customer", "Created"]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <Td>{row.publicId}</Td>
            <Td>{row.status}</Td>
            <Td>{formatMoney(row.totalMinor, row.currency)}</Td>
            <Td>{row.userId ?? row.customerPublicId}</Td>
            <Td>{formatDate(row.createdAt)}</Td>
          </tr>
        ))}
      </DataTable>
      <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} q={q} />
    </div>
  );
}
