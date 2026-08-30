import { EmptyState } from "@khepree/ui";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/catalog/product-card";
import { MarketingPageLayout } from "@/components/marketing/marketing-page-layout";
import { getMessages } from "@/lib/i18n/get-messages";
import { getPublicProducts } from "@/lib/catalog";
import { createPageMetadata } from "@/lib/seo/metadata";
import { isSupportedLocale, localePath, type SupportedLocale } from "@/lib/i18n/config";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) return {};
  const content = getMessages(raw).pages.products;
  return createPageMetadata({
    locale: raw,
    title: content.title,
    description: content.description,
    path: "/products",
  });
}

export default async function ProductsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) notFound();

  const locale: SupportedLocale = raw;
  const messages = getMessages(locale);
  const content = messages.pages.products;
  const products = await getPublicProducts(locale);

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
      {products.length > 0 ? (
        <div className="mt-8 grid gap-4">
          {products.map((product) => (
            <ProductCard key={product.publicId} product={product} locale={locale} messages={messages} />
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title={messages.products.emptyTitle}
            description={messages.products.emptyDescription}
          />
        </div>
      )}
    </MarketingPageLayout>
  );
}
