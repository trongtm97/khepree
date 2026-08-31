/** Custom-scheme URI registered on the desktop client — never http(s) open redirects. */
const CUSTOM_SCHEME_URI = /^[a-z][a-z0-9+.-]*:\/\//i;

export function isAllowlistedCustomSchemeUri(uri: string): boolean {
  const trimmed = uri.trim();
  if (!trimmed || trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return false;
  }
  return CUSTOM_SCHEME_URI.test(trimmed);
}

/** First allowlisted custom-scheme redirect URI suitable for “return to app”. */
export function pickDesktopAppReturnUri(allowedRedirectUris: string[]): string | null {
  return allowedRedirectUris.find(isAllowlistedCustomSchemeUri) ?? null;
}
