import { listAdminFeatures } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import { Input, Select } from "@khepree/ui";
import type { Metadata } from "next";
import { createFeatureAction, deleteFeatureAction } from "@/app/(admin)/actions";
import { ActionForm } from "@/components/action-form";
import { DangerFields } from "@/components/danger-fields";
import { DataTable, Td } from "@/components/data-table";
import { requireAdmin } from "@/lib/admin-session";

export const metadata: Metadata = { title: "Features" };

export default async function FeaturesPage() {
  const session = await requireAdmin("catalog.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "catalog.write");
  const rows = await listAdminFeatures();
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Features</h1>
      {canWrite ? (
        <ActionForm action={createFeatureAction} submitLabel="Create feature">
          <Input name="key" label="Key" required />
          <Input name="nameEn" label="Name (EN)" required />
          <Select
            name="valueType"
            label="Type"
            options={["boolean", "integer", "string"].map((v) => ({ value: v, label: v }))}
          />
        </ActionForm>
      ) : null}
      <DataTable headers={["Key", "Type", ""]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <Td>{row.key}</Td>
            <Td>{row.valueType}</Td>
            <Td>
              {canWrite ? (
                <ActionForm action={deleteFeatureAction} submitLabel="Delete" danger>
                  <input type="hidden" name="featureId" value={row.id} />
                  <DangerFields />
                </ActionForm>
              ) : null}
            </Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
