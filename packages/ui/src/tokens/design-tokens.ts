/** Centralized design token names for documentation and programmatic use. */
export const designTokens = {
  color: {
    background: "background",
    surface: "surface",
    surfaceElevated: "surface-elevated",
    text: "text",
    textMuted: "text-muted",
    border: "border",
    teal: "teal",
    cyan: "cyan",
    indigo: "indigo",
    solarAccent: "solar-accent",
  },
  radius: {
    card: "var(--radius-card)",
    control: "var(--radius-control)",
    button: "var(--radius-button)",
    pill: "var(--radius-pill)",
  },
  shadow: {
    soft: "var(--shadow-soft)",
    elevated: "var(--shadow-elevated)",
    glowTeal: "var(--shadow-glow-teal)",
    glowIndigo: "var(--shadow-glow-indigo)",
  },
  motion: {
    fast: "var(--motion-fast)",
    base: "var(--motion-base)",
    slow: "var(--motion-slow)",
  },
  typography: {
    display: "type-display",
    hero: "type-hero",
    title: "type-title",
    body: "type-body",
    small: "type-small",
    caps: "type-caps",
  },
} as const;

export type DesignTokenColor = (typeof designTokens.color)[keyof typeof designTokens.color];
