import { cn } from "../lib/cn";

export interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light";
}

const sizeMap = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
} as const;

/**
 * Text wordmark until /public/brand/logo.svg is provided.
 * Replace with Image + SVG when brand asset is ready.
 */
export function BrandLogo({ className, size = "md", variant = "dark" }: BrandLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold tracking-tight",
        sizeMap[size],
        variant === "light" ? "text-khepree-white" : "text-khepree-ink",
        className,
      )}
      aria-label="Khepree"
    >
      <span className="bg-gradient-to-r from-khepree-teal to-khepree-cyan bg-clip-text text-transparent">
        Khepree
      </span>
    </span>
  );
}
