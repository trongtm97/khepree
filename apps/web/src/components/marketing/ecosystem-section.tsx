import type { ResolvedKhepreeSurface } from "@khepree/config";
import { BodyText, Container, Title } from "@khepree/ui";
import Link from "next/link";
import type { Messages } from "@/lib/i18n/get-messages";
import { SurfaceIcon } from "./surface-icon";

const LAUNCHER_ORDER = ["account", "download", "partner", "developers", "app"] as const;

export function EcosystemSection({
  messages,
  surfaces,
}: {
  messages: Messages;
  surfaces: ResolvedKhepreeSurface[];
}) {
  const byId = new Map(surfaces.map((surface) => [surface.id, surface]));
  const launcherSurfaces = LAUNCHER_ORDER.map((id) => byId.get(id)).filter(
    (surface): surface is ResolvedKhepreeSurface => surface != null,
  );

  if (launcherSurfaces.length === 0) return null;

  return (
    <section id="ecosystem" className="bg-background py-14 sm:py-16 lg:py-24">
      <Container>
        <div className="max-w-2xl">
          <Title>{messages.ecosystem.heading}</Title>
          <BodyText className="mt-4 text-base leading-relaxed sm:text-lg">{messages.ecosystem.copy}</BodyText>
        </div>

        <ul className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
          {launcherSurfaces.map((surface) => (
            <li key={surface.id}>
              <Link
                href={surface.url}
                target={surface.external ? "_blank" : undefined}
                rel={surface.external ? "noopener noreferrer" : undefined}
                className="group flex h-full min-h-[7.5rem] flex-col rounded-[var(--radius-card)] border border-border bg-surface p-5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-teal/35 hover:shadow-[var(--shadow-soft)] sm:p-6"
              >
                <div className="flex items-start gap-3">
                  <SurfaceIcon id={surface.id} />
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground group-hover:text-teal">{surface.label}</h3>
                    <BodyText className="mt-1.5 text-sm leading-relaxed">{surface.description}</BodyText>
                  </div>
                </div>
                <span className="mt-auto pt-4 text-sm font-medium text-teal">{messages.ecosystem.open} →</span>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
