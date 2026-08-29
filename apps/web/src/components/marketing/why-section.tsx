import { Card, CardDescription, CardTitle, Container } from "@khepree/ui";
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
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {ITEMS.map((key) => {
            const item = messages.why[key];
            return (
              <Card key={key}>
                <CardTitle>{item.title}</CardTitle>
                <CardDescription className="mt-2">{item.copy}</CardDescription>
              </Card>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
