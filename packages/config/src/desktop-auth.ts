/** Desktop OAuth + session TTL defaults — override via env in later phases if needed. */

/** Authorization code lifetime (default 5 minutes). */
export const DESKTOP_AUTH_CODE_TTL_SECONDS = 300;

/** Desktop access token lifetime (default 15 minutes). */
export const DESKTOP_ACCESS_TOKEN_TTL_SECONDS = 900;

/** Desktop refresh credential lifetime (default 30 days). */
export const DESKTOP_REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Device proof timestamp tolerance for refresh/heartbeat (default ±120 seconds). */
export const DESKTOP_DEVICE_PROOF_TOLERANCE_SECONDS = 120;

/** Recent web session age required before sensitive account actions (default 15 minutes). */
export const SENSITIVE_ACTION_MAX_AGE_SECONDS = 900;

/** Default self-service device transfer quota when feature is absent. */
export const DEFAULT_DEVICE_TRANSFER_LIMIT = 5;

/** Default rolling window for device transfer quota (days). */
export const DEFAULT_DEVICE_TRANSFER_WINDOW_DAYS = 30;

export const DESKTOP_PKCE_METHOD = "S256" as const;
