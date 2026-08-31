import { describe, expect, it, vi } from "vitest";
import { hashSecret } from "./hash";
import { DesktopAuthService } from "./service";
import type { DesktopAuthRepository, DesktopClientRecord, DesktopSessionRecord } from "./types";

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

function session(overrides: Partial<DesktopSessionRecord> = {}): DesktopSessionRecord {
  const now = new Date();
  return {
    id: "session-uuid",
    publicId: "dss_test",
    userId: "user-1",
    desktopClientId: "client-uuid",
    productId: "product-uuid",
    deviceId: null,
    devicePublicKey: null,
    accessTokenHash: hashSecret("access-token-valid"),
    accessExpiresAt: new Date(now.getTime() + 60_000),
    refreshTokenHash: "refresh-hash",
    refreshExpiresAt: new Date(now.getTime() + 86_400_000),
    rotationVersion: 0,
    lastSeenAt: now,
    revokedAt: null,
    revokeReason: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("DesktopAuthService access session", () => {
  it("resolves a valid access token", async () => {
    const desktopClient = client();
    const desktopSession = session();
    const store: DesktopAuthRepository = {
      findClientByClientId: vi.fn(),
      findClientById: vi.fn(async () => desktopClient),
      insertClient: vi.fn(),
      createAuthCode: vi.fn(),
      findAuthCodeByHash: vi.fn(),
      markAuthCodeConsumed: vi.fn(),
      insertSession: vi.fn(),
      findSessionByAccessTokenHash: vi.fn(async () => desktopSession),
      findSessionByRefreshTokenHash: vi.fn(),
      bindSessionDevice: vi.fn(),
      findProductSlug: vi.fn(),
      findUserById: vi.fn(),
      ensureDevice: vi.fn(),
      withTransaction: vi.fn(async (fn) => fn(store)),
    };
    const service = new DesktopAuthService({ store, now: () => new Date() });
    const resolved = await service.resolveAccessSession("access-token-valid");
    expect(resolved.session.publicId).toBe("dss_test");
    expect(resolved.client.clientId).toBe("dev-client");
  });

  it("rejects expired access tokens", async () => {
    const desktopSession = session({
      accessExpiresAt: new Date(Date.now() - 1_000),
    });
    const store: DesktopAuthRepository = {
      findClientByClientId: vi.fn(),
      findClientById: vi.fn(),
      insertClient: vi.fn(),
      createAuthCode: vi.fn(),
      findAuthCodeByHash: vi.fn(),
      markAuthCodeConsumed: vi.fn(),
      insertSession: vi.fn(),
      findSessionByAccessTokenHash: vi.fn(async () => desktopSession),
      findSessionByRefreshTokenHash: vi.fn(),
      bindSessionDevice: vi.fn(),
      findProductSlug: vi.fn(),
      findUserById: vi.fn(),
      ensureDevice: vi.fn(),
      withTransaction: vi.fn(async (fn) => fn(store)),
    };
    const service = new DesktopAuthService({ store, now: () => new Date() });
    await expect(service.resolveAccessSession("access-token-valid")).rejects.toMatchObject({
      code: "SESSION_EXPIRED",
    });
  });

  it("asserts clientId matches session", () => {
    const desktopClient = client();
    const desktopSession = session();
    const service = new DesktopAuthService({
      store: { withTransaction: vi.fn() } as unknown as DesktopAuthRepository,
    });
    expect(() => service.assertSessionClient(desktopSession, desktopClient, "dev-client")).not.toThrow();
    expect(() => service.assertSessionClient(desktopSession, desktopClient, "wrong-client")).toThrow(
      expect.objectContaining({ code: "AUTH_REQUIRED" }),
    );
  });
});
