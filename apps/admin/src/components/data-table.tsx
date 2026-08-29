import { cn } from "@khepree/ui";
import type { ReactNode } from "react";
import { EmptyState } from "@khepree/ui";

export function DataTable({
  headers,
  children,
  empty,
}: {
  headers: string[];
  children: ReactNode;
  empty?: boolean;
}) {
  if (empty) {
    return <EmptyState title="No rows" description="Nothing matches these filters." />;
  }
  return (
    <div className="overflow-x-auto rounded-[var(--radius-card)] border border-khepree-mist bg-khepree-white">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} className="border-b border-khepree-mist px-3 py-2 font-medium">
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

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("border-b border-khepree-mist/70 px-3 py-2 align-top", className)}>{children}</td>;
}
