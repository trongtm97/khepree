"use client";

import { cn } from "@khepree/ui";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { ButtonLink } from "./button-link";
import { EcosystemMobileLinks } from "./ecosystem-menu";
import { LanguageSwitcher } from "./language-switcher";
import { NAV_KEYS, NAV_PATHS } from "./nav";
import type { ResolvedKhepreeSurface } from "@khepree/config";

export function MobileNav({
  locale,
  messages,
  accountUrl,
  ecosystemSurfaces,
}: {
  locale: SupportedLocale;
  messages: Messages;
  accountUrl: string;
  ecosystemSurfaces: ResolvedKhepreeSurface[];
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        className="inline-flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] border border-border"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sr-only">{open ? messages.nav.closeMenu : messages.nav.openMenu}</span>
        <span aria-hidden className="flex flex-col gap-1.5">
          <span className={cn("block h-0.5 w-5 bg-foreground transition-transform", open && "translate-y-2 rotate-45")} />
          <span className={cn("block h-0.5 w-5 bg-foreground transition-opacity", open && "opacity-0")} />
          <span className={cn("block h-0.5 w-5 bg-foreground transition-transform", open && "-translate-y-2 -rotate-45")} />
        </span>
      </button>

      {open ? (
        <nav
          id={panelId}
          aria-label="Mobile"
          className="fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-border bg-background px-4 py-4"
        >
          <ul className="flex flex-col gap-1">
            {NAV_KEYS.map((key) => (
              <li key={key}>
                <Link
                  href={localePath(locale, NAV_PATHS[key])}
                  className="block rounded-md px-3 py-2.5 text-sm font-medium hover:bg-border-subtle"
                  onClick={() => setOpen(false)}
                >
                  {messages.nav[key]}
                </Link>
              </li>
            ))}
          </ul>

          <EcosystemMobileLinks
            messages={messages}
            surfaces={ecosystemSurfaces}
            onNavigate={() => setOpen(false)}
          />

          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
            <LanguageSwitcher locale={locale} />
            <Link href={accountUrl} className="text-sm font-medium" onClick={() => setOpen(false)}>
              {messages.nav.signIn}
            </Link>
            <ButtonLink href={localePath(locale, "/products")} className="w-full" onClick={() => setOpen(false)}>
              {messages.nav.exploreProducts}
            </ButtonLink>
          </div>
        </nav>
      ) : null}
    </div>
  );
}
