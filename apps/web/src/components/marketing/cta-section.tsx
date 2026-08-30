import {
  BodyText,
  Container,
  GradientMesh,
  HeroEnergyField,
  HeroTitle,
  cn,
  ctaButtonGroupClass,
} from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { ButtonLink } from "./button-link";

export function CtaSection({
  locale,
  messages,
}: {
  locale: SupportedLocale;
  messages: Messages;
}) {
  return (
    <section className="tech-section relative overflow-hidden border-t border-white/8 section-py">
      <GradientMesh tone="teal" className="opacity-45 max-sm:opacity-32" />
      <HeroEnergyField intensity="soft" className="max-sm:opacity-55" />
      <div aria-hidden className="cta-spotlight" />
      <Container className="relative mx-auto max-w-2xl text-center">
        <HeroTitle className="text-pretty text-foreground sm:text-[clamp(2rem,3vw+0.5rem,3rem)]">
          {messages.cta.heading}
        </HeroTitle>
        <BodyText className="mx-auto mt-4 max-w-md text-base sm:text-lg">{messages.cta.supporting}</BodyText>
        <p className="mt-3 text-sm font-medium text-muted">{messages.cta.fomo}</p>
        <div className={cn(ctaButtonGroupClass, "mt-8 justify-center sm:mt-10")}>
          <ButtonLink href={localePath(locale, "/about")} variant="accent" size="lg" showArrow fullWidthMobile>
            {messages.cta.button}
          </ButtonLink>
          <ButtonLink href={localePath(locale, "/products")} variant="secondaryDark" size="lg" fullWidthMobile>
            {messages.cta.secondary}
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
