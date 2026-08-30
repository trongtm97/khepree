"use client";

import { cn } from "@khepree/ui";
import type { ResolvedKhepreeSurface } from "@khepree/config";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import type { NavProductItem } from "@/lib/nav-products";
import { EcosystemMenu } from "./ecosystem-menu";
import { ABOUT_PATH } from "./nav";
import { ProductsMenu } from "./products-menu";
import { ResourcesMenu } from "./resources-menu";

export function PrimaryNav({
  locale,
  messages,
  products,
  ecosystemSurfaces,
}: {
  locale: SupportedLocale;
  messages: Messages;
  products: NavProductItem[];
  ecosystemSurfaces: ResolvedKhepreeSurface[];
}) {
  const pathname = usePathname();
  const aboutHref = localePath(locale, ABOUT_PATH);
  const aboutActive = pathname === aboutHref || pathname.startsWith(`${aboutHref}/`);

  return (
    <nav aria-label="Primary" className="flex items-center gap-1">
      <ProductsMenu locale={locale} messages={messages} products={products} />
      <ResourcesMenu locale={locale} messages={messages} />
      <EcosystemMenu messages={messages} surfaces={ecosystemSurfaces} align="left" />
      <Link
        href={aboutHref}
        aria-current={aboutActive ? "page" : undefined}
        className={cn(
          "inline-flex min-h-11 items-center rounded-[var(--radius-control)] px-3 py-2 text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40",
          aboutActive ? "font-medium text-foreground" : "text-muted",
        )}
      >
        {messages.nav.about}
      </Link>
    </nav>
  );
}
