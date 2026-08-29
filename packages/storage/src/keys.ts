import { randomBytes } from "node:crypto";

const SAFE_NAMESPACE = /^[a-z0-9][a-z0-9-]{0,31}$/;
const SAFE_EXTENSION = /^[a-z0-9]{1,12}$/;

export interface ObjectKeyInput {
  /** e.g. marketing, blog, content, releases */
  namespace: string;
  /** Derived from validated MIME — never from client filename. */
  extension: string;
  visibility: "public" | "private";
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
  return `${prefix}/${input.namespace}/${id}.${input.extension}`;
}

/** Strip path segments and unsafe characters from a client filename (never used as key). */
export function sanitizeClientFilename(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "file";
  return base.replace(/[^\w.-]/g, "_").slice(0, 120);
}
