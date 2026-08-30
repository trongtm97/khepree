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
      <Container className="relative grid gap-10 py-14 sm:gap-12 sm:py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-16 lg:py-24 xl:py-28">
        <div className="order-1 max-w-xl motion-fade-up">
          <HeroTitle className="text-pretty text-[clamp(2.25rem,4.5vw+0.65rem,2.75rem)] leading-[1.12] text-foreground sm:text-[length:var(--text-hero)] sm:leading-[var(--leading-display)]">
            {messages.hero.headline}
          </HeroTitle>
          <BodyText className="mt-5 text-base leading-relaxed text-muted sm:mt-6 sm:text-lg">
            {messages.hero.supporting}
          </BodyText>
          <div className="mt-8 flex flex-col gap-3 max-[390px]:[&_a]:w-full max-[390px]:[&_a]:justify-center sm:flex-row sm:flex-wrap">
            <ButtonLink href={localePath(locale, "/products")} size="lg">
              {messages.hero.ctaPrimary}
            </ButtonLink>
            <ButtonLink
              href="#intent"
              variant="secondary"
              size="lg"
              className="border-white/15 bg-white/5 text-foreground hover:bg-white/10"
            >
              {messages.hero.ctaSecondary}
            </ButtonLink>
          </div>
        </div>
        <div className="order-2">
          <HeroVisual
            screenshotUrl={screenshotUrl}
            screenshotAlt={screenshotAlt}
            productName={productName}
          />
        </div>
      </Container>
    </section>
  );
}
