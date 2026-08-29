import { ADMIN_PAGE_SIZE, listAdminEntitlements, listAdminPlans, listAdminProducts } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import { Input, Select } from "@khepree/ui";
import type { Metadata } from "next";
import {
  grantEntitlementAction,
  revokeEntitlementAction,
  suspendEntitlementAction,
} from "@/app/(admin)/actions";
import { ActionForm } from "@/components/action-form";
import { DangerFields } from "@/components/danger-fields";
import { DataTable, Td } from "@/components/data-table";
import { Pagination, SearchForm } from "@/components/search-form";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate, parsePage } from "@/lib/format";

export const metadata: Metadata = { title: "Entitlements" };

export default async function EntitlementsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await requireAdmin("entitlement.read");
  const canWrite = hasPermission({ globalRole: session.globalRole }, "entitlement.admin");
  const params = await searchParams;
  const page = parsePage(params.page);
  const q = params.q?.trim() ?? "";
  const [rows, products, plans] = await Promise.all([
    listAdminEntitlements({ q, page }),
    listAdminProducts(),
    listAdminPlans(),
  ]);
  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">Entitlements</h1>
      <p className="text-sm text-khepree-slate/70">
        Grants go through the entitlement service. The UI never writes the entitlements table.
      </p>
      {canWrite ? (
        <ActionForm action={grantEntitlementAction} submitLabel="Grant complimentary">
          <Select
            name="principalType"
            label="Principal"
            options={[
              { value: "USER", label: "USER" },
              { value: "ORGANIZATION", label: "ORGANIZATION" },
            ]}
          />
          <Input name="principalId" label="Principal ID" required />
          <Select
            name="productId"
            label="Product"
            options={products.map((row) => ({ value: row.id, label: row.slug }))}
          />
          <Select
            name="planId"
            label="Plan"
            options={plans.map((row) => ({ value: row.id, label: `${row.productSlug}/${row.slug}` }))}
          />
          <Select
            name="source"
            label="Source"
            options={[
              { value: "complimentary", label: "complimentary" },
              { value: "admin_grant", label: "admin_grant" },
            ]}
          />
          <Input name="startsAt" label="Start (ISO)" type="datetime-local" />
          <Input name="expiresAt" label="End (ISO)" type="datetime-local" />
          <DangerFields reasonLabel="Grant reason" />
        </ActionForm>
      ) : null}
      <SearchForm q={q} />
      <DataTable headers={["ID", "Principal", "Status", "Source", "Expires", ""]} empty={rows.length === 0}>
        {rows.map((row) => (
          <tr key={row.id}>
            <Td>{row.publicId}</Td>
            <Td>
              {row.principalType}:{row.principalId.slice(0, 8)}
            </Td>
            <Td>{row.status}</Td>
            <Td>{row.source}</Td>
            <Td>{formatDate(row.expiresAt)}</Td>
            <Td>
              {canWrite ? (
                <div className="space-y-3">
                  <ActionForm action={suspendEntitlementAction} submitLabel="Suspend" danger>
                    <input type="hidden" name="entitlementId" value={row.id} />
                    <DangerFields />
                  </ActionForm>
                  <ActionForm action={revokeEntitlementAction} submitLabel="Revoke" danger>
                    <input type="hidden" name="entitlementId" value={row.id} />
                    <DangerFields />
                  </ActionForm>
                </div>
              ) : null}
            </Td>
          </tr>
        ))}
      </DataTable>
      <Pagination page={page} hasMore={rows.length >= ADMIN_PAGE_SIZE} q={q} />
    </div>
  );
}
