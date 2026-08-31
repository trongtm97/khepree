import type { DeviceProofInput } from "./device-proof";

export type DesktopMachineState =
  | "ACTIVE"
  | "ENTITLEMENT_MISSING"
  | "ENTITLEMENT_SUSPENDED"
  | "ENTITLEMENT_EXPIRED"
  | "DEVICE_REMOVED"
  | "DEVICE_BLOCKED"
  | "SESSION_REVOKED";

export interface DesktopRefreshInput {
  sessionPublicId: string;
  refreshToken: string;
  deviceProof: DeviceProofInput;
  proofPath: string;
  proofMethod: string;
  bodySha256: string;
}

export interface DesktopRefreshResult {
  sessionPublicId: string;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  refreshExpiresAt: string;
}

export interface DesktopHeartbeatInput {
  sessionPublicId: string;
  accessToken: string;
  deviceProof: DeviceProofInput;
  proofPath: string;
  proofMethod: string;
  bodySha256: string;
}

export interface DesktopHeartbeatResult {
  sessionPublicId: string;
  state: DesktopMachineState;
  lastSeenAt: string;
}

export interface DesktopLogoutInput {
  accessToken: string;
}
