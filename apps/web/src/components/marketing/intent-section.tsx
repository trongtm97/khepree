import { BodyText, Container, Title } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";

const ITEMS = ["lessRepetition", "fasterHardWork", "aiWithoutTech", "workAtScale"] as const;

export function IntentSection({ messages }: { messages: Messages }) {
  return (
    <section id="intent" className="bg-background py-14 sm:py-16 lg:py-24">
      <Container>
        <Title className="max-w-2xl">{messages.intent.heading}</Title>
        <ul className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5">
          {ITEMS.map((key) => {
            const item = messages.intent[key];
            return (
              <li
                key={key}
                className="rounded-[var(--radius-card)] border border-border bg-surface p-5 motion-fade-up sm:p-6"
              >
                <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                <BodyText className="mt-2 text-base leading-relaxed">{item.copy}</BodyText>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
