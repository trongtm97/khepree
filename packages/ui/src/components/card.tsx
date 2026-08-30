import { cn } from "../lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

type CardVariant = "default" | "elevated" | "glass" | "interactive";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: CardVariant;
}

const variants: Record<CardVariant, string> = {
  default: "border-border bg-surface shadow-[var(--shadow-soft)]",
  elevated: "border-border bg-surface-elevated shadow-[var(--shadow-elevated)]",
  glass: "border-border/70 bg-surface/80 backdrop-blur-md shadow-[var(--shadow-soft)]",
  interactive:
    "border-border bg-surface shadow-[var(--shadow-soft)] transition-[transform,box-shadow,border-color] duration-[var(--motion-base)] hover:-translate-y-0.5 hover:border-teal/25 hover:shadow-[var(--shadow-glow-teal)]",
};

export function Card({ className, children, variant = "default", ...props }: CardProps) {
  return (
    <div
      className={cn("rounded-[var(--radius-card)] border p-6", variants[variant], className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-lg font-semibold tracking-[var(--tracking-title)] text-foreground", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mt-2 type-small text-muted", className)} {...props}>
      {children}
    </p>
  );
}
