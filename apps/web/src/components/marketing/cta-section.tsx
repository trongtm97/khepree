import { BodyText, Container, GradientMesh, HeroEnergyField, Title } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { accountSignUpUrl } from "@/lib/urls";
import { ButtonLink } from "./button-link";

export function CtaSection({
  locale,
  messages,
}: {
  locale: SupportedLocale;
  messages: Messages;
}) {
  return (
    <section className="tech-section relative overflow-hidden border-t border-white/10 py-16 sm:py-20 lg:py-28">
      <GradientMesh tone="teal" className="opacity-55 max-sm:opacity-40" />
      <HeroEnergyField intensity="soft" className="max-sm:opacity-70" />
      <Container className="relative text-center">
        <Title className="mx-auto max-w-3xl text-foreground">{messages.cta.heading}</Title>
        <BodyText className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          {messages.cta.copy}
        </BodyText>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row max-[430px]:[&_a]:w-full max-[430px]:[&_a]:max-w-sm">
          <ButtonLink
            href={localePath(locale, "/products")}
            size="lg"
            className="motion-light-sweep min-h-11 bg-teal text-background hover:bg-teal/90"
          >
            {messages.cta.button}
          </ButtonLink>
          <ButtonLink
            href={accountSignUpUrl()}
            size="lg"
            variant="secondary"
            className="min-h-11 border-white/15 bg-white/5 text-foreground hover:bg-white/10"
          >
            {messages.cta.signUp}
          </ButtonLink>
        </div>
      </Container>
    </section>
  );
}
