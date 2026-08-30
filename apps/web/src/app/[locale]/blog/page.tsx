import { BlogIndex } from "@/components/content/blog-index";
import { getMessages } from "@/lib/i18n/get-messages";
import { createPageMetadata } from "@/lib/seo/metadata";
import { isSupportedLocale, type SupportedLocale } from "@/lib/i18n/config";
import { notFound } from "next/navigation";

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
  return <BlogIndex locale={raw as SupportedLocale} messages={getMessages(raw as SupportedLocale)} />;
}
