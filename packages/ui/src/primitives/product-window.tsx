import { cn } from "../lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

export interface ProductWindowProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: ReactNode;
  /** Perspective, edge glow, and subtle hover tilt. */
  depth?: boolean;
  /** Occasional soft sheen — not constant. */
  lightSweep?: boolean;
}

/** Product UI chrome — precision demo surface with optional depth treatment. */
export function ProductWindow({
  title = "Khepree Studio",
  children,
  depth = false,
  lightSweep = false,
  className,
  ...props
}: ProductWindowProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-elevated)]",
        depth && "product-window-depth border-teal/15",
        lightSweep && "motion-light-sweep",
        className,
      )}
      {...props}
    >
      <div className="flex items-center gap-2 border-b border-border-subtle bg-surface-elevated px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-solar-accent/80" aria-hidden />
        <span className="h-2.5 w-2.5 rounded-full bg-teal/80" aria-hidden />
        <span className="ml-2 truncate font-mono text-xs text-muted">{title}</span>
      </div>
      <div className="relative bg-background p-4 sm:p-6">{children}</div>
    </div>
  );
}
