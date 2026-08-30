import type {
  ReleaseArchitecture,
  ReleaseChannel,
  ReleasePlatform,
  ReleaseStatus,
} from "@khepree/db";

export interface ReleaseRecord {
  id: string;
  publicId: string;
  productId: string;
  version: string;
  platform: ReleasePlatform;
  architecture: ReleaseArchitecture;
  channel: ReleaseChannel;
  mediaAssetId: string;
  mediaPublicId: string;
  fileName: string;
  fileSize: number;
  checksumSha256: string;
  signature: string | null;
  minimumSupportedVersion: string | null;
  mandatoryUpdate: boolean;
  status: ReleaseStatus;
  publishedAt: Date | null;
  releaseNotesVi: string | null;
  releaseNotesEn: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReleaseDraftInput {
  productId: string;
  version: string;
  platform: ReleasePlatform;
  architecture: ReleaseArchitecture;
  channel?: ReleaseChannel;
  fileName: string;
  fileSize: number;
  checksumSha256: string;
  objectKey: string;
  mimeType: string;
  releaseNotesVi?: string | null;
  releaseNotesEn?: string | null;
  minimumSupportedVersion?: string | null;
  mandatoryUpdate?: boolean;
  signature?: string | null;
  actorUserId?: string | null;
}

export interface LatestReleaseQuery {
  productId: string;
  platform: ReleasePlatform;
  architecture: ReleaseArchitecture;
  channel?: ReleaseChannel;
  currentVersion?: string | null;
}

/** Published release row for public marketing changelog — active products only. */
export interface PublicChangelogEntry {
  releasePublicId: string;
  productSlug: string;
  productName: string;
  version: string;
  platform: ReleasePlatform;
  architecture: ReleaseArchitecture;
  channel: ReleaseChannel;
  publishedAt: Date;
  releaseNotes: string | null;
}

export interface PrepareReleaseUploadInput {
  productId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  actorUserId: string;
}

export interface CompleteReleaseUploadInput extends CreateReleaseDraftInput {
  expectedSizeBytes: number;
}
