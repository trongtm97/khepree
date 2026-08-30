"use client";

import type { ResolvedKhepreeSurface } from "@khepree/config";
import { BrandLogo, cn } from "@khepree/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { accountPublicUrl } from "@/lib/urls";
import { ButtonLink } from "./button-link";
import { EcosystemMenu } from "./ecosystem-menu";
import { LanguageSwitcher } from "./language-switcher";
import { MobileNav } from "./mobile-nav";
import { PrimaryNav } from "./primary-nav";

export interface SiteHeaderProps {
  locale: SupportedLocale;
  messages: Messages;
  accountUrl?: string;
  ecosystemSurfaces: ResolvedKhepreeSurface[];
}

export function SiteHeader({
  locale,
  messages,
  accountUrl = accountPublicUrl(),
  ecosystemSurfaces,
}: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b backdrop-blur-md motion-safe:transition-[background-color,box-shadow,border-color] motion-safe:duration-200",
        scrolled
          ? "border-border/70 bg-background/90 shadow-[0_1px_3px_rgb(0_0_0/0.05)] supports-[backdrop-filter]:bg-background/85"
          : "border-border/25 bg-background/55 supports-[backdrop-filter]:bg-background/45",
      )}
    >
      <div className="mx-auto flex h-14 max-w-[87.5rem] items-center gap-3 px-4 sm:px-6 lg:h-16 lg:gap-6 lg:px-8">
        <Link href={localePath(locale)} className="shrink-0">
          <BrandLogo />
        </Link>

        <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
          <PrimaryNav locale={locale} messages={messages} />
        </div>

        <div className="hidden shrink-0 items-center gap-1 lg:flex">
          <EcosystemMenu messages={messages} surfaces={ecosystemSurfaces} />
          <LanguageSwitcher locale={locale} />
          <Link
            href={accountUrl}
            className="rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            {messages.nav.signIn}
          </Link>
          <ButtonLink href={localePath(locale, "/products")} size="sm" className="ml-1">
            {messages.nav.exploreProducts}
          </ButtonLink>
        </div>

        <div className="ml-auto flex items-center gap-1 lg:hidden">
          <Link
            href={accountUrl}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-control)] text-muted transition-colors hover:bg-border-subtle hover:text-foreground"
            aria-label={messages.nav.signIn}
          >
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
              <circle cx="12" cy="8" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M5 19c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </Link>

          <MobileNav
            locale={locale}
            messages={messages}
            accountUrl={accountUrl}
            ecosystemSurfaces={ecosystemSurfaces}
          />
        </div>
      </div>
    </header>
  );
}
