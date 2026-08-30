import { cn } from "../lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

export interface FloatingSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  float?: boolean;
}

/** Elevated surface with optional gentle float animation. */
export function FloatingSurface({
  children,
  float = true,
  className,
  ...props
}: FloatingSurfaceProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-elevated)]",
        float && "motion-float motion-parallax-lite",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
