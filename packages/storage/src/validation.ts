import type { StorageBucket } from "./types";

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

/** Max upload sizes by bucket (bytes). Private is for installers — no 2GB metadata cap. */
export const UPLOAD_SIZE_LIMITS: Record<StorageBucket, number> = {
  public: 10 * 1024 * 1024, // 10 MB — marketing raster
  private: 512 * 1024 * 1024, // 512 MB — installers, release files
};

export type UploadContentClass =
  | "marketing_raster"
  | "svg_admin"
  | "software_release"
  | "document";

const RASTER_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const DOCUMENT_MIMES = new Set(["application/pdf", "text/plain", "text/markdown"]);
const SOFTWARE_MIMES = new Set([
  "application/octet-stream",
  "application/zip",
  "application/x-msdownload",
  "application/vnd.apple.installer+xml",
  "application/x-apple-diskimage",
  "application/x-msi",
  "application/x-debian-package",
]);

const MAGIC: Array<{ mime: string; bytes: number[]; offset?: number }> = [
  { mime: "image/jpeg", bytes: [0xff, 0xd8, 0xff] },
  { mime: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38] },
  { mime: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46], offset: 0 },
  { mime: "application/pdf", bytes: [0x25, 0x50, 0x44, 0x46] },
  { mime: "application/zip", bytes: [0x50, 0x4b, 0x03, 0x04] },
];

/** Map validated MIME type to a safe file extension for object keys. */
export function extensionForMime(mimeType: string): string {
  const map: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
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

export function sniffMagicMime(bytes: Uint8Array): string | null {
  for (const row of MAGIC) {
    const offset = row.offset ?? 0;
    if (bytes.length < offset + row.bytes.length) continue;
    if (row.bytes.every((value, i) => bytes[offset + i] === value)) {
      if (row.mime === "image/webp" && bytes.length >= 12) {
        const tag = String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!);
        if (tag !== "WEBP") continue;
      }
      return row.mime;
    }
  }
  return null;
}

function inferContentClass(mimeType: string, bucket: StorageBucket): UploadContentClass {
  if (RASTER_MIMES.has(mimeType)) return "marketing_raster";
  if (DOCUMENT_MIMES.has(mimeType)) return "document";
  if (mimeType === "image/svg+xml") return "svg_admin";
  if (bucket === "public") return "marketing_raster";
  return "software_release";
}

function allowedMimes(contentClass: UploadContentClass): Set<string> | "svg" {
  switch (contentClass) {
    case "marketing_raster":
      return RASTER_MIMES;
    case "document":
      return DOCUMENT_MIMES;
    case "software_release":
      return SOFTWARE_MIMES;
    case "svg_admin":
      return "svg";
  }
}

export function validateUpload(input: {
  mimeType: string;
  sizeBytes: number;
  bucket: StorageBucket;
  contentClass?: UploadContentClass;
  checksumSha256?: string | null;
  bytes?: Uint8Array;
  requireChecksum?: boolean;
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

  const contentClass = input.contentClass ?? inferContentClass(input.mimeType, input.bucket);
  if (contentClass === "svg_admin") {
    if (input.bucket === "public") {
      throw new UploadValidationError("SVG is not allowed on the public bucket");
    }
    if (input.mimeType !== "image/svg+xml") {
      throw new UploadValidationError("svg_admin requires image/svg+xml");
    }
  } else {
    const allowed = allowedMimes(contentClass);
    if (allowed !== "svg" && !allowed.has(input.mimeType)) {
      throw new UploadValidationError(
        `MIME type not allowed for ${contentClass}: ${input.mimeType}`,
      );
    }
  }

  if (contentClass === "software_release") {
    if (input.bucket !== "private") {
      throw new UploadValidationError("Software releases must use the private bucket");
    }
    if (input.requireChecksum && !input.checksumSha256) {
      throw new UploadValidationError("Software releases require a SHA-256 checksum");
    }
  }

  if (input.bytes && input.bytes.length > 0) {
    const sniffed = sniffMagicMime(input.bytes);
    if (sniffed && sniffed !== input.mimeType) {
      throw new UploadValidationError(
        `Declared MIME ${input.mimeType} does not match file contents (${sniffed})`,
      );
    }
  }
}
