import { randomBytes } from "node:crypto";
import { assertSafeObjectKey } from "./object-key";

const SAFE_NAMESPACE = /^[a-z0-9][a-z0-9-]{0,31}$/;
const SAFE_EXTENSION = /^[a-z0-9]{1,12}$/;
const SAFE_PATH_SEGMENT = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** Canonical public namespaces (always stored under pub/). */
export const PUBLIC_OBJECT_PREFIXES = [
  "pub/brand",
  "pub/products",
  "pub/blog",
  "pub/content",
  "pub/media",
] as const;

/** Canonical private namespaces (always stored under prv/). */
export const PRIVATE_OBJECT_PREFIXES = [
  "prv/content",
  "prv/releases",
  "prv/installers",
  "prv/downloads",
  "prv/private-media",
] as const;

export interface ObjectKeyInput {
  /** Fallback segment when pathPrefix is unset — e.g. media, releases. */
  namespace: string;
  /** Relative path under pub/ or prv/, e.g. products/my-slug/screenshots. */
  pathPrefix?: string;
  extension: string;
  visibility: "public" | "private";
  ownerId?: string;
}

function normalizePathPrefix(pathPrefix: string): string {
  const trimmed = pathPrefix.replace(/^\/+|\/+$/g, "").replace(/\/+/g, "/");
  for (const segment of trimmed.split("/")) {
    if (!segment || !SAFE_PATH_SEGMENT.test(segment)) {
      throw new Error(`Invalid storage path segment: ${segment || pathPrefix}`);
    }
  }
  assertSafeObjectKey(trimmed);
  return trimmed;
}

export function objectKeyOwnerSegment(ownerId: string): string {
  const compact = ownerId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase().slice(0, 32);
  if (compact.length < 8 || !SAFE_NAMESPACE.test(compact)) {
    throw new Error("Invalid owner id for storage key");
  }
  return compact;
}

export function objectKeyIncludesOwner(objectKey: string, ownerId: string): boolean {
  return objectKey.includes(`/${objectKeyOwnerSegment(ownerId)}/`);
}

/** Generate a non-guessable, URL-safe object key under pub/ or prv/. */
export function createObjectKey(input: ObjectKeyInput): string {
  if (!SAFE_NAMESPACE.test(input.namespace)) {
    throw new Error(`Invalid storage namespace: ${input.namespace}`);
  }
  if (!SAFE_EXTENSION.test(input.extension)) {
    throw new Error(`Invalid storage extension: ${input.extension}`);
  }

  const id = randomBytes(16).toString("hex");
  const root = input.visibility === "public" ? "pub" : "prv";

  if (input.pathPrefix) {
    const canonical = normalizePathPrefix(input.pathPrefix);
    const ownerSegment = input.ownerId ? `${objectKeyOwnerSegment(input.ownerId)}/` : "";
    const key = `${root}/${canonical}/${ownerSegment}${id}.${input.extension}`;
    assertSafeObjectKey(key);
    return key;
  }

  if (input.ownerId) {
    const owner = objectKeyOwnerSegment(input.ownerId);
    const key = `${root}/${input.namespace}/${owner}/${id}.${input.extension}`;
    assertSafeObjectKey(key);
    return key;
  }

  const key = `${root}/${input.namespace}/${id}.${input.extension}`;
  assertSafeObjectKey(key);
  return key;
}

/** Strip path segments and unsafe characters from a client filename (never used as key). */
export function sanitizeClientFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  return base.replace(/[^\w.-]/g, "_").slice(0, 120);
}
