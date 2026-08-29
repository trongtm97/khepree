const PROTECTED_PREFIXES = [
  "/dashboard",
  "/profile",
  "/security",
  "/sessions",
  "/products",
  "/licenses",
  "/devices",
  "/billing",
  "/downloads",
  "/checkout",
] as const;

const DEFAULT_RETURN_PATH = "/dashboard";

/** Reject open redirects — relative app paths only. */
export function safeReturnPath(raw: string | null | undefined, fallback = DEFAULT_RETURN_PATH): string {
  if (!raw) return fallback;

  const value = raw.trim();
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("://") || value.includes("\\")) return fallback;

  const pathOnly = value.split(/[?#]/)[0] ?? value;
  const allowed = PROTECTED_PREFIXES.some(
    (prefix) => pathOnly === prefix || pathOnly.startsWith(`${prefix}/`),
  );

  return allowed ? value : fallback;
}
