"use client";

import { cn } from "@khepree/ui";
import { usePathname, useRouter } from "next/navigation";
import {
  LOCALE_LABELS,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@/lib/i18n/config";

export function LanguageSwitcher({ locale }: { locale: SupportedLocale }) {
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(next: SupportedLocale) {
    if (next === locale) return;
    const segments = pathname.split("/");
    if (SUPPORTED_LOCALES.includes(segments[1] as SupportedLocale)) {
      segments[1] = next;
    } else {
      segments.splice(1, 0, next);
    }
    router.push(segments.join("/") || `/${next}`);
  }

  return (
    <div
      className="flex items-center gap-1 rounded-[var(--radius-control)] border border-khepree-mist bg-khepree-white p-0.5"
      role="group"
      aria-label="Language"
    >
      {SUPPORTED_LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => switchLocale(code)}
          aria-label={LOCALE_LABELS[code]}
          aria-pressed={code === locale}
          aria-current={code === locale ? "true" : undefined}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            code === locale
              ? "bg-khepree-ink text-khepree-white"
              : "text-khepree-slate/70 hover:text-khepree-ink",
          )}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
