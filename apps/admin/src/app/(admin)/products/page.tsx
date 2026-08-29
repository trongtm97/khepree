import { listAdminProducts } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import { Input } from "@khepree/ui";
import type { Metadata } from "next";
import { createProductAction, deleteProductAction, setProductStatusAction } from "@/app/(admin)/actions";
import { ActionForm } from "@/components/action-form";
import { DangerFields } from "@/components/danger-fields";
import { DataTable, Td } from "@/components/data-table";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage() {
  const session = await requireAdmin("catalog.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "catalog.write");
  const rows = await listAdminProducts();
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Products</h1>
      {canWrite ? (
        <ActionForm action={createProductAction} submitLabel="Create draft">
          <Input name="slug" label="Slug" required />
          <Input name="nameEn" label="Name (EN)" required />
          <Input name="nameVi" label="Name (VI)" />
        </ActionForm>
      ) : null}
      <DataTable headers={["Slug", "Status", "Created", ""]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <Td>{row.slug}</Td>
            <Td>{row.status}</Td>
            <Td>{formatDate(row.createdAt)}</Td>
            <Td>
              {canWrite ? (
                <div className="space-y-3">
                  <ActionForm action={setProductStatusAction} submitLabel="Retire">
                    <input type="hidden" name="productId" value={row.id} />
                    <input type="hidden" name="status" value="retired" />
                  </ActionForm>
                  <ActionForm action={deleteProductAction} submitLabel="Delete" danger>
                    <input type="hidden" name="productId" value={row.id} />
                    <DangerFields reasonLabel="Why delete (blocked if orders exist)" />
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
