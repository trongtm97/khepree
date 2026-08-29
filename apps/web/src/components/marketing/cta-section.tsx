import { Container } from "@khepree/ui";
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
    <section className="border-t border-khepree-mist bg-gradient-to-br from-khepree-ink to-khepree-slate py-16 text-khepree-white lg:py-20">
      <Container className="text-center">
        <h2 className="text-3xl font-semibold tracking-tight">{messages.cta.heading}</h2>
        <ButtonLink
          href={localePath(locale, "/products")}
          className="mt-8 bg-khepree-teal hover:bg-khepree-teal/90"
          size="lg"
        >
          {messages.cta.button}
        </ButtonLink>
      </Container>
    </section>
  );
}
