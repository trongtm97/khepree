import { cn } from "../lib/cn";

export interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "dark" | "light";
}

const heightMap = {
  sm: "h-12",
  md: "h-16",
  lg: "h-20",
} as const;

/** Served from each app's `/public/brand/logo.png`. */
export function BrandLogo({ className, size = "md", variant = "dark" }: BrandLogoProps) {
  return (
    <img
      src="/brand/logo.png"
      alt="Khepree"
      className={cn(
        "block w-auto shrink-0",
        heightMap[size],
        variant === "light" && "brightness-0 invert",
        className,
      )}
    />
  );
}
