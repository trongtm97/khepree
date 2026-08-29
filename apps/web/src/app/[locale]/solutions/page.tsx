import { notFound } from "next/navigation";
import { MarketingPageLayout } from "@/components/marketing/marketing-page-layout";
import { AUDIENCE_SLUGS, audienceCopy } from "@/components/marketing/audience-section";
import { getMessages } from "@/lib/i18n/get-messages";
import { createPageMetadata } from "@/lib/seo/metadata";
import { isSupportedLocale, localePath, type SupportedLocale } from "@/lib/i18n/config";
import Link from "next/link";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) return {};
  const content = getMessages(raw).pages.solutions;
  return createPageMetadata({
    locale: raw,
    title: content.title,
    description: content.description,
    path: "/solutions",
  });
}

export default async function SolutionsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) notFound();
  const locale: SupportedLocale = raw;
  const messages = getMessages(locale);
  const content = messages.pages.solutions;

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
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {AUDIENCE_SLUGS.map((slug) => {
          const item = audienceCopy(messages, slug);
          return (
            <li key={slug}>
              <Link
                href={localePath(locale, `/solutions/${slug}`)}
                className="block rounded-[var(--radius-card)] border border-khepree-mist p-5 hover:border-khepree-teal/40"
              >
                <h2 className="text-lg font-semibold text-khepree-ink">{item.title}</h2>
                <p className="mt-2 text-sm">{item.copy}</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </MarketingPageLayout>
  );
}
