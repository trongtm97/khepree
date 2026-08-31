import { requireSession } from "@khepree/auth/session";
import { Card, CardDescription, CardTitle, EmptyState } from "@khepree/ui";
import { isEntitlementActive } from "@khepree/db";
import { createProductService } from "@khepree/catalog";
import type { Metadata } from "next";
import Link from "next/link";
import { getPlatform } from "@/lib/commerce";
import { accountLocaleFromCookies } from "@/lib/locale";
import { accountMessages } from "@/lib/messages";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Products" };

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
              return (
                <Card key={row.entitlement.publicId}>
                  <CardTitle className="text-base">
                    {catalog?.name ?? row.productSlug ?? row.entitlement.productId}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {row.planSlug ?? "Plan"} · {row.entitlement.status}
                  </CardDescription>
                  {href ? (
                    <Link
                      href={href}
                      className="mt-4 inline-flex text-sm font-medium text-khepree-teal hover:underline"
                    >
                      {copy.viewProduct}
                    </Link>
                  ) : null}
                </Card>
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
              <Card key={product.publicId}>
                <CardTitle className="text-base">{product.name}</CardTitle>
                <CardDescription className="mt-2">
                  {product.shortDescription ?? product.description ?? "—"}
                </CardDescription>
                <Link
                  href={`/products/${product.slug}`}
                  className="mt-4 inline-flex text-sm font-medium text-khepree-teal hover:underline"
                >
                  {copy.viewProduct}
                </Link>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
