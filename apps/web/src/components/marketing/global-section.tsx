import { BodyText, Container, GradientMesh, TechGrid, Title } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";

export function GlobalSection({ messages }: { messages: Messages }) {
  return (
    <section className="tech-section relative overflow-hidden py-20 lg:py-28">
      <GradientMesh tone="mixed" className="opacity-50" />
      <TechGrid className="opacity-20" />
      <Container className="relative grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <Title className="text-foreground">{messages.global.heading}</Title>
          <BodyText className="mt-6 text-lg text-muted">{messages.global.copy}</BodyText>
        </div>

        <div aria-hidden className="relative mx-auto aspect-square w-full max-w-md">
          <div className="absolute inset-0 rounded-full border border-dashed border-teal/25 motion-orbit" />
          <div className="absolute inset-[12%] rounded-full border border-cyan/20" />
          <div className="absolute inset-[24%] rounded-full bg-gradient-to-br from-teal/20 via-cyan/10 to-indigo/10" />
          <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-solar-accent/80 shadow-[0_0_16px_rgb(251_191_36/0.5)]" />
          {[0, 60, 120, 180, 240, 300].map((deg) => (
            <span
              key={deg}
              className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan/70"
              style={{
                transform: `rotate(${deg}deg) translateY(-42%) translateX(-50%)`,
              }}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
