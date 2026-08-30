"use client";

import { cn } from "@khepree/ui";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import type { NavProductItem } from "@/lib/nav-products";
import {
  focusFirstMenuItem,
  handleMenuKeyDown,
  productMegaMenuColumns,
  productMegaMenuWidth,
} from "./nav-menu-a11y";

function ProductNavItem({
  product,
  onNavigate,
  menuItem,
}: {
  product: NavProductItem;
  onNavigate?: () => void;
  menuItem?: boolean;
}) {
  return (
    <Link
      href={product.href}
      {...(menuItem ? { role: "menuitem" as const, tabIndex: -1 } : {})}
      className="flex min-h-11 items-start gap-3 rounded-[var(--radius-control)] px-3 py-2.5 transition-colors hover:bg-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40"
      onClick={onNavigate}
    >
      {product.iconUrl ? (
        <span className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded-[var(--radius-control)] border border-border/60 bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element -- catalog icon URL */}
          <img src={product.iconUrl} alt={product.iconAlt} className="h-full w-full object-cover" />
        </span>
      ) : (
        <span
          aria-hidden
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--radius-control)] bg-teal/10 text-sm font-semibold text-teal"
        >
          {product.name.slice(0, 1)}
        </span>
      )}
      <span className="min-w-0 py-0.5">
        <span className="block text-sm font-medium text-foreground">{product.name}</span>
        {product.shortDescription ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-muted">{product.shortDescription}</span>
        ) : null}
        {product.platformLabel ? (
          <span className="mt-1 block text-[11px] font-medium uppercase tracking-wide text-muted/80">
            {product.platformLabel}
          </span>
        ) : null}
      </span>
    </Link>
  );
}

export function ProductsMenu({
  locale,
  messages,
  products,
}: {
  locale: SupportedLocale;
  messages: Messages;
  products: NavProductItem[];
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const allProductsHref = localePath(locale, "/products");
  const columns = productMegaMenuColumns(products.length);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    focusFirstMenuItem(panelRef.current);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) close();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40",
          open ? "bg-border-subtle text-foreground" : "text-muted hover:text-foreground",
        )}
      >
        {messages.nav.products}
        <svg
          aria-hidden
          viewBox="0 0 12 12"
          className={cn("h-3 w-3 motion-safe:transition-transform", open && "rotate-180")}
        >
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="menu"
          aria-label={messages.nav.products}
          style={{ width: productMegaMenuWidth(columns) }}
          onKeyDown={(event) => handleMenuKeyDown(event, panelRef, close)}
          className="absolute left-1/2 top-full z-50 mt-2 max-h-[min(70vh,28rem)] -translate-x-1/2 overflow-y-auto rounded-[var(--radius-card)] border border-border/80 bg-surface/96 p-2 shadow-[0_12px_40px_rgb(0_0_0/0.1)] backdrop-blur-xl motion-safe:motion-soft-scale"
        >
          {products.length > 0 ? (
            <ul
              className={cn(
                "grid gap-0.5",
                columns === 1 && "grid-cols-1",
                columns === 2 && "grid-cols-1 sm:grid-cols-2",
                columns === 3 && "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
              )}
            >
              {products.map((product) => (
                <li key={product.slug}>
                  <ProductNavItem product={product} onNavigate={close} menuItem />
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-2 text-sm text-muted">{messages.products.emptyDescription}</p>
          )}
          <div className="mt-1 border-t border-border/70 pt-1">
            <Link
              href={allProductsHref}
              role="menuitem"
              tabIndex={-1}
              className="flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-sm font-medium text-teal transition-colors hover:bg-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40"
              onClick={close}
            >
              {messages.nav.viewAllProducts}
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ProductsMobileLinks({
  locale,
  messages,
  products,
  onNavigate,
}: {
  locale: SupportedLocale;
  messages: Messages;
  products: NavProductItem[];
  onNavigate?: () => void;
}) {
  const allProductsHref = localePath(locale, "/products");

  return (
    <div>
      <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {messages.nav.products}
      </p>
      <ul className="flex flex-col gap-1">
        {products.map((product) => (
          <li key={product.slug}>
            <ProductNavItem product={product} onNavigate={onNavigate} />
          </li>
        ))}
        <li>
          <Link
            href={allProductsHref}
            className="flex min-h-11 items-center rounded-[var(--radius-control)] px-3 text-sm font-medium text-teal transition-colors hover:bg-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40"
            onClick={onNavigate}
          >
            {messages.nav.viewAllProducts}
          </Link>
        </li>
      </ul>
    </div>
  );
}
