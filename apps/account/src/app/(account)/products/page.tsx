import type { Metadata } from "next";
import { Card, CardDescription, CardTitle, EmptyState } from "@khepree/ui";
import { createProductService } from "@khepree/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Products" };

export default async function ProductsPage() {
  const catalogProducts = await createProductService().listCatalogProducts();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <p className="mt-2 text-sm text-khepree-slate/70">
          Your owned products will appear here once entitlements are implemented. Nothing is faked below.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Your products</h2>
        <EmptyState
          title="No owned products yet"
          description="Entitlements are not wired in this phase. Purchases and licenses will populate this section later."
        />
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Available in catalog</h2>
        {catalogProducts.length > 0 ? (
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
        ) : (
          <EmptyState
            title="Catalog unavailable"
            description="Connect DATABASE_URL and run migrations/seed to load catalog products in development."
          />
        )}
      </section>
    </div>
  );
}
