import { getAdminLicense } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import { notFound } from "next/navigation";
import { reissueLicenseAction, revokeEntitlementAction } from "@/app/(admin)/actions";
import { ActionForm } from "@/components/action-form";
import { DangerFields } from "@/components/danger-fields";
import { DataTable, Td } from "@/components/data-table";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate } from "@/lib/format";

export default async function LicenseDetailPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const session = await requireAdmin("entitlement.read");
  const { publicId } = await params;
  const license = await getAdminLicense(publicId);
  if (!license) notFound();
  const canWrite = hasPermission({ globalRole: session.globalRole }, "entitlement.admin");
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{license.publicId}</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">
          {license.status} · {license.keyPrefix}…{license.keyLast4} · entitlement {license.entitlementPublicId}
        </p>
      </header>
      {canWrite ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <ActionForm action={reissueLicenseAction} submitLabel="Reissue key" danger>
            <input type="hidden" name="entitlementId" value={license.entitlementId} />
            <DangerFields reasonLabel="Reissue reason" />
          </ActionForm>
          <ActionForm action={revokeEntitlementAction} submitLabel="Revoke license" danger>
            <input type="hidden" name="entitlementId" value={license.entitlementId} />
            <DangerFields reasonLabel="Revoke reason" />
          </ActionForm>
        </div>
      ) : null}
      <section className="space-y-3">
        <h2 className="font-semibold">Activation history</h2>
        <DataTable headers={["Device", "Status", "Activated", "Deactivated"]} empty={license.activations.length === 0}>
          {license.activations.map((row) => (
            <tr key={row.id}>
              <Td>{row.deviceId.slice(0, 8)}</Td>
              <Td>{row.status}</Td>
              <Td>{formatDate(row.activatedAt)}</Td>
              <Td>{formatDate(row.deactivatedAt)}</Td>
            </tr>
          ))}
        </DataTable>
      </section>
    </div>
  );
}
