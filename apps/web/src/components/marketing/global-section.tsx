import { Card, CardDescription, CardTitle, Container } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";

const ITEMS = ["multilingual", "availability", "crossPlatform", "international"] as const;

export function GlobalSection({ messages }: { messages: Messages }) {
  return (
    <section className="py-16 lg:py-24">
      <Container>
        <h2 className="text-3xl font-semibold tracking-tight">{messages.global.heading}</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {ITEMS.map((key) => {
            const item = messages.global[key];
            return (
              <Card key={key}>
                <CardTitle className="text-lg">{item.title}</CardTitle>
                <CardDescription className="mt-2">{item.copy}</CardDescription>
              </Card>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
