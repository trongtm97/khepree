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

/** Canonical post-auth redirect for account — internal paths only. */
export function safeAccountNextPath(
  raw: string | null | undefined,
  fallback = DEFAULT_RETURN_PATH,
): string {
  if (!raw) return fallback;

  const value = raw.trim();
  const lower = value.toLowerCase();

  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  if (value.includes("://") || value.includes("\\")) return fallback;
  if (lower.startsWith("javascript:") || lower.startsWith("data:") || lower.startsWith("vbscript:")) {
    return fallback;
  }

  const pathOnly = value.split(/[?#]/)[0] ?? value;
  if (!pathOnly || pathOnly === "/") return fallback;

  const allowed = PROTECTED_PREFIXES.some(
    (prefix) => pathOnly === prefix || pathOnly.startsWith(`${prefix}/`),
  );

  return allowed ? value : fallback;
}
