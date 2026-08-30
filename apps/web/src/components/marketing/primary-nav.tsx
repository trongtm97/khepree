"use client";

import { cn } from "@khepree/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { NAV_KEYS, NAV_PATHS } from "./nav";

export function PrimaryNav({
  locale,
  messages,
}: {
  locale: SupportedLocale;
  messages: Messages;
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
      {NAV_KEYS.map((key) => {
        const href = localePath(locale, NAV_PATHS[key]);
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center rounded-[var(--radius-control)] px-3 py-2 text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/40",
              active ? "font-medium text-foreground" : "text-muted",
            )}
          >
            {messages.nav[key]}
          </Link>
        );
      })}
    </nav>
  );
}
