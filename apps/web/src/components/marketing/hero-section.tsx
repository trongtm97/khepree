import { BodyText, Container, HeroEnergyField, HeroTitle, cn, ctaButtonGroupClass } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { ButtonLink } from "./button-link";
import { LeverageHeroVisual } from "./leverage-visual";

export function HeroSection({
  locale,
  messages,
  screenshotUrl,
  screenshotAlt,
}: {
  locale: SupportedLocale;
  messages: Messages;
  screenshotUrl?: string | null;
  screenshotAlt?: string;
}) {
  return (
    <section className="tech-section relative overflow-hidden border-b border-white/8">
      <HeroEnergyField intensity="soft" className="max-sm:opacity-55" />
      <Container className="relative grid gap-8 py-10 sm:gap-10 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-12 lg:py-20 xl:py-24">
        <div className="order-1 max-w-xl motion-fade-up lg:max-w-lg xl:max-w-xl">
          <HeroTitle className="whitespace-pre-line text-pretty text-[clamp(1.75rem,2.8vw+0.5rem,2.85rem)] leading-[1.12] text-foreground sm:leading-[1.1] lg:text-[length:var(--text-hero)]">
            {messages.hero.headline}
          </HeroTitle>
          <BodyText className="mt-4 max-w-md text-base leading-relaxed text-muted sm:mt-5 sm:max-w-lg sm:text-lg">
            {messages.hero.supporting}
          </BodyText>
          <div className={cn(ctaButtonGroupClass, "mt-6 sm:mt-8")}>
            <ButtonLink href={localePath(locale, "/about")} variant="accent" size="lg" showArrow fullWidthMobile>
              {messages.hero.ctaPrimary}
            </ButtonLink>
            <ButtonLink href={localePath(locale, "/products")} variant="secondaryDark" size="lg" fullWidthMobile>
              {messages.hero.ctaSecondary}
            </ButtonLink>
          </div>
          <p className="mt-4 text-sm font-medium text-muted sm:mt-5">{messages.hero.microcopy}</p>
        </div>
        <div className="order-2 min-w-0 lg:justify-self-end">
          <LeverageHeroVisual
            messages={messages}
            screenshotUrl={screenshotUrl}
            screenshotAlt={screenshotAlt}
          />
        </div>
      </Container>
    </section>
  );
}
