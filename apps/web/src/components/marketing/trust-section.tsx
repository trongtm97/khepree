import { BodyText, Container, Title } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";

const SIGNALS = [
  "clearPayments",
  "purchasedProducts",
  "safeDownloads",
  "vietnameseSupport",
] as const;

export function TrustSection({ messages }: { messages: Messages }) {
  return (
    <section className="border-y border-border bg-background py-16 lg:py-24">
      <Container>
        <Title>{messages.trust.heading}</Title>
        <ul className="mt-10 divide-y divide-border rounded-[var(--radius-card)] border border-border">
          {SIGNALS.map((key) => {
            const item = messages.trust[key];
            return (
              <li key={key} className="p-5 sm:p-6">
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
