"use client";

import type { ResolvedKhepreeSurface } from "@khepree/config";
import { BrandLogo, cn } from "@khepree/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import type { NavProductItem } from "@/lib/nav-products";
import { ButtonLink } from "./button-link";
import { LanguageSwitcher } from "./language-switcher";
import { MobileNav } from "./mobile-nav";
import { PrimaryNav } from "./primary-nav";

export interface SiteHeaderProps {
  locale: SupportedLocale;
  messages: Messages;
  products: NavProductItem[];
  ecosystemSurfaces: ResolvedKhepreeSurface[];
  signInUrl: string;
  signUpUrl: string;
}

export function SiteHeader({
  locale,
  messages,
  products,
  ecosystemSurfaces,
  signInUrl,
  signUpUrl,
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
          ? [
              "border-border/70 bg-background/95 shadow-[0_1px_0_rgb(255_255_255/0.6)_inset,0_4px_24px_rgb(16_24_40/0.06)]",
              "supports-[backdrop-filter]:bg-background/90 supports-[backdrop-filter]:backdrop-blur-xl",
            ].join(" ")
          : "border-border/30 bg-background/70 supports-[backdrop-filter]:bg-background/55",
      )}
    >
      <div className="mx-auto flex h-[3.75rem] max-w-[76rem] items-center px-4 sm:px-6 lg:px-8">
        <Link href={localePath(locale)} className="flex shrink-0 items-center py-1">
          <BrandLogo context="header" />
        </Link>

        <div className="ml-6 hidden lg:flex">
          <PrimaryNav
            locale={locale}
            messages={messages}
            products={products}
            ecosystemSurfaces={ecosystemSurfaces}
          />
        </div>

        <div className="ml-auto hidden shrink-0 items-center gap-1.5 lg:flex xl:gap-2">
          <LanguageSwitcher locale={locale} />
          <Link
            href={signInUrl}
            className="inline-flex h-10 items-center rounded-[var(--radius-control)] px-3 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            {messages.nav.signIn}
          </Link>
          <ButtonLink href={signUpUrl} variant="accent" size="sm" className="shrink-0" showArrow>
            {messages.nav.signUp}
          </ButtonLink>
        </div>

        <div className="ml-auto lg:hidden">
          <MobileNav
            locale={locale}
            messages={messages}
            signInUrl={signInUrl}
            signUpUrl={signUpUrl}
            products={products}
            ecosystemSurfaces={ecosystemSurfaces}
          />
        </div>
      </div>
    </header>
  );
}
