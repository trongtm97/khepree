import { AdminShell, EmptyState, PageHeader } from "@khepree/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin — Khepree",
};

export default function AdminHomePage() {
  return (
    <AdminShell>
      <PageHeader
        title="Admin overview"
        description="Internal administration shell — RBAC-gated tools ship in a later phase."
      />
      <div className="mt-8">
        <EmptyState
          title="Admin tools not configured"
          description="User management, catalog, and system settings will appear here once admin authorization is implemented."
        />
      </div>
    </AdminShell>
  );
}
