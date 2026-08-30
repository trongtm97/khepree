import { DEFAULT_LOCALE, LOCALE_COOKIE, isSupportedLocale } from "@khepree/config";
import { ErrorScreen } from "@khepree/ui";
import Link from "next/link";
import { cookies } from "next/headers";
import { getMessages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";

async function resolveLocale(): Promise<SupportedLocale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isSupportedLocale(fromCookie)) return fromCookie;
  return DEFAULT_LOCALE;
}

export async function PublicNotFound() {
  const locale = await resolveLocale();
  const messages = getMessages(locale);
  const copy = messages.notFound;

  return (
    <ErrorScreen title={copy.title} description={copy.description}>
      <nav aria-label={copy.title} className="flex flex-wrap justify-center gap-4">
        <Link className="min-h-11 py-2 text-sm text-khepree-teal underline" href={localePath(locale)}>
          {copy.home}
        </Link>
        <Link
          className="min-h-11 py-2 text-sm text-khepree-teal underline"
          href={localePath(locale, "/products")}
        >
          {copy.products}
        </Link>
        <Link
          className="min-h-11 py-2 text-sm text-khepree-teal underline"
          href={localePath(locale, "/support")}
        >
          {copy.support}
        </Link>
      </nav>
    </ErrorScreen>
  );
}
