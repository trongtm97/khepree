import { cn } from "../lib/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "accent";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const variants: Record<Variant, string> = {
  primary:
    "bg-teal text-white shadow-[var(--shadow-glow-teal)] hover:bg-teal/92 active:scale-[0.98]",
  secondary:
    "border border-border bg-surface text-foreground shadow-[var(--shadow-soft)] hover:border-teal/30 hover:bg-surface-elevated active:scale-[0.98]",
  ghost: "text-foreground hover:bg-border-subtle/80 active:scale-[0.98]",
  accent:
    "bg-gradient-to-r from-teal to-cyan text-white shadow-[var(--shadow-glow-teal)] hover:opacity-95 active:scale-[0.98]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-button)] font-medium",
        "transition-[transform,background-color,border-color,opacity,box-shadow] duration-[var(--motion-base)] ease-[var(--motion-ease-out)]",
        "disabled:pointer-events-none disabled:opacity-50",
        "motion-parallax-lite",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
