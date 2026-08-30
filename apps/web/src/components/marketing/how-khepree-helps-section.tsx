import { Container, Title } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";

const STEPS = ["step1", "step2", "step3"] as const;

export function HowKhepreeHelpsSection({ messages }: { messages: Messages }) {
  return (
    <section className="border-y border-border bg-surface py-14 sm:py-16 lg:py-24">
      <Container>
        <Title className="text-center">{messages.howItWorks.heading}</Title>

        <div className="mx-auto mt-10 max-w-5xl sm:mt-12">
          <ol className="flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-0">
            {STEPS.map((key, index) => (
              <li key={key} className="flex flex-1 flex-col lg:flex-row lg:items-center">
                <div className="flex-1 rounded-[var(--radius-card)] border border-border bg-background p-5 sm:p-6">
                  <span
                    aria-hidden
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-teal/10 text-base font-semibold text-teal"
                  >
                    {index + 1}
                  </span>
                  <p className="mt-4 text-lg font-medium leading-snug text-foreground sm:text-xl">
                    {messages.howItWorks[key].title}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted sm:text-base">
                    {messages.howItWorks[key].copy}
                  </p>
                </div>
                {index < STEPS.length - 1 ? (
                  <div
                    aria-hidden
                    className="flex shrink-0 items-center justify-center py-2 text-xl text-teal/50 lg:w-12 lg:py-0"
                  >
                    <span className="lg:hidden">↓</span>
                    <span className="hidden lg:inline">→</span>
                  </div>
                ) : null}
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
