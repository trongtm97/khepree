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

/** Presentational product card — composable marketing/catalog shell. */
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
        <div className="relative h-36 overflow-hidden bg-background">
          {image ? (
            <img src={image.src} alt={image.alt} className="h-full w-full object-cover" />
          ) : (
            <div
              aria-hidden
              className="flex h-full items-center justify-center bg-gradient-to-br from-foreground via-indigo/40 to-teal/50 text-2xl font-semibold text-white"
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
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{title}</CardTitle>
          {badge ? <Badge variant="outline">{badge}</Badge> : null}
        </div>
        {description ? <CardDescription className="flex-1">{description}</CardDescription> : null}
        {priceLabel ? <p className="mt-4 text-sm font-medium text-foreground">{priceLabel}</p> : null}
        {ctaLabel ? <p className="mt-3 text-sm font-medium text-teal">{ctaLabel}</p> : null}
        {footer}
      </div>
    </Card>
  );
}
