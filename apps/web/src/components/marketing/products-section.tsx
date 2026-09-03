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
          <ul className="mt-10 grid list-none gap-3 p-0 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {products.map((product) => (
              <li key={product.publicId} className="min-w-0">
                <ProductCard product={product} locale={locale} messages={messages} />
              </li>
            ))}
          </ul>
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
