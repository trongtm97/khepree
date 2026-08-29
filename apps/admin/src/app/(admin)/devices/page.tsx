import { ADMIN_PAGE_SIZE, listAdminDevices } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import type { Metadata } from "next";
import { blockDeviceAction } from "@/app/(admin)/actions";
import { ActionForm } from "@/components/action-form";
import { DangerFields } from "@/components/danger-fields";
import { DataTable, Td } from "@/components/data-table";
import { Pagination } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Devices" };

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireAdmin("entitlement.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "entitlement.admin");
  const page = parsePage((await searchParams).page);
  const rows = await listAdminDevices({ page });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Devices</h1>
      <DataTable headers={["Device", "Principal", "Status", "Platform", "Last seen", ""]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <Td>{row.publicId}</Td>
            <Td>
              {row.principalType}:{row.principalId.slice(0, 8)}
            </Td>
            <Td>{row.status}</Td>
            <Td>{row.platform ?? "—"}</Td>
            <Td>{formatDate(row.lastSeenAt)}</Td>
            <Td>
              {canWrite && row.status !== "blocked" ? (
                <ActionForm action={blockDeviceAction} submitLabel="Block" danger>
                  <input type="hidden" name="devicePublicId" value={row.publicId} />
                  <DangerFields />
                </ActionForm>
              ) : null}
            </Td>
          </tr>
        ))}
      </DataTable>
      <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} />
    </div>
  );
}
