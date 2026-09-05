import type {
  ReleaseArchitecture,
  ReleaseChannel,
  ReleasePlatform,
} from "@khepree/db";
import { versionCeilingBelow } from "../release/version";
import type { AnnouncementRecord } from "./types";

export interface ReleaseNotifySource {
  id: string;
  publicId: string;
  productId: string;
  version: string;
  platform: ReleasePlatform;
  architecture: ReleaseArchitecture;
  channel: ReleaseChannel;
  releaseNotesVi: string | null;
  releaseNotesEn: string | null;
}

export interface PublishWhatsNewForReleaseResult {
  announcement: AnnouncementRecord;
  created: boolean;
}

/** Build draft fields for an auto whats_new announcement tied to a published release. */
export function buildReleaseWhatsNewDraftInput(
  release: ReleaseNotifySource,
  actorUserId?: string | null,
) {
  const titleVi = `Phiên bản ${release.version} đã sẵn sàng`;
  const titleEn = `Version ${release.version} is available`;
  const translations = [
    {
      locale: "vi",
      title: titleVi,
      body: release.releaseNotesVi?.trim() || `Cập nhật lên ${release.version}.`,
      ctaLabel: "Cập nhật",
    },
  ];
  if (release.releaseNotesEn?.trim()) {
    translations.push({
      locale: "en",
      title: titleEn,
      body: release.releaseNotesEn.trim(),
      ctaLabel: "Update",
    });
  } else {
    translations.push({
      locale: "en",
      title: titleEn,
      body: `Update to ${release.version}.`,
      ctaLabel: "Update",
    });
  }

  return {
    productId: release.productId,
    relatedReleaseId: release.id,
    severity: "info" as const,
    type: "whats_new" as const,
    targetPlatform: release.platform,
    targetArchitecture: release.architecture,
    releaseChannel: release.channel,
    maximumAppVersion: versionCeilingBelow(release.version),
    ctaKind: "software_update" as const,
    ctaPayload: {
      releasePublicId: release.publicId,
      actions: ["download", "auto_update"] as const,
    },
    translations,
    actorUserId: actorUserId ?? null,
  };
}
