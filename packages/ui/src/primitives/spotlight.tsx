import { cn } from "../lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

export interface SpotlightProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

/** Mouse-free spotlight vignette for product focal areas. */
export function Spotlight({ children, className, ...props }: SpotlightProps) {
  return (
    <div className={cn("relative overflow-hidden", className)} {...props}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgb(13_148_136/0.12),transparent_55%)]"
      />
      {children}
    </div>
  );
}
