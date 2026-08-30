"use client";

import { cn } from "@khepree/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { RESOURCE_NAV_KEYS, RESOURCE_NAV_LABEL_KEYS, RESOURCE_NAV_PATHS } from "./nav";

function ResourceLinkItem({
  href,
  label,
  onNavigate,
}: {
  href: string;
  label: string;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex min-h-11 items-center rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40"
      onClick={onNavigate}
    >
      {label}
    </Link>
  );
}

export function ResourcesMenu({ locale, messages }: { locale: SupportedLocale; messages: Messages }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const active = RESOURCE_NAV_KEYS.some((key) => {
    const href = localePath(locale, RESOURCE_NAV_PATHS[key]);
    return pathname === href || pathname.startsWith(`${href}/`);
  });

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
          "inline-flex min-h-11 items-center gap-1.5 rounded-[var(--radius-control)] px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40",
          open || active ? "bg-border-subtle font-medium text-foreground" : "font-medium text-muted hover:text-foreground",
        )}
      >
        {messages.nav.resources}
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
          id={panelId}
          role="menu"
          aria-label={messages.nav.resources}
          className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-[var(--radius-card)] border border-border/80 bg-surface/95 p-2 shadow-[0_8px_30px_rgb(0_0_0/0.08)] backdrop-blur-md motion-safe:motion-soft-scale"
        >
          <ul className="grid gap-0.5">
            {RESOURCE_NAV_KEYS.map((key) => (
              <li key={key}>
                <ResourceLinkItem
                  href={localePath(locale, RESOURCE_NAV_PATHS[key])}
                  label={messages.nav[RESOURCE_NAV_LABEL_KEYS[key]]}
                  onNavigate={() => setOpen(false)}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function ResourcesMobileLinks({
  locale,
  messages,
  onNavigate,
}: {
  locale: SupportedLocale;
  messages: Messages;
  onNavigate?: () => void;
}) {
  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {messages.nav.resources}
      </p>
      <ul className="flex flex-col gap-1">
        {RESOURCE_NAV_KEYS.map((key) => (
          <li key={key}>
            <ResourceLinkItem
              href={localePath(locale, RESOURCE_NAV_PATHS[key])}
              label={messages.nav[RESOURCE_NAV_LABEL_KEYS[key]]}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
