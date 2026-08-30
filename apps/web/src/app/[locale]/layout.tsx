import "@khepree/ui/globals.css";
import "@/styles/mobile-public.css";
import { GeistSans } from "geist/font/sans";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { JsonLd } from "@/components/seo/json-ld";
import { getEcosystemFooterSurfaces, getEcosystemNavSurfaces } from "@/lib/ecosystem-nav";
import { getMessages } from "@/lib/i18n/get-messages";
import { isSupportedLocale, htmlLang, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/i18n/config";
import { organizationJsonLd } from "@/lib/seo/json-ld";

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
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
  const ecosystemNav = getEcosystemNavSurfaces(locale);
  const ecosystemFooter = getEcosystemFooterSurfaces(locale);

  return (
    <html lang={htmlLang(locale)} suppressHydrationWarning className={GeistSans.variable}>
      <body>
        <JsonLd data={organizationJsonLd()} />
        <div className="flex min-h-screen flex-col">
          <SiteHeader
            locale={locale}
            messages={messages}
            ecosystemSurfaces={ecosystemNav}
          />
          <main className="homepage-safe-x flex-1 overflow-x-clip">{children}</main>
          <SiteFooter locale={locale} messages={messages} ecosystemSurfaces={ecosystemFooter} />
        </div>
      </body>
    </html>
  );
}
