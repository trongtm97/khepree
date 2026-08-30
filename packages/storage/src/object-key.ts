const UNSAFE_KEY = /(?:^|[/\\])\.\.(?:[/\\]|$)|\\|\0|^\/|^\.\./;

/** Reject traversal and absolute paths in server-generated or client-supplied keys at trust boundaries. */
export function assertSafeObjectKey(objectKey: string): void {
  const key = objectKey.trim();
  if (!key) throw new Error("objectKey is required");
  if (UNSAFE_KEY.test(key)) {
    throw new Error("objectKey contains unsafe path segments");
  }
  if (/^https?:\/\//i.test(key)) {
    throw new Error("objectKey must be a storage key, not a URL");
  }
}
