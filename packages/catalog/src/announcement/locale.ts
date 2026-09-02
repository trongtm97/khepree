import { DEFAULT_LOCALE } from "@khepree/config";

export interface AnnouncementTranslationRow {
  locale: string;
  title: string;
  body: string | null;
}

/** Requested locale → vi (default) → en. */
export function resolveAnnouncementCopy(
  locale: string,
  translations: AnnouncementTranslationRow[],
): AnnouncementTranslationRow | null {
  const pick = (code: string) => translations.find((row) => row.locale === code);
  const resolved = pick(locale) ?? pick(DEFAULT_LOCALE) ?? pick("en");
  if (!resolved?.title?.trim()) return null;
  return {
    locale: resolved.locale,
    title: resolved.title.trim(),
    body: resolved.body?.trim() || null,
  };
}

export function hasDefaultLocaleTranslation(translations: AnnouncementTranslationRow[]): boolean {
  const row = translations.find((entry) => entry.locale === DEFAULT_LOCALE);
  return Boolean(row?.title?.trim());
}
