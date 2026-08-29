import { notFound } from "next/navigation";
import { MarketingPageLayout } from "@/components/marketing/marketing-page-layout";
import { AUDIENCE_SLUGS, audienceCopy, isAudienceSlug } from "@/components/marketing/audience-section";
import { getMessages } from "@/lib/i18n/get-messages";
import { createPageMetadata } from "@/lib/seo/metadata";
import { isSupportedLocale, localePath, type SupportedLocale } from "@/lib/i18n/config";
import Link from "next/link";

export function generateStaticParams() {
  return AUDIENCE_SLUGS.map((audience) => ({ audience }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; audience: string }>;
}) {
  const { locale: raw, audience } = await params;
  if (!isSupportedLocale(raw) || !isAudienceSlug(audience)) return {};
  const messages = getMessages(raw);
  const item = audienceCopy(messages, audience);
  const extra = messages.pages.solutions.audiences[audience];
  return createPageMetadata({
    locale: raw,
    title: item.title,
    description: extra.seoDescription,
    path: `/solutions/${audience}`,
  });
}

export default async function SolutionAudiencePage({
  params,
}: {
  params: Promise<{ locale: string; audience: string }>;
}) {
  const { locale: raw, audience } = await params;
  if (!isSupportedLocale(raw) || !isAudienceSlug(audience)) notFound();

  const locale: SupportedLocale = raw;
  const messages = getMessages(locale);
  const item = audienceCopy(messages, audience);
  const extra = messages.pages.solutions.audiences[audience];

  return (
    <MarketingPageLayout
      title={item.title}
      description={item.copy}
      breadcrumbs={[
        { label: messages.meta.siteName, href: localePath(locale) },
        { label: messages.pages.solutions.title, href: localePath(locale, "/solutions") },
        { label: item.title },
      ]}
    >
      <p>{extra.body}</p>
      <p className="mt-4">
        <Link href={localePath(locale, "/products")} className="text-khepree-teal underline">
          {messages.nav.exploreProducts}
        </Link>
      </p>
    </MarketingPageLayout>
  );
}
