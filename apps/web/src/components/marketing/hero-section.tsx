import { BodyText, Container, HeroEnergyField, HeroTitle } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { ButtonLink } from "./button-link";
import { HeroVisual } from "./hero-visual";

export function HeroSection({
  locale,
  messages,
  screenshotUrl,
  screenshotAlt,
  productName,
}: {
  locale: SupportedLocale;
  messages: Messages;
  screenshotUrl?: string | null;
  screenshotAlt?: string;
  productName?: string;
}) {
  return (
    <section className="tech-section relative overflow-hidden border-b border-white/10">
      <HeroEnergyField intensity="soft" />
      <Container className="relative grid gap-12 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-16 lg:py-24 xl:py-28">
        <div className="max-w-xl motion-fade-up">
          <HeroTitle className="text-foreground">{messages.hero.headline}</HeroTitle>
          <BodyText className="mt-6 text-lg text-muted">{messages.hero.supporting}</BodyText>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={localePath(locale, "/products")} size="lg">
              {messages.hero.ctaPrimary}
            </ButtonLink>
            <ButtonLink
              href="#ecosystem"
              variant="secondary"
              size="lg"
              className="border-white/15 bg-white/5 text-foreground hover:bg-white/10"
            >
              {messages.hero.ctaSecondary}
            </ButtonLink>
          </div>
        </div>
        <HeroVisual
          screenshotUrl={screenshotUrl}
          screenshotAlt={screenshotAlt}
          productName={productName}
        />
      </Container>
    </section>
  );
}
