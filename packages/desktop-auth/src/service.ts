import {
  DESKTOP_ACCESS_TOKEN_TTL_SECONDS,
  DESKTOP_AUTH_CODE_TTL_SECONDS,
  DESKTOP_PKCE_METHOD,
  DESKTOP_REFRESH_TOKEN_TTL_SECONDS,
} from "@khepree/config";
import { createPublicId } from "@khepree/db";
import { DesktopAuthError } from "./errors";
import { generateSecureToken, hashSecret } from "./hash";
import { verifyPkceS256 } from "./pkce";
import type {
  ConsumeAuthCodeInput,
  CreateAuthCodeResult,
  CreateSessionResult,
  DesktopAuthRepository,
  DesktopClientRecord,
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
  now?: () => Date;
  authCodeTtlSeconds?: number;
  accessTokenTtlSeconds?: number;
  refreshTokenTtlSeconds?: number;
}

export class DesktopAuthService {
  private readonly now: () => Date;
  private readonly authCodeTtlSeconds: number;
  private readonly accessTokenTtlSeconds: number;
  private readonly refreshTokenTtlSeconds: number;

  constructor(private readonly options: DesktopAuthServiceOptions) {
    this.now = options.now ?? (() => new Date());
    this.authCodeTtlSeconds = options.authCodeTtlSeconds ?? DESKTOP_AUTH_CODE_TTL_SECONDS;
    this.accessTokenTtlSeconds = options.accessTokenTtlSeconds ?? DESKTOP_ACCESS_TOKEN_TTL_SECONDS;
    this.refreshTokenTtlSeconds = options.refreshTokenTtlSeconds ?? DESKTOP_REFRESH_TOKEN_TTL_SECONDS;
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

  async consumeAuthCode(
    input: ConsumeAuthCodeInput,
    context: ConsumeAuthCodeContext,
  ): Promise<{ authCodeId: string; userId: string; desktopClientId: string }> {
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

    await this.options.store.markAuthCodeConsumed(record.id, this.now());
    return {
      authCodeId: record.id,
      userId: record.userId,
      desktopClientId: record.desktopClientId,
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
}

export function createDesktopAuthService(options: DesktopAuthServiceOptions): DesktopAuthService {
  return new DesktopAuthService(options);
}
