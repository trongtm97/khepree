import { cn } from "../lib/cn";
import type { HTMLAttributes } from "react";

type BadgeVariant = "default" | "teal" | "indigo" | "solar" | "outline";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-khepree-mist text-khepree-slate",
  teal: "bg-khepree-teal/10 text-khepree-teal",
  indigo: "bg-khepree-indigo/10 text-khepree-indigo",
  solar: "bg-khepree-solar/15 text-khepree-slate",
  outline: "border border-khepree-mist text-khepree-slate bg-transparent",
};

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
