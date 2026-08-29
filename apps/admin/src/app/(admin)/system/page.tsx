import { getEnv, isDatabaseConfigured, isEmailConfigured, isStorageConfigured } from "@khepree/config";
import { ADMIN_PAGE_SIZE, listAdminSystemEvents } from "@khepree/db";
import type { Metadata } from "next";
import { DataTable, Td } from "@/components/data-table";
import { Pagination } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "System" };

export default async function SystemPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin("admin.access");
  const env = getEnv();
  const page = parsePage((await searchParams).page);
  const rows = await listAdminSystemEvents({ page });
  const flags = [
    { label: "NODE_ENV", value: env.NODE_ENV },
    { label: "Database", value: isDatabaseConfigured(env) ? "configured" : "not configured" },
    { label: "Storage", value: isStorageConfigured(env) ? "configured" : "not configured" },
    { label: "Email", value: isEmailConfigured(env) ? "configured" : "not configured" },
    {
      label: "Admin MFA (prod)",
      value: "ADMIN and SUPER_ADMIN must enable MFA in production",
    },
  ];
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">System</h1>
      <ul className="space-y-1 text-sm">
        {flags.map((row) => (
          <li key={row.label}>
            <span className="font-medium">{row.label}:</span> {row.value}
          </li>
        ))}
      </ul>
      <section className="space-y-3">
        <h2 className="font-semibold">System events</h2>
        <DataTable headers={["When", "Type", "Severity"]} empty={rows.length === 0}>
          {rows.map((row) => (
            <tr key={row.id}>
              <Td>{formatDate(row.createdAt)}</Td>
              <Td>{row.eventType}</Td>
              <Td>{row.severity}</Td>
            </tr>
          ))}
        </DataTable>
        <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} />
      </section>
    </div>
  );
}
