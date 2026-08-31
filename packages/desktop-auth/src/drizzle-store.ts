import { and, eq, isNull, sql } from "drizzle-orm";
import {
  createPublicId,
  desktopAuthCodes,
  desktopClients,
  desktopSessions,
  devices,
  products,
  user,
  withTransaction,
  type Database,
} from "@khepree/db";
import { hashInstallationId } from "@khepree/licensing";
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

  withTransaction<T>(fn: (repo: DesktopAuthRepository) => Promise<T>): Promise<T> {
    return withTransaction(this.db, async (tx) => fn(new DrizzleDesktopAuthRepository(tx)));
  }

  async findClientByClientId(clientId: string): Promise<DesktopClientRecord | null> {
    const [row] = await this.db
      .select()
      .from(desktopClients)
      .where(eq(desktopClients.clientId, clientId))
      .limit(1);
    return row ? mapClient(row) : null;
  }

  async findClientById(id: string): Promise<DesktopClientRecord | null> {
    const [row] = await this.db
      .select()
      .from(desktopClients)
      .where(eq(desktopClients.id, id))
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

  async markAuthCodeConsumed(id: string, consumedAt: Date): Promise<boolean> {
    const rows = await this.db
      .update(desktopAuthCodes)
      .set({ consumedAt })
      .where(and(eq(desktopAuthCodes.id, id), isNull(desktopAuthCodes.consumedAt)))
      .returning({ id: desktopAuthCodes.id });
    return rows.length > 0;
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

  async findSessionByAccessTokenHash(accessTokenHash: string): Promise<DesktopSessionRecord | null> {
    const [row] = await this.db
      .select()
      .from(desktopSessions)
      .where(eq(desktopSessions.accessTokenHash, accessTokenHash))
      .limit(1);
    return row ? mapSession(row) : null;
  }

  async findSessionByPublicId(publicId: string): Promise<DesktopSessionRecord | null> {
    const [row] = await this.db
      .select()
      .from(desktopSessions)
      .where(eq(desktopSessions.publicId, publicId))
      .limit(1);
    return row ? mapSession(row) : null;
  }

  async findDeviceById(
    deviceId: string,
  ): Promise<{ id: string; publicId: string; status: "active" | "deactivated" | "blocked" } | null> {
    const [row] = await this.db.select().from(devices).where(eq(devices.id, deviceId)).limit(1);
    if (!row) return null;
    return { id: row.id, publicId: row.publicId, status: row.status };
  }

  async rotateSessionCredentials(input: {
    sessionId: string;
    expectedRefreshHash: string;
    accessToken: string;
    accessExpiresAt: Date;
    refreshToken: string;
    refreshExpiresAt: Date;
    lastSeenAt: Date;
  }): Promise<"rotated" | "not_found" | "reused"> {
    const rows = await this.db
      .update(desktopSessions)
      .set({
        accessTokenHash: hashSecret(input.accessToken),
        accessExpiresAt: input.accessExpiresAt,
        refreshTokenHash: hashSecret(input.refreshToken),
        refreshExpiresAt: input.refreshExpiresAt,
        rotationVersion: sql`${desktopSessions.rotationVersion} + 1`,
        lastSeenAt: input.lastSeenAt,
        updatedAt: input.lastSeenAt,
      })
      .where(
        and(
          eq(desktopSessions.id, input.sessionId),
          eq(desktopSessions.refreshTokenHash, input.expectedRefreshHash),
          isNull(desktopSessions.revokedAt),
        ),
      )
      .returning({ id: desktopSessions.id });
    if (rows.length > 0) return "rotated";

    const [session] = await this.db
      .select({ refreshTokenHash: desktopSessions.refreshTokenHash, revokedAt: desktopSessions.revokedAt })
      .from(desktopSessions)
      .where(eq(desktopSessions.id, input.sessionId))
      .limit(1);
    if (!session || session.revokedAt) return "not_found";
    if (session.refreshTokenHash !== input.expectedRefreshHash) return "reused";
    return "not_found";
  }

  async revokeSession(sessionId: string, at: Date, reason: string): Promise<boolean> {
    const rows = await this.db
      .update(desktopSessions)
      .set({
        revokedAt: at,
        revokeReason: reason,
        updatedAt: at,
      })
      .where(and(eq(desktopSessions.id, sessionId), isNull(desktopSessions.revokedAt)))
      .returning({ id: desktopSessions.id });
    return rows.length > 0;
  }

  async revokeSessionsForDevice(deviceId: string, at: Date, reason: string): Promise<number> {
    const rows = await this.db
      .update(desktopSessions)
      .set({
        revokedAt: at,
        revokeReason: reason,
        updatedAt: at,
      })
      .where(and(eq(desktopSessions.deviceId, deviceId), isNull(desktopSessions.revokedAt)))
      .returning({ id: desktopSessions.id });
    return rows.length;
  }

  async touchSessionLastSeen(sessionId: string, at: Date): Promise<void> {
    await this.db
      .update(desktopSessions)
      .set({ lastSeenAt: at, updatedAt: at })
      .where(eq(desktopSessions.id, sessionId));
  }

  async bindSessionDevice(
    sessionId: string,
    input: { deviceId: string; devicePublicKey?: string | null },
  ): Promise<DesktopSessionRecord> {
    const [row] = await this.db
      .update(desktopSessions)
      .set({
        deviceId: input.deviceId,
        ...(input.devicePublicKey !== undefined ? { devicePublicKey: input.devicePublicKey } : {}),
        lastSeenAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(desktopSessions.id, sessionId))
      .returning();
    if (!row) throw new Error("desktop session update failed");
    return mapSession(row);
  }

  async findProductSlug(productId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ slug: products.slug })
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);
    return row?.slug ?? null;
  }

  async findUserById(userId: string): Promise<{ id: string; email: string; name: string } | null> {
    const [row] = await this.db
      .select({ id: user.id, email: user.email, name: user.name })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);
    return row ?? null;
  }

  async ensureDevice(input: {
    userId: string;
    installationId: string;
    platform?: string;
    deviceName?: string;
  }): Promise<{ id: string; publicId: string; status: "active" | "deactivated" | "blocked" }> {
    const installationHash = hashInstallationId(input.installationId);
    const [existing] = await this.db
      .select()
      .from(devices)
      .where(
        and(
          eq(devices.principalType, "USER"),
          eq(devices.principalId, input.userId),
          eq(devices.installationHash, installationHash),
        ),
      )
      .limit(1);

    if (existing) {
      const [updated] = await this.db
        .update(devices)
        .set({
          lastSeenAt: new Date(),
          ...(input.platform !== undefined ? { platform: input.platform } : {}),
          ...(input.deviceName !== undefined ? { name: input.deviceName } : {}),
          updatedAt: new Date(),
        })
        .where(eq(devices.id, existing.id))
        .returning();
      const row = updated ?? existing;
      return { id: row.id, publicId: row.publicId, status: row.status };
    }

    const [row] = await this.db
      .insert(devices)
      .values({
        publicId: createPublicId("dev"),
        principalType: "USER",
        principalId: input.userId,
        installationHash,
        platform: input.platform ?? null,
        name: input.deviceName ?? null,
      })
      .returning();
    if (!row) throw new Error("device insert failed");
    return { id: row.id, publicId: row.publicId, status: row.status };
  }
}

export function createDrizzleDesktopAuthRepository(db: Database): DesktopAuthRepository {
  return new DrizzleDesktopAuthRepository(db);
}
