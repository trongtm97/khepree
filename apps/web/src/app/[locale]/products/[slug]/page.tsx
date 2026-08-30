import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { ProductDetailSections } from "@/components/catalog/product-detail-sections";
import { ProductChangelogSection } from "@/components/catalog/product-changelog-section";
import { getMessages } from "@/lib/i18n/get-messages";
import { getPublicProductBySlug, getProductPreviewBySlug } from "@/lib/catalog";
import { getPublicChangelog } from "@/lib/releases";
import { breadcrumbJsonLd, faqPageJsonLd, productPlanOffersJsonLd, softwareApplicationJsonLd } from "@/lib/seo/json-ld";
import { createPageMetadata, siteUrl } from "@/lib/seo/metadata";
import { accountPublicUrl } from "@/lib/urls";
import { isSupportedLocale, localePath, type SupportedLocale } from "@/lib/i18n/config";

export const revalidate = 3600;

function productImage(product: { icon: { url: string } | null; gallery: Array<{ url: string }> }) {
  return product.gallery?.[0]?.url ?? product.icon?.url ?? undefined;
}

function hreflangFromProduct(availableLocales: string[]): SupportedLocale[] {
  return availableLocales.filter((locale): locale is SupportedLocale => isSupportedLocale(locale));
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isSupportedLocale(raw)) return {};

  const preview = (await searchParams).preview;
  const product = preview
    ? await getProductPreviewBySlug(slug, raw, preview)
    : await getPublicProductBySlug(slug, raw);
  if (!product) return {};

  const meta = createPageMetadata({
    locale: raw,
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.shortDescription ?? product.description ?? "",
    path: `/products/${slug}`,
    hreflangLocales: hreflangFromProduct(product.availableLocales),
    image: productImage(product),
    noIndex: Boolean(preview),
  });
  if (preview) {
    return { ...meta, robots: { index: false, follow: false, noarchive: true } };
  }
  return meta;
}

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isSupportedLocale(raw)) notFound();

  const locale: SupportedLocale = raw;
  const preview = (await searchParams).preview;
  const product = preview
    ? await getProductPreviewBySlug(slug, raw, preview)
    : await getPublicProductBySlug(slug, raw);
  if (!product) notFound();

  const messages = getMessages(locale);
  const isPreview = Boolean(preview);
  const releases = isPreview ? [] : await getPublicChangelog(locale, slug);
  const changelog = messages.pages.changelog;

  const path = localePath(locale, `/products/${slug}`);
  const pageUrl = siteUrl(path);
  const offers = productPlanOffersJsonLd(product, pageUrl);
  const breadcrumbs = [
    { label: messages.meta.siteName, href: localePath(locale) },
    { label: messages.pages.products.title, href: localePath(locale, "/products") },
    { label: product.name },
  ];

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd(
          breadcrumbs
            .filter((item) => item.href)
            .map((item) => ({ name: item.label, href: item.href! })),
        )}
      />
      <JsonLd
        data={softwareApplicationJsonLd({
          name: product.name,
          description: product.seoDescription ?? product.shortDescription ?? product.description ?? "",
          url: pageUrl,
          operatingSystem: product.operatingSystems,
          image: productImage(product),
          offers: offers.length > 0 ? offers : undefined,
        })}
      />
      {product.marketing.faq?.length ? <JsonLd data={faqPageJsonLd(product.marketing.faq)} /> : null}
      <div className="border-b border-khepree-slate/10">
        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
          {isPreview ? (
            <p className="mb-3 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Bản xem trước nháp — noindex, không lập chỉ mục.
            </p>
          ) : null}
          <Breadcrumbs items={breadcrumbs} />
        </div>
      </div>
      <ProductDetailSections
        product={product}
        locale={locale}
        messages={messages}
        accountUrl={accountPublicUrl()}
      />
      {releases.length > 0 ? (
        <div className="border-b border-khepree-slate/10">
          <div className="mx-auto max-w-6xl px-4 lg:px-8">
            <ProductChangelogSection
              entries={releases}
              locale={locale}
              title={messages.catalog.nav.changelog}
              versionLabel={changelog.version}
              releasedLabel={changelog.released}
              downloadsLabel={changelog.downloads}
              fullChangelogLabel={messages.catalog.fullChangelog}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
