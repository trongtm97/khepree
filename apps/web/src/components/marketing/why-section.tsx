import { BodyText, Container, GlassPanel, Title } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";

const ITEMS = [
  "usefulFirst",
  "simpleByDesign",
  "createRealValue",
  "alwaysMovingForward",
] as const;

const VISUALS: Record<(typeof ITEMS)[number], string> = {
  usefulFirst: "bg-gradient-to-br from-teal/15 via-cyan/10 to-transparent",
  simpleByDesign: "bg-[radial-gradient(circle_at_top_right,rgb(99_102_241/0.15),transparent_60%)]",
  createRealValue: "bg-gradient-to-tr from-solar-accent/15 via-teal/10 to-transparent",
  alwaysMovingForward: "bg-[linear-gradient(135deg,rgb(6_182_212/0.12),rgb(20_184_166/0.08))]",
};

export function WhySection({ messages }: { messages: Messages }) {
  return (
    <section id="why-khepree" className="border-y border-border bg-background py-16 lg:py-24">
      <Container>
        <Title>{messages.why.heading}</Title>
        <div className="mt-10 grid auto-rows-fr gap-4 md:grid-cols-6">
          {ITEMS.map((key, index) => {
            const item = messages.why[key];
            const wide = index === 0 || index === 3;
            return (
              <GlassPanel
                key={key}
                className={`relative overflow-hidden p-6 ${wide ? "md:col-span-4" : "md:col-span-2"} ${VISUALS[key]}`}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-teal/10 blur-2xl motion-float"
                />
                <h3 className="relative text-xl font-semibold text-foreground">{item.title}</h3>
                <BodyText className="relative mt-3">{item.copy}</BodyText>
              </GlassPanel>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
