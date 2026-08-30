import type { ResolvedKhepreeSurface } from "@khepree/config";
import {
  BodyText,
  Container,
  DataFlow,
  HeroEnergyField,
  OffscreenMotionPause,
  Title,
} from "@khepree/ui";
import Link from "next/link";
import type { Messages } from "@/lib/i18n/get-messages";

const NODE_POSITIONS: Partial<Record<ResolvedKhepreeSurface["id"], string>> = {
  marketing: "left-[8%] top-[18%]",
  account: "right-[10%] top-[22%]",
  app: "left-[12%] bottom-[22%]",
  partner: "right-[8%] bottom-[24%]",
  download: "left-1/2 bottom-[8%] -translate-x-1/2",
  developers: "right-[22%] top-[48%]",
};

const ECOSYSTEM_LINES = [
  { x1: 400, y1: 300, x2: 120, y2: 130 },
  { x1: 400, y1: 300, x2: 680, y2: 150 },
  { x1: 400, y1: 300, x2: 140, y2: 470 },
  { x1: 400, y1: 300, x2: 660, y2: 460 },
  { x1: 400, y1: 300, x2: 400, y2: 540 },
  { x1: 400, y1: 300, x2: 620, y2: 300 },
];

export function EcosystemSection({
  messages,
  surfaces,
}: {
  messages: Messages;
  surfaces: ResolvedKhepreeSurface[];
}) {
  const nodes = surfaces.filter((surface) => NODE_POSITIONS[surface.id]);

  return (
    <section id="ecosystem" className="relative overflow-hidden py-16 lg:py-24">
      <Container>
        <div className="max-w-2xl">
          <Title>{messages.ecosystem.heading}</Title>
          <BodyText className="mt-4 text-lg">{messages.ecosystem.copy}</BodyText>
        </div>

        <OffscreenMotionPause className="relative mx-auto mt-14 aspect-[4/3] max-w-4xl overflow-hidden rounded-[var(--radius-card)] border border-border bg-[#070b14]">
          <HeroEnergyField intensity="soft" />
          <DataFlow lines={ECOSYSTEM_LINES} hub={{ x: 400, y: 300 }} />

          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-cyan/40 bg-gradient-to-br from-teal/30 to-cyan/20 text-sm font-semibold text-foreground shadow-[0_0_32px_rgb(6_182_212/0.35)] motion-float">
              {messages.ecosystem.center}
            </div>
          </div>

          {nodes.map((node, index) => (
            <Link
              key={node.id}
              href={node.url}
              target={node.external ? "_blank" : undefined}
              rel={node.external ? "noopener noreferrer" : undefined}
              className={`absolute z-10 max-w-[9rem] rounded-[var(--radius-control)] border border-white/10 bg-surface/90 px-3 py-2 text-center text-xs font-medium text-foreground backdrop-blur-sm transition-transform hover:-translate-y-0.5 hover:border-teal/40 motion-float sm:max-w-[10rem] sm:text-sm ${NODE_POSITIONS[node.id] ?? ""}`}
              style={{ animationDelay: `${index * 0.35}s` }}
            >
              {node.label}
            </Link>
          ))}
        </OffscreenMotionPause>

        <ul className="mt-10 divide-y divide-border">
          {surfaces.map((surface) => (
            <li key={surface.id}>
              <Link
                href={surface.url}
                target={surface.external ? "_blank" : undefined}
                rel={surface.external ? "noopener noreferrer" : undefined}
                className="flex flex-col gap-1 py-4 transition-colors hover:text-teal sm:flex-row sm:items-baseline sm:justify-between"
              >
                <span className="font-semibold text-foreground">{surface.label}</span>
                <BodyText className="text-sm">{surface.description}</BodyText>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
