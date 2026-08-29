/** Pure CSS abstract UI composition — no images, no heavy JS. */
export function HeroVisual() {
  return (
    <div
      aria-hidden
      className="relative mx-auto aspect-[4/3] w-full max-w-lg overflow-hidden rounded-[var(--radius-card)] border border-khepree-mist bg-khepree-white shadow-xl shadow-khepree-teal/5"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-khepree-teal/10 via-khepree-white to-khepree-cyan/10" />
      <div className="absolute left-4 top-4 h-3 w-16 rounded-full bg-khepree-mist" />
      <div className="absolute left-4 top-10 right-4 space-y-2">
        <div className="h-2 w-3/4 rounded bg-khepree-mist" />
        <div className="h-2 w-1/2 rounded bg-khepree-mist/80" />
      </div>
      <div className="absolute bottom-6 left-4 right-4 grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-lg border border-khepree-mist bg-khepree-white/80 p-3 backdrop-blur-sm"
          >
            <div className="h-1.5 w-8 rounded bg-khepree-teal/40" />
            <div className="mt-2 h-8 rounded bg-khepree-mist/60" />
          </div>
        ))}
      </div>
      <div className="absolute right-6 top-1/3 h-20 w-20 rounded-2xl border border-khepree-cyan/30 bg-gradient-to-br from-khepree-teal/20 to-khepree-indigo/10" />
      <div className="absolute bottom-1/3 left-1/4 h-12 w-12 rounded-full bg-khepree-solar/20 blur-sm" />
    </div>
  );
}
