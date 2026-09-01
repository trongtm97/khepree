import { getEnv } from "@khepree/config";
import { updateTag } from "next/cache";

/** Best-effort ISR refresh on marketing web (separate Next.js app). */
export async function revalidateMarketingWeb(plan: { tags: string[]; paths: string[] }) {
  const webUrl = getEnv().WEB_URL?.replace(/\/$/, "");
  const secret = getEnv().OUTBOX_WORKER_SECRET;
  if (!webUrl || !secret || secret.includes("CHANGE_ME")) return;

  try {
    const response = await fetch(`${webUrl}/api/internal/revalidate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ tags: plan.tags, paths: plan.paths }),
      cache: "no-store",
    });
    if (!response.ok) {
      console.warn("[revalidate-marketing] web responded", response.status);
    }
  } catch (error) {
    console.warn("[revalidate-marketing] web fetch failed", error);
  }
}

export async function revalidateMarketingProduct(slug: string) {
  const { buildProductRevalidationPlan } = await import("@khepree/catalog");
  for (const locale of ["vi", "en"] as const) {
    const plan = buildProductRevalidationPlan({ slug, locale });
    for (const tag of plan.tags) updateTag(tag);
    await revalidateMarketingWeb(plan);
  }
}
