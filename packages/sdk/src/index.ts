/** @khepree/sdk — client SDK for desktop/mobile activation (foundation stub) */
export const SDK_VERSION = "0.1.0";

export interface ActivationRequest {
  licenseKey: string;
  deviceFingerprint: string;
  platform: string;
}

export interface ActivationResponse {
  leaseToken: string;
  expiresAt: string;
  publicKey: string;
}
