import { BodyText, Container, Title } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";

const SIGNALS = [
  { key: "clearPayments", icon: "₫" },
  { key: "purchasedProducts", icon: "◫" },
  { key: "safeDownloads", icon: "↓" },
  { key: "vietnameseSupport", icon: "VI" },
] as const;

export function TrustSection({ messages }: { messages: Messages }) {
  return (
    <section className="border-y border-border bg-surface py-14 sm:py-16 lg:py-24">
      <Container>
        <Title className="max-w-2xl">{messages.trust.heading}</Title>
        <ul className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5">
          {SIGNALS.map(({ key, icon }) => {
            const item = messages.trust[key];
            return (
              <li
                key={key}
                className="rounded-[var(--radius-card)] border border-border bg-background p-5 sm:p-6"
              >
                <span
                  aria-hidden
                  className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-control)] bg-teal/10 text-sm font-semibold text-teal"
                >
                  {icon}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{item.title}</h3>
                <BodyText className="mt-2 text-base leading-relaxed">{item.copy}</BodyText>
              </li>
            );
          })}
        </ul>
      </Container>
    </section>
  );
}
