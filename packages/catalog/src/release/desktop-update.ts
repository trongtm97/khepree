import { sanitizeAnnouncementBody } from "../announcement/body";
import type { ReleaseRecord } from "./types";
import { resolveReleaseNotes } from "./public-changelog";

export interface DesktopUpdateArtifact {
  artifactPublicId: string;
  kind: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
}

export interface DesktopLatestUpdatePayload {
  releasePublicId: string;
  version: string;
  platform: string;
  architecture: string;
  channel: string;
  mandatoryUpdate: boolean;
  minimumSupportedVersion: string | null;
  publishedAt: string | null;
  releaseNotes: string | null;
  artifacts: DesktopUpdateArtifact[];
}

export function serializeDesktopLatestUpdate(
  release: ReleaseRecord,
  locale: string,
): DesktopLatestUpdatePayload {
  const rawNotes = resolveReleaseNotes(locale, [
    { locale: "vi", releaseNotes: release.releaseNotesVi },
    { locale: "en", releaseNotes: release.releaseNotesEn },
  ]);

  return {
    releasePublicId: release.publicId,
    version: release.version,
    platform: release.platform,
    architecture: release.architecture,
    channel: release.channel,
    mandatoryUpdate: release.mandatoryUpdate,
    minimumSupportedVersion: release.minimumSupportedVersion,
    publishedAt: release.publishedAt?.toISOString() ?? null,
    releaseNotes: sanitizeAnnouncementBody(rawNotes),
    artifacts: release.artifacts.map((artifact) => ({
      artifactPublicId: artifact.publicId,
      kind: artifact.kind,
      fileName: artifact.fileName,
      contentType: artifact.contentType,
      sizeBytes: artifact.sizeBytes,
      sha256: artifact.sha256,
    })),
  };
}
