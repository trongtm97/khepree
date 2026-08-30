import { HeroSection } from "@/components/marketing/hero-section";
import {
  AiPhilosophyQuote,
  BrandSection,
  FomoSection,
  Leverage10xSection,
  PipelineSection,
  UrgencySection,
} from "@/components/marketing/homepage-sections";
import { IntentSection } from "@/components/marketing/intent-section";
import { ProductShowcaseSection } from "@/components/marketing/product-showcase-section";
import { TrustSection } from "@/components/marketing/trust-section";
import { ValueStrip } from "@/components/marketing/value-strip";
import { CtaSection } from "@/components/marketing/cta-section";
import { JsonLd } from "@/components/seo/json-ld";
import { getPublicProducts } from "@/lib/catalog";
import { getMessages } from "@/lib/i18n/get-messages";
import { isSupportedLocale, type SupportedLocale } from "@/lib/i18n/config";
import { createPageMetadata } from "@/lib/seo/metadata";
import { websiteJsonLd } from "@/lib/seo/json-ld";

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

  return (
    <>
      <JsonLd data={websiteJsonLd()} />
      <HeroSection
        locale={locale}
        messages={messages}
        screenshotUrl={heroMedia?.url}
        screenshotAlt={heroMedia?.altText || heroProduct?.name}
      />
      <ValueStrip messages={messages} />
      <FomoSection messages={messages} />
      <Leverage10xSection messages={messages} />
      <IntentSection messages={messages} />
      <ProductShowcaseSection locale={locale} messages={messages} products={products} />
      <AiPhilosophyQuote messages={messages} />
      <PipelineSection messages={messages} />
      <UrgencySection locale={locale} messages={messages} />
      <BrandSection locale={locale} messages={messages} />
      <TrustSection locale={locale} messages={messages} />
      <CtaSection locale={locale} messages={messages} />
    </>
  );
}
