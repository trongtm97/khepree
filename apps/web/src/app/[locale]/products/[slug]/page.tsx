import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";
import { JsonLd } from "@/components/seo/json-ld";
import { ProductDetailSections } from "@/components/catalog/product-detail-sections";
import { getMessages } from "@/lib/i18n/get-messages";
import { getPublicProductBySlug } from "@/lib/catalog";
import { breadcrumbJsonLd, softwareApplicationJsonLd } from "@/lib/seo/json-ld";
import { createPageMetadata, siteUrl } from "@/lib/seo/metadata";
import { accountPublicUrl } from "@/lib/urls";
import { isSupportedLocale, localePath, type SupportedLocale } from "@/lib/i18n/config";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isSupportedLocale(raw)) return {};

  const product = await getPublicProductBySlug(slug, raw);
  if (!product) return {};

  return createPageMetadata({
    locale: raw,
    title: product.seoTitle ?? product.name,
    description: product.seoDescription ?? product.shortDescription ?? product.description ?? "",
    path: `/products/${slug}`,
  });
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  if (!isSupportedLocale(raw)) notFound();

  const locale: SupportedLocale = raw;
  const messages = getMessages(locale);
  const product = await getPublicProductBySlug(slug, raw);
  if (!product) notFound();

  const path = localePath(locale, `/products/${slug}`);
  const breadcrumbs = [
    { label: messages.meta.siteName, href: localePath(locale) },
    { label: messages.pages.products.title, href: localePath(locale, "/products") },
    { label: product.name },
  ];

  const operatingSystem = product.platforms.map((platform) => {
    if (platform === "desktop") return "Windows, macOS, Linux";
    if (platform === "mobile") return "iOS, Android";
    return "Web Browser";
  });

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
          url: siteUrl(path),
          operatingSystem,
        })}
      />
      <div className="border-b border-khepree-slate/10">
        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      </div>
      <ProductDetailSections
        product={product}
        locale={locale}
        messages={messages}
        accountUrl={accountPublicUrl()}
      />
    </>
  );
}
