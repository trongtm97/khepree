import { cookies, headers } from "next/headers";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  resolvePreferredLocale,
  type SupportedLocale,
} from "@khepree/config";

export function resolveAccountLocale(input: {
  userLocale?: string | null;
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
} = {}): SupportedLocale {
  return resolvePreferredLocale({
    userLocale: input.userLocale,
    cookieLocale: input.cookieLocale,
    acceptLanguage: input.acceptLanguage,
  });
}

export async function accountLocaleFromCookies(userLocale?: string | null): Promise<SupportedLocale> {
  const store = await cookies();
  const headerStore = await headers();
  return resolvePreferredLocale({
    userLocale,
    cookieLocale: store.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: headerStore.get("accept-language"),
  });
}

export { DEFAULT_LOCALE, LOCALE_COOKIE };
