import type { PublicProductMedia } from "@khepree/catalog";
import { ProductWindow } from "@khepree/ui";

export function ProductHeroVisual({
  media,
  productName,
  priority = false,
}: {
  media: PublicProductMedia | null;
  productName: string;
  priority?: boolean;
}) {
  if (media?.url) {
    return (
      <div className="product-window-depth overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-elevated)]">
        {/* eslint-disable-next-line @next/next/no-img-element -- Product Studio media */}
        <img
          src={media.url}
          alt={media.altText || productName}
          className="aspect-[16/10] w-full object-cover object-top"
          fetchPriority={priority ? "high" : undefined}
        />
      </div>
    );
  }

  return (
    <ProductWindow title={productName} depth lightSweep className="shadow-[var(--shadow-elevated)]">
      <div className="space-y-4">
        <div className="h-3 w-32 rounded-full bg-teal/60" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 rounded-lg bg-border-subtle" />
          <div className="h-24 rounded-lg bg-gradient-to-br from-teal/20 to-cyan/10" />
        </div>
        <div className="h-28 rounded-lg bg-border-subtle/80" />
      </div>
    </ProductWindow>
  );
}

export function ProductScreenshot({
  media,
  productName,
  className,
}: {
  media: PublicProductMedia;
  productName: string;
  className?: string;
}) {
  return (
    <figure className={className}>
      {/* eslint-disable-next-line @next/next/no-img-element -- Product Studio media */}
      <img
        src={media.url}
        alt={media.altText || productName}
        className="product-window-depth w-full rounded-[var(--radius-card)] border border-border object-cover shadow-[var(--shadow-soft)]"
      />
    </figure>
  );
}
