import { Container } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { ButtonLink } from "./button-link";
import { HeroVisual } from "./hero-visual";

export function HeroSection({
  locale,
  messages,
}: {
  locale: SupportedLocale;
  messages: Messages;
}) {
  return (
    <section className="relative overflow-hidden border-b border-khepree-mist">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--color-khepree-teal)_0%,_transparent_50%)] opacity-[0.07]" />
      <Container className="relative grid gap-12 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-khepree-ink sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
            {messages.hero.headline}
          </h1>
          <p className="mt-6 max-w-xl text-lg text-khepree-slate/80">{messages.hero.supporting}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href={localePath(locale, "/products")} size="lg">
              {messages.hero.ctaPrimary}
            </ButtonLink>
            <ButtonLink href={`${localePath(locale)}#why-khepree`} variant="secondary" size="lg">
              {messages.hero.ctaSecondary}
            </ButtonLink>
          </div>
        </div>
        <HeroVisual />
      </Container>
    </section>
  );
}
