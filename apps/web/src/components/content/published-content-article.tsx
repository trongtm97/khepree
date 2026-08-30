import { notFound } from "next/navigation";
import { SUPPORTED_LOCALES } from "@khepree/config";
import type { ContentType, PublishedContent } from "@khepree/catalog";
import { ArticleCard, BodyText, CapsLabel } from "@khepree/ui";
import Link from "next/link";
import { ArticleReadingLayout } from "@/components/content/article-reading-layout";
import { DocsArticleLayout } from "@/components/content/docs-article-layout";
import { MarketingPageLayout } from "@/components/marketing/marketing-page-layout";
import { JsonLd } from "@/components/seo/json-ld";
import {
  buildProductBlocks,
  getContentPreview,
  getFeaturedImage,
  getPublishedBody,
  getPublishedContent,
  listPublishedContent,
  renderArticleHtml,
} from "@/lib/content";
import { extractMarkdownHeadings, injectHeadingIds } from "@/lib/content-headings";
import { getMessages } from "@/lib/i18n/get-messages";
import { articleJsonLd } from "@/lib/seo/json-ld";
import { createPageMetadata, siteUrl } from "@/lib/seo/metadata";
import { isSupportedLocale, localePath, type SupportedLocale } from "@/lib/i18n/config";

async function publishedLocales(contentType: ContentType, slug: string) {
  const found: SupportedLocale[] = [];
  for (const locale of SUPPORTED_LOCALES) {
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
  const featured = entry.featuredMediaPublicId
    ? await getFeaturedImage(entry.featuredMediaPublicId)
    : null;
  return createPageMetadata({
    locale: raw,
    title: entry.seoTitle ?? entry.title,
    description: entry.seoDescription ?? entry.excerpt ?? entry.title,
    path: `${pathPrefix}/${slug}`,
    hreflangLocales,
    image: featured?.url,
  });
}

async function relatedArticles(locale: SupportedLocale, slug: string, limit = 3) {
  const entries = await listPublishedContent("article", locale);
  return entries.filter((entry) => entry.slug !== slug).slice(0, limit);
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
        : { title: "Trang", description: entry.excerpt ?? entry.title, tocLabel: "Mục lục" };
  const body = await getPublishedBody(entry.bodyObjectKey);
  const productBlocks = body ? await buildProductBlocks(body, locale) : {};
  const headings = body ? extractMarkdownHeadings(body) : [];
  const rawHtml = body ? renderArticleHtml(body, productBlocks) : "";
  const html = rawHtml ? injectHeadingIds(rawHtml, headings) : "";
  const featuredImage = await getFeaturedImage(entry.featuredMediaPublicId);
  const path = localePath(locale, `${pathPrefix}/${slug}`);

  const breadcrumbs = [
    { label: messages.meta.siteName, href: localePath(locale) },
    { label: index.title, href: localePath(locale, pathPrefix) },
    { label: entry.title },
  ];

  const previewBanner = isPreview ? (
    <p className="mb-4 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
      Bản xem trước — chưa xuất bản (noindex)
    </p>
  ) : null;

  const metaLine = (
    <div className="mb-6 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
      {entry.authorName ? <span>{entry.authorName}</span> : null}
      {entry.categoryName ? <CapsLabel>{entry.categoryName}</CapsLabel> : null}
    </div>
  );

  const featured = featuredImage ? (
    // eslint-disable-next-line @next/next/no-img-element -- CMS featured hero
    <img
      src={featuredImage.url}
      alt={featuredImage.altText || entry.title}
      className="mb-8 w-full rounded-[var(--radius-card)] border border-border object-cover"
    />
  ) : null;

  const bodyContent = html ? (
    <div
      className="prose prose-neutral max-w-none prose-headings:scroll-mt-24 prose-a:text-teal :lang(vi):prose-p:leading-[1.8]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  ) : (
    <BodyText>{entry.excerpt}</BodyText>
  );

  if (contentType === "doc") {
    const docEntries = await listPublishedContent("doc", locale);
    return (
      <>
        <JsonLd
          data={articleJsonLd({
            headline: entry.title,
            description: entry.seoDescription ?? entry.excerpt ?? entry.title,
            url: siteUrl(path),
            datePublished: entry.publishedAt,
            dateModified: entry.updatedAt,
            inLanguage: locale === "vi" ? "vi" : "en",
            author: entry.authorName ?? undefined,
            image: featuredImage?.url,
          })}
        />
        <DocsArticleLayout
          locale={locale}
          messages={messages}
          entries={docEntries}
          currentSlug={slug}
          title={entry.title}
          breadcrumbs={breadcrumbs}
        >
          {previewBanner}
          {bodyContent}
        </DocsArticleLayout>
      </>
    );
  }

  const related = contentType === "article" ? await relatedArticles(locale, slug) : [];

  return (
    <>
      <JsonLd
        data={articleJsonLd({
          headline: entry.title,
          description: entry.seoDescription ?? entry.excerpt ?? entry.title,
          url: siteUrl(path),
          datePublished: entry.publishedAt,
          dateModified: entry.updatedAt,
          inLanguage: locale === "vi" ? "vi" : "en",
          author: entry.authorName ?? undefined,
          image: featuredImage?.url,
        })}
      />
      <MarketingPageLayout
        title={entry.title}
        description={entry.excerpt ?? index.description}
        breadcrumbs={breadcrumbs}
        plain
      >
        {previewBanner}
        {metaLine}
        {featured}
        <ArticleReadingLayout
          headings={headings}
          tocLabel={messages.pages.blog.tocLabel}
          sidebar={
            related.length > 0 ? (
              <RelatedArticles locale={locale} messages={messages} items={related} />
            ) : undefined
          }
        >
          {bodyContent}
        </ArticleReadingLayout>
      </MarketingPageLayout>
    </>
  );
}

function RelatedArticles({
  locale,
  messages,
  items,
}: {
  locale: SupportedLocale;
  messages: ReturnType<typeof getMessages>;
  items: PublishedContent[];
}) {
  return (
    <section aria-labelledby="related-articles">
      <h2 id="related-articles" className="text-lg font-semibold text-foreground">
        {messages.pages.blog.relatedHeading ?? "Bài viết liên quan"}
      </h2>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.entryPublicId}>
            <Link href={localePath(locale, `/blog/${item.slug}`)} className="block h-full">
              <ArticleCard title={item.title} excerpt={item.excerpt ?? undefined} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
