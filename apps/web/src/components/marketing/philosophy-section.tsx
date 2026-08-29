import { Container } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";

export function PhilosophySection({ messages }: { messages: Messages }) {
  return (
    <section className="border-y border-khepree-mist bg-khepree-white py-16 lg:py-24">
      <Container className="max-w-3xl">
        <h2 className="text-3xl font-semibold tracking-tight">{messages.philosophy.heading}</h2>
        <p className="mt-6 text-lg leading-relaxed text-khepree-slate/80">{messages.philosophy.copy}</p>
      </Container>
    </section>
  );
}
