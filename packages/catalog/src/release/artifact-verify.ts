import { createHash } from "node:crypto";
import type { ObjectStorage } from "@khepree/storage";
import { CatalogError } from "../product/admin";

/** SHA-256 hex digest of bytes — not S3 ETag (multipart ETag is not SHA-256). */
export function sha256HexOfBytes(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export async function verifyStoredObjectSha256(input: {
  storage: ObjectStorage;
  objectKey: string;
  expectedSha256: string;
  expectedSizeBytes: number;
}): Promise<void> {
  const head = await input.storage.headObject(input.objectKey, "private");
  if (!head?.contentLength) {
    throw new CatalogError("INVALID_INPUT", "Artifact chưa tồn tại trong storage");
  }
  if (head.contentLength !== input.expectedSizeBytes) {
    throw new CatalogError(
      "INVALID_INPUT",
      `Kích thước storage (${head.contentLength}) không khớp khai báo (${input.expectedSizeBytes})`,
    );
  }

  const bytes = await input.storage.getObject(input.objectKey, "private");
  if (!bytes) {
    throw new CatalogError("INVALID_INPUT", "Không đọc được artifact từ storage");
  }
  if (bytes.length !== input.expectedSizeBytes) {
    throw new CatalogError("INVALID_INPUT", "Kích thước bytes đọc được không khớp");
  }

  const actual = sha256HexOfBytes(bytes);
  const expected = input.expectedSha256.trim().toLowerCase();
  if (actual !== expected) {
    throw new CatalogError("INVALID_INPUT", "SHA-256 storage không khớp manifest/artifact");
  }
}
