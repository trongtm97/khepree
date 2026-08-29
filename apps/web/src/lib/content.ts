import {
  contentRevalidationTags,
  createContentService,
  type ContentType,
  type PublishedContent,
} from "@khepree/catalog";
import { getDb } from "@khepree/db";
import { unstable_cache } from "next/cache";

function service() {
  const db = getDb();
  if (!db) return null;
  return createContentService(db);
}

export async function listPublishedContent(contentType: ContentType, locale: string) {
  return unstable_cache(
    async (): Promise<PublishedContent[]> => {
      const cms = service();
      if (!cms) return [];
      return cms.listPublished({ contentType, locale });
    },
    [`published-${contentType}-${locale}`],
    { revalidate: 3600, tags: [`content-type:${contentType}`, `content-locale:${locale}`] },
  )();
}

export async function getPublishedContent(contentType: ContentType, slug: string, locale: string) {
  return unstable_cache(
    async (): Promise<PublishedContent | null> => {
      const cms = service();
      if (!cms) return null;
      return cms.getPublished({ slug, contentType, locale });
    },
    [`published-${contentType}-${locale}-${slug}`],
    {
      revalidate: 3600,
      tags: contentRevalidationTags({ slug, contentType, locale }),
    },
  )();
}

export async function getPublishedBody(bodyObjectKey: string | null): Promise<string | null> {
  if (!bodyObjectKey) return null;
  const cms = service();
  if (!cms) return null;
  return cms.getBody({ bodyObjectKey });
}
