import { BrandLogo } from "@khepree/ui";
import Link from "next/link";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { ButtonLink } from "./button-link";
import { LanguageSwitcher } from "./language-switcher";
import { MobileNav } from "./mobile-nav";
import { PrimaryNav } from "./primary-nav";

export interface SiteHeaderProps {
  locale: SupportedLocale;
  messages: Messages;
  accountUrl: string;
}

export function SiteHeader({ locale, messages, accountUrl }: SiteHeaderProps) {
  return (
    <header className="relative sticky top-0 z-50 border-b border-khepree-mist bg-khepree-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href={localePath(locale)} className="shrink-0">
          <BrandLogo />
        </Link>

        <PrimaryNav locale={locale} messages={messages} />

        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher locale={locale} />
          <Link
            href={accountUrl}
            className="text-sm font-medium text-khepree-slate/80 hover:text-khepree-ink"
          >
            {messages.nav.signIn}
          </Link>
          <ButtonLink href={localePath(locale, "/products")} size="sm">
            {messages.nav.exploreProducts}
          </ButtonLink>
        </div>

        <MobileNav locale={locale} messages={messages} accountUrl={accountUrl} />
      </div>
    </header>
  );
}
