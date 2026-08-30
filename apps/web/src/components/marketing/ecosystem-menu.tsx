"use client";

import type { ResolvedKhepreeSurface } from "@khepree/config";
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
  return (
    <Link
      href={surface.url}
      target={surface.external ? "_blank" : undefined}
      rel={surface.external ? "noopener noreferrer" : undefined}
      className={cn(
        "flex items-start gap-3 rounded-[var(--radius-control)] transition-colors hover:bg-border-subtle",
        compact ? "px-3 py-2.5" : "px-3 py-3",
      )}
      onClick={onNavigate}
    >
      <SurfaceIcon id={surface.id} />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{surface.label}</span>
        {!compact ? (
          <span className="mt-0.5 block text-xs text-muted">{surface.description}</span>
        ) : null}
      </span>
    </Link>
  );
}

export function EcosystemMenu({
  messages,
  surfaces,
}: {
  messages: Messages;
  surfaces: ResolvedKhepreeSurface[];
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
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

  return (
    <div ref={rootRef} className="relative hidden lg:block">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium transition-colors",
          open ? "bg-border-subtle text-foreground" : "text-muted hover:text-foreground",
        )}
      >
        {messages.nav.ecosystem}
        <svg aria-hidden viewBox="0 0 12 12" className={cn("h-3 w-3 transition-transform", open && "rotate-180")}>
          <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      {open ? (
        <div
          id={panelId}
          className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,24rem)] overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface/95 p-2 shadow-[var(--shadow-elevated)] backdrop-blur-md motion-soft-scale"
        >
          <ul className="grid gap-1">
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
  return (
    <ul className="mt-2 flex flex-col gap-1 border-t border-border pt-3">
      <li className="px-3 py-1 text-xs font-medium uppercase tracking-wide text-muted">
        {messages.nav.ecosystem}
      </li>
      {surfaces.map((surface) => (
        <li key={surface.id}>
          <EcosystemLinkItem surface={surface} onNavigate={onNavigate} compact />
        </li>
      ))}
    </ul>
  );
}
