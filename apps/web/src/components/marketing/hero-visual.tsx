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
    <OffscreenMotionPause className="relative mx-auto w-full max-w-2xl lg:max-w-none">
      <div className="relative aspect-[4/3] min-h-[220px] overflow-hidden rounded-[var(--radius-card)] bg-[#070b14] shadow-[0_24px_64px_rgb(0_0_0/0.45)] sm:min-h-[280px] sm:aspect-[16/11] lg:min-h-[380px] lg:aspect-[16/10] xl:min-h-[440px]">
        <GradientMesh tone="mixed" className="opacity-85 max-sm:opacity-65" />
        <HeroEnergyField className="max-sm:opacity-75" />
        <TechGrid className="max-sm:opacity-35" />

        <div className="absolute left-1/2 top-[40%] h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-teal/40 via-cyan/30 to-indigo/20 blur-2xl motion-float max-sm:h-20 max-sm:w-20 max-sm:blur-xl mobile-reduce-motion" />
        <div className="absolute left-1/2 top-[40%] h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan/20 ring-1 ring-cyan/40 max-sm:h-12 max-sm:w-12" />

        <OrbitRing
          size="lg"
          nodes={3}
          className="left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 opacity-75 max-sm:opacity-55"
          tilt={10}
        />
        <OrbitRing
          size="md"
          reverse
          nodes={2}
          className="left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 opacity-50 max-sm:opacity-35"
          tilt={16}
        />

        {screenshotUrl ? (
          <FloatingSurface
            float
            className="absolute inset-[10%] z-10 flex items-stretch border-white/15 bg-surface/95 p-1 backdrop-blur-sm product-window-depth motion-parallax-lite max-sm:inset-[8%] mobile-no-blur mobile-reduce-motion"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- real product media from Product Studio */}
            <img
              src={screenshotUrl}
              alt={screenshotAlt || productName || "Khepree"}
              className="h-full w-full rounded-md object-cover object-top"
            />
          </FloatingSurface>
        ) : (
          <>
            <ProductWindow
              title={productName || "Khepree Studio"}
              depth
              lightSweep
              className="absolute bottom-[10%] left-[6%] z-10 w-[62%] border-white/15 bg-surface/95 motion-float motion-parallax-lite max-sm:bottom-[8%] max-sm:left-[8%] max-sm:w-[84%] mobile-reduce-motion"
            >
              <div className="space-y-3">
                <div className="h-2.5 w-24 rounded-full bg-teal/70" />
                <div className="grid grid-cols-3 gap-2">
                  <div className="h-14 rounded-lg bg-border-subtle max-sm:h-10" />
                  <div className="h-14 rounded-lg bg-border-subtle max-sm:h-10" />
                  <div className="h-14 rounded-lg bg-solar-accent/25 max-sm:h-10" />
                </div>
                <div className="h-20 rounded-lg bg-gradient-to-r from-teal/15 to-cyan/10 max-sm:h-12" />
              </div>
            </ProductWindow>

            <FloatingSurface
              float
              className="absolute right-[6%] top-[14%] z-10 w-[34%] border-white/15 bg-surface/85 p-3 backdrop-blur-md max-sm:hidden mobile-no-blur"
            >
              <div className="space-y-2">
                <div className="h-1.5 w-14 rounded-full bg-cyan/60" />
                <div className="h-10 rounded-md bg-border-subtle" />
                <div className="h-10 rounded-md bg-teal/20" />
              </div>
            </FloatingSurface>

            <FloatingSurface
              float
              className="absolute bottom-[18%] right-[8%] z-[5] w-[28%] border-cyan/20 bg-indigo/10 p-2 opacity-80 max-sm:hidden mobile-reduce-motion"
            >
              <div className="h-8 rounded bg-gradient-to-r from-teal/30 to-transparent" />
            </FloatingSurface>
          </>
        )}
      </div>
    </OffscreenMotionPause>
  );
}
