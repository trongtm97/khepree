import type { ReactNode } from "react";
import { adminUi } from "@/lib/labels";

export function AdminDangerZone({ children, title = adminUi.dangerZone }: { children: ReactNode; title?: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-red-200 bg-red-50/40 p-4">
      <h3 className="text-sm font-semibold text-red-800">{title}</h3>
      <div className="mt-3 space-y-3">{children}</div>
    </div>
  );
}
