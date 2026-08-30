/** Safe public-site redirect paths. Reject protocol URLs and protocol-relative hosts. */
export function isSafeRedirectPath(path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return false;
  if (trimmed.includes("://") || trimmed.includes("\\")) return false;
  if (/\s/.test(trimmed)) return false;
  return trimmed.length <= 512;
}

export function normalizeRedirectPath(path: string): string {
  const trimmed = path.trim();
  if (trimmed.length > 1 && trimmed.endsWith("/")) return trimmed.slice(0, -1);
  return trimmed;
}
