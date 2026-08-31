import { EmptyState, Container } from "@khepree/ui";
import { ProductCard } from "@/components/catalog/product-card";
import type { Messages } from "@/lib/i18n/get-messages";
import { getPublicProducts } from "@/lib/catalog";
import type { SupportedLocale } from "@/lib/i18n/config";

export async function ProductsSection({
  locale,
  messages,
}: {
  locale: SupportedLocale;
  messages: Messages;
}) {
  const products = await getPublicProducts(locale);

  return (
    <section id="products" className="py-16 lg:py-24">
      <Container>
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight">{messages.products.heading}</h2>
          <p className="mt-4 text-muted">{messages.products.copy}</p>
        </div>

        {products.length > 0 ? (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.publicId} product={product} locale={locale} messages={messages} />
            ))}
          </div>
        ) : (
          <div className="mt-10">
            <EmptyState
              title={messages.products.emptyTitle}
              description={messages.products.emptyDescription}
            />
          </div>
        )}
      </Container>
    </section>
  );
}
