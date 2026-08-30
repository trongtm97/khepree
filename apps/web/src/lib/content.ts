import {
  createContentService,
  createMediaService,
  verifyContentPreviewToken,
  renderContentMarkdown,
  type ProductCtaBlock,
} from "@khepree/catalog";
import { getEnv } from "@khepree/config";
import { unstable_cache } from "next/cache";
import type { ContentType, PublishedContent } from "@khepree/catalog";

function service() {
  return createContentService();
}

export async function listPublishedContent(contentType: ContentType, locale: string) {
  return unstable_cache(
    async (): Promise<PublishedContent[]> => {
      return service().listPublished({ contentType, locale });
    },
    [`published-${contentType}-${locale}`],
    { revalidate: 3600, tags: [`content-type:${contentType}`, `content-locale:${locale}`] },
  )();
}

export async function getPublishedContent(contentType: ContentType, slug: string, locale: string) {
  return unstable_cache(
    async (): Promise<PublishedContent | null> => {
      return service().getPublished({ slug, contentType, locale });
    },
    [`published-${contentType}-${locale}-${slug}`],
    {
      revalidate: 3600,
      tags: [`content:${contentType}:${locale}:${slug}`, `content-locale:${locale}`, `content-type:${contentType}`],
    },
  )();
}

export async function getPublishedBody(bodyObjectKey: string | null): Promise<string | null> {
  if (!bodyObjectKey) return null;
  return service().getBody({ bodyObjectKey });
}

export async function getContentPreview(
  versionId: string,
  token: string,
): Promise<(PublishedContent & { versionId: string }) | null> {
  const env = getEnv();
  const secret = env.BETTER_AUTH_SECRET ?? "dev-local-preview-secret-32chars!";
  if (!verifyContentPreviewToken({ versionId, token, secret })) return null;
  return service().getPreviewVersion(versionId);
}

export async function buildProductBlocks(body: string, locale: string): Promise<Record<string, ProductCtaBlock>> {
  const slugs = [...body.matchAll(/\[\[product:([a-z0-9-]+)\]\]/gi)].map((match) => match[1]!);
  if (slugs.length === 0) return {};
  const { getPublicProductBySlug } = await import("./catalog");
  const { localePath } = await import("./i18n/config");
  const blocks: Record<string, ProductCtaBlock> = {};
  for (const slug of slugs) {
    const product = await getPublicProductBySlug(slug, locale);
    if (!product) continue;
    blocks[slug] = {
      slug,
      name: product.name,
      description: product.shortDescription ?? product.name,
      href: localePath(locale as "vi" | "en", `/products/${product.slug}`),
    };
  }
  return blocks;
}

export function renderArticleHtml(body: string, productBlocks: Record<string, ProductCtaBlock>): string {
  return renderContentMarkdown(body, { productBlocks });
}

export async function getFeaturedImageUrl(publicId: string | null): Promise<string | null> {
  if (!publicId) return null;
  const media = await createMediaService().getByPublicId(publicId);
  return media?.publicUrl ?? null;
}
