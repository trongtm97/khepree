import { AudienceSection } from "@/components/marketing/audience-section";
import { CtaSection } from "@/components/marketing/cta-section";
import { GlobalSection } from "@/components/marketing/global-section";
import { HeroSection } from "@/components/marketing/hero-section";
import { PhilosophySection } from "@/components/marketing/philosophy-section";
import { ProductsSection } from "@/components/marketing/products-section";
import { ValueStrip } from "@/components/marketing/value-strip";
import { WhySection } from "@/components/marketing/why-section";
import { getMessages } from "@/lib/i18n/get-messages";
import { isSupportedLocale, type SupportedLocale } from "@/lib/i18n/config";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) return null;

  const locale: SupportedLocale = raw;
  const messages = getMessages(locale);

  return (
    <>
      <HeroSection locale={locale} messages={messages} />
      <ValueStrip messages={messages} />
      <ProductsSection locale={locale} messages={messages} />
      <WhySection messages={messages} />
      <AudienceSection messages={messages} />
      <PhilosophySection messages={messages} />
      <GlobalSection messages={messages} />
      <CtaSection locale={locale} messages={messages} />
    </>
  );
}
