import { Badge } from "./badge";
import { Button } from "./button";
import { Card, CardDescription, CardTitle } from "./card";
import { cn } from "../lib/cn";
import type { HTMLAttributes, ReactNode } from "react";

export interface PricingCardProps extends HTMLAttributes<HTMLDivElement> {
  name: string;
  price: string;
  interval?: string;
  description?: string;
  features?: string[];
  highlighted?: boolean;
  badge?: string;
  ctaLabel?: string;
  onCtaClick?: () => void;
  footer?: ReactNode;
}

/** Pricing tier card with dimensional highlight state. */
export function PricingCard({
  name,
  price,
  interval,
  description,
  features = [],
  highlighted = false,
  badge,
  ctaLabel,
  onCtaClick,
  footer,
  className,
  ...props
}: PricingCardProps) {
  return (
    <Card
      variant={highlighted ? "elevated" : "glass"}
      className={cn(
        "relative flex h-full flex-col",
        highlighted && "border-teal/30 shadow-[var(--shadow-glow-teal)]",
        className,
      )}
      {...props}
    >
      {highlighted ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-teal to-transparent"
        />
      ) : null}
      <div className="flex items-start justify-between gap-3">
        <CardTitle className="text-xl">{name}</CardTitle>
        {badge ? <Badge variant={highlighted ? "teal" : "outline"}>{badge}</Badge> : null}
      </div>
      {description ? <CardDescription>{description}</CardDescription> : null}
      <div className="mt-6 flex items-end gap-1">
        <span className="type-hero text-foreground">{price}</span>
        {interval ? <span className="type-small pb-1 text-muted">{interval}</span> : null}
      </div>
      {features.length > 0 ? (
        <ul className="mt-6 flex-1 space-y-2 type-small text-muted">
          {features.map((feature) => (
            <li key={feature} className="flex gap-2">
              <span aria-hidden className="text-teal">
                ✓
              </span>
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex-1" />
      )}
      {ctaLabel ? (
        <Button
          variant={highlighted ? "accent" : "secondary"}
          className="mt-6 w-full"
          onClick={onCtaClick}
        >
          {ctaLabel}
        </Button>
      ) : null}
      {footer}
    </Card>
  );
}
