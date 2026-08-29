"use client";

import { BrandLogo, cn } from "@khepree/ui";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { ButtonLink } from "./button-link";
import { LanguageSwitcher } from "./language-switcher";

const NAV_KEYS = ["products", "solutions", "pricing", "resources", "company"] as const;
const NAV_PATHS: Record<(typeof NAV_KEYS)[number], string> = {
  products: "/products",
  solutions: "/solutions",
  pricing: "/pricing",
  resources: "/docs",
  company: "/about",
};

export interface SiteHeaderProps {
  locale: SupportedLocale;
  messages: Messages;
  accountUrl: string;
}

export function SiteHeader({ locale, messages, accountUrl }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b border-khepree-mist bg-khepree-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href={localePath(locale)} className="shrink-0">
          <BrandLogo />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
          {NAV_KEYS.map((key) => (
            <Link
              key={key}
              href={localePath(locale, NAV_PATHS[key])}
              className="text-sm text-khepree-slate/80 transition-colors hover:text-khepree-ink"
            >
              {messages.nav[key]}
            </Link>
          ))}
        </nav>

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

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] border border-khepree-mist lg:hidden"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">{open ? messages.nav.closeMenu : messages.nav.openMenu}</span>
          <span aria-hidden className="flex flex-col gap-1.5">
            <span className={cn("block h-0.5 w-5 bg-khepree-ink transition-transform", open && "translate-y-2 rotate-45")} />
            <span className={cn("block h-0.5 w-5 bg-khepree-ink transition-opacity", open && "opacity-0")} />
            <span className={cn("block h-0.5 w-5 bg-khepree-ink transition-transform", open && "-translate-y-2 -rotate-45")} />
          </span>
        </button>
      </div>

      {open ? (
        <nav
          id={panelId}
          aria-label="Mobile"
          className="border-t border-khepree-mist bg-khepree-white px-4 py-4 lg:hidden"
        >
          <ul className="flex flex-col gap-1">
            {NAV_KEYS.map((key) => (
              <li key={key}>
                <Link
                  href={localePath(locale, NAV_PATHS[key])}
                  className="block rounded-md px-3 py-2.5 text-sm font-medium hover:bg-khepree-mist/60"
                  onClick={() => setOpen(false)}
                >
                  {messages.nav[key]}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-3 border-t border-khepree-mist pt-4">
            <LanguageSwitcher locale={locale} />
            <Link href={accountUrl} className="text-sm font-medium">
              {messages.nav.signIn}
            </Link>
            <ButtonLink href={localePath(locale, "/products")} className="w-full">
              {messages.nav.exploreProducts}
            </ButtonLink>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
