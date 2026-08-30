"use client";

import type { ResolvedKhepreeSurface } from "@khepree/config";
import { cn } from "@khepree/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import type { NavProductItem } from "@/lib/nav-products";
import { ButtonLink } from "./button-link";
import { EcosystemMobileLinks } from "./ecosystem-menu";
import { LanguageSwitcher } from "./language-switcher";
import { ABOUT_PATH } from "./nav";
import { ProductsMobileLinks } from "./products-menu";
import { ResourcesMobileLinks } from "./resources-menu";

const HEADER_OFFSET = "3.5rem";

export function MobileNav({
  locale,
  messages,
  signInUrl,
  signUpUrl,
  products,
  ecosystemSurfaces,
}: {
  locale: SupportedLocale;
  messages: Messages;
  signInUrl: string;
  signUpUrl: string;
  products: NavProductItem[];
  ecosystemSurfaces: ResolvedKhepreeSurface[];
}) {
  const [menu, setMenu] = useState({ open: false, path: "" });
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const aboutHref = localePath(locale, ABOUT_PATH);
  const aboutActive = pathname === aboutHref || pathname.startsWith(`${aboutHref}/`);

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
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-control)] border border-border/70 bg-background/60 transition-colors hover:bg-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40"
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
            className="fixed inset-x-0 z-50 flex flex-col overflow-hidden border-t border-border/80 bg-background/98 shadow-[0_16px_48px_rgb(0_0_0/0.12)] backdrop-blur-xl motion-safe:animate-in motion-safe:slide-in-from-top-2"
            style={{
              top: HEADER_OFFSET,
              height: `calc(100dvh - ${HEADER_OFFSET})`,
              paddingBottom: "max(1rem, env(safe-area-inset-bottom))",
            }}
          >
            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4">
              <ProductsMobileLinks locale={locale} messages={messages} products={products} onNavigate={close} />
              <ResourcesMobileLinks locale={locale} messages={messages} onNavigate={close} />
              <EcosystemMobileLinks messages={messages} surfaces={ecosystemSurfaces} onNavigate={close} />

              <div className="mt-4 border-t border-border pt-4">
                <Link
                  href={aboutHref}
                  aria-current={aboutActive ? "page" : undefined}
                  className={cn(
                    "flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-base font-medium transition-colors hover:bg-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40",
                    aboutActive ? "text-foreground" : "text-muted",
                  )}
                  onClick={close}
                >
                  {messages.nav.about}
                </Link>
              </div>

              <div className="mt-4 border-t border-border pt-4">
                <LanguageSwitcher locale={locale} />
              </div>
            </div>

            <div className="shrink-0 space-y-3 border-t border-border bg-background/95 px-4 py-4">
              <Link
                href={signInUrl}
                className="flex min-h-11 items-center justify-center rounded-[var(--radius-control)] text-sm font-medium text-muted transition-colors hover:bg-border-subtle hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40"
                onClick={close}
              >
                {messages.nav.signIn}
              </Link>
              <ButtonLink href={signUpUrl} variant="accent" showArrow fullWidthMobile className="w-full" onClick={close}>
                {messages.nav.signUp}
              </ButtonLink>
            </div>
          </nav>
        </>
      ) : null}
    </div>
  );
}
