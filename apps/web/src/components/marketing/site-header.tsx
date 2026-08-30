"use client";

import type { ResolvedKhepreeSurface } from "@khepree/config";
import { BrandLogo, cn } from "@khepree/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { accountSignInUrl, accountSignUpUrl } from "@/lib/urls";
import { ButtonLink } from "./button-link";
import { EcosystemMenu } from "./ecosystem-menu";
import { LanguageSwitcher } from "./language-switcher";
import { MobileNav } from "./mobile-nav";
import { PrimaryNav } from "./primary-nav";

export interface SiteHeaderProps {
  locale: SupportedLocale;
  messages: Messages;
  ecosystemSurfaces: ResolvedKhepreeSurface[];
}

export function SiteHeader({ locale, messages, ecosystemSurfaces }: SiteHeaderProps) {
  const [scrolled, setScrolled] = useState(false);
  const signInUrl = accountSignInUrl();
  const signUpUrl = accountSignUpUrl();

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
          ? "border-border/70 bg-background/92 shadow-[0_1px_3px_rgb(0_0_0/0.06)] supports-[backdrop-filter]:bg-background/88"
          : "border-border/20 bg-background/50 supports-[backdrop-filter]:bg-background/40",
      )}
    >
      <div className="mx-auto flex h-14 max-w-[87.5rem] items-center gap-3 px-4 sm:px-6 lg:gap-5 lg:px-8">
        <Link href={localePath(locale)} className="flex shrink-0 items-center">
          <BrandLogo context="header" />
        </Link>

        <div className="hidden min-w-0 flex-1 items-center justify-center lg:flex">
          <PrimaryNav locale={locale} messages={messages} />
        </div>

        <div className="hidden shrink-0 items-center gap-0.5 lg:flex">
          <EcosystemMenu messages={messages} surfaces={ecosystemSurfaces} />
          <LanguageSwitcher locale={locale} />
          <Link
            href={signInUrl}
            className="rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            {messages.nav.signIn}
          </Link>
          <ButtonLink href={signUpUrl} size="sm" className="ml-1">
            {messages.nav.signUp}
          </ButtonLink>
        </div>

        <div className="ml-auto lg:hidden">
          <MobileNav
            locale={locale}
            messages={messages}
            signInUrl={signInUrl}
            signUpUrl={signUpUrl}
            ecosystemSurfaces={ecosystemSurfaces}
          />
        </div>
      </div>
    </header>
  );
}
