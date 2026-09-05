"use server";

import { isCatalogError } from "@khepree/catalog";
import type {
  ReleaseArchitecture,
  ReleaseArtifactKind,
  ReleaseChannel,
  ReleasePlatform,
} from "@khepree/db";
import { hasPermission, type Permission } from "@khepree/security";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/action-form";
import { requireAdmin } from "@/lib/admin-session";
import { getAnnouncementService } from "@/lib/announcement-service";
import { getReleaseService } from "@/lib/release-service";

export type ReleaseUploadState = ActionState & {
  uploadUrl?: string;
  objectKey?: string;
  uploadHeaders?: Record<string, string>;
};

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

function revalidateRelease(productId: string) {
  revalidatePath(`/products/${productId}`);
  revalidatePath("/releases");
  revalidatePath("/downloads");
}

export async function prepareReleaseUploadAction(
  _s: ReleaseUploadState,
  formData: FormData,
): Promise<ReleaseUploadState> {
  try {
    const session = await actor("catalog.write");
    const productId = String(formData.get("productId") ?? "");
    const fileName = String(formData.get("fileName") ?? "");
    const mimeType = String(formData.get("mimeType") ?? "application/octet-stream");
    const sizeBytes = Number(formData.get("sizeBytes") ?? 0);
    const result = await getReleaseService().prepareArtifactUpload({
      productId,
      fileName,
      mimeType,
      sizeBytes,
      actorUserId: session.user.id,
    });
    return {
      objectKey: result.objectKey,
      uploadUrl: result.upload.url,
      uploadHeaders: result.upload.headers,
    };
  } catch (error) {
    return fail(error);
  }
}

export async function createReleaseDraftAction(
  _s: ActionState,
  formData: FormData,
): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    const productId = String(formData.get("productId") ?? "");
    await getReleaseService().createDraft({
      productId,
      version: String(formData.get("version") ?? ""),
      platform: String(formData.get("platform") ?? "windows") as ReleasePlatform,
      architecture: String(formData.get("architecture") ?? "x64") as ReleaseArchitecture,
      channel: (String(formData.get("channel") ?? "stable") || "stable") as ReleaseChannel,
      fileName: String(formData.get("fileName") ?? ""),
      fileSize: Number(formData.get("fileSize") ?? 0),
      checksumSha256: String(formData.get("checksumSha256") ?? ""),
      objectKey: String(formData.get("objectKey") ?? ""),
      mimeType: String(formData.get("mimeType") ?? "application/octet-stream"),
      releaseNotesVi: String(formData.get("releaseNotesVi") ?? "") || null,
      releaseNotesEn: String(formData.get("releaseNotesEn") ?? "") || null,
      mandatoryUpdate: formData.get("mandatoryUpdate") === "on",
      minimumSupportedVersion: String(formData.get("minimumSupportedVersion") ?? "") || null,
      signature: String(formData.get("manifestSignature") ?? "") || null,
      signingKeyId: String(formData.get("signingKeyId") ?? "") || null,
      actorUserId: session.user.id,
    });
    revalidateRelease(productId);
    return { notice: "Đã lưu bản phát hành (draft)" };
  } catch (error) {
    return fail(error);
  }
}

export async function publishReleaseAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    const releaseId = String(formData.get("releaseId") ?? "");
    const productId = String(formData.get("productId") ?? "");
    const notifyDesktop = formData.get("notifyDesktop") === "on";
    const readiness = await getReleaseService().getPublishReadiness(releaseId);
    if (!readiness.ready) {
      return { error: readiness.blockers[0] ?? "Release chưa verified" };
    }
    const published = await getReleaseService().publish(releaseId, session.user.id);
    revalidateRelease(productId);
    revalidatePath(`/releases/${String(formData.get("releasePublicId") ?? "")}`);

    if (!notifyDesktop) {
      return { notice: "Đã xuất bản phiên bản (không tạo thông báo desktop)" };
    }

    try {
      const result = await getAnnouncementService().publishWhatsNewForRelease(
        {
          id: published.id,
          publicId: published.publicId,
          productId: published.productId,
          version: published.version,
          platform: published.platform,
          architecture: published.architecture,
          channel: published.channel,
          releaseNotesVi: published.releaseNotesVi,
          releaseNotesEn: published.releaseNotesEn,
        },
        session.user.id,
      );
      revalidatePath("/announcements");
      if (result.created) {
        return {
          notice: `Đã xuất bản phiên bản và tạo thông báo desktop (${result.announcement.publicId})`,
        };
      }
      return {
        notice: `Đã xuất bản phiên bản — thông báo desktop đã tồn tại (${result.announcement.publicId})`,
      };
    } catch (notifyError) {
      const message =
        notifyError instanceof Error ? notifyError.message : "Không tạo được thông báo desktop";
      return {
        notice: `Đã xuất bản phiên bản, nhưng thông báo desktop thất bại: ${message}`,
      };
    }
  } catch (error) {
    return fail(error);
  }
}

export async function addReleaseArtifactAction(_s: ActionState, formData: FormData): Promise<ActionState> {
  try {
    const session = await actor("catalog.write");
    const releaseId = String(formData.get("releaseId") ?? "");
    const productId = String(formData.get("productId") ?? "");
    await getReleaseService().addArtifact({
      releaseId,
      kind: String(formData.get("kind") ?? "installer") as ReleaseArtifactKind,
      fileName: String(formData.get("fileName") ?? ""),
      fileSize: Number(formData.get("fileSize") ?? 0),
      checksumSha256: String(formData.get("checksumSha256") ?? ""),
      objectKey: String(formData.get("objectKey") ?? ""),
      mimeType: String(formData.get("mimeType") ?? "application/octet-stream"),
      signature: String(formData.get("manifestSignature") ?? "") || null,
      signingKeyId: String(formData.get("signingKeyId") ?? "") || null,
      actorUserId: session.user.id,
    });
    revalidateRelease(productId);
    revalidatePath(`/releases/${String(formData.get("releasePublicId") ?? "")}`);
    return { notice: "Đã thêm artifact" };
  } catch (error) {
    return fail(error);
  }
}
