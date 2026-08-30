import { BodyText, Container, FloatingSurface, GradientMesh, ProductWindow, TechGrid, Title } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";

const BENEFITS = ["aiBenefit", "automationBenefit", "reliabilityBenefit"] as const;

export function TechnologyShowcaseSection({ messages }: { messages: Messages }) {
  return (
    <section className="tech-section relative overflow-hidden py-16 sm:py-20 lg:py-28">
      <GradientMesh tone="mixed" className="opacity-55 max-sm:opacity-40" />
      <TechGrid className="opacity-25 max-sm:opacity-15" />
      <Container className="relative grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <Title className="whitespace-pre-line text-foreground">{messages.technology.heading}</Title>
          <BodyText className="mt-5 text-base leading-relaxed text-muted sm:mt-6 sm:text-lg">
            {messages.technology.copy}
          </BodyText>
          <ul className="mt-8 space-y-4">
            {BENEFITS.map((key) => (
              <li key={key} className="flex gap-3 text-base leading-relaxed text-muted">
                <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-cyan/80" />
                {messages.technology[key]}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
          <div className="relative aspect-[4/3] min-h-[240px] overflow-hidden rounded-[var(--radius-card)] border border-white/10 bg-[#070b14] shadow-[var(--shadow-elevated)] sm:min-h-[280px] lg:min-h-[320px]">
            <GradientMesh tone="teal" className="opacity-50 max-sm:opacity-35" />
            <ProductWindow
              title="Workflow"
              depth
              lightSweep
              className="absolute bottom-[8%] left-[6%] z-10 w-[58%] border-white/15 bg-surface/95 motion-float mobile-reduce-motion"
            >
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="h-8 flex-1 rounded bg-teal/20" />
                  <div className="h-8 w-16 rounded bg-border-subtle" />
                </div>
                <div className="h-12 rounded-lg bg-gradient-to-r from-teal/15 to-cyan/10" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-10 rounded bg-border-subtle" />
                  <div className="h-10 rounded bg-solar-accent/20" />
                </div>
              </div>
            </ProductWindow>
            <FloatingSurface
              float
              className="absolute right-[6%] top-[10%] z-10 w-[36%] border-white/10 bg-surface/90 p-3 backdrop-blur-sm max-sm:hidden mobile-no-blur mobile-reduce-motion"
            >
              <div className="space-y-2">
                <div className="h-1.5 w-10 rounded-full bg-cyan/70" />
                <div className="h-6 rounded bg-teal/25" />
                <div className="h-6 rounded bg-border-subtle" />
              </div>
            </FloatingSurface>
            <FloatingSurface className="absolute left-[10%] top-[12%] z-[1] w-[30%] border-cyan/15 bg-indigo/10 p-2 opacity-70 max-sm:hidden">
              <div className="h-6 rounded bg-gradient-to-r from-cyan/30 to-transparent" />
            </FloatingSurface>
          </div>
        </div>
      </Container>
    </section>
  );
}
