import { Container } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";

const ITEMS = [
  "usefulFirst",
  "simpleByDesign",
  "createRealValue",
  "alwaysMovingForward",
] as const;

export function WhySection({ messages }: { messages: Messages }) {
  return (
    <section id="why-khepree" className="border-y border-khepree-mist bg-khepree-white py-16 lg:py-24">
      <Container>
        <h2 className="text-3xl font-semibold tracking-tight">{messages.why.heading}</h2>
        <div className="mt-10 grid gap-4 md:grid-cols-6">
          {ITEMS.map((key, index) => {
            const item = messages.why[key];
            const wide = index === 0 || index === 3;
            return (
              <article
                key={key}
                className={
                  wide
                    ? "rounded-[var(--radius-card)] border border-khepree-mist bg-khepree-cloud/80 p-6 md:col-span-4"
                    : "rounded-[var(--radius-card)] border border-khepree-mist bg-khepree-white p-6 md:col-span-2"
                }
              >
                <h3 className="text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-khepree-slate/80">{item.copy}</p>
              </article>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
