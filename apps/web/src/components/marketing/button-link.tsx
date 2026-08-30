import { cn } from "@khepree/ui";
import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-khepree-teal text-khepree-white hover:bg-khepree-teal/90 shadow-sm shadow-khepree-teal/20",
  secondary:
    "bg-khepree-white text-khepree-ink border border-khepree-mist hover:bg-khepree-mist/60",
  ghost: "text-khepree-ink hover:bg-khepree-mist/80",
};

const sizes = {
  sm: "h-11 min-h-11 px-3.5 text-base",
  md: "h-11 min-h-11 px-5 text-base",
  lg: "h-12 min-h-12 px-6 text-base",
} as const;

export interface ButtonLinkProps extends Omit<ComponentProps<typeof Link>, "className"> {
  variant?: Variant;
  size?: keyof typeof sizes;
  className?: string;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(
        "inline-flex items-center justify-center rounded-[var(--radius-button)] font-medium transition-colors duration-150",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
}
