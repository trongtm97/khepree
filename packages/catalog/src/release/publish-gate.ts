import type { KeyObject } from "node:crypto";
import type { ObjectStorage } from "@khepree/storage";
import { CatalogError } from "../product/admin";
import { verifyStoredObjectSha256 } from "./artifact-verify";
import { assertPublishableReleaseNotes } from "./release-notes-policy";
import type { ArtifactVerificationResult, ReleaseArtifactRecord, ReleasePublishReadiness } from "./types";
import {
  buildUpdateArtifactManifest,
  verifyUpdateArtifactManifestSignature,
  type UpdateArtifactManifest,
} from "./update-signing";
import { assertPublishableArtifacts } from "./artifact-policy";
import { parseReleaseVersion } from "./version";

export async function verifyReleaseArtifact(input: {
  release: {
    productId: string;
    publicId: string;
    version: string;
    channel: string;
    platform: UpdateArtifactManifest["platform"];
    architecture: UpdateArtifactManifest["architecture"];
  };
  artifact: ReleaseArtifactRecord;
  mediaObjectKey: string;
  storage: ObjectStorage;
  trustedPublicKeys: Map<string, KeyObject>;
  verifyStorageBytes?: boolean;
}): Promise<ArtifactVerificationResult> {
  const base = {
    artifactPublicId: input.artifact.publicId,
    kind: input.artifact.kind,
    fileName: input.artifact.fileName,
  };

  if (!input.artifact.signature?.trim() || !input.artifact.signingKeyId?.trim()) {
    return { ...base, state: "missing_signature", detail: "Thiếu chữ ký CI manifest" };
  }

  const manifest = buildUpdateArtifactManifest({
    productId: input.release.productId,
    releasePublicId: input.release.publicId,
    version: input.release.version,
    channel: input.release.channel as UpdateArtifactManifest["channel"],
    platform: input.release.platform,
    architecture: input.release.architecture,
    artifactKind: input.artifact.kind,
    fileName: input.artifact.fileName,
    sizeBytes: input.artifact.sizeBytes,
    sha256: input.artifact.sha256,
  });

  try {
    verifyUpdateArtifactManifestSignature({
      manifest,
      signatureBase64: input.artifact.signature,
      keyId: input.artifact.signingKeyId,
      trustedPublicKeys: input.trustedPublicKeys,
    });
  } catch (error) {
    const message = error instanceof CatalogError ? error.message : "Chữ ký không hợp lệ";
    const state = message.includes("keyId") ? "untrusted_key" : "storage_mismatch";
    return { ...base, state, detail: message };
  }

  if (input.verifyStorageBytes !== false) {
    try {
      await verifyStoredObjectSha256({
        storage: input.storage,
        objectKey: input.mediaObjectKey,
        expectedSha256: input.artifact.sha256,
        expectedSizeBytes: input.artifact.sizeBytes,
      });
    } catch (error) {
      const message = error instanceof CatalogError ? error.message : "Storage verify failed";
      return { ...base, state: "storage_mismatch", detail: message };
    }
  }

  return { ...base, state: "verified" };
}

export async function assessReleasePublishReadiness(input: {
  release: {
    id: string;
    productId: string;
    publicId: string;
    version: string;
    platform: UpdateArtifactManifest["platform"];
    architecture: UpdateArtifactManifest["architecture"];
    channel: string;
    status: string;
  };
  artifacts: ReleaseArtifactRecord[];
  notes: Array<{ locale: string; releaseNotes: string | null }>;
  mediaById: Map<string, { objectKey: string }>;
  storage: ObjectStorage;
  trustedPublicKeys: Map<string, KeyObject>;
}): Promise<ReleasePublishReadiness> {
  const blockers: string[] = [];

  if (input.release.status !== "draft") {
    blockers.push("Release không ở trạng thái draft");
  }
  if (!parseReleaseVersion(input.release.version)) {
    blockers.push("Version SemVer không hợp lệ");
  }
  try {
    assertPublishableArtifacts(
      input.release.platform,
      input.artifacts.map((artifact) => artifact.kind),
    );
  } catch (error) {
    blockers.push(error instanceof Error ? error.message : "Thiếu artifact bắt buộc");
  }
  try {
    assertPublishableReleaseNotes(input.notes);
  } catch (error) {
    blockers.push(error instanceof Error ? error.message : "Thiếu ghi chú phát hành");
  }
  if (input.trustedPublicKeys.size === 0) {
    blockers.push("UPDATE_SIGNING_PUBLIC_KEY chưa cấu hình");
  }

  const artifacts: ArtifactVerificationResult[] = [];
  for (const artifact of input.artifacts) {
    const media = input.mediaById.get(artifact.mediaAssetId);
    if (!media) {
      artifacts.push({
        artifactPublicId: artifact.publicId,
        kind: artifact.kind,
        fileName: artifact.fileName,
        state: "storage_mismatch",
        detail: "Media artifact không tồn tại",
      });
      blockers.push(`Artifact ${artifact.kind}: media không tồn tại`);
      continue;
    }
    const result = await verifyReleaseArtifact({
      release: input.release,
      artifact,
      mediaObjectKey: media.objectKey,
      storage: input.storage,
      trustedPublicKeys: input.trustedPublicKeys,
    });
    artifacts.push(result);
    if (result.state !== "verified") {
      blockers.push(`${artifact.kind}: ${result.detail ?? result.state}`);
    }
  }

  return { ready: blockers.length === 0, artifacts, blockers };
}
