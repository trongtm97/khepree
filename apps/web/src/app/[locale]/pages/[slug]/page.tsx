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
    contentType: "page",
    pathPrefix: "/pages",
    preview: Boolean(sp.preview && sp.versionId),
  });
}

export default async function CmsPage({
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
      contentType="page"
      pathPrefix="/pages"
      previewToken={sp.preview}
      previewVersionId={sp.versionId}
    />
  );
}
