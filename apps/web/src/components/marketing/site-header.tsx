import type { ResolvedKhepreeSurface } from "@khepree/config";
import { BrandLogo } from "@khepree/ui";
import Link from "next/link";
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
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href={localePath(locale)} className="shrink-0">
          <BrandLogo />
        </Link>

        <PrimaryNav locale={locale} messages={messages} />

        <div className="hidden items-center gap-2 lg:flex">
          <EcosystemMenu messages={messages} surfaces={ecosystemSurfaces} />
          <LanguageSwitcher locale={locale} />
          <Link
            href={accountUrl}
            className="px-3 py-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
          >
            {messages.nav.signIn}
          </Link>
          <ButtonLink href={localePath(locale, "/products")} size="sm">
            {messages.nav.exploreProducts}
          </ButtonLink>
        </div>

        <MobileNav
          locale={locale}
          messages={messages}
          accountUrl={accountUrl}
          ecosystemSurfaces={ecosystemSurfaces}
        />
      </div>
    </header>
  );
}
