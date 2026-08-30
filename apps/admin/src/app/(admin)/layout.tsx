import { AdminAppShell } from "@/components/admin-app-shell";
import { requireAdmin } from "@/lib/admin-session";
import { ADMIN_NAV_GROUPS, filterNavGroups } from "@/lib/routes";
import { hasAnyPermission } from "@khepree/security";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdmin();
  const ctx = { globalRole: session.globalRole };
  const navGroups = filterNavGroups(ADMIN_NAV_GROUPS, (permissions) => hasAnyPermission(ctx, permissions));

  return (
    <AdminAppShell
      userName={session.user.name}
      userEmail={session.user.email}
      role={session.globalRole}
      navGroups={navGroups}
    >
      {children}
    </AdminAppShell>
  );
}
