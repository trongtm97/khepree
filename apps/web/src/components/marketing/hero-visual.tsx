import {
  FloatingSurface,
  GradientMesh,
  HeroEnergyField,
  OffscreenMotionPause,
  OrbitRing,
  ProductWindow,
  TechGrid,
} from "@khepree/ui";

/** Rising Intelligence — energy field, orbit paths, floating product surfaces. */
export function HeroVisual({
  screenshotUrl,
  screenshotAlt,
  productName,
}: {
  screenshotUrl?: string | null;
  screenshotAlt?: string;
  productName?: string;
}) {
  return (
    <OffscreenMotionPause className="relative mx-auto w-full max-w-xl max-sm:max-h-[min(280px,52vw)] max-sm:aspect-[16/10] aspect-[4/5] sm:aspect-square lg:max-w-none">
      <div className="absolute inset-0 overflow-hidden rounded-[var(--radius-card)] bg-[#070b14] shadow-[var(--shadow-elevated)]">
        <GradientMesh tone="mixed" className="opacity-80 max-sm:opacity-60" />
        <HeroEnergyField className="max-sm:opacity-70" />
        <TechGrid className="max-sm:opacity-40" />

        <div className="absolute left-1/2 top-[42%] h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-teal/35 via-cyan/25 to-indigo/15 blur-xl motion-float max-sm:h-16 max-sm:w-16 max-sm:blur-md mobile-reduce-motion" />
        <div className="absolute left-1/2 top-[42%] h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan/15 ring-1 ring-cyan/35 max-sm:h-10 max-sm:w-10" />

        <OrbitRing
          size="lg"
          nodes={2}
          className="left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 opacity-65 max-sm:opacity-50"
          tilt={12}
        />
        <OrbitRing
          size="md"
          reverse
          nodes={1}
          className="left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 opacity-45 max-sm:hidden"
          tilt={18}
        />

        {screenshotUrl ? (
          <FloatingSurface
            float
            className="absolute bottom-[12%] left-[8%] right-[8%] z-10 border-white/10 bg-surface/90 backdrop-blur-md motion-parallax-lite product-window-depth max-sm:bottom-[8%] max-sm:static max-sm:mx-3 max-sm:mt-[38%] max-sm:backdrop-blur-none mobile-no-blur mobile-reduce-motion"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- real product media from Product Studio */}
            <img
              src={screenshotUrl}
              alt={screenshotAlt || productName || "Khepree"}
              className="w-full rounded-md object-cover object-top"
            />
          </FloatingSurface>
        ) : (
          <>
            <ProductWindow
              title={productName || "Khepree Studio"}
              depth
              lightSweep
              className="absolute bottom-[14%] left-[6%] z-10 w-[58%] border-white/10 bg-surface/95 motion-float motion-parallax-lite max-sm:bottom-[10%] max-sm:left-[10%] max-sm:w-[80%] mobile-reduce-motion"
            >
              <div className="space-y-3">
                <div className="h-2 w-20 rounded-full bg-teal/70" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-12 rounded-lg bg-border-subtle" />
                  <div className="h-12 rounded-lg bg-border-subtle" />
                  <div className="h-12 rounded-lg bg-solar-accent/25" />
                </div>
                <div className="h-16 rounded-lg bg-gradient-to-r from-teal/15 to-cyan/10 max-sm:h-10" />
              </div>
            </ProductWindow>

            <FloatingSurface
              float
              className="absolute right-[8%] top-[18%] z-10 w-[38%] border-white/10 bg-surface/80 p-3 backdrop-blur-md max-sm:hidden"
            >
              <div className="space-y-2">
                <div className="h-1.5 w-12 rounded-full bg-cyan/60" />
                <div className="h-8 rounded-md bg-border-subtle" />
                <div className="h-8 rounded-md bg-teal/20" />
              </div>
            </FloatingSurface>
          </>
        )}
      </div>
    </OffscreenMotionPause>
  );
}
