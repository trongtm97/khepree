import { DEFAULT_LOCALE } from "@khepree/config";

/** Requested locale → DEFAULT_LOCALE (vi) → null. Never an arbitrary third locale. */
export function resolveLocalizedRow<T extends { locale: string }>(
  rows: T[],
  locale: string,
  fallbackLocale: string = DEFAULT_LOCALE,
): T | null {
  return (
    rows.find((row) => row.locale === locale) ??
    rows.find((row) => row.locale === fallbackLocale) ??
    null
  );
}

/** Public pages: only a real translation for `locale`, never a silent fallback. */
export function requireLocaleRow<T extends { locale: string }>(rows: T[], locale: string): T | null {
  return rows.find((row) => row.locale === locale) ?? null;
}

export function availableLocalesOf<T extends { locale: string }>(rows: T[]): string[] {
  return [...new Set(rows.map((row) => row.locale))].sort();
}
