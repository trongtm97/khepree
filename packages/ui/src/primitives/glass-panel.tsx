import { cn } from "../lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  elevation?: "flat" | "raised";
}

/** Frosted surface for overlays and feature panels. */
export function GlassPanel({
  children,
  elevation = "raised",
  className,
  ...props
}: GlassPanelProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-border/80 bg-surface/75 backdrop-blur-xl",
        elevation === "raised" && "shadow-[var(--shadow-soft)]",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
