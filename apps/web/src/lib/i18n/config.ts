import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@khepree/config";

export { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale };

export function isSupportedLocale(value: string): value is SupportedLocale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function localePath(locale: SupportedLocale, path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") return `/${locale}`;
  return `/${locale}${normalized}`;
}

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  vi: "Tiếng Việt",
};
