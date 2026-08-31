export { createAuth, getAuth, type Auth } from "./server";
export { createKhepreeAuthClient, type KhepreeAuthClient } from "./client";
export {
  getSession,
  requireSession,
  requireUser,
  requirePermission,
  getOptionalSession,
  listActiveSessions,
  revokeSessionById,
  revokeOtherActiveSessions,
  type SessionUser,
  type AuthenticatedSession,
  type SessionRow,
} from "./session";
export {
  assertRecentAuth,
  hasRecentAuth,
  touchSessionForStepUp,
  recentAuthRedirectTarget,
  AuthError,
  isAuthError,
} from "./recent-auth";
export { recordAuthAudit, type AuthAuditAction } from "./audit";
export { getAuthBaseUrl } from "./email";
export { safeAccountNextPath, safeAccountNextPath as safeReturnPath } from "./safe-account-next-path";
export { isGoogleAuthConfigured } from "./google";
export {
  LEGAL_DOCUMENT_VERSION,
  hasRequiredLegalConsent,
  recordLegalConsents,
} from "./legal-consent";
export { ensureUserProfile, ensureUserProfileById, getUserOrgMemberships, setUserPreferredLocale } from "./profile";
export {
  IdentityDirectory,
  IdentityError,
  createIdentityDirectory,
  isIdentityError,
} from "./directory";
