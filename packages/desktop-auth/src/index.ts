export { DesktopAuthError, isDesktopAuthError } from "./errors";
export { generateSecureToken, hashSecret, secretsEqual } from "./hash";
export { createPkceChallenge, verifyPkceS256 } from "./pkce";
export {
  createDrizzleDesktopAuthRepository,
  DrizzleDesktopAuthRepository,
} from "./drizzle-store";
export { createDesktopAuthService, DesktopAuthService } from "./service";
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
export type {
  ConsumeAuthCodeContext,
  DesktopAuthServiceOptions,
  IssueAuthCodeInput,
} from "./service";
