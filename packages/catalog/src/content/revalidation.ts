import type { ContentType } from "./types";

/** Next.js cache tags for ISR revalidation after publish. */
export function contentRevalidationTags(input: {
  slug: string;
  contentType: ContentType;
  locale: string;
}): string[] {
  return [
    `content:${input.contentType}:${input.locale}:${input.slug}`,
    `content-locale:${input.locale}`,
    `content-type:${input.contentType}`,
  ];
}

/** Path hints for apps/web revalidatePath after publish. */
export function contentRevalidationPaths(input: {
  slug: string;
  contentType: ContentType;
  locale: string;
}): string[] {
  const base = `/${input.locale}`;
  switch (input.contentType) {
    case "article":
      return [`${base}/blog/${input.slug}`, `${base}/blog`];
    case "doc":
      return [`${base}/docs/${input.slug}`, `${base}/docs`];
    case "legal":
      return [`${base}/${input.slug}`];
    case "page":
    case "product_page":
      return [`${base}/${input.slug}`];
    default:
      return [`${base}/${input.slug}`];
  }
}

export interface ContentRevalidationPlan {
  tags: string[];
  paths: string[];
}

export function buildContentRevalidationPlan(input: {
  slug: string;
  contentType: ContentType;
  locale: string;
}): ContentRevalidationPlan {
  return {
    tags: contentRevalidationTags(input),
    paths: contentRevalidationPaths(input),
  };
}
