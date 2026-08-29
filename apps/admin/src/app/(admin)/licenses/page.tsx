import { ADMIN_PAGE_SIZE, listAdminLicenses } from "@khepree/db";
import type { Metadata } from "next";
import Link from "next/link";
import { DataTable, Td } from "@/components/data-table";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Licenses" };

export default async function LicensesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdmin("entitlement.read");
  const params = await searchParams;
  const page = parsePage(params.page);
  const q = params.q?.trim() ?? "";
  const rows = await listAdminLicenses({ q, page });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Licenses</h1>
      <SearchForm q={q} />
      <DataTable headers={["License", "Key", "Status", "Principal", "Created"]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <Td>
              <Link className="text-khepree-teal underline" href={`/licenses/${row.publicId}`}>
                {row.publicId}
              </Link>
            </Td>
            <Td>
              {row.keyPrefix}…{row.keyLast4}
            </Td>
            <Td>{row.status}</Td>
            <Td>{row.principalId.slice(0, 8)}</Td>
            <Td>{formatDate(row.createdAt)}</Td>
          </tr>
        ))}
      </DataTable>
      <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} q={q} />
    </div>
  );
}
