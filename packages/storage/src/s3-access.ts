import { getEnv } from "@khepree/config";

export type S3PublicAccessMode = "acl" | "none";

export const PUBLIC_OBJECT_ACL = "public-read" as const;
export const PUBLIC_OBJECT_ACL_HEADER = "x-amz-acl" as const;
export const PUBLIC_CACHE_CONTROL = "public, max-age=31536000, immutable" as const;

export function resolvePublicAccessMode(source = getEnv()): S3PublicAccessMode {
  const mode = source.S3_PUBLIC_ACCESS_MODE ?? "acl";
  return mode === "none" ? "none" : "acl";
}

export function publicAclPutFields(mode: S3PublicAccessMode): {
  ACL?: typeof PUBLIC_OBJECT_ACL;
  CacheControl?: string;
} {
  if (mode !== "acl") return {};
  return {
    ACL: PUBLIC_OBJECT_ACL,
    CacheControl: PUBLIC_CACHE_CONTROL,
  };
}

export function publicAclUploadHeaders(mode: S3PublicAccessMode): Record<string, string> {
  if (mode !== "acl") return {};
  return { [PUBLIC_OBJECT_ACL_HEADER]: PUBLIC_OBJECT_ACL };
}

export function isPublicAclUnsupported(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as { name?: string; Code?: string; message?: string };
  const code = record.name ?? record.Code ?? "";
  if (code === "AccessControlListNotSupported" || code === "InvalidRequest" || code === "AccessDenied") {
    return true;
  }
  const message = String(record.message ?? "");
  return /AccessControlListNotSupported|acl.*not supported|does not allow ACLs/i.test(message);
}

export const PUBLIC_ACL_UNSUPPORTED_MESSAGE =
  "Public object ACL is not supported by this S3 provider. Configure bucket-level public-read policy or an authenticated CDN origin strategy (see docs/OBJECT-STORAGE.md).";
