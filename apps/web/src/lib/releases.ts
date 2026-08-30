import { createReleaseService, type PublicChangelogEntry } from "@khepree/catalog";
import { createDrizzleAuditService, getDb } from "@khepree/db";
import { unstable_cache } from "next/cache";

function releaseService() {
  const db = getDb();
  if (!db) return null;
  return createReleaseService(db, createDrizzleAuditService(db));
}

export async function getPublicChangelog(
  locale: string,
  productSlug?: string,
): Promise<PublicChangelogEntry[]> {
  return unstable_cache(
    async () => {
      const service = releaseService();
      if (!service) return [];
      try {
        return await service.listPublicChangelog({ locale, productSlug });
      } catch {
        return [];
      }
    },
    [`public-changelog-${locale}-${productSlug ?? "all"}`],
    { revalidate: 3600, tags: ["releases", `releases-locale:${locale}`] },
  )();
}
