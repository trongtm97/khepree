import { getAdminUser, listAdminDevices, listAdminEntitlements } from "@khepree/db";
import { hasPermission } from "@khepree/security";
import { GLOBAL_ROLES } from "@khepree/types";
import { Select } from "@khepree/ui";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { DangerFields } from "@/components/danger-fields";
import { DataTable, Td } from "@/components/data-table";
import {
  revokeUserSessionAction,
  setUserRoleAction,
  setUserSuspendedAction,
} from "@/app/(admin)/actions";
import { requireAdmin } from "@/lib/admin-session";
import { formatDate } from "@/lib/format";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin("admin.users.read");
  const { id } = await params;
  const user = await getAdminUser(id);
  if (!user) notFound();
  const canWrite = hasPermission({ globalRole: session.globalRole }, "admin.users.write");
  const entitlements = await listAdminEntitlements({ principalId: id, page: 1 });
  const devices = await listAdminDevices({ principalId: id, page: 1 });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{user.email}</h1>
        <p className="mt-1 text-sm text-khepree-slate/70">
          {user.name} · {user.globalRole} · {user.suspendedAt ? "suspended" : "active"} · MFA{" "}
          {user.twoFactorEnabled ? "on" : "off"}
        </p>
      </header>

      {canWrite ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-3">
            <h2 className="font-semibold">Change role</h2>
            <ActionForm action={setUserRoleAction} submitLabel="Update role" danger>
              <input type="hidden" name="userId" value={user.id} />
              <Select
                name="role"
                label="Role"
                defaultValue={user.globalRole}
                options={GLOBAL_ROLES.map((role) => ({ value: role, label: role }))}
              />
              <DangerFields />
            </ActionForm>
          </section>
          <section className="space-y-3">
            <h2 className="font-semibold">Status</h2>
            <ActionForm
              action={setUserSuspendedAction}
              submitLabel={user.suspendedAt ? "Unsuspend" : "Suspend"}
              danger
            >
              <input type="hidden" name="userId" value={user.id} />
              <input type="hidden" name="suspended" value={user.suspendedAt ? "0" : "1"} />
              <DangerFields />
            </ActionForm>
          </section>
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-semibold">Sessions</h2>
        <DataTable headers={["ID", "IP", "User agent", "Expires", ""]} empty={user.sessions.length === 0}>
          {user.sessions.map((row) => (
            <tr key={row.id}>
              <Td className="font-mono text-xs">{row.id.slice(0, 8)}</Td>
              <Td>{row.ipAddress ?? "—"}</Td>
              <Td>{row.userAgent ?? "—"}</Td>
              <Td>{formatDate(row.expiresAt)}</Td>
              <Td>
                {canWrite ? (
                  <ActionForm action={revokeUserSessionAction} submitLabel="Revoke" danger>
                    <input type="hidden" name="userId" value={user.id} />
                    <input type="hidden" name="sessionId" value={row.id} />
                    <DangerFields />
                  </ActionForm>
                ) : null}
              </Td>
            </tr>
          ))}
        </DataTable>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Entitlements</h2>
        <DataTable headers={["ID", "Status", "Source"]} empty={entitlements.length === 0}>
          {entitlements.map((row) => (
            <tr key={row.id}>
              <Td>{row.publicId}</Td>
              <Td>{row.status}</Td>
              <Td>{row.source}</Td>
            </tr>
          ))}
        </DataTable>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Devices</h2>
        <DataTable headers={["Device", "Status", "Platform"]} empty={devices.length === 0}>
          {devices.map((row) => (
            <tr key={row.id}>
              <Td>{row.publicId}</Td>
              <Td>{row.status}</Td>
              <Td>{row.platform ?? "—"}</Td>
            </tr>
          ))}
        </DataTable>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Audit timeline</h2>
        <DataTable headers={["When", "Action", "Resource", "IP"]} empty={user.audit.length === 0}>
          {user.audit.map((row) => (
            <tr key={row.id}>
              <Td>{formatDate(row.createdAt)}</Td>
              <Td>{row.action}</Td>
              <Td>
                {row.resourceType} {row.resourceId ?? ""}
              </Td>
              <Td>{row.ipAddress ?? "—"}</Td>
            </tr>
          ))}
        </DataTable>
      </section>
    </div>
  );
}
