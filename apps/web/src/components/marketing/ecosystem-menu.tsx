"use client";

import type { ResolvedKhepreeSurface } from "@khepree/config";
import { getOutboundLinkAttributes } from "@khepree/config";
import { cn } from "@khepree/ui";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { Messages } from "@/lib/i18n/get-messages";
import { SurfaceIcon } from "./surface-icon";

function EcosystemLinkItem({
  surface,
  onNavigate,
  compact,
}: {
  surface: ResolvedKhepreeSurface;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const outbound = getOutboundLinkAttributes(surface.url, {
    forceNewTab: surface.openBehavior === "new-tab",
  });
  return (
    <Link
      href={surface.url}
      {...outbound}
      role="menuitem"
      className={cn(
        "flex min-h-11 items-start gap-3 rounded-[var(--radius-control)] transition-colors hover:bg-border-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40",
        compact ? "px-3 py-2.5" : "px-3 py-3",
      )}
      onClick={onNavigate}
    >
      <SurfaceIcon id={surface.id} />
      <span className="min-w-0 py-0.5">
        <span className="block text-sm font-medium text-foreground">{surface.label}</span>
        {!compact ? (
          <span className="mt-0.5 block text-xs leading-relaxed text-muted">{surface.description}</span>
        ) : null}
      </span>
    </Link>
  );
}

export function EcosystemMenu({
  messages,
  surfaces,
  align = "right",
}: {
  messages: Messages;
  surfaces: ResolvedKhepreeSurface[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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

  if (surfaces.length === 0) return null;

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
        {messages.nav.ecosystem}
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
          aria-label={messages.nav.ecosystem}
          className={cn(
            "absolute top-full z-50 mt-2 w-[min(100vw-2rem,26rem)] overflow-hidden rounded-[var(--radius-card)] border border-border/80 bg-surface/95 p-2 shadow-[0_8px_30px_rgb(0_0_0/0.08)] backdrop-blur-md motion-safe:motion-soft-scale",
            align === "left" ? "left-0" : "right-0",
          )}
        >
          <ul className="grid gap-0.5">
            {surfaces.map((surface) => (
              <li key={surface.id}>
                <EcosystemLinkItem surface={surface} onNavigate={() => setOpen(false)} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function EcosystemMobileLinks({
  messages,
  surfaces,
  onNavigate,
}: {
  messages: Messages;
  surfaces: ResolvedKhepreeSurface[];
  onNavigate?: () => void;
}) {
  if (surfaces.length === 0) return null;

  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">
        {messages.nav.ecosystem}
      </p>
      <ul className="flex flex-col gap-1">
        {surfaces.map((surface) => (
          <li key={surface.id}>
            <EcosystemLinkItem surface={surface} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
    </div>
  );
}
