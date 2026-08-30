/** Rising/orbit composition. Real product UI is used when a screenshot URL is provided. */
export function HeroVisual({
  screenshotUrl,
  screenshotAlt,
}: {
  screenshotUrl?: string | null;
  screenshotAlt?: string;
}) {
  if (screenshotUrl) {
    return (
      <div className="relative mx-auto w-full max-w-lg">
        <div
          aria-hidden
          className="absolute -inset-6 rounded-full border border-khepree-cyan/20 motion-reduce:hidden"
        />
        <div
          aria-hidden
          className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-khepree-solar/20 blur-2xl"
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- real product media URL */}
        <img
          src={screenshotUrl}
          alt={screenshotAlt || ""}
          className="relative w-full rounded-[var(--radius-card)] border border-khepree-mist bg-khepree-white shadow-xl shadow-khepree-teal/10"
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      className="relative mx-auto aspect-[4/3] w-full max-w-lg overflow-hidden rounded-[var(--radius-card)] border border-khepree-mist bg-khepree-ink shadow-xl shadow-khepree-teal/10"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(34,211,238,0.18),transparent_42%),radial-gradient(circle_at_80%_70%,rgba(20,184,166,0.16),transparent_40%)]" />
      <div className="absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full border border-khepree-cyan/30" />
      <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-khepree-teal/20" />
      <div className="absolute bottom-8 left-6 right-6 rounded-xl border border-white/10 bg-white/8 p-4 backdrop-blur-md">
        <div className="h-2 w-24 rounded-full bg-khepree-teal/70" />
        <div className="mt-3 grid grid-cols-3 gap-2">
          <div className="h-10 rounded-lg bg-white/10" />
          <div className="h-10 rounded-lg bg-white/10" />
          <div className="h-10 rounded-lg bg-khepree-solar/30" />
        </div>
      </div>
    </div>
  );
}
