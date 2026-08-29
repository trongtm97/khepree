import { DEFAULT_LOCALE } from "@khepree/config";

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
