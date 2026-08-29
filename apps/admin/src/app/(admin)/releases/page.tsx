import { listAdminMedia } from "@khepree/db";
import type { Metadata } from "next";
import { DataTable, Td } from "@/components/data-table";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Releases" };

export default async function ReleasesPage() {
  await requireAdmin("content.read");
  const rows = await listAdminMedia({ context: "release", page: 1 });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Releases</h1>
      <p className="text-sm text-khepree-slate/70">
        Release artifacts are private media with context <code>release</code>. There is no separate releases table.
      </p>
      <DataTable headers={["ID", "MIME", "Key", "Created"]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <Td>{row.publicId}</Td>
            <Td>{row.mimeType}</Td>
            <Td className="font-mono text-xs">{row.objectKey}</Td>
            <Td>{formatDate(row.createdAt)}</Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
