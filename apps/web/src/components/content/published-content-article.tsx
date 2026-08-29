import { notFound } from "next/navigation";
import type { ContentType } from "@khepree/catalog";
import { MarketingPageLayout } from "@/components/marketing/marketing-page-layout";
import { JsonLd } from "@/components/seo/json-ld";
import { contentParagraphs } from "@/lib/content-body";
import { getPublishedBody, getPublishedContent } from "@/lib/content";
import { getMessages } from "@/lib/i18n/get-messages";
import { articleJsonLd } from "@/lib/seo/json-ld";
import { createPageMetadata, siteUrl } from "@/lib/seo/metadata";
import { isSupportedLocale, localePath, type SupportedLocale } from "@/lib/i18n/config";

async function publishedLocales(contentType: ContentType, slug: string) {
  const found: SupportedLocale[] = [];
  for (const locale of ["en", "vi"] as const) {
    const entry = await getPublishedContent(contentType, slug, locale);
    if (entry) found.push(locale);
  }
  return found;
}

export async function publishedContentMetadata({
  locale: raw,
  slug,
  contentType,
  pathPrefix,
}: {
  locale: string;
  slug: string;
  contentType: Extract<ContentType, "article" | "doc">;
  pathPrefix: "/blog" | "/docs";
}) {
  if (!isSupportedLocale(raw)) return {};
  const entry = await getPublishedContent(contentType, slug, raw);
  if (!entry) return { robots: { index: false, follow: false } };
  const hreflangLocales = await publishedLocales(contentType, slug);
  return createPageMetadata({
    locale: raw,
    title: entry.seoTitle ?? entry.title,
    description: entry.seoDescription ?? entry.excerpt ?? entry.title,
    path: `${pathPrefix}/${slug}`,
    hreflangLocales,
  });
}

export async function PublishedContentArticle({
  locale: raw,
  slug,
  contentType,
  pathPrefix,
}: {
  locale: string;
  slug: string;
  contentType: Extract<ContentType, "article" | "doc">;
  pathPrefix: "/blog" | "/docs";
}) {
  if (!isSupportedLocale(raw)) notFound();
  const locale: SupportedLocale = raw;
  const entry = await getPublishedContent(contentType, slug, locale);
  if (!entry) notFound();

  const messages = getMessages(locale);
  const index = contentType === "article" ? messages.pages.blog : messages.pages.docs;
  const body = await getPublishedBody(entry.bodyObjectKey);
  const paragraphs = body ? contentParagraphs(body) : [];
  const path = localePath(locale, `${pathPrefix}/${slug}`);

  return (
    <>
      <JsonLd
        data={articleJsonLd({
          headline: entry.title,
          description: entry.seoDescription ?? entry.excerpt ?? entry.title,
          url: siteUrl(path),
          datePublished: entry.publishedAt,
          inLanguage: locale === "vi" ? "vi" : "en",
        })}
      />
      <MarketingPageLayout
        title={entry.title}
        description={entry.excerpt ?? index.description}
        breadcrumbs={[
          { label: messages.meta.siteName, href: localePath(locale) },
          { label: index.title, href: localePath(locale, pathPrefix) },
          { label: entry.title },
        ]}
      >
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)
        ) : (
          <p>{entry.excerpt}</p>
        )}
      </MarketingPageLayout>
    </>
  );
}
