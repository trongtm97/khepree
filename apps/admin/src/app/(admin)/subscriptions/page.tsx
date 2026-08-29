import { ADMIN_PAGE_SIZE, listAdminSubscriptions } from "@khepree/db";
import type { Metadata } from "next";
import { DataTable, Td } from "@/components/data-table";
import { Pagination } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Subscriptions" };

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin("finance.read");
  const params = await searchParams;
  const page = parsePage(params.page);
  const rows = await listAdminSubscriptions({ page });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Subscriptions</h1>
      <DataTable headers={["ID", "Status", "Provider", "Period"]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <Td>{row.publicId}</Td>
            <Td>{row.status}</Td>
            <Td>{row.provider ?? "—"}</Td>
            <Td>
              {formatDate(row.currentPeriodStart)} → {formatDate(row.currentPeriodEnd)}
            </Td>
          </tr>
        ))}
      </DataTable>
      <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} />
    </div>
  );
}
