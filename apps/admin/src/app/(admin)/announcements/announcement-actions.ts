"use server";

import { isCatalogError, parseAnnouncementDraftForm } from "@khepree/catalog";
import { hasPermission, type Permission } from "@khepree/security";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/action-form";
import { requireAdmin } from "@/lib/admin-session";
import {
  assertPublishConfirmation,
  readAnnouncementFormData,
} from "@/lib/announcement-publish";
import { getAnnouncementService } from "@/lib/announcement-service";

async function actor(permission: Permission) {
  const session = await requireAdmin(permission);
  if (!hasPermission({ globalRole: session.globalRole }, permission)) {
    throw new Error("Forbidden");
  }
  return session;
}

function fail(error: unknown): ActionState {
  if (isCatalogError(error)) return { error: error.message };
  if (error instanceof Error) return { error: error.message };
  return { error: "Unexpected error" };
}

function revalidateAnnouncements(publicId?: string) {
  revalidatePath("/announcements");
  if (publicId) revalidatePath(`/announcements/${publicId}`);
}

export async function createAnnouncementDraftAction(
  _s: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    const parsed = parseAnnouncementDraftForm(readAnnouncementFormData(formData));
    const row = await getAnnouncementService().createDraft({
      ...parsed,
      actorUserId: session.user.id,
    });
    revalidateAnnouncements(row.publicId);
    return { redirectTo: `/announcements/${row.publicId}` };
  } catch (error) {
    return fail(error);
  }
}

export async function saveAnnouncementDraftAction(
  _s: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    const announcementId = String(formData.get("announcementId") ?? "");
    const publicId = String(formData.get("publicId") ?? "");
    const parsed = parseAnnouncementDraftForm(readAnnouncementFormData(formData));
    await getAnnouncementService().updateDraft({
      announcementId,
      ...parsed,
      actorUserId: session.user.id,
    });
    revalidateAnnouncements(publicId);
    return { notice: "Đã lưu nháp" };
  } catch (error) {
    return fail(error);
  }
}

export async function publishAnnouncementAction(
  _s: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    assertPublishConfirmation(formData);
    const announcementId = String(formData.get("announcementId") ?? "");
    const publicId = String(formData.get("publicId") ?? "");
    await getAnnouncementService().publish(announcementId, session.user.id);
    revalidateAnnouncements(publicId);
    return { notice: "Đã xuất bản thông báo" };
  } catch (error) {
    return fail(error);
  }
}

export async function expireAnnouncementAction(
  _s: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    assertPublishConfirmation(formData);
    const announcementId = String(formData.get("announcementId") ?? "");
    const publicId = String(formData.get("publicId") ?? "");
    await getAnnouncementService().expire(announcementId, session.user.id);
    revalidateAnnouncements(publicId);
    return { notice: "Đã đánh dấu hết hạn" };
  } catch (error) {
    return fail(error);
  }
}

export async function archiveAnnouncementAction(
  _s: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    assertPublishConfirmation(formData);
    const announcementId = String(formData.get("announcementId") ?? "");
    const publicId = String(formData.get("publicId") ?? "");
    await getAnnouncementService().archive(announcementId, session.user.id);
    revalidateAnnouncements(publicId);
    return { notice: "Đã lưu trữ thông báo" };
  } catch (error) {
    return fail(error);
  }
}

export async function clonePublishedAnnouncementAction(
  _s: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    const announcementId = String(formData.get("announcementId") ?? "");
    const row = await getAnnouncementService().clonePublishedToDraft(
      announcementId,
      session.user.id,
    );
    revalidateAnnouncements(row.publicId);
    return { redirectTo: `/announcements/${row.publicId}` };
  } catch (error) {
    return fail(error);
  }
}
