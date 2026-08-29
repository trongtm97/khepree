import { randomBytes } from "node:crypto";

const SAFE_NAMESPACE = /^[a-z0-9][a-z0-9-]{0,31}$/;
const SAFE_EXTENSION = /^[a-z0-9]{1,12}$/;

export interface ObjectKeyInput {
  /** e.g. marketing, blog, content, releases */
  namespace: string;
  /** Derived from validated MIME — never from client filename. */
  extension: string;
  visibility: "public" | "private";
  /** When set, the key includes this owner segment so complete cannot claim another actor's object. */
  ownerId?: string;
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

/** Generate a non-guessable, URL-safe object key. */
export function createObjectKey(input: ObjectKeyInput): string {
  if (!SAFE_NAMESPACE.test(input.namespace)) {
    throw new Error(`Invalid storage namespace: ${input.namespace}`);
  }
  if (!SAFE_EXTENSION.test(input.extension)) {
    throw new Error(`Invalid storage extension: ${input.extension}`);
  }

  const id = randomBytes(16).toString("hex");
  const prefix = input.visibility === "public" ? "pub" : "prv";
  if (input.ownerId) {
    const owner = objectKeyOwnerSegment(input.ownerId);
    return `${prefix}/${input.namespace}/${owner}/${id}.${input.extension}`;
  }
  return `${prefix}/${input.namespace}/${id}.${input.extension}`;
}

/** Strip path segments and unsafe characters from a client filename (never used as key). */
export function sanitizeClientFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  return base.replace(/[^\w.-]/g, "_").slice(0, 120);
}
