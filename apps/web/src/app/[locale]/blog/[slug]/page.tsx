import { PublishedContentArticle, publishedContentMetadata } from "@/components/content/published-content-article";

export const revalidate = 3600;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ preview?: string; versionId?: string }>;
}) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  return publishedContentMetadata({
    locale,
    slug,
    contentType: "article",
    pathPrefix: "/blog",
    preview: Boolean(sp.preview && sp.versionId),
  });
}

export default async function BlogArticlePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ preview?: string; versionId?: string }>;
}) {
  const { locale, slug } = await params;
  const sp = await searchParams;

  return (
    <PublishedContentArticle
      locale={locale}
      slug={slug}
      contentType="article"
      pathPrefix="/blog"
      previewToken={sp.preview}
      previewVersionId={sp.versionId}
    />
  );
}
