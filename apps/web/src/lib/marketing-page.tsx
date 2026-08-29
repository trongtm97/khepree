import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MarketingPageLayout } from "@/components/marketing/marketing-page-layout";
import { getMessages, type Messages } from "@/lib/i18n/get-messages";
import { isSupportedLocale, localePath, type SupportedLocale } from "@/lib/i18n/config";
import { createPageMetadata } from "@/lib/seo/metadata";

type PageKey = keyof Messages["pages"];

export interface MarketingPageConfig {
  pageKey: PageKey;
  path: string;
  renderBody?: (messages: Messages, locale: SupportedLocale) => ReactNode;
}

export function createMarketingPage(config: MarketingPageConfig) {
  const { pageKey, path, renderBody } = config;

  async function generateMetadata({
    params,
  }: {
    params: Promise<{ locale: string }>;
  }): Promise<Metadata> {
    const { locale: raw } = await params;
    if (!isSupportedLocale(raw)) return {};
    const content = getMessages(raw).pages[pageKey];
    return createPageMetadata({
      locale: raw,
      title: content.title,
      description: content.description,
      path,
    });
  }

  async function Page({ params }: { params: Promise<{ locale: string }> }) {
    const { locale: raw } = await params;
    if (!isSupportedLocale(raw)) notFound();

    const locale = raw;
    const messages = getMessages(locale);
    const content = messages.pages[pageKey];

    return (
      <MarketingPageLayout
        title={content.title}
        description={content.description}
        breadcrumbs={[
          { label: messages.meta.siteName, href: localePath(locale) },
          { label: content.title },
        ]}
      >
        <p>{content.intro}</p>
        {renderBody?.(messages, locale)}
      </MarketingPageLayout>
    );
  }

  return { generateMetadata, default: Page };
}
