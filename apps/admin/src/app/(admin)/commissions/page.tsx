import { ADMIN_PAGE_SIZE, listAdminCommissions } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import type { Metadata } from "next";
import { commissionAction } from "@/app/(admin)/actions";
import { ActionForm } from "@/components/action-form";
import { DataTable, Td } from "@/components/data-table";
import { Pagination } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { formatMoney, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Commissions" };

export default async function CommissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await requireAdmin("finance.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "finance.write");
  const page = parsePage((await searchParams).page);
  const rows = await listAdminCommissions({ page });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Commissions</h1>
      <DataTable headers={["Commission", "Partner", "Amount", "Status", ""]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <Td>{row.publicId}</Td>
            <Td>{row.partnerName}</Td>
            <Td>{formatMoney(row.amountMinor, row.currency)}</Td>
            <Td>{row.status}</Td>
            <Td>
              {canWrite ? (
                <div className="flex flex-wrap gap-2">
                  {row.status === "pending" ? (
                    <ActionForm action={commissionAction} submitLabel="Approve">
                      <input type="hidden" name="commissionId" value={row.id} />
                      <input type="hidden" name="op" value="approve" />
                    </ActionForm>
                  ) : null}
                  {row.status === "approved" ? (
                    <ActionForm action={commissionAction} submitLabel="Release">
                      <input type="hidden" name="commissionId" value={row.id} />
                      <input type="hidden" name="op" value="release" />
                    </ActionForm>
                  ) : null}
                  {row.status === "available" ? (
                    <ActionForm action={commissionAction} submitLabel="Pay">
                      <input type="hidden" name="commissionId" value={row.id} />
                      <input type="hidden" name="op" value="pay" />
                    </ActionForm>
                  ) : null}
                </div>
              ) : null}
            </Td>
          </tr>
        ))}
      </DataTable>
      <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} />
    </div>
  );
}
