import { Container, GradientMesh, HeroEnergyField, Title } from "@khepree/ui";
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
    <section className="tech-section relative overflow-hidden border-t border-white/10 py-20 lg:py-28">
      <GradientMesh tone="teal" className="opacity-60" />
      <HeroEnergyField intensity="soft" />
      <Container className="relative text-center">
        <Title className="mx-auto max-w-3xl text-foreground">{messages.cta.heading}</Title>
        <ButtonLink
          href={localePath(locale, "/products")}
          size="lg"
          className="motion-light-sweep mt-8 bg-teal text-background hover:bg-teal/90"
        >
          {messages.cta.button}
        </ButtonLink>
      </Container>
    </section>
  );
}
