import { BodyText, Container, HeroEnergyField, HeroTitle, cn, ctaButtonGroupClass } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { accountSignUpUrl } from "@/lib/urls";
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
      <Container className="relative grid gap-10 py-12 sm:gap-12 sm:py-16 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)] lg:items-center lg:gap-14 lg:py-20 xl:py-24">
        <div className="order-1 max-w-xl motion-fade-up">
          <HeroTitle className="text-pretty text-[clamp(1.875rem,4vw+0.5rem,2.75rem)] leading-[1.15] text-foreground sm:text-[length:var(--text-hero)] sm:leading-[var(--leading-display)]">
            {messages.hero.headline}
          </HeroTitle>
          <BodyText className="mt-4 text-base leading-relaxed text-muted sm:mt-5 sm:text-lg">
            {messages.hero.supporting}
          </BodyText>
          <div className={cn(ctaButtonGroupClass, "mt-7 sm:mt-8")}>
            <ButtonLink href={localePath(locale, "/products")} variant="accent" showArrow fullWidthMobile>
              {messages.hero.ctaPrimary}
            </ButtonLink>
            <ButtonLink href={accountSignUpUrl()} variant="secondaryDark" fullWidthMobile>
              {messages.hero.ctaSecondary}
            </ButtonLink>
          </div>
        </div>
        <div className="order-2 min-w-0">
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
