import { createPublicKey, verify } from "node:crypto";
import { DESKTOP_DEVICE_PROOF_TOLERANCE_SECONDS } from "@khepree/config";
import { DesktopAuthError } from "./errors";

export interface DeviceProofInput {
  timestamp: number;
  nonce: string;
  signature: string;
  method: string;
  path: string;
  bodySha256: string;
}

export function buildDeviceProofMessage(input: {
  sessionPublicId: string;
  timestamp: number;
  nonce: string;
  method: string;
  path: string;
  bodySha256: string;
}): string {
  return [
    "KHEPREE-DESKTOP-V1",
    input.sessionPublicId,
    String(input.timestamp),
    input.nonce,
    input.method.toUpperCase(),
    input.path,
    input.bodySha256,
  ].join("\n");
}

export function assertDeviceProofTimestamp(
  timestamp: number,
  nowSeconds: number,
  toleranceSeconds = DESKTOP_DEVICE_PROOF_TOLERANCE_SECONDS,
): void {
  if (!Number.isFinite(timestamp)) {
    throw new DesktopAuthError("DEVICE_PROOF_INVALID", "Device proof timestamp is invalid");
  }
  const delta = Math.abs(nowSeconds - timestamp);
  if (delta > toleranceSeconds) {
    throw new DesktopAuthError("DEVICE_PROOF_INVALID", "Device proof timestamp is outside the allowed window");
  }
}

export function verifyDeviceProofSignature(input: {
  devicePublicKey: string;
  sessionPublicId: string;
  proof: DeviceProofInput;
  nowSeconds?: number;
  toleranceSeconds?: number;
}): void {
  const nowSeconds = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  assertDeviceProofTimestamp(input.proof.timestamp, nowSeconds, input.toleranceSeconds);

  if (!input.proof.nonce.trim()) {
    throw new DesktopAuthError("DEVICE_PROOF_INVALID", "Device proof nonce is required");
  }
  if (!input.proof.signature.trim()) {
    throw new DesktopAuthError("DEVICE_PROOF_INVALID", "Device proof signature is required");
  }

  const message = buildDeviceProofMessage({
    sessionPublicId: input.sessionPublicId,
    timestamp: input.proof.timestamp,
    nonce: input.proof.nonce,
    method: input.proof.method,
    path: input.proof.path,
    bodySha256: input.proof.bodySha256,
  });

  let publicKey;
  try {
    publicKey = parseDevicePublicKey(input.devicePublicKey);
  } catch {
    throw new DesktopAuthError("DEVICE_PROOF_INVALID", "Device public key is invalid");
  }

  const ok = verify(
    null,
    Buffer.from(message, "utf8"),
    publicKey,
    Buffer.from(input.proof.signature, "base64"),
  );
  if (!ok) {
    throw new DesktopAuthError("DEVICE_PROOF_INVALID", "Device proof signature is invalid");
  }
}

function parseDevicePublicKey(value: string) {
  const trimmed = value.trim();
  if (trimmed.includes("BEGIN")) {
    return createPublicKey(trimmed);
  }
  return createPublicKey({
    key: Buffer.from(trimmed, "base64"),
    format: "der",
    type: "spki",
  });
}
