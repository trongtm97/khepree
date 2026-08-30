"use client";

import { cn } from "@khepree/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { ButtonLink } from "./button-link";
import { EcosystemMobileLinks } from "./ecosystem-menu";
import { LanguageSwitcher } from "./language-switcher";
import { NAV_KEYS, NAV_PATHS } from "./nav";
import type { ResolvedKhepreeSurface } from "@khepree/config";

const HEADER_OFFSET = "3.5rem";

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
  const [menu, setMenu] = useState({ open: false, path: "" });
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  const open = menu.open && menu.path === pathname;

  const setOpen = useCallback(
    (next: boolean | ((value: boolean) => boolean)) => {
      setMenu((current) => {
        const nextOpen = typeof next === "function" ? next(current.open && current.path === pathname) : next;
        return { open: nextOpen, path: pathname };
      });
    },
    [pathname],
  );

  const close = useCallback(() => {
    setMenu({ open: false, path: pathname });
    triggerRef.current?.focus();
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  return (
    <div className="lg:hidden">
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-control)] border border-border/70 bg-background/50 transition-colors hover:bg-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="sr-only">{open ? messages.nav.closeMenu : messages.nav.openMenu}</span>
        <span aria-hidden className="flex flex-col gap-1.5">
          <span
            className={cn(
              "block h-0.5 w-5 bg-foreground motion-safe:transition-transform",
              open && "translate-y-2 rotate-45",
            )}
          />
          <span
            className={cn(
              "block h-0.5 w-5 bg-foreground motion-safe:transition-opacity",
              open && "opacity-0",
            )}
          />
          <span
            className={cn(
              "block h-0.5 w-5 bg-foreground motion-safe:transition-transform",
              open && "-translate-y-2 -rotate-45",
            )}
          />
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label={messages.nav.closeMenu}
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[2px] motion-safe:animate-in motion-safe:fade-in"
            style={{ top: HEADER_OFFSET }}
            onClick={close}
          />

          <nav
            id={panelId}
            aria-label="Mobile"
            role="dialog"
            aria-modal="true"
            className="fixed inset-x-0 z-50 flex flex-col overflow-hidden border-t border-border/80 bg-background/98 backdrop-blur-lg motion-safe:animate-in motion-safe:slide-in-from-top-2"
            style={{
              top: HEADER_OFFSET,
              height: `calc(100dvh - ${HEADER_OFFSET})`,
              paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
            }}
          >
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              <ul className="flex flex-col gap-1">
                {NAV_KEYS.map((key) => (
                  <li key={key}>
                    <Link
                      href={localePath(locale, NAV_PATHS[key])}
                      className="flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-base font-medium text-foreground transition-colors hover:bg-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40"
                      onClick={close}
                    >
                      {messages.nav[key]}
                    </Link>
                  </li>
                ))}
              </ul>

              <EcosystemMobileLinks
                messages={messages}
                surfaces={ecosystemSurfaces}
                onNavigate={close}
              />
            </div>

            <div className="shrink-0 space-y-4 border-t border-border bg-background/95 px-4 py-4">
              <LanguageSwitcher locale={locale} />
              <Link
                href={accountUrl}
                className="flex min-h-11 items-center text-sm font-medium text-foreground"
                onClick={close}
              >
                {messages.nav.signIn}
              </Link>
              <ButtonLink href={localePath(locale, "/products")} className="w-full" size="lg" onClick={close}>
                {messages.nav.exploreProducts}
              </ButtonLink>
            </div>
          </nav>
        </>
      ) : null}
    </div>
  );
}
