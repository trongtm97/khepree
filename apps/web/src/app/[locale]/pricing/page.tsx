import { DEFAULT_CURRENCY, DEFAULT_MARKET_REGION } from "@khepree/config";
import { EmptyState } from "@khepree/ui";
import { notFound } from "next/navigation";
import { PricingPlanCard } from "@/components/catalog/pricing-plan-card";
import { MarketingPageLayout } from "@/components/marketing/marketing-page-layout";
import { getMessages } from "@/lib/i18n/get-messages";
import { getPricingGroups } from "@/lib/catalog";
import { createPageMetadata } from "@/lib/seo/metadata";
import { accountPublicUrl } from "@/lib/urls";
import { isSupportedLocale, localePath, type SupportedLocale } from "@/lib/i18n/config";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) return {};
  const content = getMessages(raw).pages.pricing;
  return createPageMetadata({
    locale: raw,
    title: content.title,
    description: content.description,
    path: "/pricing",
  });
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) notFound();

  const locale: SupportedLocale = raw;
  const messages = getMessages(locale);
  const content = messages.pages.pricing;
  const groups = await getPricingGroups(locale);

  return (
    <MarketingPageLayout
      title={content.title}
      description={content.description}
      breadcrumbs={[
        { label: messages.meta.siteName, href: localePath(locale) },
        { label: content.title },
      ]}
    >
      <p>{content.intro}</p>

      {groups.length > 0 ? (
        <div className="mt-10 space-y-12">
          {groups.map((group) => (
            <section key={group.product.publicId}>
              <h2 className="text-xl font-semibold tracking-tight">{group.product.name}</h2>
              {group.product.shortDescription ? (
                <p className="mt-2 text-khepree-slate/80">{group.product.shortDescription}</p>
              ) : null}
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.plans.map((plan) => (
                  <PricingPlanCard
                    key={plan.publicId}
                    plan={plan}
                    locale={locale}
                    messages={messages}
                    preferredCurrency={DEFAULT_CURRENCY}
                    preferredRegion={DEFAULT_MARKET_REGION}
                    accountUrl={accountPublicUrl()}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            title={messages.products.emptyTitle}
            description={messages.products.emptyDescription}
          />
        </div>
      )}
    </MarketingPageLayout>
  );
}
