import { ButtonLink } from "@/components/marketing/button-link";

/** Sticky bottom CTA for product detail on mobile only — commerce pages with plans. */
export function ProductMobileCta({ href, label }: { href: string; label: string }) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-5 py-3 backdrop-blur-sm lg:hidden mobile-no-blur"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <ButtonLink href={href} variant="accent" fullWidthMobile className="w-full">
        {label}
      </ButtonLink>
    </div>
  );
}
