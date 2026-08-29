import { requireSession } from "@khepree/auth/session";
import { Card, CardDescription, CardTitle, EmptyState } from "@khepree/ui";
import { DEFAULT_LOCALE } from "@khepree/config";
import { createProductService } from "@khepree/catalog";
import { isEntitlementActive } from "@khepree/db";
import type { Metadata } from "next";
import { getPlatform } from "@/lib/commerce";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage() {
  const session = await requireSession();
  const catalogProducts = await createProductService().listCatalogProducts({
    locale: DEFAULT_LOCALE,
  });
  const owned = (await getPlatform().entitlement.resolveEntitlementsForPrincipal({
    type: "USER",
    id: session.user.id,
  })).filter((row) => isEntitlementActive({ ...row.entitlement }));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <p className="mt-2 text-sm text-khepree-slate/70">
          Owned products come from active entitlements, not from plan name checks.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Your products</h2>
        {owned.length === 0 ? (
          <EmptyState
            title="No owned products yet"
            description="Complete a purchase. Access is granted only after a verified payment webhook."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {owned.map((row) => (
              <Card key={row.entitlement.publicId}>
                <CardTitle className="text-base">{row.productSlug ?? row.entitlement.productId}</CardTitle>
                <CardDescription className="mt-2">
                  {row.planSlug ?? "Plan"} · {row.entitlement.status}
                </CardDescription>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Available in catalog</h2>
        {catalogProducts.length === 0 ? (
          <EmptyState
            title="Catalog unavailable"
            description="Connect DATABASE_URL and run migrations/seed to load catalog products in development."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {catalogProducts.map((product) => (
              <Card key={product.publicId}>
                <CardTitle className="text-base">{product.name}</CardTitle>
                <CardDescription className="mt-2">
                  {product.shortDescription ?? product.description ?? "No description"}
                </CardDescription>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
