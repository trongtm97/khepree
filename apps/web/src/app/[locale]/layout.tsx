import "@khepree/ui/globals.css";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { JsonLd } from "@/components/seo/json-ld";
import { getMessages } from "@/lib/i18n/get-messages";
import { isSupportedLocale, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/i18n/config";
import { organizationJsonLd } from "@/lib/seo/json-ld";
import { createPageMetadata } from "@/lib/seo/metadata";

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) return {};
  const messages = getMessages(raw);
  return createPageMetadata({
    locale: raw,
    title: messages.meta.siteName,
    description: messages.meta.defaultDescription,
    path: "/",
  });
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) notFound();

  const locale: SupportedLocale = raw;
  const messages = getMessages(locale);
  const accountUrl = process.env.NEXT_PUBLIC_ACCOUNT_URL ?? "http://localhost:3001";

  return (
    <html lang={locale} suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <JsonLd data={organizationJsonLd()} />
        <div className="flex min-h-screen flex-col">
          <SiteHeader locale={locale} messages={messages} accountUrl={accountUrl} />
          <main className="flex-1">{children}</main>
          <SiteFooter locale={locale} messages={messages} />
        </div>
      </body>
    </html>
  );
}
