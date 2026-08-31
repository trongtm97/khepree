"use server";

import {
  contentPreviewUrl,
  suggestContentSlug,
} from "@khepree/catalog";
import type { ContentType } from "@khepree/catalog";
import { hasPermission, type Permission } from "@khepree/security";
import { revalidatePath, updateTag } from "next/cache";
import type { ActionState } from "@/components/action-form";
import { requireAdmin } from "@/lib/admin-session";
import { getContentService } from "@/lib/admin";
import { getEnv } from "@khepree/config";

async function actor(permission: Permission) {
  const session = await requireAdmin(permission);
  if (!hasPermission({ globalRole: session.globalRole }, permission)) {
    throw new Error("Forbidden");
  }
  return session;
}

function fail(error: unknown): ActionState {
  if (error instanceof Error) return { error: error.message };
  return { error: "Unexpected error" };
}

function revalidateContent(plan: { tags: string[]; paths: string[] }) {
  for (const tag of plan.tags) updateTag(tag);
  for (const path of plan.paths) revalidatePath(path);
  revalidatePath("/content");
  revalidatePath("/content/articles");
  revalidatePath("/content/pages");
  revalidatePath("/content/docs");
}

export async function createContentArticleAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  let entryId: string | undefined;
  try {
    const session = await actor("content.write");
    const title = String(formData.get("title") ?? "").trim();
    const slugRaw = String(formData.get("slug") ?? "").trim();
    const slug = slugRaw || suggestContentSlug(title);
    const contentType = String(formData.get("contentType") ?? "article") as ContentType;
    const row = await getContentService().createDraft({
      slug,
      contentType,
      locale: "vi",
      title,
      excerpt: String(formData.get("excerpt") ?? "") || null,
      seoTitle: String(formData.get("seoTitle") ?? "") || null,
      seoDescription: String(formData.get("seoDescription") ?? "") || null,
      body: String(formData.get("body") ?? "") || null,
      featuredMediaPublicId: String(formData.get("featuredMediaPublicId") ?? "") || null,
      authorUserId: session.user.id,
      categoryId: String(formData.get("categoryId") ?? "") || null,
    });
    entryId = row.entryId;
  } catch (error) {
    return fail(error);
  }
  return { redirectTo: `/content/${entryId}` };
}

export async function saveContentDraftAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("content.write");
    const versionId = String(formData.get("versionId") ?? "");
    await getContentService().updateDraft({
      versionId,
      title: String(formData.get("title") ?? ""),
      excerpt: String(formData.get("excerpt") ?? "") || null,
      seoTitle: String(formData.get("seoTitle") ?? "") || null,
      seoDescription: String(formData.get("seoDescription") ?? "") || null,
      body: String(formData.get("body") ?? ""),
      featuredMediaPublicId: String(formData.get("featuredMediaPublicId") ?? "") || null,
      authorUserId: session.user.id,
      categoryId: String(formData.get("categoryId") ?? "") || null,
    });
    const entryId = String(formData.get("entryId") ?? "");
    revalidatePath(`/content/${entryId}`);
    return { notice: "Đã lưu nháp" };
  } catch (error) {
    return fail(error);
  }
}

export async function publishContentDraftAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await actor("content.write");
    const versionId = String(formData.get("versionId") ?? "");
    const entryId = String(formData.get("entryId") ?? "");
    const result = await getContentService().publish(versionId);
    revalidateContent(result.revalidation);
    revalidatePath(`/content/${entryId}`);
    return { notice: "Đã xuất bản" };
  } catch (error) {
    return fail(error);
  }
}

export async function archiveContentDraftAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await actor("content.write");
    const versionId = String(formData.get("versionId") ?? "");
    const entryId = String(formData.get("entryId") ?? "");
    await getContentService().archive(versionId);
    revalidatePath(`/content/${entryId}`);
    return { notice: "Đã lưu trữ" };
  } catch (error) {
    return fail(error);
  }
}

export async function forkPublishedContentAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await actor("content.write");
    const entryId = String(formData.get("entryId") ?? "");
    const locale = String(formData.get("locale") ?? "vi");
    await getContentService().createDraftFromPublished({ entryId, locale });
    revalidatePath(`/content/${entryId}`);
    return { notice: "Đã tạo bản nháp mới từ bản published" };
  } catch (error) {
    return fail(error);
  }
}

export async function getContentPreviewLink(versionId: string, locale: string, slug: string, contentType: ContentType) {
  await requireAdmin("content.read");
  const env = getEnv();
  const secret = env.BETTER_AUTH_SECRET ?? "dev-local-preview-secret-32chars!";
  const webBase = env.APP_URL ?? "http://localhost:3000";
  const type = contentType === "article" ? "article" : contentType === "doc" ? "doc" : "page";
  return contentPreviewUrl({ locale, contentType: type, slug, versionId, secret, webBaseUrl: webBase });
}
