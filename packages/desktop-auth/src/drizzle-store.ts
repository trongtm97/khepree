import { and, eq, isNull } from "drizzle-orm";
import {
  desktopAuthCodes,
  desktopClients,
  desktopSessions,
  type Database,
} from "@khepree/db";
import { hashSecret } from "./hash";
import type {
  CreateAuthCodeInput,
  CreateSessionInput,
  DesktopAuthCodeRecord,
  DesktopAuthRepository,
  DesktopClientRecord,
  DesktopSessionRecord,
} from "./types";

function mapClient(row: typeof desktopClients.$inferSelect): DesktopClientRecord {
  return {
    id: row.id,
    clientId: row.clientId,
    productId: row.productId,
    displayName: row.displayName,
    allowedRedirectUris: row.allowedRedirectUris,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapAuthCode(row: typeof desktopAuthCodes.$inferSelect): DesktopAuthCodeRecord {
  return {
    id: row.id,
    codeHash: row.codeHash,
    userId: row.userId,
    desktopClientId: row.desktopClientId,
    codeChallenge: row.codeChallenge,
    codeChallengeMethod: row.codeChallengeMethod,
    redirectUri: row.redirectUri,
    expiresAt: row.expiresAt,
    consumedAt: row.consumedAt,
    createdAt: row.createdAt,
  };
}

function mapSession(row: typeof desktopSessions.$inferSelect): DesktopSessionRecord {
  return {
    id: row.id,
    publicId: row.publicId,
    userId: row.userId,
    desktopClientId: row.desktopClientId,
    productId: row.productId,
    deviceId: row.deviceId,
    devicePublicKey: row.devicePublicKey,
    accessTokenHash: row.accessTokenHash,
    accessExpiresAt: row.accessExpiresAt,
    refreshTokenHash: row.refreshTokenHash,
    refreshExpiresAt: row.refreshExpiresAt,
    rotationVersion: row.rotationVersion,
    lastSeenAt: row.lastSeenAt,
    revokedAt: row.revokedAt,
    revokeReason: row.revokeReason,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class DrizzleDesktopAuthRepository implements DesktopAuthRepository {
  constructor(private readonly db: Database) {}

  async findClientByClientId(clientId: string): Promise<DesktopClientRecord | null> {
    const [row] = await this.db
      .select()
      .from(desktopClients)
      .where(eq(desktopClients.clientId, clientId))
      .limit(1);
    return row ? mapClient(row) : null;
  }

  async insertClient(input: {
    clientId: string;
    productId: string;
    displayName: string;
    allowedRedirectUris: string[];
    status?: "active" | "inactive";
  }): Promise<DesktopClientRecord> {
    const [row] = await this.db
      .insert(desktopClients)
      .values({
        clientId: input.clientId,
        productId: input.productId,
        displayName: input.displayName,
        allowedRedirectUris: input.allowedRedirectUris,
        status: input.status ?? "active",
      })
      .returning();
    if (!row) throw new Error("desktop client insert failed");
    return mapClient(row);
  }

  async createAuthCode(input: CreateAuthCodeInput, code: string): Promise<DesktopAuthCodeRecord> {
    const [row] = await this.db
      .insert(desktopAuthCodes)
      .values({
        codeHash: hashSecret(code),
        userId: input.userId,
        desktopClientId: input.desktopClientId,
        codeChallenge: input.codeChallenge,
        codeChallengeMethod: input.codeChallengeMethod ?? "S256",
        redirectUri: input.redirectUri,
        expiresAt: input.expiresAt,
      })
      .returning();
    if (!row) throw new Error("desktop auth code insert failed");
    return mapAuthCode(row);
  }

  async findAuthCodeByHash(codeHash: string): Promise<DesktopAuthCodeRecord | null> {
    const [row] = await this.db
      .select()
      .from(desktopAuthCodes)
      .where(eq(desktopAuthCodes.codeHash, codeHash))
      .limit(1);
    return row ? mapAuthCode(row) : null;
  }

  async markAuthCodeConsumed(id: string, consumedAt: Date): Promise<void> {
    await this.db
      .update(desktopAuthCodes)
      .set({ consumedAt })
      .where(and(eq(desktopAuthCodes.id, id), isNull(desktopAuthCodes.consumedAt)));
  }

  async insertSession(input: CreateSessionInput): Promise<DesktopSessionRecord> {
    const [row] = await this.db
      .insert(desktopSessions)
      .values({
        publicId: input.publicId,
        userId: input.userId,
        desktopClientId: input.desktopClientId,
        productId: input.productId,
        deviceId: input.deviceId ?? null,
        devicePublicKey: input.devicePublicKey ?? null,
        accessTokenHash: hashSecret(input.accessToken),
        accessExpiresAt: input.accessExpiresAt,
        refreshTokenHash: hashSecret(input.refreshToken),
        refreshExpiresAt: input.refreshExpiresAt,
      })
      .returning();
    if (!row) throw new Error("desktop session insert failed");
    return mapSession(row);
  }

  async findSessionByRefreshTokenHash(refreshTokenHash: string): Promise<DesktopSessionRecord | null> {
    const [row] = await this.db
      .select()
      .from(desktopSessions)
      .where(eq(desktopSessions.refreshTokenHash, refreshTokenHash))
      .limit(1);
    return row ? mapSession(row) : null;
  }
}

export function createDrizzleDesktopAuthRepository(db: Database): DesktopAuthRepository {
  return new DrizzleDesktopAuthRepository(db);
}
