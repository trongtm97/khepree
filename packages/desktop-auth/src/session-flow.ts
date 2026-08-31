import { verifyDeviceProofSignature } from "./device-proof";
import { generateSecureToken, hashSecret } from "./hash";
import type { NonceStore } from "./nonce-store";
import type {
  DesktopHeartbeatInput,
  DesktopHeartbeatResult,
  DesktopLogoutInput,
  DesktopMachineState,
  DesktopRefreshInput,
  DesktopRefreshResult,
} from "./session-types";
import type {
  DesktopAuthRepository,
  DesktopClientRecord,
  DesktopSessionRecord,
} from "./types";
import type { DesktopEntitlementAccess } from "./exchange-types";
import type { EntitlementService, PrincipalRef } from "@khepree/entitlement";

const NONCE_TTL_SECONDS = 300;

type EntitlementReader = Pick<
  EntitlementService,
  "resolveEntitlementsForPrincipal" | "canUseProduct"
>;

export interface SessionFlowDeps {
  store: DesktopAuthRepository;
  entitlement?: EntitlementReader;
  nonceStore: NonceStore;
  now: () => Date;
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  deviceProofToleranceSeconds: number;
  audit?: {
    record(input: {
      actorUserId?: string | null;
      action: string;
      resourceType: string;
      resourceId: string;
      metadata?: Record<string, unknown> | null;
      ipAddress?: string | null;
    }): Promise<void>;
  };
}

export async function refreshDesktopSession(
  deps: SessionFlowDeps,
  input: DesktopRefreshInput,
  auditMeta?: { ipAddress?: string | null },
): Promise<DesktopRefreshResult> {
  if (!input.sessionPublicId.trim() || !input.refreshToken.trim()) {
    throw new DesktopAuthError("REFRESH_TOKEN_INVALID", "sessionPublicId and refreshToken are required");
  }

  const session = await deps.store.findSessionByPublicId(input.sessionPublicId.trim());
  if (!session) {
    throw new DesktopAuthError("REFRESH_TOKEN_INVALID", "Refresh token is invalid");
  }
  if (session.revokedAt) {
    throw new DesktopAuthError("SESSION_REVOKED", "Desktop session has been revoked");
  }
  if (session.refreshExpiresAt.getTime() <= deps.now().getTime()) {
    throw new DesktopAuthError("REFRESH_TOKEN_INVALID", "Refresh token has expired");
  }
  if (session.publicId !== input.sessionPublicId.trim()) {
    throw new DesktopAuthError("REFRESH_TOKEN_INVALID", "Session identity mismatch");
  }

  assertDeviceProof(deps, session, input.deviceProof, input.proofMethod, input.proofPath, input.bodySha256);
  await assertFreshNonce(deps, session.publicId, input.deviceProof.nonce);

  await requireClient(deps.store, session);
  await assertDeviceReady(deps.store, session);
  await assertEntitlementActive(deps, session);

  const refreshHash = hashSecret(input.refreshToken.trim());
  const accessToken = generateSecureToken(32);
  const refreshToken = generateSecureToken(48);
  const now = deps.now();
  const rotate = await deps.store.rotateSessionCredentials({
    sessionId: session.id,
    expectedRefreshHash: refreshHash,
    accessToken,
    accessExpiresAt: new Date(now.getTime() + deps.accessTokenTtlSeconds * 1000),
    refreshToken,
    refreshExpiresAt: new Date(now.getTime() + deps.refreshTokenTtlSeconds * 1000),
    lastSeenAt: now,
  });

  if (rotate === "reused") {
    await handleRefreshReuse(deps, session, auditMeta);
    throw new DesktopAuthError("REFRESH_TOKEN_REUSED", "Refresh token has already been used");
  }
  if (rotate !== "rotated") {
    throw new DesktopAuthError("REFRESH_TOKEN_INVALID", "Refresh token is invalid");
  }

  return {
    sessionPublicId: session.publicId,
    accessToken,
    refreshToken,
    accessExpiresAt: new Date(now.getTime() + deps.accessTokenTtlSeconds * 1000).toISOString(),
    refreshExpiresAt: new Date(now.getTime() + deps.refreshTokenTtlSeconds * 1000).toISOString(),
  };
}

export async function heartbeatDesktopSession(
  deps: SessionFlowDeps,
  input: DesktopHeartbeatInput,
): Promise<DesktopHeartbeatResult> {
  if (!input.sessionPublicId.trim() || !input.accessToken.trim()) {
    throw new DesktopAuthError("AUTH_REQUIRED", "sessionPublicId and access token are required");
  }

  const session = await deps.store.findSessionByAccessTokenHash(hashSecret(input.accessToken.trim()));
  if (!session || session.publicId !== input.sessionPublicId.trim()) {
    throw new DesktopAuthError("AUTH_REQUIRED", "Access token is invalid");
  }
  if (session.revokedAt) {
    return {
      sessionPublicId: session.publicId,
      state: "SESSION_REVOKED",
      lastSeenAt: session.lastSeenAt.toISOString(),
    };
  }
  if (session.accessExpiresAt.getTime() <= deps.now().getTime()) {
    throw new DesktopAuthError("SESSION_EXPIRED", "Access token has expired");
  }

  assertDeviceProof(deps, session, input.deviceProof, input.proofMethod, input.proofPath, input.bodySha256);
  await assertFreshNonce(deps, session.publicId, input.deviceProof.nonce);

  const state = await resolveMachineState(deps, session);
  const now = deps.now();
  if (state === "ACTIVE") {
    await deps.store.touchSessionLastSeen(session.id, now);
  }
  const refreshed = await deps.store.findSessionByPublicId(session.publicId);
  return {
    sessionPublicId: session.publicId,
    state,
    lastSeenAt: (refreshed?.lastSeenAt ?? now).toISOString(),
  };
}

export async function logoutDesktopSession(
  deps: SessionFlowDeps,
  input: DesktopLogoutInput,
  auditMeta?: { ipAddress?: string | null },
): Promise<void> {
  const token = input.accessToken.trim();
  if (!token) throw new DesktopAuthError("AUTH_REQUIRED", "Access token is required");

  const session = await deps.store.findSessionByAccessTokenHash(hashSecret(token));
  if (!session) throw new DesktopAuthError("AUTH_REQUIRED", "Access token is invalid");
  if (session.revokedAt) return;

  const revoked = await deps.store.revokeSession(session.id, deps.now(), "logout");
  if (!revoked) return;

  await deps.audit?.record({
    actorUserId: session.userId,
    action: "DESKTOP_SESSION_REVOKED",
    resourceType: "desktop_session",
    resourceId: session.publicId,
    metadata: { reason: "logout" },
    ipAddress: auditMeta?.ipAddress ?? null,
  });
}

async function handleRefreshReuse(
  deps: SessionFlowDeps,
  session: DesktopSessionRecord,
  auditMeta?: { ipAddress?: string | null },
): Promise<void> {
  await deps.store.revokeSession(session.id, deps.now(), "refresh_token_reused");
  await deps.audit?.record({
    actorUserId: session.userId,
    action: "DESKTOP_REFRESH_TOKEN_REUSED",
    resourceType: "desktop_session",
    resourceId: session.publicId,
    metadata: { rotationVersion: session.rotationVersion },
    ipAddress: auditMeta?.ipAddress ?? null,
  });
}

function assertDeviceProof(
  deps: SessionFlowDeps,
  session: DesktopSessionRecord,
  proof: DesktopRefreshInput["deviceProof"],
  proofMethod: string,
  proofPath: string,
  bodySha256: string,
): void {
  if (!session.devicePublicKey) {
    throw new DesktopAuthError("DEVICE_PROOF_INVALID", "Device is not bound to this session");
  }
  verifyDeviceProofSignature({
    devicePublicKey: session.devicePublicKey,
    sessionPublicId: session.publicId,
    proof: {
      ...proof,
      method: proofMethod,
      path: proofPath,
      bodySha256,
    },
    nowSeconds: Math.floor(deps.now().getTime() / 1000),
    toleranceSeconds: deps.deviceProofToleranceSeconds,
  });
}

async function assertFreshNonce(deps: SessionFlowDeps, sessionPublicId: string, nonce: string): Promise<void> {
  const ok = await deps.nonceStore.reserve(sessionPublicId, nonce, NONCE_TTL_SECONDS);
  if (!ok) {
    throw new DesktopAuthError("DEVICE_REPLAY_DETECTED", "Device proof nonce was already used");
  }
}

async function requireClient(store: DesktopAuthRepository, session: DesktopSessionRecord): Promise<DesktopClientRecord> {
  const client = await store.findClientById(session.desktopClientId);
  if (!client || client.status !== "active") {
    throw new DesktopAuthError("CLIENT_INACTIVE", "Desktop client is inactive");
  }
  return client;
}

async function assertDeviceReady(store: DesktopAuthRepository, session: DesktopSessionRecord): Promise<void> {
  if (!session.deviceId) {
    throw new DesktopAuthError("DEVICE_REMOVED", "Device is not activated on this session");
  }
  const device = await store.findDeviceById(session.deviceId);
  if (!device) {
    throw new DesktopAuthError("DEVICE_REMOVED", "Device is not registered");
  }
  if (device.status === "blocked") {
    throw new DesktopAuthError("DEVICE_BLOCKED", "This device is blocked");
  }
  if (device.status === "deactivated") {
    throw new DesktopAuthError("DEVICE_REMOVED", "Device has been removed");
  }
}

async function assertEntitlementActive(deps: SessionFlowDeps, session: DesktopSessionRecord): Promise<void> {
  const access = await resolveEntitlementAccess(deps, session);
  if (access === "active") return;
  if (access === "suspended") {
    throw new DesktopAuthError("ENTITLEMENT_SUSPENDED", "Entitlement is suspended");
  }
  if (access === "expired") {
    throw new DesktopAuthError("ENTITLEMENT_EXPIRED", "Entitlement has expired");
  }
  throw new DesktopAuthError("ENTITLEMENT_MISSING", "No active entitlement");
}

async function resolveMachineState(
  deps: SessionFlowDeps,
  session: DesktopSessionRecord,
): Promise<DesktopMachineState> {
  if (session.revokedAt) return "SESSION_REVOKED";
  if (!session.deviceId) return "DEVICE_REMOVED";
  const device = await deps.store.findDeviceById(session.deviceId);
  if (!device) return "DEVICE_REMOVED";
  if (device.status === "blocked") return "DEVICE_BLOCKED";
  if (device.status === "deactivated") return "DEVICE_REMOVED";

  const access = await resolveEntitlementAccess(deps, session);
  if (access === "active") return "ACTIVE";
  if (access === "suspended") return "ENTITLEMENT_SUSPENDED";
  if (access === "expired") return "ENTITLEMENT_EXPIRED";
  return "ENTITLEMENT_MISSING";
}

async function resolveEntitlementAccess(
  deps: SessionFlowDeps,
  session: DesktopSessionRecord,
): Promise<DesktopEntitlementAccess> {
  if (!deps.entitlement) return "missing";
  const principal: PrincipalRef = { type: "USER", id: session.userId };
  const rows = await deps.entitlement.resolveEntitlementsForPrincipal(principal);
  const match = rows.find((row) => row.entitlement.productId === session.productId);
  if (!match) return "missing";
  if (match.entitlement.status === "suspended" || match.entitlement.status === "revoked") {
    return "suspended";
  }
  if (match.entitlement.status === "expired") return "expired";
  if (match.entitlement.status !== "active") return "missing";
  const active = await deps.entitlement.canUseProduct(principal, session.productId);
  return active ? "active" : "missing";
}
