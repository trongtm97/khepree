import { listAdminPlans, listAdminPrices } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import { Input, Select } from "@khepree/ui";
import type { Metadata } from "next";
import { createPriceAction, deletePriceAction, setPriceActiveAction } from "@/app/(admin)/actions";
import { ActionForm } from "@/components/action-form";
import { DangerFields } from "@/components/danger-fields";
import { DataTable, Td } from "@/components/data-table";
import { requireAdmin } from "@/lib/admin-session";
import { formatMoney } from "@/lib/format";

export const metadata: Metadata = { title: "Prices" };

export default async function PricesPage() {
  const session = await requireAdmin("catalog.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "catalog.write");
  const [rows, plans] = await Promise.all([listAdminPrices(), listAdminPlans()]);
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Prices</h1>
      {canWrite ? (
        <ActionForm action={createPriceAction} submitLabel="Create price">
          <Select
            name="planId"
            label="Plan"
            options={plans.map((row) => ({ value: row.id, label: `${row.productSlug}/${row.slug}` }))}
          />
          <Input name="currency" label="Currency" defaultValue="USD" required />
          <Input name="amountMinor" label="Amount (minor units)" required />
          <Input name="interval" label="Interval" placeholder="month" />
        </ActionForm>
      ) : null}
      <DataTable headers={["Public ID", "Plan", "Amount", "Active", ""]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <Td>{row.publicId}</Td>
            <Td>{row.planSlug}</Td>
            <Td>
              {formatMoney(row.amountMinor, row.currency)} {row.interval ?? ""}
            </Td>
            <Td>{row.isActive ? "yes" : "no"}</Td>
            <Td>
              {canWrite ? (
                <div className="space-y-3">
                  <ActionForm action={setPriceActiveAction} submitLabel={row.isActive ? "Deactivate" : "Activate"}>
                    <input type="hidden" name="priceId" value={row.id} />
                    <input type="hidden" name="isActive" value={row.isActive ? "0" : "1"} />
                  </ActionForm>
                  <ActionForm action={deletePriceAction} submitLabel="Delete" danger>
                    <input type="hidden" name="priceId" value={row.id} />
                    <DangerFields />
                  </ActionForm>
                </div>
              ) : null}
            </Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
