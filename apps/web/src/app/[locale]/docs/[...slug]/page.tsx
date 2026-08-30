import { PublishedContentArticle, publishedContentMetadata } from "@/components/content/published-content-article";

export const revalidate = 3600;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
  searchParams: Promise<{ preview?: string; versionId?: string }>;
}) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  return publishedContentMetadata({
    locale,
    slug: slug.join("/"),
    contentType: "doc",
    pathPrefix: "/docs",
    preview: Boolean(sp.preview && sp.versionId),
  });
}

export default async function DocsArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string[] }>;
  searchParams: Promise<{ preview?: string; versionId?: string }>;
}) {
  const { locale, slug } = await params;
  const sp = await searchParams;

  return (
    <PublishedContentArticle
      locale={locale}
      slug={slug.join("/")}
      contentType="doc"
      pathPrefix="/docs"
      previewToken={sp.preview}
      previewVersionId={sp.versionId}
    />
  );
}
