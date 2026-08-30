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
    <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
      {NAV_KEYS.map((key) => {
        const href = localePath(locale, NAV_PATHS[key]);
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "text-sm transition-colors hover:text-khepree-ink",
              active ? "font-medium text-khepree-ink" : "text-khepree-slate/80",
            )}
          >
            {messages.nav[key]}
          </Link>
        );
      })}
    </nav>
  );
}
