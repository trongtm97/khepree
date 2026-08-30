import { cn } from "../lib/cn";

/** Intrinsic artwork ratio (842×200 source). */
export const BRAND_LOGO_ASPECT_RATIO = 842 / 200;

export type BrandLogoContext = "header" | "auth" | "app" | "footer";

export interface BrandLogoProps {
  className?: string;
  /** Display context — each maps to a fixed pixel height to avoid layout shift. */
  context?: BrandLogoContext;
  variant?: "dark" | "light";
}

/** Fixed display heights per surface (px). */
const contextHeightPx: Record<BrandLogoContext, number> = {
  header: 40,
  auth: 46,
  app: 38,
  footer: 56,
};

function contextDimensions(context: BrandLogoContext) {
  const height = contextHeightPx[context];
  const width = Math.round(height * BRAND_LOGO_ASPECT_RATIO);
  return { width, height };
}

/** Served from each app's `/public/brand/logo.png`. */
export function BrandLogo({ className, context = "header", variant = "dark" }: BrandLogoProps) {
  const { width, height } = contextDimensions(context);

  return (
    <img
      src="/brand/logo.png"
      alt="Khepree"
      width={width}
      height={height}
      className={cn(
        "block shrink-0",
        variant === "light" && "brightness-0 invert",
        className,
      )}
      style={{ width, height, aspectRatio: `${width} / ${height}` }}
    />
  );
}
