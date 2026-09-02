import type {
  ReleaseArchitecture,
  ReleaseArtifactKind,
  ReleaseChannel,
  ReleasePlatform,
  ReleaseStatus,
} from "@khepree/db";

export interface ReleaseArtifactRecord {
  id: string;
  publicId: string;
  releaseId: string;
  kind: ReleaseArtifactKind;
  mediaAssetId: string;
  mediaPublicId: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  sha256: string;
  signature: string | null;
  signingKeyId: string | null;
  createdAt: Date;
}

export interface ReleaseRecord {
  id: string;
  publicId: string;
  productId: string;
  version: string;
  platform: ReleasePlatform;
  architecture: ReleaseArchitecture;
  channel: ReleaseChannel;
  /** @deprecated Legacy primary file — prefer artifacts[]; retained for backward compatibility. */
  mediaAssetId: string;
  /** @deprecated Legacy primary file — prefer artifacts[]; retained for backward compatibility. */
  mediaPublicId: string;
  /** @deprecated Legacy primary file — prefer artifacts[]; retained for backward compatibility. */
  fileName: string;
  /** @deprecated Legacy primary file — prefer artifacts[]; retained for backward compatibility. */
  fileSize: number;
  /** @deprecated Legacy primary file — prefer artifacts[]; retained for backward compatibility. */
  checksumSha256: string;
  /** @deprecated Legacy primary file — prefer artifacts[]; retained for backward compatibility. */
  signature: string | null;
  artifacts: ReleaseArtifactRecord[];
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
  signingKeyId?: string | null;
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

export interface AddReleaseArtifactInput {
  releaseId: string;
  kind: ReleaseArtifactKind;
  fileName: string;
  fileSize: number;
  checksumSha256: string;
  objectKey: string;
  mimeType: string;
  signature?: string | null;
  signingKeyId?: string | null;
  actorUserId?: string | null;
}

export type ArtifactVerificationState =
  | "verified"
  | "missing_signature"
  | "untrusted_key"
  | "storage_mismatch";

export interface ArtifactVerificationResult {
  artifactPublicId: string;
  kind: ReleaseArtifactKind;
  fileName: string;
  state: ArtifactVerificationState;
  detail?: string;
}

export interface ReleasePublishReadiness {
  ready: boolean;
  artifacts: ArtifactVerificationResult[];
  blockers: string[];
}