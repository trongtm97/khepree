import { BodyText, Container } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";

export function ValueStrip({ messages }: { messages: Messages }) {
  return (
    <section
      aria-label={messages.valueStrip.heading}
      className="section-surface border-b border-border section-py-compact"
    >
      <Container className="max-w-3xl text-center">
        <p className="text-lg font-semibold leading-snug tracking-tight text-foreground sm:text-xl lg:text-2xl">
          {messages.valueStrip.heading}
        </p>
        <BodyText className="mx-auto mt-3 max-w-xl text-base sm:text-lg">{messages.valueStrip.subtext}</BodyText>
      </Container>
    </section>
  );
}
