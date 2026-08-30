import { CtaSection } from "@/components/marketing/cta-section";
import { EcosystemSection } from "@/components/marketing/ecosystem-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { HowKhepreeHelpsSection } from "@/components/marketing/how-khepree-helps-section";
import { IntentSection } from "@/components/marketing/intent-section";
import { ProductShowcaseSection } from "@/components/marketing/product-showcase-section";
import { ResourcesSection } from "@/components/marketing/resources-section";
import { TechnologyShowcaseSection } from "@/components/marketing/technology-showcase-section";
import { TrustSection } from "@/components/marketing/trust-section";
import { getEcosystemNetworkSurfaces } from "@/lib/ecosystem-nav";
import { listPublishedContent } from "@/lib/content";
import { getPublicProducts } from "@/lib/catalog";
import { getMessages } from "@/lib/i18n/get-messages";
import { isSupportedLocale, localePath, type SupportedLocale } from "@/lib/i18n/config";
import { createPageMetadata } from "@/lib/seo/metadata";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) return {};
  const messages = getMessages(raw);
  return createPageMetadata({
    locale: raw,
    title: messages.meta.siteName,
    description: messages.meta.defaultDescription,
    path: "/",
  });
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) return null;

  const locale: SupportedLocale = raw;
  const messages = getMessages(locale);
  const products = await getPublicProducts(locale);
  const heroProduct = products.find((product) => product.gallery?.[0] || product.icon);
  const heroMedia = heroProduct?.gallery[0] ?? heroProduct?.icon ?? null;

  const [articles, docs] = await Promise.all([
    listPublishedContent("article", locale),
    listPublishedContent("doc", locale),
  ]);
  const resources = [...articles, ...docs]
    .sort((a, b) => {
      const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 4)
    .map((item) => ({
      ...item,
      href: localePath(locale, `${item.contentType === "article" ? "/blog" : "/docs"}/${item.slug}`),
    }));

  const ecosystemSurfaces = getEcosystemNetworkSurfaces(locale);

  return (
    <>
      <HeroSection
        locale={locale}
        messages={messages}
        screenshotUrl={heroMedia?.url}
        screenshotAlt={heroMedia?.altText || heroProduct?.name}
        productName={heroProduct?.name}
      />
      <IntentSection messages={messages} />
      <ProductShowcaseSection locale={locale} messages={messages} products={products} />
      <HowKhepreeHelpsSection messages={messages} />
      <TechnologyShowcaseSection messages={messages} />
      <EcosystemSection messages={messages} surfaces={ecosystemSurfaces} />
      <TrustSection messages={messages} />
      <ResourcesSection locale={locale} messages={messages} items={resources} />
      <CtaSection locale={locale} messages={messages} />
    </>
  );
}
