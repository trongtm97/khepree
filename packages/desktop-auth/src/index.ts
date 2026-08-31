export { DesktopAuthError, isDesktopAuthError } from "./errors";
export { buildDeviceProofMessage, verifyDeviceProofSignature } from "./device-proof";
export type { DeviceProofInput } from "./device-proof";
export { MemoryNonceStore, RedisNonceStore } from "./nonce-store";
export type { NonceStore, NonceRedisCommands } from "./nonce-store";
export type {
  DesktopHeartbeatInput,
  DesktopHeartbeatResult,
  DesktopLogoutInput,
  DesktopMachineState,
  DesktopRefreshInput,
  DesktopRefreshResult,
} from "./session-types";
export {
  heartbeatDesktopSession,
  logoutDesktopSession,
  refreshDesktopSession,
} from "./session-flow";
export type { SessionFlowDeps } from "./session-flow";
export { generateSecureToken, hashSecret, secretsEqual } from "./hash";
export { createPkceChallenge, verifyPkceS256 } from "./pkce";
export {
  buildDesktopAuthorizePath,
  buildDesktopCallbackUrl,
  parseDesktopAuthorizeSearchParams,
} from "./authorize-params";
export { isAllowlistedCustomSchemeUri, pickDesktopAppReturnUri } from "./return-uri";
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
