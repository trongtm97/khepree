import { Card, CardDescription, CardTitle, Container } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";

const AUDIENCES = ["creators", "professionals", "entrepreneurs", "businesses"] as const;

export function AudienceSection({ messages }: { messages: Messages }) {
  return (
    <section className="py-16 lg:py-24">
      <Container>
        <h2 className="text-3xl font-semibold tracking-tight">{messages.audience.heading}</h2>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {AUDIENCES.map((key) => {
            const item = messages.audience[key];
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
