import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { buildDeviceProofMessage } from "./device-proof";
import { hashSecret } from "./hash";
import { MemoryNonceStore } from "./nonce-store";
import { heartbeatDesktopSession, logoutDesktopSession, refreshDesktopSession } from "./session-flow";
import type { SessionFlowDeps } from "./session-flow";
import type { DesktopAuthRepository, DesktopSessionRecord } from "./types";

const NOW = new Date("2026-08-31T12:00:00.000Z");
const REFRESH_PATH = "/api/v1/desktop/auth/refresh";
const HEARTBEAT_PATH = "/api/v1/desktop/heartbeat";

function session(overrides: Partial<DesktopSessionRecord> = {}): DesktopSessionRecord {
  return {
    id: "session-uuid",
    publicId: "dss_test",
    userId: "user-1",
    desktopClientId: "client-uuid",
    productId: "product-uuid",
    deviceId: "device-uuid",
    devicePublicKey: "",
    accessTokenHash: hashSecret("access-current"),
    accessExpiresAt: new Date(NOW.getTime() + 60_000),
    refreshTokenHash: hashSecret("refresh-current"),
    refreshExpiresAt: new Date(NOW.getTime() + 86_400_000),
    rotationVersion: 0,
    lastSeenAt: NOW,
    revokedAt: null,
    revokeReason: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function createProof(
  privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"],
  input: {
    sessionPublicId: string;
    timestamp: number;
    nonce: string;
    method: string;
    path: string;
    bodySha256: string;
  },
) {
  const message = buildDeviceProofMessage(input);
  const signature = sign(null, Buffer.from(message, "utf8"), privateKey).toString("base64");
  return { ...input, signature };
}

describe("desktop refresh + heartbeat", () => {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const publicKeySpkiBase64 = publicKey.export({ type: "spki", format: "der" }).toString("base64");
  const nonceStore = new MemoryNonceStore();

  function deps(store: DesktopAuthRepository): SessionFlowDeps {
    return {
      store,
      nonceStore,
      now: () => NOW,
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 2_592_000,
      deviceProofToleranceSeconds: 120,
      entitlement: {
        resolveEntitlementsForPrincipal: vi.fn(async () => [
          {
            entitlement: {
              publicId: "ent_1",
              productId: "product-uuid",
              status: "active",
              expiresAt: null,
            },
            productSlug: "sample",
            planSlug: "pro",
            features: [],
            license: null,
          },
        ]),
        canUseProduct: vi.fn(async () => true),
      },
      audit: { record: vi.fn(async () => undefined) },
    } as unknown as SessionFlowDeps;
  }

  function baseStore(current: DesktopSessionRecord): DesktopAuthRepository {
    let row = { ...current, devicePublicKey: publicKeySpkiBase64 };
    return {
      findClientByClientId: vi.fn(),
      findClientById: vi.fn(async () => ({
        id: "client-uuid",
        clientId: "dev-client",
        productId: "product-uuid",
        displayName: "Dev",
        allowedRedirectUris: [] as string[],
        status: "active" as const,
        createdAt: NOW,
        updatedAt: NOW,
      })),
      insertClient: vi.fn(),
      createAuthCode: vi.fn(),
      findAuthCodeByHash: vi.fn(),
      markAuthCodeConsumed: vi.fn(),
      insertSession: vi.fn(),
      findSessionByAccessTokenHash: vi.fn(async (hash) => (row.accessTokenHash === hash ? row : null)),
      findSessionByRefreshTokenHash: vi.fn(async (hash) => (row.refreshTokenHash === hash ? row : null)),
      findSessionByPublicId: vi.fn(async (id) => (row.publicId === id ? row : null)),
      findDeviceById: vi.fn(async () => ({ id: "device-uuid", publicId: "dev_public", status: "active" as const })),
      rotateSessionCredentials: vi.fn(async (input) => {
        if (row.revokedAt) return "not_found" as const;
        if (row.refreshTokenHash !== input.expectedRefreshHash) return "reused" as const;
        row = {
          ...row,
          accessTokenHash: hashSecret(input.accessToken),
          refreshTokenHash: hashSecret(input.refreshToken),
          accessExpiresAt: input.accessExpiresAt,
          refreshExpiresAt: input.refreshExpiresAt,
          rotationVersion: row.rotationVersion + 1,
          lastSeenAt: input.lastSeenAt,
        };
        return "rotated" as const;
      }),
      revokeSession: vi.fn(async (sessionId, at, reason) => {
        if (row.id !== sessionId || row.revokedAt) return false;
        row = { ...row, revokedAt: at, revokeReason: reason };
        return true;
      }),
      touchSessionLastSeen: vi.fn(async (_sessionId, at) => {
        row = { ...row, lastSeenAt: at };
      }),
      bindSessionDevice: vi.fn(),
      findProductSlug: vi.fn(),
      findUserById: vi.fn(),
      ensureDevice: vi.fn(),
      withTransaction: vi.fn(async (fn) => fn(baseStore(row))),
    };
  }

  it("refreshes with a valid device proof and rotates credentials", async () => {
    nonceStore.clear();
    const store = baseStore(session());
    const proof = createProof(privateKey, {
      sessionPublicId: "dss_test",
      timestamp: Math.floor(NOW.getTime() / 1000),
      nonce: "refresh-nonce-1",
      method: "POST",
      path: REFRESH_PATH,
      bodySha256: "body-hash",
    });
    const result = await refreshDesktopSession(deps(store), {
      sessionPublicId: "dss_test",
      refreshToken: "refresh-current",
      deviceProof: proof,
      proofMethod: "POST",
      proofPath: REFRESH_PATH,
      bodySha256: "body-hash",
    });
    expect(result.accessToken.length).toBeGreaterThan(10);
    expect(result.refreshToken.length).toBeGreaterThan(10);
  });

  it("rejects nonce replay", async () => {
    nonceStore.clear();
    const store = baseStore(session());
    const proof = createProof(privateKey, {
      sessionPublicId: "dss_test",
      timestamp: Math.floor(NOW.getTime() / 1000),
      nonce: "replay-nonce",
      method: "POST",
      path: REFRESH_PATH,
      bodySha256: "body-hash",
    });
    const input = {
      sessionPublicId: "dss_test",
      refreshToken: "refresh-current",
      deviceProof: proof,
      proofMethod: "POST",
      proofPath: REFRESH_PATH,
      bodySha256: "body-hash",
    };
    await refreshDesktopSession(deps(store), input);
    await expect(refreshDesktopSession(deps(store), input)).rejects.toMatchObject({
      code: "DEVICE_REPLAY_DETECTED",
    });
  });

  it("rejects refresh token reuse and revokes the session", async () => {
    nonceStore.clear();
    const store = baseStore(session());
    const d = deps(store);
    const proof = (nonce: string) =>
      createProof(privateKey, {
        sessionPublicId: "dss_test",
        timestamp: Math.floor(NOW.getTime() / 1000),
        nonce,
        method: "POST",
        path: REFRESH_PATH,
        bodySha256: "body-hash",
      });
    await refreshDesktopSession(d, {
      sessionPublicId: "dss_test",
      refreshToken: "refresh-current",
      deviceProof: proof("reuse-1"),
      proofMethod: "POST",
      proofPath: REFRESH_PATH,
      bodySha256: "body-hash",
    });
    await expect(
      refreshDesktopSession(d, {
        sessionPublicId: "dss_test",
        refreshToken: "refresh-current",
        deviceProof: proof("reuse-2"),
        proofMethod: "POST",
        proofPath: REFRESH_PATH,
        bodySha256: "body-hash",
      }),
    ).rejects.toMatchObject({ code: "REFRESH_TOKEN_REUSED" });
    expect(store.revokeSession).toHaveBeenCalled();
  });

  it("rejects blocked devices", async () => {
    nonceStore.clear();
    const store = baseStore(session());
    (store.findDeviceById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "device-uuid",
      publicId: "dev_public",
      status: "blocked",
    });
    const proof = createProof(privateKey, {
      sessionPublicId: "dss_test",
      timestamp: Math.floor(NOW.getTime() / 1000),
      nonce: "blocked-nonce",
      method: "POST",
      path: REFRESH_PATH,
      bodySha256: "body-hash",
    });
    await expect(
      refreshDesktopSession(deps(store), {
        sessionPublicId: "dss_test",
        refreshToken: "refresh-current",
        deviceProof: proof,
        proofMethod: "POST",
        proofPath: REFRESH_PATH,
        bodySha256: "body-hash",
      }),
    ).rejects.toMatchObject({ code: "DEVICE_BLOCKED" });
  });

  it("returns suspended entitlement on heartbeat without throwing", async () => {
    nonceStore.clear();
    const store = baseStore(session());
    const d = deps(store);
    (d.entitlement!.resolveEntitlementsForPrincipal as ReturnType<typeof vi.fn>).mockResolvedValue([
      {
        entitlement: {
          publicId: "ent_1",
          productId: "product-uuid",
          status: "suspended",
          expiresAt: null,
        },
        productSlug: "sample",
        planSlug: "pro",
        features: [],
        license: null,
      },
    ]);
    const proof = createProof(privateKey, {
      sessionPublicId: "dss_test",
      timestamp: Math.floor(NOW.getTime() / 1000),
      nonce: "heartbeat-nonce",
      method: "POST",
      path: HEARTBEAT_PATH,
      bodySha256: "body-hash",
    });
    const result = await heartbeatDesktopSession(d, {
      sessionPublicId: "dss_test",
      accessToken: "access-current",
      deviceProof: proof,
      proofMethod: "POST",
      proofPath: HEARTBEAT_PATH,
      bodySha256: "body-hash",
    });
    expect(result.state).toBe("ENTITLEMENT_SUSPENDED");
  });

  it("logs out the current session without freeing the device slot", async () => {
    const store = baseStore(session());
    await logoutDesktopSession(deps(store), { accessToken: "access-current" });
    expect(store.revokeSession).toHaveBeenCalledWith("session-uuid", NOW, "logout");
    expect(store.findDeviceById).not.toHaveBeenCalled();
  });
});
