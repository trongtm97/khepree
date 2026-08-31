import { describe, expect, it, vi } from "vitest";
import { createPkceChallenge } from "./pkce";
import { DesktopAuthService } from "./service";
import type {
  DesktopAuthCodeRecord,
  DesktopAuthRepository,
  DesktopClientRecord,
} from "./types";

const DEVICE_KEY = "d".repeat(44);

function client(overrides: Partial<DesktopClientRecord> = {}): DesktopClientRecord {
  return {
    id: "client-uuid",
    clientId: "dev-client",
    productId: "product-uuid",
    displayName: "Dev Client",
    allowedRedirectUris: ["khepree-dev://auth/callback"],
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockStore(initial: {
  client?: DesktopClientRecord | null;
  authCode?: DesktopAuthCodeRecord | null;
}): DesktopAuthRepository {
  let authCode = initial.authCode ?? null;

  const store: DesktopAuthRepository = {
    findClientByClientId: vi.fn(async () => initial.client ?? null),
    insertClient: vi.fn(),
    createAuthCode: vi.fn(),
    findAuthCodeByHash: vi.fn(async () => authCode),
    markAuthCodeConsumed: vi.fn(async (id: string) => {
      if (!authCode || authCode.id !== id || authCode.consumedAt) return false;
      authCode = { ...authCode, consumedAt: new Date() };
      return true;
    }),
    insertSession: vi.fn(async (input) => ({
      id: "session-uuid",
      publicId: input.publicId,
      userId: input.userId,
      desktopClientId: input.desktopClientId,
      productId: input.productId,
      deviceId: input.deviceId ?? null,
      devicePublicKey: input.devicePublicKey ?? null,
      accessTokenHash: "hash",
      accessExpiresAt: input.accessExpiresAt,
      refreshTokenHash: "refresh-hash",
      refreshExpiresAt: input.refreshExpiresAt,
      rotationVersion: 0,
      lastSeenAt: new Date(),
      revokedAt: null,
      revokeReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    findSessionByRefreshTokenHash: vi.fn(),
    findProductSlug: vi.fn(async () => "development-sample"),
    findUserById: vi.fn(async (userId) => ({
      id: userId,
      email: `${userId}@example.test`,
      name: "Desktop User",
    })),
    ensureDevice: vi.fn(async () => ({
      id: "device-uuid",
      publicId: "dev_public",
      status: "active" as const,
    })),
    withTransaction: vi.fn(async (fn) => fn(store)),
  };

  return store;
}

describe("DesktopAuthService exchange", () => {
  const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
  const challenge = createPkceChallenge(verifier);
  const redirectUri = "khepree-dev://auth/callback";

  it("rejects wrong client id", async () => {
    const store = createMockStore({ client: null });
    const service = new DesktopAuthService({ store });
    await expect(
      service.exchangeAuthCode({
        clientId: "missing",
        code: "code",
        redirectUri,
        codeVerifier: verifier,
        devicePublicKey: DEVICE_KEY,
        installationId: "install-id-1234567890",
      }),
    ).rejects.toMatchObject({ code: "AUTH_CODE_INVALID" });
  });

  it("rejects wrong redirect URI", async () => {
    const store = createMockStore({ client: client() });
    const service = new DesktopAuthService({ store });
    await expect(
      service.exchangeAuthCode({
        clientId: "dev-client",
        code: "code",
        redirectUri: "evil://callback",
        codeVerifier: verifier,
        devicePublicKey: DEVICE_KEY,
        installationId: "install-id-1234567890",
      }),
    ).rejects.toMatchObject({ code: "REDIRECT_URI_INVALID" });
  });

  it("rejects invalid PKCE", async () => {
    const store = createMockStore({
      client: client(),
      authCode: {
        id: "code-id",
        codeHash: "hash",
        userId: "user-1",
        desktopClientId: "client-uuid",
        codeChallenge: challenge,
        codeChallengeMethod: "S256",
        redirectUri,
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
        createdAt: new Date(),
      },
    });
    const service = new DesktopAuthService({ store });
    await expect(
      service.exchangeAuthCode({
        clientId: "dev-client",
        code: "plaintext-code",
        redirectUri,
        codeVerifier: "wrong-verifier-value-1234567890",
        devicePublicKey: DEVICE_KEY,
        installationId: "install-id-1234567890",
      }),
    ).rejects.toMatchObject({ code: "PKCE_INVALID" });
  });

  it("returns tokens on successful exchange", async () => {
    const store = createMockStore({
      client: client(),
      authCode: {
        id: "code-id",
        codeHash: "hash",
        userId: "user-1",
        desktopClientId: "client-uuid",
        codeChallenge: challenge,
        codeChallengeMethod: "S256",
        redirectUri,
        expiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
        createdAt: new Date(),
      },
    });
    const service = new DesktopAuthService({
      store,
      entitlement: {
        resolveEntitlementsForPrincipal: async () => [],
        canUseProduct: async () => false,
      } as never,
    });
    const result = await service.exchangeAuthCode({
      clientId: "dev-client",
      code: "plaintext-code",
      redirectUri,
      codeVerifier: verifier,
      devicePublicKey: DEVICE_KEY,
      installationId: "install-id-1234567890",
    });
    expect(result.accessToken.length).toBeGreaterThan(20);
    expect(result.entitlementAccess).toBe("missing");
  });
});
