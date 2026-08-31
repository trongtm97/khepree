/**
 * Phase K08 — desktop security gate scenarios (integration, memory stores).
 */
import { generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { AuditService } from "@khepree/db";
import {
  MemoryCatalogReader,
  MemoryEntitlementRepository,
  createEntitlementOrderHandlers,
  createEntitlementService,
} from "@khepree/entitlement";
import {
  MOCK_SIGNATURE_HEADER,
  MockDevelopmentPaymentProvider,
  MemoryCommerceRepository,
  signMockWebhook,
  createCommerceService,
  type PurchasableOffer,
} from "@khepree/commerce";
import {
  buildDeviceProofMessage,
  hashSecret,
  heartbeatDesktopSession,
  refreshDesktopSession,
  MemoryNonceStore,
  type DesktopAuthRepository,
  type DesktopSessionRecord,
} from "@khepree/desktop-auth";
import { isLicensingError } from "@khepree/licensing";
import { generateEphemeralSigningKeys, createLicensingService, MemoryLicensingRepository } from "@khepree/licensing";
import { resetDesktopNonceStoreForTests } from "./desktop-nonce-store";

const NOW = new Date("2026-08-31T12:00:00.000Z");
const USER = "user_1";
const PRINCIPAL = { type: "USER" as const, id: USER };
const PRODUCT_ID = "prod-noveltrans";
const INSTALL_A = "install-aaaa-bbbb-cccc";
const INSTALL_B = "install-dddd-eeee-ffff";
const REFRESH_PATH = "/api/v1/desktop/auth/refresh";
const HEARTBEAT_PATH = "/api/v1/desktop/heartbeat";

const basicPlan = {
  productId: PRODUCT_ID,
  productSlug: "noveltrans",
  planId: "plan-basic",
  planSlug: "basic",
  licensingMode: "LICENSE_KEY_DEVICE" as const,
  accessTermDays: 365,
  features: [{ key: "devices.max", value: { valueType: "integer" as const, integerValue: 1 } }],
};

const proPlan = {
  ...basicPlan,
  planId: "plan-pro",
  planSlug: "pro",
  features: [
    { key: "devices.max", value: { valueType: "integer" as const, integerValue: 2 } },
    { key: "export.batch", value: { valueType: "boolean" as const, booleanValue: true } },
  ],
};

const offer: PurchasableOffer = {
  product: {
    id: PRODUCT_ID,
    publicId: "prod_nt",
    slug: "noveltrans",
    name: "NovelTrans",
    licensingMode: "ACCOUNT",
  },
  plan: {
    id: "plan-pro",
    publicId: "plan_pro",
    slug: "pro",
    name: "Pro",
    billingType: "one_time",
    accessTermDays: 365,
  },
  price: {
    id: "price-pro",
    publicId: "price_pro_vnd",
    currency: "VND",
    amountMinor: 599000n,
    interval: null,
  },
};

function recordingAudit(): AuditService & { actions: string[] } {
  const actions: string[] = [];
  return {
    actions,
    record: async (input) => {
      actions.push(input.action);
    },
  };
}

function catalogReader(deviceLimit = 1) {
  return new MemoryCatalogReader(
    new Map([
      [
        "plan-basic",
        {
          ...basicPlan,
          features: [
            { key: "devices.max", value: { valueType: "integer" as const, integerValue: deviceLimit } },
          ],
        },
      ],
      ["plan-pro", proPlan],
    ]),
  );
}

async function seedPlatform(options?: { grantPlanId?: string; deviceLimit?: number }) {
  resetDesktopNonceStoreForTests();
  const deviceLimit = options?.deviceLimit ?? 1;
  const entitlementStore = new MemoryEntitlementRepository(() => NOW);
  const catalog = catalogReader(deviceLimit);
  const audit = recordingAudit();
  const entitlement = createEntitlementService({
    store: entitlementStore,
    catalog,
    audit,
    now: () => NOW,
  });
  const licensingStore = new MemoryLicensingRepository(() => NOW);
  const revokedDevices: string[] = [];
  const sessionRevoker = {
    revokeSessionsForDevice: async (deviceId: string) => {
      revokedDevices.push(deviceId);
      return 1;
    },
  };
  const licensing = createLicensingService({
    store: licensingStore,
    entitlement,
    audit,
    keys: generateEphemeralSigningKeys(),
    now: () => NOW,
    sessionRevoker,
  });
  const commerceStore = new MemoryCommerceRepository(() => NOW);
  const commerce = createCommerceService({
    store: commerceStore,
    provider: new MockDevelopmentPaymentProvider({
      webhookSecret: "test-secret",
      hostedBaseUrl: "http://localhost:3001",
    }),
    catalog: {
      getPurchasableOffer: async (planPublicId, pricePublicId) =>
        planPublicId === offer.plan.publicId && pricePublicId === offer.price.publicId ? offer : null,
    },
    audit,
    handlers: createEntitlementOrderHandlers(entitlement),
    now: () => NOW,
  });

  if (options?.grantPlanId) {
    await entitlement.grantEntitlement({
      principal: PRINCIPAL,
      productId: PRODUCT_ID,
      planId: options.grantPlanId,
      source: "perpetual",
    });
  }

  return { entitlement, licensing, commerce, commerceStore, revokedDevices };
}

async function payOrder(commerce: ReturnType<typeof createCommerceService>, orderPublicId: string) {
  const rawBody = JSON.stringify({
    id: `evt_${orderPublicId}`,
    type: "payment.succeeded",
    data: {
      providerPaymentId: `mockpay_${orderPublicId}`,
      amountMinor: offer.price.amountMinor.toString(),
      currency: "VND",
    },
  });
  await commerce.processWebhook({
    providerId: "mock",
    headers: { [MOCK_SIGNATURE_HEADER]: signMockWebhook("test-secret", rawBody) },
    rawBody,
  });
}

function sessionRow(overrides: Partial<DesktopSessionRecord> = {}): DesktopSessionRecord {
  return {
    id: "session-uuid",
    publicId: "dss_gate",
    userId: USER,
    desktopClientId: "client-uuid",
    productId: PRODUCT_ID,
    deviceId: "device-internal",
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

function mockStoreWithSession(
  row: DesktopSessionRecord,
  deviceStatus: "active" | "deactivated" | "blocked" = "active",
): DesktopAuthRepository {
  let current = row;
  return {
    findClientByClientId: vi.fn(),
    findClientById: vi.fn(async () => ({
      id: "client-uuid",
      clientId: "dev-client",
      productId: PRODUCT_ID,
      displayName: "Dev",
      allowedRedirectUris: [],
      status: "active" as const,
      createdAt: NOW,
      updatedAt: NOW,
    })),
    findActiveClientByProductId: vi.fn(),
    insertClient: vi.fn(),
    createAuthCode: vi.fn(),
    findAuthCodeByHash: vi.fn(),
    markAuthCodeConsumed: vi.fn(),
    insertSession: vi.fn(),
    findSessionByAccessTokenHash: vi.fn(async (hash) => (current.accessTokenHash === hash ? current : null)),
    findSessionByRefreshTokenHash: vi.fn(async (hash) => (current.refreshTokenHash === hash ? current : null)),
    findSessionByPublicId: vi.fn(async (id) => (current.publicId === id ? current : null)),
    findDeviceById: vi.fn(async () => ({
      id: "device-internal",
      publicId: "dev_public",
      status: deviceStatus,
    })),
    rotateSessionCredentials: vi.fn(async (input) => {
      current = {
        ...current,
        accessTokenHash: hashSecret(input.accessToken),
        refreshTokenHash: hashSecret(input.refreshToken),
        rotationVersion: current.rotationVersion + 1,
      };
      return "rotated" as const;
    }),
    revokeSession: vi.fn(),
    revokeSessionsForDevice: vi.fn(),
    touchSessionLastSeen: vi.fn(),
    bindSessionDevice: vi.fn(),
    findProductSlug: vi.fn(),
    findUserById: vi.fn(),
    ensureDevice: vi.fn(),
    withTransaction: vi.fn(async (fn) => fn(mockStoreWithSession(current, deviceStatus))),
  };
}

describe("K08 desktop security gate", () => {
  it("scenario 1: activate denied ENTITLEMENT_MISSING without entitlement", async () => {
    const { licensing } = await seedPlatform();
    await expect(
      licensing.activateByPrincipal({ principal: PRINCIPAL, productId: PRODUCT_ID, installationId: INSTALL_A }),
    ).rejects.toMatchObject({ code: "ENTITLEMENT_MISSING" });
  });

  it("scenario 2: verified payment then device activation", async () => {
    const { licensing, commerce } = await seedPlatform();
    const intent = await commerce.createCheckoutIntent({
      owner: { type: "user", userId: USER },
      planPublicId: offer.plan.publicId,
      pricePublicId: offer.price.publicId,
      locale: "vi",
      successUrl: "http://localhost:3001/billing",
      cancelUrl: "http://localhost:3001/billing",
    });
    await payOrder(commerce, intent.orderPublicId);
    const activated = await licensing.activateByPrincipal({
      principal: PRINCIPAL,
      productId: PRODUCT_ID,
      installationId: INSTALL_A,
    });
    expect(activated.lease.payload.productId).toBe(PRODUCT_ID);
  });

  it("scenario 3: refresh rotates credentials without re-login", async () => {
    const { entitlement } = await seedPlatform({ grantPlanId: "plan-basic" });
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const publicKeySpki = publicKey.export({ type: "spki", format: "der" }).toString("base64");
    const store = mockStoreWithSession(sessionRow({ devicePublicKey: publicKeySpki }));
    const proof = createProof(privateKey, {
      sessionPublicId: "dss_gate",
      timestamp: Math.floor(NOW.getTime() / 1000),
      nonce: "cold-start",
      method: "POST",
      path: REFRESH_PATH,
      bodySha256: "body-hash",
    });
    const result = await refreshDesktopSession(
      {
        store,
        entitlement,
        nonceStore: new MemoryNonceStore(),
        now: () => NOW,
        accessTokenTtlSeconds: 900,
        refreshTokenTtlSeconds: 2_592_000,
        deviceProofToleranceSeconds: 120,
      },
      {
        sessionPublicId: "dss_gate",
        refreshToken: "refresh-current",
        deviceProof: proof,
        proofMethod: "POST",
        proofPath: REFRESH_PATH,
        bodySha256: "body-hash",
      },
    );
    expect(result.accessToken.length).toBeGreaterThan(20);
  });

  it("scenario 4: device limit returns used/max", async () => {
    const { licensing } = await seedPlatform({ grantPlanId: "plan-basic", deviceLimit: 1 });
    await licensing.activateByPrincipal({ principal: PRINCIPAL, productId: PRODUCT_ID, installationId: INSTALL_A });
    try {
      await licensing.activateByPrincipal({ principal: PRINCIPAL, productId: PRODUCT_ID, installationId: INSTALL_B });
      expect.fail("expected limit");
    } catch (error) {
      expect(isLicensingError(error) && error.code).toBe("DEVICE_LIMIT_REACHED");
      if (!isLicensingError(error)) throw error;
      expect(error.details).toMatchObject({ used: 1, max: 1 });
    }
  });

  it("scenario 5: remove device frees slot and revokes sessions", async () => {
    const { licensing, revokedDevices } = await seedPlatform({ grantPlanId: "plan-basic", deviceLimit: 1 });
    const first = await licensing.activateByPrincipal({
      principal: PRINCIPAL,
      productId: PRODUCT_ID,
      installationId: INSTALL_A,
    });
    await licensing.removeDevice({ principal: PRINCIPAL, devicePublicId: first.device.publicId, actorUserId: USER });
    expect(revokedDevices).toContain(first.device.id);
    await licensing.activateByPrincipal({ principal: PRINCIPAL, productId: PRODUCT_ID, installationId: INSTALL_B });
  });

  it("scenario 6: heartbeat on removed device reports DEVICE_REMOVED", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const publicKeySpki = publicKey.export({ type: "spki", format: "der" }).toString("base64");
    const store = mockStoreWithSession(sessionRow({ devicePublicKey: publicKeySpki }), "deactivated");
    const proof = createProof(privateKey, {
      sessionPublicId: "dss_gate",
      timestamp: Math.floor(NOW.getTime() / 1000),
      nonce: "removed-hb",
      method: "POST",
      path: HEARTBEAT_PATH,
      bodySha256: "body-hash",
    });
    const result = await heartbeatDesktopSession(
      {
        store,
        nonceStore: new MemoryNonceStore(),
        now: () => NOW,
        accessTokenTtlSeconds: 900,
        refreshTokenTtlSeconds: 2_592_000,
        deviceProofToleranceSeconds: 120,
      },
      {
        sessionPublicId: "dss_gate",
        accessToken: "access-current",
        deviceProof: proof,
        proofMethod: "POST",
        proofPath: HEARTBEAT_PATH,
        bodySha256: "body-hash",
      },
    );
    expect(result.state).toBe("DEVICE_REMOVED");
  });

  it("scenario 7: blocked device cannot activate", async () => {
    const { licensing } = await seedPlatform({ grantPlanId: "plan-basic" });
    const first = await licensing.activateByPrincipal({
      principal: PRINCIPAL,
      productId: PRODUCT_ID,
      installationId: INSTALL_A,
    });
    await licensing.blockDevice(first.device.publicId, "admin");
    await expect(
      licensing.activateByPrincipal({
        principal: PRINCIPAL,
        productId: PRODUCT_ID,
        installationId: INSTALL_A,
      }),
    ).rejects.toMatchObject({ code: "DEVICE_BLOCKED" });
  });

  it("scenario 8: suspended entitlement denies refresh and heartbeat", async () => {
    const { entitlement } = await seedPlatform({ grantPlanId: "plan-basic" });
    const rows = await entitlement.resolveEntitlementsForPrincipal(PRINCIPAL);
    await entitlement.suspendEntitlement({ entitlementId: rows[0]!.entitlement.id, reason: "refund" });
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const publicKeySpki = publicKey.export({ type: "spki", format: "der" }).toString("base64");
    const store = mockStoreWithSession(sessionRow({ devicePublicKey: publicKeySpki }));
    const deps = {
      store,
      entitlement,
      nonceStore: new MemoryNonceStore(),
      now: () => NOW,
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 2_592_000,
      deviceProofToleranceSeconds: 120,
    };
    const refreshProof = createProof(privateKey, {
      sessionPublicId: "dss_gate",
      timestamp: Math.floor(NOW.getTime() / 1000),
      nonce: "suspend-refresh",
      method: "POST",
      path: REFRESH_PATH,
      bodySha256: "body-hash",
    });
    await expect(
      refreshDesktopSession(deps, {
        sessionPublicId: "dss_gate",
        refreshToken: "refresh-current",
        deviceProof: refreshProof,
        proofMethod: "POST",
        proofPath: REFRESH_PATH,
        bodySha256: "body-hash",
      }),
    ).rejects.toMatchObject({ code: "ENTITLEMENT_SUSPENDED" });
    const hbProof = createProof(privateKey, {
      sessionPublicId: "dss_gate",
      timestamp: Math.floor(NOW.getTime() / 1000),
      nonce: "suspend-hb",
      method: "POST",
      path: HEARTBEAT_PATH,
      bodySha256: "body-hash",
    });
    const hb = await heartbeatDesktopSession(deps, {
      sessionPublicId: "dss_gate",
      accessToken: "access-current",
      deviceProof: hbProof,
      proofMethod: "POST",
      proofPath: HEARTBEAT_PATH,
      bodySha256: "body-hash",
    });
    expect(hb.state).toBe("ENTITLEMENT_SUSPENDED");
  });

  it("scenario 9: invalid device proof denied", async () => {
    const { entitlement } = await seedPlatform({ grantPlanId: "plan-basic" });
    const { privateKey: wrongKey } = generateKeyPairSync("ed25519");
    const { publicKey } = generateKeyPairSync("ed25519");
    const publicKeySpki = publicKey.export({ type: "spki", format: "der" }).toString("base64");
    const store = mockStoreWithSession(sessionRow({ devicePublicKey: publicKeySpki }));
    const proof = createProof(wrongKey, {
      sessionPublicId: "dss_gate",
      timestamp: Math.floor(NOW.getTime() / 1000),
      nonce: "bad-sig",
      method: "POST",
      path: REFRESH_PATH,
      bodySha256: "body-hash",
    });
    await expect(
      refreshDesktopSession(
        {
          store,
          entitlement,
          nonceStore: new MemoryNonceStore(),
          now: () => NOW,
          accessTokenTtlSeconds: 900,
          refreshTokenTtlSeconds: 2_592_000,
          deviceProofToleranceSeconds: 120,
        },
        {
          sessionPublicId: "dss_gate",
          refreshToken: "refresh-current",
          deviceProof: proof,
          proofMethod: "POST",
          proofPath: REFRESH_PATH,
          bodySha256: "body-hash",
        },
      ),
    ).rejects.toMatchObject({ code: "DEVICE_PROOF_INVALID" });
  });

  it("scenario 10: nonce replay rejected", async () => {
    const { entitlement } = await seedPlatform({ grantPlanId: "plan-basic" });
    const { privateKey, publicKey } = generateKeyPairSync("ed25519");
    const publicKeySpki = publicKey.export({ type: "spki", format: "der" }).toString("base64");
    const store = mockStoreWithSession(sessionRow({ devicePublicKey: publicKeySpki }));
    const nonceStore = new MemoryNonceStore();
    const deps = {
      store,
      entitlement,
      nonceStore,
      now: () => NOW,
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 2_592_000,
      deviceProofToleranceSeconds: 120,
    };
    const proof = createProof(privateKey, {
      sessionPublicId: "dss_gate",
      timestamp: Math.floor(NOW.getTime() / 1000),
      nonce: "replay-once",
      method: "POST",
      path: REFRESH_PATH,
      bodySha256: "body-hash",
    });
    const input = {
      sessionPublicId: "dss_gate",
      refreshToken: "refresh-current",
      deviceProof: proof,
      proofMethod: "POST",
      proofPath: REFRESH_PATH,
      bodySha256: "body-hash",
    };
    await refreshDesktopSession(deps, input);
    await expect(refreshDesktopSession(deps, input)).rejects.toMatchObject({ code: "DEVICE_REPLAY_DETECTED" });
  });

  it("scenario 11: plan upgrade updates features without duplicate entitlement", async () => {
    const { entitlement } = await seedPlatform({ grantPlanId: "plan-basic" });
    const upgraded = await entitlement.grantEntitlement({
      principal: PRINCIPAL,
      productId: PRODUCT_ID,
      planId: "plan-pro",
      source: "perpetual",
      orderPublicId: "ord_up",
      orderItemId: "item_up",
    });
    expect(upgraded.entitlement.planId).toBe("plan-pro");
    const rows = await entitlement.resolveEntitlementsForPrincipal(PRINCIPAL);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.features.some((f) => f.key === "export.batch")).toBe(true);
  });

  it("scenario 12: refund suspends entitlement", async () => {
    const { entitlement, commerce, commerceStore } = await seedPlatform({ grantPlanId: "plan-basic" });
    const intent = await commerce.createCheckoutIntent({
      owner: { type: "user", userId: USER },
      planPublicId: offer.plan.publicId,
      pricePublicId: offer.price.publicId,
      locale: "vi",
      successUrl: "http://localhost:3001/billing",
      cancelUrl: "http://localhost:3001/billing",
    });
    await payOrder(commerce, intent.orderPublicId);
    const payment = commerceStore.payments[0];
    if (!payment) throw new Error("missing payment");
    await commerce.requestRefund({ paymentId: payment.id, amountMinor: offer.price.amountMinor });
    await expect(entitlement.canUseProduct(PRINCIPAL, PRODUCT_ID)).resolves.toBe(false);
  });
});
