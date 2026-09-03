import { Badge } from "./badge";
import { Card, CardDescription, CardTitle } from "./card";
import { cn } from "../lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

export interface ProductCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  image?: { src: string; alt: string };
  fallbackInitial?: string;
  badge?: string;
  priceLabel?: string;
  ctaLabel?: string;
  media?: ReactNode;
  footer?: ReactNode;
}

/** Presentational product card — dense catalog tile for multi-column grids. */
export function ProductCard({
  title,
  description,
  image,
  fallbackInitial,
  badge,
  priceLabel,
  ctaLabel,
  media,
  footer,
  className,
  ...props
}: ProductCardProps) {
  const initial = fallbackInitial ?? title.slice(0, 1);

  return (
    <Card variant="interactive" className={cn("flex h-full flex-col overflow-hidden p-0", className)} {...props}>
      {media ?? (
        <div className="relative aspect-[16/10] overflow-hidden bg-background">
          {image ? (
            <img src={image.src} alt={image.alt} className="h-full w-full object-cover" loading="lazy" decoding="async" />
          ) : (
            <div
              aria-hidden
              className="flex h-full items-center justify-center bg-gradient-to-br from-foreground via-indigo/40 to-teal/50 text-xl font-semibold text-white"
            >
              {initial}
            </div>
          )}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-surface/80 via-transparent to-transparent opacity-0 transition-opacity duration-[var(--motion-base)] group-hover:opacity-100"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="line-clamp-2 text-sm leading-snug sm:text-[0.9375rem]">{title}</CardTitle>
            {badge ? (
              <Badge variant="outline" className="max-w-[40%] shrink-0 truncate px-1.5 py-0 text-[10px] leading-5">
                {badge}
              </Badge>
            ) : null}
          </div>
          {description ? (
            <CardDescription className="mt-0 line-clamp-2 flex-1 text-xs leading-relaxed">{description}</CardDescription>
          ) : null}
        </div>
        {(priceLabel || ctaLabel || footer) && (
          <div className="mt-auto flex items-end justify-between gap-2 pt-1">
            <div className="min-w-0">
              {priceLabel ? <p className="truncate text-xs font-medium text-foreground">{priceLabel}</p> : null}
              {footer}
            </div>
            {ctaLabel ? <p className="shrink-0 text-xs font-medium text-teal">{ctaLabel}</p> : null}
          </div>
        )}
      </div>
    </Card>
  );
}
