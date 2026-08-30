import { Container } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";

const STEPS = ["step1", "step2", "step3"] as const;

export function HowKhepreeHelpsSection({ messages }: { messages: Messages }) {
  return (
    <section className="border-y border-border bg-surface py-16 lg:py-24">
      <Container>
        <ol className="mx-auto flex max-w-3xl flex-col gap-6 sm:gap-8">
          {STEPS.map((key, index) => (
            <li key={key} className="flex items-start gap-4 sm:items-center sm:gap-6">
              <span
                aria-hidden
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal/10 text-base font-semibold text-teal"
              >
                {index + 1}
              </span>
              <p className="min-w-0 flex-1 pt-2 text-lg font-medium leading-snug text-foreground sm:pt-0 sm:text-xl">
                {messages.howItWorks[key]}
              </p>
              {index < STEPS.length - 1 ? (
                <span aria-hidden className="hidden text-2xl text-teal/50 sm:block">
                  →
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}
