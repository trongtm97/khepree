import {
  Container,
  GradientMesh,
  HeroEnergyField,
  HeroTitle,
  Title,
  cn,
  ctaButtonGroupClass,
} from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";
import { localePath, type SupportedLocale } from "@/lib/i18n/config";
import { ButtonLink } from "./button-link";
import { LeverageMultiplyVisual } from "./leverage-visual";
import { ScrollReveal } from "./scroll-reveal";

export function FomoSection({ messages }: { messages: Messages }) {
  const copy = messages.fomo;
  return (
    <section className="tech-section relative overflow-hidden border-y border-white/8 section-py">
      <GradientMesh tone="teal" className="opacity-40 max-sm:opacity-28" />
      <HeroEnergyField intensity="soft" className="max-sm:opacity-55" />
      <Container className="relative">
        <HeroTitle className="max-w-2xl text-pretty text-foreground">{copy.heading}</HeroTitle>
        <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-14">
          <div className="space-y-4 text-base leading-relaxed text-muted sm:text-lg">
            <p>{copy.groupAsk}</p>
            <p>{copy.groupBuild}</p>
          </div>
          <div aria-hidden className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="rounded-[var(--radius-card)] border border-white/10 bg-[#0b1730]/80 px-4 py-8 text-center sm:py-10">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Prompt</p>
              <p className="mt-3 text-base font-semibold text-muted sm:text-lg">{copy.visualAsk}</p>
            </div>
            <div className="leverage-output-card rounded-[var(--radius-card)] border border-teal/30 bg-teal/10 px-4 py-8 text-center sm:py-10">
              <p className="text-xs font-semibold uppercase tracking-wider text-teal/80">System → Outputs</p>
              <p className="mt-3 text-base font-semibold text-teal sm:text-lg">{copy.visualBuild}</p>
            </div>
          </div>
        </div>
        <p className="mt-10 max-w-2xl text-xl font-semibold leading-snug text-foreground sm:mt-12 sm:text-2xl">
          {copy.closing}
        </p>
      </Container>
    </section>
  );
}

export function Leverage10xSection({ messages }: { messages: Messages }) {
  const copy = messages.leverage10x;
  return (
    <section className="section-light border-b border-border section-py">
      <Container className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <Title className="max-w-xl text-pretty">{copy.heading}</Title>
          <ul className="mt-6 space-y-2.5 text-base font-semibold text-foreground sm:mt-8 sm:space-y-3 sm:text-lg">
            {copy.statements.map((statement) => (
              <li key={statement} className="flex items-start gap-2.5">
                <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-teal" />
                {statement}
              </li>
            ))}
          </ul>
          <p className="mt-6 text-base leading-relaxed text-muted sm:mt-8 sm:text-lg">{copy.closing}</p>
        </div>
        <LeverageMultiplyVisual stages={copy.speedStages} />
      </Container>
    </section>
  );
}

export function PipelineSection({ messages }: { messages: Messages }) {
  const copy = messages.pipeline;
  const inputKeys = ["idea", "content", "data", "media"] as const;
  const outputKeys = ["content", "product", "asset", "result"] as const;

  return (
    <section className="section-light border-y border-border section-py">
      <Container>
        <Title className="max-w-2xl text-pretty">{copy.heading}</Title>
        <div className="mt-10 lg:mt-12">
          <div className="hidden lg:grid lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-8">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Inputs</p>
              <ul className="grid grid-cols-2 gap-2.5">
                {inputKeys.map((key) => (
                  <li
                    key={key}
                    className="marketing-card px-4 py-3.5 text-center text-sm font-semibold text-foreground"
                  >
                    {copy.inputs[key]}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col items-center gap-2 px-2">
              <span aria-hidden className="text-2xl text-teal">→</span>
              <span className="rounded-[var(--radius-control)] border border-teal/35 bg-teal/10 px-5 py-2.5 text-sm font-bold tracking-wide text-teal shadow-[var(--shadow-glow-teal)]">
                {copy.hub}
              </span>
              <span aria-hidden className="text-2xl text-teal">→</span>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">Outputs</p>
              <ul className="grid grid-cols-2 gap-2.5">
                {outputKeys.map((key) => (
                  <li
                    key={key}
                    className="marketing-card leverage-output-card border-teal/20 bg-gradient-to-br from-teal/8 to-cyan/5 px-4 py-3.5 text-center text-sm font-semibold text-foreground"
                  >
                    {copy.outputs[key]}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-4 lg:hidden">
            <ul className="grid grid-cols-2 gap-2">
              {inputKeys.map((key) => (
                <li
                  key={key}
                  className="marketing-card px-3 py-3 text-center text-sm font-semibold text-foreground"
                >
                  {copy.inputs[key]}
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-center gap-3 py-1">
              <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-transparent to-teal/40" />
              <span className="rounded-[var(--radius-control)] border border-teal/35 bg-teal/10 px-4 py-2 text-xs font-bold tracking-wide text-teal">
                {copy.hub}
              </span>
              <span aria-hidden className="h-px flex-1 bg-gradient-to-l from-transparent to-teal/40" />
            </div>
            <ul className="grid grid-cols-2 gap-2">
              {outputKeys.map((key) => (
                <li
                  key={key}
                  className="marketing-card border-teal/20 bg-gradient-to-br from-teal/8 to-cyan/5 px-3 py-3 text-center text-sm font-semibold text-foreground"
                >
                  {copy.outputs[key]}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <ol className="mt-12 grid gap-4 sm:gap-5 md:grid-cols-3 lg:mt-14">
          {copy.steps.map((step, index) => (
            <li key={step}>
              <ScrollReveal delay={index * 60}>
                <div className="marketing-card marketing-card-lift h-full p-5 sm:p-6">
                  <p className="font-mono text-sm font-semibold text-teal">{String(index + 1).padStart(2, "0")}</p>
                  <h3 className="mt-2.5 text-base font-semibold leading-snug text-foreground sm:text-lg">{step}</h3>
                </div>
              </ScrollReveal>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

export function AiPhilosophyQuote({ messages }: { messages: Messages }) {
  const copy = messages.aiPhilosophy;
  return (
    <section className="statement-pivot relative overflow-hidden border-y border-border section-py-compact">
      <div aria-hidden className="statement-pivot-glow" />
      <Container className="relative mx-auto max-w-3xl text-center">
        <HeroTitle className="text-pretty text-foreground sm:text-[clamp(1.75rem,2.5vw+0.5rem,2.5rem)]">
          {copy.heading}
        </HeroTitle>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">{copy.supporting}</p>
        <div
          aria-hidden
          className="mx-auto mt-6 h-px w-16 bg-gradient-to-r from-transparent via-teal/60 to-transparent"
        />
      </Container>
    </section>
  );
}

export function UrgencySection({ locale, messages }: { locale: SupportedLocale; messages: Messages }) {
  const copy = messages.urgency;
  return (
    <section className="tech-section relative overflow-hidden border-y border-white/8 section-py">
      <GradientMesh tone="teal" className="opacity-38 max-sm:opacity-25" />
      <HeroEnergyField intensity="soft" className="max-sm:opacity-55" />
      <Container className="relative">
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start lg:gap-14">
          <div>
            <HeroTitle className="text-pretty text-foreground">{copy.heading}</HeroTitle>
            <p className="mt-5 max-w-xl whitespace-pre-line text-base leading-relaxed text-muted sm:text-lg">
              {copy.supporting}
            </p>
            <p className="mt-8 whitespace-pre-line text-xl font-semibold leading-snug text-foreground sm:text-2xl">
              {copy.closing}
            </p>
            <div className={cn(ctaButtonGroupClass, "mt-8")}>
              <ButtonLink href={localePath(locale, "/products")} variant="accent" showArrow fullWidthMobile>
                {copy.cta}
              </ButtonLink>
            </div>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {copy.pillars.map((pillar) => (
              <li
                key={pillar}
                className="rounded-[var(--radius-card)] border border-white/10 bg-[#0b1730]/70 px-4 py-4 text-base font-semibold leading-snug text-foreground sm:py-5"
              >
                {pillar}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}

export function BrandSection({ locale, messages }: { locale: SupportedLocale; messages: Messages }) {
  const copy = messages.brand;
  return (
    <section className="section-surface border-b border-border section-py-compact">
      <Container>
        <div className="mx-auto max-w-3xl border-s-0 px-1 text-center sm:border-s-2 sm:border-teal/25 sm:ps-6 sm:text-start lg:ps-8">
          <Title className="text-pretty">{copy.heading}</Title>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted sm:mt-4 sm:text-lg">{copy.supporting}</p>
          <div className="mt-5 flex justify-center sm:justify-start">
            <ButtonLink href={localePath(locale, "/about")} variant="secondary" showArrow>
              {copy.linkLabel.replace(/\s*→\s*$/, "")}
            </ButtonLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
