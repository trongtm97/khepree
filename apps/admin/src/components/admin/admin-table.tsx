import { cn } from "@khepree/ui";
import type { ReactNode } from "react";
import { AdminEmptyState } from "./admin-empty-state";

export function AdminTable({
  headers,
  children,
  empty,
  caption,
}: {
  headers: string[];
  children: ReactNode;
  empty?: boolean;
  caption?: string;
}) {
  if (empty) {
    return <AdminEmptyState />;
  }
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-khepree-mist bg-khepree-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} scope="col" className="border-b border-khepree-mist px-3 py-2 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function AdminTd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <td className={cn("border-b border-khepree-mist/70 px-3 py-2 align-top", className)}>{children}</td>
  );
}
