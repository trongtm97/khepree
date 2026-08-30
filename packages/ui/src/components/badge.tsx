import { cn } from "../lib/cn";
import type { HTMLAttributes } from "react";

type BadgeVariant = "default" | "teal" | "cyan" | "indigo" | "solar" | "outline";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  default: "border border-border-subtle bg-border-subtle/60 text-foreground",
  teal: "border border-teal/15 bg-teal/10 text-teal",
  cyan: "border border-cyan/15 bg-cyan/10 text-cyan",
  indigo: "border border-indigo/15 bg-indigo/10 text-indigo",
  solar: "border border-solar-accent/20 bg-solar-accent/12 text-foreground",
  outline: "border border-border bg-transparent text-muted",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
