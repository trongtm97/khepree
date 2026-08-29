"use server";

import { createContentService } from "@khepree/catalog";
import { revalidatePath } from "next/cache";

export async function createDraftAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const locale = String(formData.get("locale") ?? "en").trim();
  const body = String(formData.get("body") ?? "");

  if (!slug || !title) {
    return;
  }

  const content = createContentService();
  await content.createDraft({
    slug,
    contentType: "article",
    locale,
    title,
    excerpt: String(formData.get("excerpt") ?? "") || null,
    body: body || null,
  });

  revalidatePath("/content");
}

export async function publishDraftFormAction(formData: FormData) {
  const versionId = String(formData.get("versionId") ?? "");
  if (!versionId) return;

  const content = createContentService();
  const { revalidation } = await content.publish(versionId);

  revalidatePath("/content");
  for (const path of revalidation.paths) {
    revalidatePath(path);
  }
}

export async function archiveDraftFormAction(formData: FormData) {
  const versionId = String(formData.get("versionId") ?? "");
  if (!versionId) return;

  const content = createContentService();
  await content.archive(versionId);
  revalidatePath("/content");
}
