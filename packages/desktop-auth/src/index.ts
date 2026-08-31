export { DesktopAuthError, isDesktopAuthError } from "./errors";
export { generateSecureToken, hashSecret, secretsEqual } from "./hash";
export { createPkceChallenge, verifyPkceS256 } from "./pkce";
export {
  buildDesktopAuthorizePath,
  buildDesktopCallbackUrl,
  parseDesktopAuthorizeSearchParams,
} from "./authorize-params";
export type { DesktopAuthorizeParams } from "./authorize-params";
export {
  createDrizzleDesktopAuthRepository,
  DrizzleDesktopAuthRepository,
} from "./drizzle-store";
export {
  createDesktopAuthService,
  DesktopAuthService,
} from "./service";
export type {
  ConsumeAuthCodeContext,
  CreateDesktopAuthServiceOverrides,
  DesktopAuthServiceOptions,
  IssueAuthCodeInput,
} from "./service";
export type {
  DesktopEntitlementAccess,
  DesktopExchangeInput,
  DesktopExchangeResult,
} from "./exchange-types";
export type {
  ConsumeAuthCodeInput,
  CreateAuthCodeInput,
  CreateAuthCodeResult,
  CreateSessionInput,
  CreateSessionResult,
  DesktopAuthCodeRecord,
  DesktopAuthRepository,
  DesktopClientRecord,
  DesktopSessionRecord,
} from "./types";
