import { requireSession } from "@khepree/auth/session";
import type { PublicProductSummary } from "@khepree/catalog";
import { createProductService } from "@khepree/catalog";
import { isEntitlementActive } from "@khepree/db";
import { EmptyState, ProductCard } from "@khepree/ui";
import type { Metadata } from "next";
import Link from "next/link";
import { getPlatform } from "@/lib/commerce";
import { accountLocaleFromCookies } from "@/lib/locale";
import { accountMessages } from "@/lib/messages";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Products" };

function productCardImage(product: Pick<PublicProductSummary, "name" | "gallery" | "icon">) {
  const media = product.gallery?.[0] ?? product.icon;
  if (!media?.url) return undefined;
  return { src: media.url, alt: media.altText || product.name };
}

export default async function ProductsPage() {
  const session = await requireSession();
  const locale = await accountLocaleFromCookies(session.locale);
  const copy = accountMessages(locale).products;
  const catalogProducts = await createProductService().listCatalogProducts({ locale });
  const owned = (
    await getPlatform().entitlement.resolveEntitlementsForPrincipal({
      type: "USER",
      id: session.user.id,
    })
  ).filter((row) => isEntitlementActive({ ...row.entitlement }));

  const catalogBySlug = new Map(catalogProducts.map((product) => [product.slug, product]));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">{copy.title}</h1>
        <p className="mt-2 text-sm text-khepree-slate/70">{copy.intro}</p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{copy.owned}</h2>
        {owned.length === 0 ? (
          <EmptyState title={copy.noOwned} description={copy.noOwnedBody} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {owned.map((row) => {
              const slug = row.productSlug;
              const catalog = slug ? catalogBySlug.get(slug) : undefined;
              const href = slug ? `/products/${slug}` : null;
              const title = catalog?.name ?? row.productSlug ?? row.entitlement.productId;
              const card = (
                <ProductCard
                  className="group h-full"
                  title={title}
                  description={`${row.planSlug ?? "Plan"} · ${row.entitlement.status}`}
                  image={catalog ? productCardImage(catalog) : undefined}
                  fallbackInitial={title.slice(0, 1)}
                  ctaLabel={href ? copy.viewProduct : undefined}
                />
              );
              return href ? (
                <Link key={row.entitlement.publicId} href={href} className="block h-full">
                  {card}
                </Link>
              ) : (
                <div key={row.entitlement.publicId}>{card}</div>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{copy.catalog}</h2>
        {catalogProducts.length === 0 ? (
          <EmptyState title={copy.noCatalog} description={copy.noCatalogBody} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {catalogProducts.map((product) => (
              <Link
                key={product.publicId}
                href={`/products/${product.slug}`}
                className="group block h-full"
              >
                <ProductCard
                  className="group h-full"
                  title={product.name}
                  description={product.shortDescription ?? product.description ?? ""}
                  image={productCardImage(product)}
                  fallbackInitial={product.name.slice(0, 1)}
                  ctaLabel={copy.viewProduct}
                />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
