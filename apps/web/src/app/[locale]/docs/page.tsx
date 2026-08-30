import { DocsIndex } from "@/components/content/docs-index";
import { getMessages } from "@/lib/i18n/get-messages";
import { createPageMetadata } from "@/lib/seo/metadata";
import { isSupportedLocale, type SupportedLocale } from "@/lib/i18n/config";
import { notFound } from "next/navigation";

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) return {};
  const content = getMessages(raw).pages.docs;
  return createPageMetadata({
    locale: raw,
    title: content.title,
    description: content.description,
    path: "/docs",
  });
}

export default async function DocsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  if (!isSupportedLocale(raw)) notFound();
  return <DocsIndex locale={raw as SupportedLocale} messages={getMessages(raw as SupportedLocale)} />;
}
