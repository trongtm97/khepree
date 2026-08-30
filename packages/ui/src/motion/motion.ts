/** Reusable motion class names — CSS-only, respects prefers-reduced-motion. */
export const motionClasses = {
  fadeUp: "motion-fade-up",
  softScale: "motion-soft-scale",
  stagger: "motion-stagger",
  parallaxLite: "motion-parallax-lite",
  float: "motion-float",
  orbit: "motion-orbit",
  orbitReverse: "motion-orbit-reverse",
  energyField: "motion-energy-field",
  flowLine: "motion-flow-line",
  scanHighlight: "motion-scan",
  lightSweep: "motion-light-sweep",
  gradientDrift: "motion-gradient-drift",
  productWindowDepth: "product-window-depth",
} as const;

export type MotionClass = (typeof motionClasses)[keyof typeof motionClasses];
