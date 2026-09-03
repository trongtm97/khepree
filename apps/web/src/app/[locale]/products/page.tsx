import { EmptyState } from "@khepree/ui";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/catalog/product-card";
import { MarketingPageLayout } from "@/components/marketing/marketing-page-layout";
import { getMessages } from "@/lib/i18n/get-messages";
import { getPublicProducts } from "@/lib/catalog";
import { createPageMetadata } from "@/lib/seo/metadata";
import { createPageBreadcrumbs, pageBreadcrumbLabel } from "@/lib/seo/page-breadcrumbs";
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
      breadcrumbs={createPageBreadcrumbs(locale, messages, {
        label: pageBreadcrumbLabel(content),
        href: localePath(locale, "/products"),
      })}
      plain
    >
      <p className="max-w-2xl text-muted">{content.intro}</p>
      {products.length > 0 ? (
        <ul className="mt-8 grid list-none gap-3 p-0 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <li key={product.publicId} className="min-w-0">
              <ProductCard product={product} locale={locale} messages={messages} />
            </li>
          ))}
        </ul>
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
