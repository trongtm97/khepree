import { listAdminPlans, listAdminProducts } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import { Input, Select } from "@khepree/ui";
import type { Metadata } from "next";
import { createPlanAction, deletePlanAction, setPlanStatusAction } from "@/app/(admin)/actions";
import { ActionForm } from "@/components/action-form";
import { DangerFields } from "@/components/danger-fields";
import { DataTable, Td } from "@/components/data-table";
import { requireAdmin } from "@/lib/admin-session";

export const metadata: Metadata = { title: "Plans" };

export default async function PlansPage() {
  const session = await requireAdmin("catalog.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "catalog.write");
  const [rows, products] = await Promise.all([listAdminPlans(), listAdminProducts()]);
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Plans</h1>
      {canWrite ? (
        <ActionForm action={createPlanAction} submitLabel="Create plan">
          <Select
            name="productId"
            label="Product"
            options={products.map((row) => ({ value: row.id, label: row.slug }))}
          />
          <Input name="slug" label="Slug" required />
          <Input name="nameEn" label="Name (EN)" required />
          <Select
            name="billingType"
            label="Billing"
            options={["free", "one_time", "recurring", "perpetual", "custom"].map((v) => ({
              value: v,
              label: v,
            }))}
          />
        </ActionForm>
      ) : null}
      <DataTable headers={["Product", "Slug", "Billing", "Status", ""]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <Td>{row.productSlug}</Td>
            <Td>{row.slug}</Td>
            <Td>{row.billingType}</Td>
            <Td>{row.status}</Td>
            <Td>
              {canWrite ? (
                <div className="space-y-3">
                  <ActionForm action={setPlanStatusAction} submitLabel="Archive">
                    <input type="hidden" name="planId" value={row.id} />
                    <input type="hidden" name="status" value="archived" />
                  </ActionForm>
                  <ActionForm action={deletePlanAction} submitLabel="Delete" danger>
                    <input type="hidden" name="planId" value={row.id} />
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
