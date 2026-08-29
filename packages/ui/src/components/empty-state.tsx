import { cn } from "../lib/cn";
import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-khepree-mist bg-khepree-white px-6 py-12 text-center",
        className,
      )}
    >
      <h3 className="text-base font-medium text-khepree-ink">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm text-khepree-slate/70">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
