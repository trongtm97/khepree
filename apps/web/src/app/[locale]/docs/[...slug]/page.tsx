import { PublishedContentArticle, publishedContentMetadata } from "@/components/content/published-content-article";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
}) {
  const { locale, slug } = await params;
  return publishedContentMetadata({
    locale,
    slug: slug.join("/"),
    contentType: "doc",
    pathPrefix: "/docs",
  });
}

export default async function DocsArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
}) {
  const { locale, slug } = await params;
  return (
    <PublishedContentArticle
      locale={locale}
      slug={slug.join("/")}
      contentType="doc"
      pathPrefix="/docs"
    />
  );
}
