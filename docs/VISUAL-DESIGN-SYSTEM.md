# Khepree Visual Design System (Phase 17.1)

Reusable visual language for `@khepree/ui`. **Not a page redesign** — tokens, primitives, motion, and polished components to apply incrementally across apps.

## Reference analysis (patterns only — no copied layouts/assets)

Research covered official sites: Linear, Vercel, Stripe, Raycast, Framer, Notion, ElevenLabs.

| Source | Pattern absorbed | Khepree translation |
|--------|------------------|---------------------|
| **Linear** | Dense product UI in hero, real interface mockups, precise spacing | `ProductWindow`, tight control radii, monospace chrome labels |
| **Vercel** | Clear nav hierarchy, ecosystem clarity | `NavLink`, section rhythm via `Container` + typography scale |
| **Stripe** | Dimensional gradients, product storytelling bands | `GradientMesh`, `TechGlow`, pricing/feature depth |
| **Raycast** | Youthful motion, playful orbit accents | `OrbitRing`, `motion-float`, `motion-orbit` |
| **Framer** | Glass, depth, shader-like layers | `GlassPanel`, `NoiseTexture`, `FloatingSurface` |
| **Notion** | Simple hierarchy, calm whitespace | `type-*` scale, muted body copy, restrained cards |
| **ElevenLabs** | AI/tech optimism, dark feature bands | `.tech-section`, teal/cyan/indigo spectrum |

**Khepree identity:** young, modern, AI/software, Vietnam-first, global-ready, premium, technological, optimistic — **not** generic rounded-white SaaS.

## Design tokens

Defined in `packages/ui/src/globals.css` (`@theme`) and exported as `designTokens` from `@khepree/ui`.

| Token | CSS utility | Role |
|-------|-------------|------|
| `background` | `bg-background` | Page canvas (light primary) |
| `surface` | `bg-surface` | Cards, panels |
| `surfaceElevated` | `bg-surface-elevated` | Raised panels, chrome |
| `text` / `foreground` | `text-foreground` | Primary copy |
| `textMuted` / `muted` | `text-muted` | Secondary copy |
| `border` | `border-border` | Dividers, outlines |
| `teal` | `text-teal`, `bg-teal` | Primary brand action |
| `cyan` | `text-cyan` | Accent highlights |
| `indigo` | `text-indigo` | Depth / enterprise tone |
| `solarAccent` | `bg-solar-accent` | Optimistic highlight |

Legacy `khepree-*` color aliases remain for existing apps.

### Dark technology sections

Wrap feature bands in `.tech-section` to swap semantic colors locally (dark background, light text) without a global dark mode.

## Typography (Geist)

- Loaded in apps via `geist/font/sans` (see `apps/web` layout).
- Utilities: `type-display`, `type-hero`, `type-title`, `type-body`, `type-small`, `type-caps`.
- React helpers: `Display`, `HeroTitle`, `Title`, `BodyText`, `SmallText`, `CapsLabel`.
- Desktop hero target: `clamp(~44px, 4.5vw + 1rem, 80px)` via `--text-display`.
- **Vietnamese:** `:lang(vi)` resets heading letter-spacing to `0` — avoids cramped diacritics.

## Depth primitives

Use sparingly — one focal effect per section.

| Component | Purpose |
|-----------|---------|
| `TechGlow` | Radial brand glow behind hero/product |
| `GradientMesh` | Dimensional background wash |
| `GlassPanel` | Frosted overlay surface |
| `TechGrid` | Engineering grid mask |
| `OrbitRing` | Playful decorative motion |
| `HeroEnergyField` | Slow hero energy field |
| `CursorSpotlight` | Desktop pointer vignette |
| `DataFlow` | Ecosystem connection lines |
| `OffscreenMotionPause` | Viewport-aware animation pause |
| `NoiseTexture` | SVG noise depth (no assets) |
| `Spotlight` | Top radial vignette |
| `FloatingSurface` | Elevated card with optional float |
| `ProductWindow` | App chrome for product demos |

## Motion system

CSS-only keyframes in `globals.css`. Classes exported as `motionClasses`:

- `motion-fade-up` — entrance
- `motion-soft-scale` — dropdown/panel entrance
- `motion-stagger` — child cascade (6 steps)
- `motion-parallax-lite` — 2px hover lift
- `motion-float` — gentle vertical loop
- `motion-orbit` — ring rotation
- `motion-orbit-reverse` — counter-rotation orbit
- `motion-energy-field` — slow hero energy drift
- `motion-flow-line` — SVG connection pulse
- `motion-light-sweep` — occasional sheen (88% idle)
- `motion-scan` — highlight sweep (legacy; prefer light-sweep)
- `motion-gradient-drift` — background gradient shift
- `product-window-depth` — perspective + edge glow + hover tilt

**Rules:** transform + opacity + SVG stroke only; disabled under `prefers-reduced-motion`; pause offscreen via `OffscreenMotionPause`; never block interaction.

## Motion & interaction polish (Phase 17.5)

Additional primitives — technology feel without crypto/gaming aesthetic:

| Component | Purpose |
|-----------|---------|
| `HeroEnergyField` | Slow cyan-teal radial energy field |
| `CursorSpotlight` | Desktop pointer spotlight (technology sections) |
| `DataFlow` | Animated SVG ecosystem connection lines |
| `OffscreenMotionPause` | Pause decorative loops when offscreen |

Enhanced:

| Component | Phase 17.5 change |
|-----------|-------------------|
| `OrbitRing` | SVG paths, 1–3 luminous nodes, optional tilt |
| `TechGrid` | Perspective transform, lower opacity, edge fade |
| `ProductWindow` | `depth` + `lightSweep` props |

**Performance:** no WebGL; no particle libraries; no layout-triggering animation loops.

## Component polish (Phase 17.1)

Upgraded in `@khepree/ui`:

- `Button` — `primary | secondary | ghost | accent`, subtle scale on press
- `Card` — `default | elevated | glass | interactive`
- `Badge` — refined borders + brand variants
- `Dropdown` — glass panel + soft-scale open
- `Tabs` — segmented control (not underline-only)
- `NavLink` — hover underline grow
- `ProductCard`, `ArticleCard`, `PricingCard` — marketing shells

## Usage

```tsx
import "@khepree/ui/globals.css";
import {
  HeroTitle,
  BodyText,
  Button,
  GradientMesh,
  TechGlow,
  ProductWindow,
  motionClasses,
} from "@khepree/ui";

<section className="relative overflow-hidden py-24">
  <GradientMesh tone="mixed" />
  <TechGlow tone="teal" />
  <div className={motionClasses.fadeUp}>
    <HeroTitle>Phần mềm giúp bạn đi xa hơn</HeroTitle>
    <BodyText>…</BodyText>
    <Button variant="accent">Khám phá sản phẩm</Button>
  </div>
  <ProductWindow title="Khepree Studio">…</ProductWindow>
</section>
```

## Performance

- No Three.js / WebGL in Phase 17.1.
- Animations use GPU-friendly `transform` and `opacity`.
- Noise is inline SVG data URI (tiny).
- Avoid stacking multiple animated meshes in one viewport.

## Next phases (out of scope)

- Apply system to marketing page sections (hero, pricing, blog index)
- App shell nav migration to `NavLink`
- Dark mode global toggle (optional — `.tech-section` covers bands today)
