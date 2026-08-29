import { EmptyState } from "@khepree/ui";
import type { ReactNode } from "react";

export function AccountEmptyPage({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      </header>
      <EmptyState title={description} description="This area will populate as you add products and licenses." action={action} />
    </div>
  );
}
