import { Container } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";

export function GlobalSection({ messages }: { messages: Messages }) {
  return (
    <section className="py-16 lg:py-24">
      <Container className="grid gap-8 lg:grid-cols-5 lg:items-center">
        <h2 className="text-3xl font-semibold tracking-tight lg:col-span-2">{messages.global.heading}</h2>
        <p className="text-lg leading-relaxed text-khepree-slate/80 lg:col-span-3">{messages.global.copy}</p>
      </Container>
    </section>
  );
}
