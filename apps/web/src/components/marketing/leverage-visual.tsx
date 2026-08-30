import { GradientMesh, HeroEnergyField, OffscreenMotionPause, TechGrid } from "@khepree/ui";
import type { Messages } from "@/lib/i18n/get-messages";

const OUTPUT_KEYS = ["content", "product", "asset", "result"] as const;

/** Abstract 1 → Khepree → many outputs — no fake product UI. */
export function LeverageHeroVisual({
  messages,
  screenshotUrl,
  screenshotAlt,
}: {
  messages: Messages;
  screenshotUrl?: string | null;
  screenshotAlt?: string;
}) {
  const labels = messages.pipeline;

  return (
    <OffscreenMotionPause className="relative mx-auto w-full max-w-xl lg:max-w-none">
      <div className="relative aspect-[5/4] min-h-[220px] overflow-hidden rounded-[var(--radius-card)] border border-white/12 bg-[#07111f] shadow-[0_20px_56px_rgb(0_0_0/0.4)] sm:min-h-[280px] lg:min-h-[340px]">
        <GradientMesh tone="teal" className="opacity-70 max-sm:opacity-50" />
        <HeroEnergyField intensity="soft" className="max-sm:opacity-60" />
        <TechGrid className="max-sm:opacity-25" />

        <div className="relative flex h-full flex-col justify-center gap-3 px-4 py-5 sm:gap-4 sm:px-6 lg:px-7">
          <div className="flex items-center justify-center gap-2 sm:gap-3">
            <div className="leverage-input-pulse min-w-0 rounded-[var(--radius-control)] border border-cyan/35 bg-cyan/10 px-3 py-2 text-center sm:px-4 sm:py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-cyan/85 sm:text-xs">INPUT</p>
              <p className="mt-0.5 truncate text-xs font-medium text-foreground sm:text-sm">{labels.inputLabel}</p>
            </div>

            <div aria-hidden className="flex shrink-0 items-center text-cyan/55">
              <span className="h-px w-5 bg-gradient-to-r from-transparent to-cyan/45 sm:w-8" />
              <span className="px-0.5 text-base sm:text-lg">→</span>
            </div>

            <div className="shrink-0 rounded-[var(--radius-control)] border border-teal/45 bg-teal/15 px-3 py-2 text-center shadow-[0_0_20px_rgb(25_211_197/0.22)] sm:px-4 sm:py-2.5">
              <p className="text-xs font-bold tracking-wide text-teal sm:text-sm">{labels.hub}</p>
            </div>

            <div aria-hidden className="hidden shrink-0 items-center text-teal/55 sm:flex">
              <span className="px-0.5 text-lg">→</span>
              <span className="h-px w-6 bg-gradient-to-r from-teal/45 to-transparent" />
            </div>
          </div>

          <ul className="leverage-branch-grid grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-2.5">
            {OUTPUT_KEYS.map((key, index) => (
              <li
                key={key}
                className="leverage-output-card rounded-[var(--radius-control)] border border-white/10 bg-[#0b1730]/90 p-2 sm:p-2.5 mobile-no-blur"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {index === 0 && screenshotUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- real product media when available
                  <img
                    src={screenshotUrl}
                    alt={screenshotAlt || labels.outputs[key]}
                    className="mb-1.5 aspect-video w-full rounded object-cover object-top"
                  />
                ) : (
                  <div
                    aria-hidden
                    className="mb-1.5 aspect-video w-full rounded bg-gradient-to-br from-teal/25 via-cyan/12 to-transparent"
                  />
                )}
                <p className="text-[10px] font-semibold leading-tight text-foreground sm:text-xs">
                  {labels.outputs[key]}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </OffscreenMotionPause>
  );
}

/** Leverage funnel — 100 → 10 → 1 operations. */
export function LeverageMultiplyVisual({ stages }: { stages: string[] }) {
  const widths = ["100%", "78%", "56%"] as const;

  return (
    <div aria-hidden className="mx-auto w-full max-w-xs sm:max-w-sm">
      <ul className="flex flex-col items-center gap-0">
        {stages.map((stage, index) => (
          <li key={stage} className="flex w-full flex-col items-center">
            <div
              className="rounded-[var(--radius-control)] border border-border bg-surface px-4 py-3 text-center font-mono text-base font-semibold text-foreground motion-fade-up mobile-reduce-motion sm:text-lg"
              style={{ width: widths[index] ?? "100%", animationDelay: `${index * 80}ms` }}
            >
              {stage}
            </div>
            {index < stages.length - 1 ? (
              <span className="my-1.5 block text-lg leading-none text-teal/70" aria-hidden>
                ↓
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-teal/25 bg-teal/8 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal">
          <span className="h-1.5 w-1.5 rounded-full bg-teal leverage-input-pulse" />
          10X leverage
        </span>
      </div>
    </div>
  );
}
