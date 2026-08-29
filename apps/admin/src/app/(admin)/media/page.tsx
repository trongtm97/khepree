import { ADMIN_PAGE_SIZE, listAdminMedia } from "@khepree/db";
import type { Metadata } from "next";
import { signDownloadAction } from "@/app/(admin)/actions";
import { ActionForm } from "@/components/action-form";
import { DataTable, Td } from "@/components/data-table";
import { Pagination } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Media" };

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  await requireAdmin("content.read");
  const page = parsePage((await searchParams).page);
  const rows = await listAdminMedia({ page });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Media</h1>
      <p className="text-sm text-khepree-slate/70">R2-backed library. Private objects use signed download URLs.</p>
      <DataTable headers={["ID", "MIME", "Visibility", "Context", "Created", ""]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <Td>{row.publicId}</Td>
            <Td>{row.mimeType}</Td>
            <Td>{row.visibility}</Td>
            <Td>{row.context ?? "—"}</Td>
            <Td>{formatDate(row.createdAt)}</Td>
            <Td>
              {row.visibility === "private" ? (
                <ActionForm action={signDownloadAction} submitLabel="Sign URL">
                  <input type="hidden" name="mediaPublicId" value={row.publicId} />
                </ActionForm>
              ) : (
                "public"
              )}
            </Td>
          </tr>
        ))}
      </DataTable>
      <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} />
    </div>
  );
}
