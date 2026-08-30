import { BodyText, Container, Title } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";

const ITEMS = ["publishContent", "marketProduct", "exploitData", "scaleProcess"] as const;

export function IntentSection({ messages }: { messages: Messages }) {
  return (
    <section id="intent" className="section-light section-py">
      <Container>
        <Title className="max-w-2xl text-pretty">{messages.intent.heading}</Title>
        <BodyText className="mt-3 max-w-xl text-base sm:text-lg">{messages.intent.intro}</BodyText>
        <ul className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5">
          {ITEMS.map((key) => {
            const item = messages.intent[key];
            return (
              <li key={key}>
                <article className="marketing-card marketing-card-lift h-full p-5 motion-fade-up sm:p-6">
                  <h3 className="text-base font-semibold text-foreground sm:text-lg">{item.title}</h3>
                  <BodyText className="mt-2 text-base leading-relaxed">{item.copy}</BodyText>
                </article>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
