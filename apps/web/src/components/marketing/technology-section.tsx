import {
  BodyText,
  Container,
  CursorSpotlight,
  GradientMesh,
  HeroEnergyField,
  TechGrid,
  Title,
} from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";

const STEPS = ["stepIdea", "stepSoftware", "stepResult"] as const;

export function TechnologySection({ messages }: { messages: Messages }) {
  return (
    <CursorSpotlight>
      <section className="tech-section relative overflow-hidden border-y border-white/10 py-20 lg:py-28">
        <GradientMesh tone="indigo" className="opacity-40" />
        <HeroEnergyField intensity="soft" />
        <TechGrid density="fine" className="opacity-15" />
        <Container className="relative">
          <div className="max-w-3xl">
            <Title className="text-foreground">{messages.philosophy.heading}</Title>
            <BodyText className="mt-6 text-lg text-muted">{messages.philosophy.copy}</BodyText>
          </div>

          <div
            className="mt-14 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-6 motion-stagger"
            aria-label={messages.philosophy.stepSoftware}
          >
            {STEPS.map((step, index) => (
              <div key={step} className="flex flex-1 items-center gap-4 sm:flex-col sm:text-center">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm font-semibold text-foreground ring-1 ring-teal/30 motion-float">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1 sm:flex-none">
                  <p className="text-base font-medium text-foreground sm:text-lg">
                    {messages.philosophy[step]}
                  </p>
                </div>
                {index < STEPS.length - 1 ? (
                  <svg
                    aria-hidden
                    viewBox="0 0 24 12"
                    className="hidden h-3 w-8 shrink-0 text-teal/60 sm:block"
                  >
                    <path d="M0 6h20M16 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                ) : null}
              </div>
            ))}
          </div>
        </Container>
      </section>
    </CursorSpotlight>
  );
}
