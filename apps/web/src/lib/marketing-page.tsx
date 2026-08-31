import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MarketingPageLayout } from "@/components/marketing/marketing-page-layout";
import { getMessages, type Messages } from "@/lib/i18n/get-messages";
import { isSupportedLocale, localePath, type SupportedLocale } from "@/lib/i18n/config";
import { createPageMetadata } from "@/lib/seo/metadata";
import { createPageBreadcrumbs, pageBreadcrumbLabel } from "@/lib/seo/page-breadcrumbs";

type MarketingPageKey = {
  [K in keyof Messages["pages"]]: Messages["pages"][K] extends { intro: string } ? K : never;
}[keyof Messages["pages"]];

export interface MarketingPageConfig {
  pageKey: MarketingPageKey;
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
        breadcrumbs={createPageBreadcrumbs(locale, messages, {
          label: pageBreadcrumbLabel(content),
          href: localePath(locale, path),
        })}
      >
        <p>{content.intro}</p>
        {renderBody?.(messages, locale)}
      </MarketingPageLayout>
    );
  }

  return { generateMetadata, default: Page };
}
