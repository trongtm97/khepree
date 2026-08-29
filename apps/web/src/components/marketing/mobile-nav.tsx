"use client";

import { cn } from "@khepree/ui";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { ButtonLink } from "./button-link";
import { LanguageSwitcher } from "./language-switcher";
import { NAV_KEYS, NAV_PATHS } from "./nav";

export function MobileNav({
  locale,
  messages,
  accountUrl,
}: {
  locale: SupportedLocale;
  messages: Messages;
  accountUrl: string;
}) {
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
    <div className="lg:hidden">
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] border border-khepree-mist"
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

      {open ? (
        <nav
          id={panelId}
          aria-label="Mobile"
          className="absolute inset-x-0 top-16 border-t border-khepree-mist bg-khepree-white px-4 py-4"
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
    </div>
  );
}
