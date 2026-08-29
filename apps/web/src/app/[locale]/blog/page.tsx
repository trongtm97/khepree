import { notFound } from "next/navigation";
import { PublishedContentIndex } from "@/components/content/published-content-index";
import { getMessages } from "@/lib/i18n/get-messages";
import { createPageMetadata } from "@/lib/seo/metadata";
import { isSupportedLocale, type SupportedLocale } from "@/lib/i18n/config";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) return {};
  const content = getMessages(raw).pages.blog;
  return createPageMetadata({
    locale: raw,
    title: content.title,
    description: content.description,
    path: "/blog",
  });
}

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) notFound();
  const locale: SupportedLocale = raw;
  return (
    <PublishedContentIndex
      locale={locale}
      messages={getMessages(locale)}
      contentType="article"
      pathPrefix="/blog"
    />
  );
}
