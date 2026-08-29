import { randomBytes } from "node:crypto";

const PREFIX_PATTERN = /^[a-z]{2,12}$/;

/** Durable, non-sequential, URL-safe public identifier. */
export function createPublicId(prefix: string): string {
  if (!PREFIX_PATTERN.test(prefix)) {
    throw new Error(`Invalid public id prefix: ${prefix}`);
  }
  return `${prefix}_${randomBytes(12).toString("base64url")}`;
}

export function isPublicId(value: string, prefix?: string): boolean {
  const pattern = prefix
    ? new RegExp(`^${prefix}_[A-Za-z0-9_-]{12,24}$`)
    : /^[a-z]{2,12}_[A-Za-z0-9_-]{12,24}$/;
  return pattern.test(value);
}
