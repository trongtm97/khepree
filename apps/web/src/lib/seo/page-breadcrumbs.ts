import type { BreadcrumbItem } from "@/components/seo/breadcrumbs";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { breadcrumbJsonLd } from "./json-ld";

export function homeBreadcrumb(locale: SupportedLocale, messages: Messages): BreadcrumbItem {
  return { label: messages.common.home, href: localePath(locale) };
}

export function createPageBreadcrumbs(
  locale: SupportedLocale,
  messages: Messages,
  ...tail: BreadcrumbItem[]
): BreadcrumbItem[] {
  return [homeBreadcrumb(locale, messages), ...tail];
}

/** Short display label — prefers dedicated breadcrumb over SEO/page title. */
export function pageBreadcrumbLabel(content: { title: string; breadcrumb?: string }): string {
  return content.breadcrumb ?? content.title;
}

/** BreadcrumbList JSON-LD from visual trail (items with href, including current page). */
export function pageBreadcrumbJsonLd(items: BreadcrumbItem[]) {
  return breadcrumbJsonLd(
    items
      .filter((item): item is BreadcrumbItem & { href: string } => Boolean(item.href))
      .map((item) => ({ name: item.label, href: item.href })),
  );
}
