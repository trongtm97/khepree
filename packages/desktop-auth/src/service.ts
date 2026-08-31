import {
  DESKTOP_ACCESS_TOKEN_TTL_SECONDS,
  DESKTOP_AUTH_CODE_TTL_SECONDS,
  DESKTOP_DEVICE_PROOF_TOLERANCE_SECONDS,
  DESKTOP_PKCE_METHOD,
  DESKTOP_REFRESH_TOKEN_TTL_SECONDS,
} from "@khepree/config";
import { createPublicId, createDrizzleAuditService, getDb, type AuditService, type Database } from "@khepree/db";
import {
  createEntitlementService,
  type EntitlementService,
  type PrincipalRef,
} from "@khepree/entitlement";
import { DesktopAuthError } from "./errors";
import type { DesktopExchangeInput, DesktopExchangeResult, DesktopEntitlementAccess } from "./exchange-types";
import { generateSecureToken, hashSecret } from "./hash";
import { verifyPkceS256 } from "./pkce";
import { MemoryNonceStore, type NonceStore } from "./nonce-store";
import {
  heartbeatDesktopSession,
  logoutDesktopSession,
  refreshDesktopSession,
} from "./session-flow";
import type {
  DesktopHeartbeatInput,
  DesktopHeartbeatResult,
  DesktopLogoutInput,
  DesktopRefreshInput,
  DesktopRefreshResult,
} from "./session-types";
import { createDrizzleDesktopAuthRepository } from "./drizzle-store";
import type {
  ConsumeAuthCodeInput,
  CreateAuthCodeResult,
  CreateSessionResult,
  DesktopAuthRepository,
  DesktopClientRecord,
  DesktopSessionRecord,
} from "./types";

export interface IssueAuthCodeInput {
  userId: string;
  client: DesktopClientRecord;
  codeChallenge: string;
  codeChallengeMethod?: string;
  redirectUri: string;
}

export interface ConsumeAuthCodeContext {
  client: DesktopClientRecord;
}

export interface DesktopAuthServiceOptions {
  store: DesktopAuthRepository;
  entitlement?: EntitlementService;
  audit?: AuditService;
  nonceStore?: NonceStore;
  now?: () => Date;
  authCodeTtlSeconds?: number;
  accessTokenTtlSeconds?: number;
  refreshTokenTtlSeconds?: number;
  deviceProofToleranceSeconds?: number;
}

const MIN_DEVICE_PUBLIC_KEY_LENGTH = 32;
const MAX_DEVICE_PUBLIC_KEY_LENGTH = 512;

export class DesktopAuthService {
  private readonly now: () => Date;
  private readonly authCodeTtlSeconds: number;
  private readonly accessTokenTtlSeconds: number;
  private readonly refreshTokenTtlSeconds: number;
  private readonly nonceStore: NonceStore;
  private readonly deviceProofToleranceSeconds: number;

  constructor(private readonly options: DesktopAuthServiceOptions) {
    this.now = options.now ?? (() => new Date());
    this.authCodeTtlSeconds = options.authCodeTtlSeconds ?? DESKTOP_AUTH_CODE_TTL_SECONDS;
    this.accessTokenTtlSeconds = options.accessTokenTtlSeconds ?? DESKTOP_ACCESS_TOKEN_TTL_SECONDS;
    this.refreshTokenTtlSeconds = options.refreshTokenTtlSeconds ?? DESKTOP_REFRESH_TOKEN_TTL_SECONDS;
    this.nonceStore = options.nonceStore ?? new MemoryNonceStore();
    this.deviceProofToleranceSeconds =
      options.deviceProofToleranceSeconds ?? DESKTOP_DEVICE_PROOF_TOLERANCE_SECONDS;
  }

  private sessionFlowDeps() {
    return {
      store: this.options.store,
      entitlement: this.options.entitlement,
      nonceStore: this.nonceStore,
      now: this.now,
      accessTokenTtlSeconds: this.accessTokenTtlSeconds,
      refreshTokenTtlSeconds: this.refreshTokenTtlSeconds,
      deviceProofToleranceSeconds: this.deviceProofToleranceSeconds,
      audit: this.options.audit,
    };
  }

  assertRedirectUriAllowed(client: DesktopClientRecord, redirectUri: string): void {
    if (!client.allowedRedirectUris.includes(redirectUri)) {
      throw new DesktopAuthError("REDIRECT_URI_INVALID", "Redirect URI is not allowed for this client");
    }
  }

  assertClientActive(client: DesktopClientRecord): void {
    if (client.status !== "active") {
      throw new DesktopAuthError("CLIENT_INACTIVE", "Desktop client is inactive");
    }
  }

  async resolveClient(clientId: string): Promise<DesktopClientRecord> {
    const client = await this.options.store.findClientByClientId(clientId);
    if (!client) {
      throw new DesktopAuthError("AUTH_CODE_INVALID", "Desktop client is not registered");
    }
    return client;
  }

  async issueAuthCode(input: IssueAuthCodeInput): Promise<CreateAuthCodeResult> {
    this.assertClientActive(input.client);
    this.assertRedirectUriAllowed(input.client, input.redirectUri);
    const method = input.codeChallengeMethod ?? DESKTOP_PKCE_METHOD;
    if (method !== DESKTOP_PKCE_METHOD) {
      throw new DesktopAuthError("PKCE_INVALID", "Unsupported PKCE method");
    }
    if (!input.codeChallenge.trim()) {
      throw new DesktopAuthError("PKCE_INVALID", "codeChallenge is required");
    }

    const code = generateSecureToken(32);
    const expiresAt = new Date(this.now().getTime() + this.authCodeTtlSeconds * 1000);
    const record = await this.options.store.createAuthCode(
      {
        userId: input.userId,
        desktopClientId: input.client.id,
        codeChallenge: input.codeChallenge,
        codeChallengeMethod: method,
        redirectUri: input.redirectUri,
        expiresAt,
      },
      code,
    );
    return { record, code };
  }

  private validateExchangeInput(input: DesktopExchangeInput): void {
    if (!input.clientId.trim()) throw new DesktopAuthError("AUTH_CODE_INVALID", "clientId is required");
    if (!input.code.trim()) throw new DesktopAuthError("AUTH_CODE_INVALID", "code is required");
    if (!input.codeVerifier.trim()) throw new DesktopAuthError("PKCE_INVALID", "codeVerifier is required");
    if (!input.redirectUri.trim()) throw new DesktopAuthError("REDIRECT_URI_INVALID", "redirectUri is required");
    if (!input.installationId.trim()) {
      throw new DesktopAuthError("AUTH_CODE_INVALID", "installationId is required");
    }
    const key = input.devicePublicKey.trim();
    if (key.length < MIN_DEVICE_PUBLIC_KEY_LENGTH || key.length > MAX_DEVICE_PUBLIC_KEY_LENGTH) {
      throw new DesktopAuthError("DEVICE_PROOF_INVALID", "devicePublicKey is invalid");
    }
  }

  private async validateAuthCodeRecord(
    input: ConsumeAuthCodeInput,
    context: ConsumeAuthCodeContext,
  ): Promise<{ id: string; userId: string; desktopClientId: string }> {
    this.assertClientActive(context.client);
    this.assertRedirectUriAllowed(context.client, input.redirectUri);

    const codeHash = hashSecret(input.code);
    const record = await this.options.store.findAuthCodeByHash(codeHash);
    if (!record || record.desktopClientId !== context.client.id) {
      throw new DesktopAuthError("AUTH_CODE_INVALID", "Authorization code is invalid");
    }
    if (record.consumedAt) {
      throw new DesktopAuthError("AUTH_CODE_INVALID", "Authorization code was already used");
    }
    if (record.expiresAt.getTime() <= this.now().getTime()) {
      throw new DesktopAuthError("AUTH_CODE_EXPIRED", "Authorization code has expired");
    }
    if (record.redirectUri !== input.redirectUri) {
      throw new DesktopAuthError("REDIRECT_URI_INVALID", "Redirect URI does not match");
    }
    if (!verifyPkceS256(input.codeVerifier, record.codeChallenge, record.codeChallengeMethod)) {
      throw new DesktopAuthError("PKCE_INVALID", "PKCE verification failed");
    }

    return { id: record.id, userId: record.userId, desktopClientId: record.desktopClientId };
  }

  async consumeAuthCode(
    input: ConsumeAuthCodeInput,
    context: ConsumeAuthCodeContext,
  ): Promise<{ authCodeId: string; userId: string; desktopClientId: string }> {
    const pending = await this.validateAuthCodeRecord(input, context);
    const consumed = await this.options.store.markAuthCodeConsumed(pending.id, this.now());
    if (!consumed) {
      throw new DesktopAuthError("AUTH_CODE_INVALID", "Authorization code was already used");
    }
    return {
      authCodeId: pending.id,
      userId: pending.userId,
      desktopClientId: pending.desktopClientId,
    };
  }

  async createSession(input: {
    userId: string;
    client: DesktopClientRecord;
    deviceId?: string | null;
    devicePublicKey?: string | null;
  }): Promise<CreateSessionResult> {
    this.assertClientActive(input.client);
    const accessToken = generateSecureToken(32);
    const refreshToken = generateSecureToken(48);
    const now = this.now();
    const record = await this.options.store.insertSession({
      publicId: createPublicId("dss"),
      userId: input.userId,
      desktopClientId: input.client.id,
      productId: input.client.productId,
      deviceId: input.deviceId ?? null,
      devicePublicKey: input.devicePublicKey ?? null,
      accessToken,
      accessExpiresAt: new Date(now.getTime() + this.accessTokenTtlSeconds * 1000),
      refreshToken,
      refreshExpiresAt: new Date(now.getTime() + this.refreshTokenTtlSeconds * 1000),
    });
    return { record, accessToken, refreshToken };
  }

  private async resolveEntitlementAccess(
    principal: PrincipalRef,
    productId: string,
  ): Promise<{ entitlement: DesktopExchangeResult["entitlement"]; access: DesktopEntitlementAccess }> {
    const entitlementService = this.options.entitlement;
    if (!entitlementService) {
      return { entitlement: null, access: "missing" };
    }

    const rows = await entitlementService.resolveEntitlementsForPrincipal(principal);
    const match = rows.find((row) => row.entitlement.productId === productId);
    if (!match) {
      return { entitlement: null, access: "missing" };
    }

    const summary = {
      entitlementPublicId: match.entitlement.publicId,
      productSlug: match.productSlug,
      planSlug: match.planSlug,
      status: match.entitlement.status,
      expiresAt: match.entitlement.expiresAt?.toISOString() ?? null,
      features: match.features,
    };

    if (match.entitlement.status === "suspended" || match.entitlement.status === "revoked") {
      return { entitlement: summary, access: "suspended" };
    }
    if (match.entitlement.status === "expired") {
      return { entitlement: summary, access: "expired" };
    }
    if (match.entitlement.status !== "active") {
      return { entitlement: summary, access: "missing" };
    }

    const active = await entitlementService.canUseProduct(principal, productId);
    return { entitlement: summary, access: active ? "active" : "missing" };
  }

  async exchangeAuthCode(
    input: DesktopExchangeInput,
    audit?: { actorUserId?: string | null; ipAddress?: string | null },
  ): Promise<DesktopExchangeResult> {
    this.validateExchangeInput(input);
    const client = await this.resolveClient(input.clientId);
    this.assertClientActive(client);
    this.assertRedirectUriAllowed(client, input.redirectUri);

    try {
      const result = await this.options.store.withTransaction(async (repo) => {
        const service = new DesktopAuthService({ ...this.options, store: repo });
        const pending = await service.validateAuthCodeRecord(
          {
            code: input.code,
            codeVerifier: input.codeVerifier,
            redirectUri: input.redirectUri,
          },
          { client },
        );
        const consumed = await repo.markAuthCodeConsumed(pending.id, this.now());
        if (!consumed) {
          throw new DesktopAuthError("AUTH_CODE_INVALID", "Authorization code was already used");
        }

        const device = await repo.ensureDevice({
          userId: pending.userId,
          installationId: input.installationId,
          platform: input.platform,
          deviceName: input.deviceName,
        });
        if (device.status === "blocked") {
          throw new DesktopAuthError("DEVICE_BLOCKED", "This device is blocked");
        }

        const session = await service.createSession({
          userId: pending.userId,
          client,
          deviceId: device.id,
          devicePublicKey: input.devicePublicKey.trim(),
        });

        return { pending, device, session };
      });

      const userRecord = await this.options.store.findUserById(result.pending.userId);
      if (!userRecord) {
        throw new DesktopAuthError("AUTH_CODE_INVALID", "Authorization code is invalid");
      }

      const productSlug = await this.options.store.findProductSlug(client.productId);
      const principal: PrincipalRef = { type: "USER", id: result.pending.userId };
      const entitlementState = await this.resolveEntitlementAccess(principal, client.productId);

      await this.options.audit?.record({
        actorUserId: audit?.actorUserId ?? result.pending.userId,
        action: "DESKTOP_SESSION_CREATED",
        resourceType: "desktop_session",
        resourceId: result.session.record.publicId,
        metadata: {
          clientId: client.clientId,
          productSlug,
          devicePublicId: result.device.publicId,
          entitlementAccess: entitlementState.access,
          appVersion: input.appVersion ?? null,
        },
        ipAddress: audit?.ipAddress ?? null,
      });

      return {
        sessionPublicId: result.session.record.publicId,
        accessToken: result.session.accessToken,
        refreshToken: result.session.refreshToken,
        accessExpiresAt: result.session.record.accessExpiresAt.toISOString(),
        refreshExpiresAt: result.session.record.refreshExpiresAt.toISOString(),
        devicePublicId: result.device.publicId,
        user: {
          publicId: userRecord.id,
          email: userRecord.email,
          name: userRecord.name,
        },
        client: {
          clientId: client.clientId,
          displayName: client.displayName,
          productSlug,
          status: client.status,
        },
        entitlement: entitlementState.entitlement,
        entitlementAccess: entitlementState.access,
      };
    } catch (error) {
      if (error instanceof DesktopAuthError) {
        await this.options.audit?.record({
          actorUserId: audit?.actorUserId ?? null,
          action: "DESKTOP_AUTH_FAILED",
          resourceType: "desktop_client",
          resourceId: input.clientId,
          metadata: { code: error.code, appVersion: input.appVersion ?? null },
          ipAddress: audit?.ipAddress ?? null,
        });
      }
      throw error;
    }
  }

  async recordAuthorized(input: {
    userId: string;
    client: DesktopClientRecord;
    ipAddress?: string | null;
  }): Promise<void> {
    const productSlug = await this.options.store.findProductSlug(input.client.productId);
    await this.options.audit?.record({
      actorUserId: input.userId,
      action: "DESKTOP_AUTHORIZED",
      resourceType: "desktop_client",
      resourceId: input.client.clientId,
      metadata: { productSlug },
      ipAddress: input.ipAddress ?? null,
    });
  }

  async resolveAccessSession(accessToken: string): Promise<{
    session: DesktopSessionRecord;
    client: DesktopClientRecord;
  }> {
    const token = accessToken.trim();
    if (!token) {
      throw new DesktopAuthError("AUTH_REQUIRED", "Access token is required");
    }
    const session = await this.options.store.findSessionByAccessTokenHash(hashSecret(token));
    if (!session) {
      throw new DesktopAuthError("AUTH_REQUIRED", "Access token is invalid");
    }
    if (session.revokedAt) {
      throw new DesktopAuthError("SESSION_REVOKED", "Desktop session has been revoked");
    }
    if (session.accessExpiresAt.getTime() <= this.now().getTime()) {
      throw new DesktopAuthError("SESSION_EXPIRED", "Access token has expired");
    }
    const client = await this.options.store.findClientById(session.desktopClientId);
    if (!client) {
      throw new DesktopAuthError("AUTH_REQUIRED", "Desktop client is not registered");
    }
    this.assertClientActive(client);
    return { session, client };
  }

  assertSessionClient(session: DesktopSessionRecord, client: DesktopClientRecord, clientId: string): void {
    if (client.clientId !== clientId || session.desktopClientId !== client.id) {
      throw new DesktopAuthError("AUTH_REQUIRED", "clientId does not match session");
    }
    if (session.productId !== client.productId) {
      throw new DesktopAuthError("AUTH_REQUIRED", "clientId does not match session");
    }
  }

  async bindSessionDevice(
    sessionId: string,
    input: { deviceId: string; devicePublicKey?: string | null },
  ): Promise<DesktopSessionRecord> {
    return this.options.store.bindSessionDevice(sessionId, input);
  }

  async revokeSessionsForDevice(deviceId: string, reason: string): Promise<number> {
    return this.options.store.revokeSessionsForDevice(deviceId, this.now(), reason);
  }

  async findUserById(userId: string) {
    return this.options.store.findUserById(userId);
  }

  async findProductSlug(productId: string) {
    return this.options.store.findProductSlug(productId);
  }

  async recordDeviceActivated(input: {
    userId: string;
    client: DesktopClientRecord;
    devicePublicId: string;
    appVersion?: string | null;
    ipAddress?: string | null;
  }): Promise<void> {
    await this.options.audit?.record({
      actorUserId: input.userId,
      action: "DESKTOP_DEVICE_ACTIVATED",
      resourceType: "device",
      resourceId: input.devicePublicId,
      metadata: {
        clientId: input.client.clientId,
        appVersion: input.appVersion ?? null,
      },
      ipAddress: input.ipAddress ?? null,
    });
  }

  async refreshSession(
    input: DesktopRefreshInput,
    auditMeta?: { ipAddress?: string | null },
  ): Promise<DesktopRefreshResult> {
    return refreshDesktopSession(this.sessionFlowDeps(), input, auditMeta);
  }

  async heartbeat(input: DesktopHeartbeatInput): Promise<DesktopHeartbeatResult> {
    return heartbeatDesktopSession(this.sessionFlowDeps(), input);
  }

  async logout(input: DesktopLogoutInput, auditMeta?: { ipAddress?: string | null }): Promise<void> {
    return logoutDesktopSession(this.sessionFlowDeps(), input, auditMeta);
  }

  async findSessionByPublicId(publicId: string): Promise<DesktopSessionRecord | null> {
    return this.options.store.findSessionByPublicId(publicId);
  }
}

export interface CreateDesktopAuthServiceOverrides {
  db?: Database | null;
  store?: DesktopAuthRepository;
  entitlement?: EntitlementService;
  audit?: AuditService;
  now?: () => Date;
  authCodeTtlSeconds?: number;
  accessTokenTtlSeconds?: number;
  refreshTokenTtlSeconds?: number;
}

export function createDesktopAuthService(
  overrides: CreateDesktopAuthServiceOverrides = {},
): DesktopAuthService {
  const db = overrides.db ?? getDb();
  const store = overrides.store ?? (db ? createDrizzleDesktopAuthRepository(db) : null);
  if (!store) throw new DesktopAuthError("AUTH_REQUIRED", "Database is not configured");
  const entitlement =
    overrides.entitlement ?? createEntitlementService({ db: db ?? undefined, now: overrides.now });
  const audit =
    overrides.audit ?? (db ? createDrizzleAuditService(db) : { record: async () => undefined });
  return new DesktopAuthService({
    store,
    entitlement,
    audit,
    now: overrides.now,
    authCodeTtlSeconds: overrides.authCodeTtlSeconds,
    accessTokenTtlSeconds: overrides.accessTokenTtlSeconds,
    refreshTokenTtlSeconds: overrides.refreshTokenTtlSeconds,
  });
}
