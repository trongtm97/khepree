import { cn } from "../lib/cn";
import type { ReactNode } from "react";

export interface TooltipProps {
  content: string;
  children: ReactNode;
  className?: string;
}

/** Accessible tooltip using native title + aria-label pattern for Phase 01. */
export function Tooltip({ content, children, className }: TooltipProps) {
  return (
    <span className={cn("relative inline-flex", className)} title={content} aria-label={content}>
      {children}
    </span>
  );
}
