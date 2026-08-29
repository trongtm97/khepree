import { AdminAppShell } from "@/components/admin-app-shell";
import { requireAdmin } from "@/lib/admin-session";
import { ADMIN_NAV } from "@/lib/routes";
import { hasAnyPermission } from "@khepree/security";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdmin();
  const ctx = { globalRole: session.globalRole };
  const nav = ADMIN_NAV.filter((item) => hasAnyPermission(ctx, item.anyOf)).map((item) => ({
    label: item.label,
    href: item.href,
  }));

  return (
    <AdminAppShell
      userName={session.user.name}
      userEmail={session.user.email}
      role={session.globalRole}
      nav={nav}
    >
      {children}
    </AdminAppShell>
  );
}
