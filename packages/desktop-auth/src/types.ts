export interface DesktopClientRecord {
  id: string;
  clientId: string;
  productId: string;
  displayName: string;
  allowedRedirectUris: string[];
  status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

export interface DesktopAuthCodeRecord {
  id: string;
  codeHash: string;
  userId: string;
  desktopClientId: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  redirectUri: string;
  expiresAt: Date;
  consumedAt: Date | null;
  createdAt: Date;
}

export interface DesktopSessionRecord {
  id: string;
  publicId: string;
  userId: string;
  desktopClientId: string;
  productId: string;
  deviceId: string | null;
  devicePublicKey: string | null;
  accessTokenHash: string;
  accessExpiresAt: Date;
  refreshTokenHash: string;
  refreshExpiresAt: Date;
  rotationVersion: number;
  lastSeenAt: Date;
  revokedAt: Date | null;
  revokeReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAuthCodeInput {
  userId: string;
  desktopClientId: string;
  codeChallenge: string;
  codeChallengeMethod?: string;
  redirectUri: string;
  expiresAt: Date;
}

export interface CreateAuthCodeResult {
  record: DesktopAuthCodeRecord;
  code: string;
}

export interface ConsumeAuthCodeInput {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

export interface CreateSessionInput {
  publicId: string;
  userId: string;
  desktopClientId: string;
  productId: string;
  deviceId?: string | null;
  devicePublicKey?: string | null;
  accessToken: string;
  accessExpiresAt: Date;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export interface CreateSessionResult {
  record: DesktopSessionRecord;
  accessToken: string;
  refreshToken: string;
}

export interface DesktopAuthRepository {
  findClientByClientId(clientId: string): Promise<DesktopClientRecord | null>;
  findClientById(id: string): Promise<DesktopClientRecord | null>;
  findActiveClientByProductId(productId: string): Promise<DesktopClientRecord | null>;
  insertClient(input: {
    clientId: string;
    productId: string;
    displayName: string;
    allowedRedirectUris: string[];
    status?: "active" | "inactive";
  }): Promise<DesktopClientRecord>;
  createAuthCode(input: CreateAuthCodeInput, code: string): Promise<DesktopAuthCodeRecord>;
  findAuthCodeByHash(codeHash: string): Promise<DesktopAuthCodeRecord | null>;
  markAuthCodeConsumed(id: string, consumedAt: Date): Promise<boolean>;
  insertSession(input: CreateSessionInput): Promise<DesktopSessionRecord>;
  findSessionByAccessTokenHash(accessTokenHash: string): Promise<DesktopSessionRecord | null>;
  findSessionByRefreshTokenHash(refreshTokenHash: string): Promise<DesktopSessionRecord | null>;
  findSessionByPublicId(publicId: string): Promise<DesktopSessionRecord | null>;
  findDeviceById(deviceId: string): Promise<{ id: string; publicId: string; status: "active" | "deactivated" | "blocked" } | null>;
  rotateSessionCredentials(input: {
    sessionId: string;
    expectedRefreshHash: string;
    accessToken: string;
    accessExpiresAt: Date;
    refreshToken: string;
    refreshExpiresAt: Date;
    lastSeenAt: Date;
  }): Promise<"rotated" | "not_found" | "reused">;
  revokeSession(sessionId: string, at: Date, reason: string): Promise<boolean>;
  revokeSessionsForDevice(deviceId: string, at: Date, reason: string): Promise<number>;
  touchSessionLastSeen(sessionId: string, at: Date): Promise<void>;
  bindSessionDevice(
    sessionId: string,
    input: { deviceId: string; devicePublicKey?: string | null },
  ): Promise<DesktopSessionRecord>;
  findProductSlug(productId: string): Promise<string | null>;
  findUserById(userId: string): Promise<{ id: string; email: string; name: string } | null>;
  ensureDevice(input: {
    userId: string;
    installationId: string;
    platform?: string;
    deviceName?: string;
  }): Promise<{ id: string; publicId: string; status: "active" | "deactivated" | "blocked" }>;
  withTransaction<T>(fn: (repo: DesktopAuthRepository) => Promise<T>): Promise<T>;
}
