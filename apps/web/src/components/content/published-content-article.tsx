import { notFound } from "next/navigation";
import type { ContentType } from "@khepree/catalog";
import { MarketingPageLayout } from "@/components/marketing/marketing-page-layout";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildProductBlocks,
  getContentPreview,
  getFeaturedImageUrl,
  getPublishedBody,
  getPublishedContent,
  renderArticleHtml,
} from "@/lib/content";
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
  preview,
}: {
  locale: string;
  slug: string;
  contentType: Extract<ContentType, "article" | "doc" | "page">;
  pathPrefix: "/blog" | "/docs" | "/pages";
  preview?: boolean;
}) {
  if (preview) {
    return { robots: { index: false, follow: false, noarchive: true } };
  }
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
  previewToken,
  previewVersionId,
}: {
  locale: string;
  slug: string;
  contentType: Extract<ContentType, "article" | "doc" | "page">;
  pathPrefix: "/blog" | "/docs" | "/pages";
  previewToken?: string;
  previewVersionId?: string;
}) {
  if (!isSupportedLocale(raw)) notFound();
  const locale: SupportedLocale = raw;
  const isPreview = Boolean(previewToken && previewVersionId);

  const entry = isPreview
    ? await getContentPreview(previewVersionId!, previewToken!)
    : await getPublishedContent(contentType, slug, locale);

  if (!entry || entry.slug !== slug) notFound();

  const messages = getMessages(locale);
  const index =
    contentType === "article"
      ? messages.pages.blog
      : contentType === "doc"
        ? messages.pages.docs
        : { title: "Trang", description: entry.excerpt ?? entry.title };
  const body = await getPublishedBody(entry.bodyObjectKey);
  const productBlocks = body ? await buildProductBlocks(body, locale) : {};
  const html = body ? renderArticleHtml(body, productBlocks) : "";
  const featuredImageUrl = await getFeaturedImageUrl(entry.featuredMediaPublicId);
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
          author: entry.authorName ?? undefined,
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
        {isPreview ? (
          <p className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Bản xem trước — chưa xuất bản (noindex)
          </p>
        ) : null}
        {entry.authorName ? <p className="mb-4 text-sm text-khepree-slate/70">Tác giả: {entry.authorName}</p> : null}
        {entry.categoryName ? <p className="mb-4 text-sm text-khepree-slate/70">Danh mục: {entry.categoryName}</p> : null}
        {featuredImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- CMS featured hero from public R2 URL
          <img src={featuredImageUrl} alt="" className="mb-6 w-full rounded-lg object-cover" />
        ) : null}
        {html ? (
          <div className="prose prose-neutral max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p>{entry.excerpt}</p>
        )}
      </MarketingPageLayout>
    </>
  );
}
