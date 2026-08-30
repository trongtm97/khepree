import { Container } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";

export function PhilosophySection({ messages }: { messages: Messages }) {
  return (
    <section className="border-y border-khepree-mist bg-khepree-ink py-20 text-khepree-white lg:py-28">
      <Container className="max-w-4xl">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
          {messages.philosophy.heading}
        </h2>
        <p className="mt-8 text-lg leading-relaxed text-white/80">{messages.philosophy.copy}</p>
      </Container>
    </section>
  );
}
