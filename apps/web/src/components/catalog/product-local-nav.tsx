"use client";

import { cn } from "@khepree/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ButtonLink } from "@/components/marketing/button-link";
import type { ProductPageSection } from "@/lib/product-page-sections";
import type { ProductPrimaryCta } from "@/lib/product-cta";
import type { Messages } from "@/lib/i18n/get-messages";

const NAV_LABELS: Record<ProductPageSection["labelKey"], keyof Messages["catalog"]["nav"]> = {
  overview: "overview",
  solutions: "solutions",
  features: "features",
  pricing: "pricing",
  guides: "guides",
  faq: "faq",
};

export function ProductLocalNav({
  productName,
  iconUrl,
  iconAlt,
  sections,
  primaryCta,
  messages,
}: {
  productName: string;
  iconUrl: string | null;
  iconAlt: string;
  sections: ProductPageSection[];
  primaryCta: ProductPrimaryCta;
  messages: Messages;
}) {
  const [active, setActive] = useState<string>("overview");

  useEffect(() => {
    const ids = sections.map((section) => section.id);
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((node): node is HTMLElement => node !== null);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-40% 0px -45% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    for (const element of elements) observer.observe(element);
    return () => observer.disconnect();
  }, [sections]);

  const ctaProps = primaryCta.external
    ? { href: primaryCta.href, target: "_blank" as const, rel: "noopener noreferrer" as const }
    : { href: primaryCta.href };

  return (
    <div className="sticky top-14 z-40 border-b border-border/80 bg-background/92 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2 lg:px-8">
        <div className="flex min-w-0 shrink items-center gap-2.5">
          {iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- product icon from catalog
            <img src={iconUrl} alt={iconAlt} className="h-8 w-8 rounded-lg border border-border object-cover" />
          ) : (
            <span
              aria-hidden
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal/10 text-sm font-semibold text-teal"
            >
              {productName.slice(0, 1)}
            </span>
          )}
          <span className="hidden truncate text-sm font-medium text-foreground sm:inline">{productName}</span>
        </div>

        <nav
          aria-label={messages.catalog.nav.sections}
          className="min-w-0 flex-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <ul className="flex gap-1 px-1">
            {sections.map((section) => {
              const label = messages.catalog.nav[NAV_LABELS[section.labelKey]];
              const isActive = active === section.id;
              return (
                <li key={section.id}>
                  <Link
                    href={`#${section.id}`}
                    aria-current={isActive ? "true" : undefined}
                    className={cn(
                      "inline-flex min-h-9 shrink-0 items-center rounded-[var(--radius-control)] px-3 text-sm transition-colors",
                      isActive ? "bg-border-subtle font-medium text-foreground" : "text-muted hover:text-foreground",
                    )}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <ButtonLink {...ctaProps} variant="accent" size="sm" className="hidden shrink-0 sm:inline-flex">
          {primaryCta.label}
        </ButtonLink>
      </div>
    </div>
  );
}
