import type { StorageBucket } from "./types";

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

/** Max upload sizes by bucket (bytes). */
export const UPLOAD_SIZE_LIMITS: Record<StorageBucket, number> = {
  public: 10 * 1024 * 1024, // 10 MB — images, marketing assets
  private: 512 * 1024 * 1024, // 512 MB — installers, release files
};

const PUBLIC_MIME_PREFIXES = ["image/", "video/"] as const;
const PUBLIC_MIME_EXACT = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
]);

/** SVG uploads are disallowed on public bucket — executable when served same-origin. */
const BLOCKED_PUBLIC_MIMES = new Set(["image/svg+xml"]);

const PRIVATE_MIME_PREFIXES = [
  "application/",
  "image/",
  "text/",
  "video/",
  "audio/",
] as const;

/** Map validated MIME type to a safe file extension for object keys. */
export function extensionForMime(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "video/mp4": "mp4",
    "application/pdf": "pdf",
    "text/plain": "txt",
    "text/markdown": "md",
    "application/octet-stream": "bin",
    "application/zip": "zip",
    "application/x-msdownload": "exe",
    "application/vnd.apple.installer+xml": "pkg",
  };

  if (map[mimeType]) return map[mimeType]!;

  const sub = mimeType.split("/")[1]?.split("+")[0]?.replace(/[^a-z0-9]/g, "");
  if (sub && sub.length <= 12) return sub;

  return "bin";
}

function isAllowedPublicMime(mimeType: string): boolean {
  if (BLOCKED_PUBLIC_MIMES.has(mimeType)) return false;
  if (PUBLIC_MIME_EXACT.has(mimeType)) return true;
  return PUBLIC_MIME_PREFIXES.some((p) => mimeType.startsWith(p));
}

function isAllowedPrivateMime(mimeType: string): boolean {
  return PRIVATE_MIME_PREFIXES.some((p) => mimeType.startsWith(p));
}

export function validateUpload(input: {
  mimeType: string;
  sizeBytes: number;
  bucket: StorageBucket;
}): void {
  if (!input.mimeType || !input.mimeType.includes("/")) {
    throw new UploadValidationError("Invalid MIME type");
  }

  const max = UPLOAD_SIZE_LIMITS[input.bucket];
  if (input.sizeBytes <= 0 || input.sizeBytes > max) {
    throw new UploadValidationError(
      `File size must be between 1 byte and ${max} bytes for ${input.bucket} uploads`,
    );
  }

  const allowed =
    input.bucket === "public" ? isAllowedPublicMime(input.mimeType) : isAllowedPrivateMime(input.mimeType);

  if (!allowed) {
    throw new UploadValidationError(`MIME type not allowed for ${input.bucket} bucket: ${input.mimeType}`);
  }
}
