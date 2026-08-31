"use server";

import { requireSession } from "@khepree/auth/session";
import { createDownloadService, createProductService } from "@khepree/catalog";
import { getDb, isEntitlementActive } from "@khepree/db";
import { redirect } from "next/navigation";
import { getPlatform } from "@/lib/commerce";

export async function downloadReleaseAction(formData: FormData) {
  const session = await requireSession();
  const slug = String(formData.get("productSlug") ?? "").trim();
  const releasePublicId = String(formData.get("releasePublicId") ?? "").trim();
  if (!slug || !releasePublicId) {
    redirect(`/products/${encodeURIComponent(slug || "")}`);
  }

  const productId = await createProductService().resolveProductIdBySlug(slug);
  if (!productId) redirect("/products");

  const rows = await getPlatform().entitlement.resolveEntitlementsForPrincipal({
    type: "USER",
    id: session.user.id,
  });
  const entitlement = rows.find((row) => row.entitlement.productId === productId);
  const entitled =
    entitlement != null &&
    isEntitlementActive({ ...entitlement.entitlement, now: new Date() }) &&
    entitlement.entitlement.status === "active";

  if (!entitled) redirect(`/products/${slug}`);

  const db = getDb();
  if (!db) redirect(`/products/${slug}`);

  const download = createDownloadService(db);
  const authorized = await download.authorizeReleaseDownload({
    releasePublicId,
    context: { entitled: true, actorUserId: session.user.id, purpose: "account_product_hub" },
  });
  if (authorized.productId !== productId) redirect(`/products/${slug}`);

  redirect(authorized.url);
}
