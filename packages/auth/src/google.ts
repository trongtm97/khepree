/** True when Google OAuth credentials are present (identity scopes only — no Gmail/Drive). */
export function isGoogleAuthConfigured(
  source: Record<string, string | undefined> = process.env,
): boolean {
  const clientId = source.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = source.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return false;
  if (clientId.includes("CHANGE_ME") || clientSecret.includes("CHANGE_ME")) return false;
  return true;
}
