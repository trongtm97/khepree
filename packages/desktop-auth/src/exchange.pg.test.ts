import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  createPublicId,
  desktopAuthCodes,
  desktopSessions,
  getDb,
  products,
  user,
} from "@khepree/db";
import { createPkceChallenge } from "./pkce";
import { createDrizzleDesktopAuthRepository } from "./drizzle-store";
import { isDesktopAuthError } from "./errors";
import { hashSecret } from "./hash";
import { createDesktopAuthService } from "./service";

const db = getDb();
const pg = Boolean(db && process.env.INTEGRATION === "1");

const DEVICE_KEY = "ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789";
const INSTALLATION_ID = "desktop-installation-id-001";
const REDIRECT_URI = "khepree-dev://auth/callback";
const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";

describe.skipIf(!pg)("Desktop auth exchange (Postgres)", () => {
  async function seedClient(suffix: string, redirectUris = [REDIRECT_URI]) {
    if (!db) throw new Error("DATABASE_URL required");
    const userId = `dsk_ex_${suffix}`;
    await db.insert(user).values({
      id: userId,
      name: "Exchange User",
      email: `${userId}@example.test`,
      emailVerified: true,
    });

    const [product] = await db
      .insert(products)
      .values({
        publicId: createPublicId("prd"),
        slug: `desktop-ex-${suffix}`,
        status: "active",
        licensingMode: "ACCOUNT",
      })
      .returning();
    if (!product) throw new Error("product insert failed");

    const store = createDrizzleDesktopAuthRepository(db);
    const primary = await store.insertClient({
      clientId: `ex-client-${suffix}`,
      productId: product.id,
      displayName: "Exchange Client",
      allowedRedirectUris: redirectUris,
    });

    const other = await store.insertClient({
      clientId: `ex-other-${suffix}`,
      productId: product.id,
      displayName: "Other Client",
      allowedRedirectUris: [REDIRECT_URI],
    });

    return { userId, product, primary, other, store };
  }

  it("exchanges a valid code and creates a session for the correct user", async () => {
    const suffix = crypto.randomUUID();
    const { userId, primary, store } = await seedClient(suffix);
    const service = createDesktopAuthService({ store, db });
    const challenge = createPkceChallenge(VERIFIER);

    const issued = await service.issueAuthCode({
      userId,
      client: primary,
      codeChallenge: challenge,
      redirectUri: REDIRECT_URI,
    });

    const result = await service.exchangeAuthCode({
      clientId: primary.clientId,
      code: issued.code,
      redirectUri: REDIRECT_URI,
      codeVerifier: VERIFIER,
      devicePublicKey: DEVICE_KEY,
      installationId: INSTALLATION_ID,
      platform: "windows",
      deviceName: "Dev PC",
    });

    expect(result.user.publicId).toBe(userId);
    expect(result.sessionPublicId).toMatch(/^dss_/);
    expect(result.devicePublicId).toMatch(/^dev_/);
    expect(result.entitlementAccess).toBe("missing");

    const sessionRows = await db!
      .select()
      .from(desktopSessions)
      .where(eq(desktopSessions.publicId, result.sessionPublicId));
    expect(sessionRows).toHaveLength(1);
    expect(sessionRows[0]?.userId).toBe(userId);
    expect(JSON.stringify(sessionRows)).not.toContain(result.accessToken);
  });

  it("rejects expired and reused codes", async () => {
    const suffix = crypto.randomUUID();
    const { userId, primary, store } = await seedClient(suffix);
    const fixedNow = new Date("2026-01-01T00:00:00.000Z");
    const issuer = createDesktopAuthService({ store, db, now: () => fixedNow, authCodeTtlSeconds: 30 });
    const challenge = createPkceChallenge(VERIFIER);
    const issued = await issuer.issueAuthCode({
      userId,
      client: primary,
      codeChallenge: challenge,
      redirectUri: REDIRECT_URI,
    });

    const expired = createDesktopAuthService({
      store,
      db,
      now: () => new Date(fixedNow.getTime() + 60_000),
    });
    await expect(
      expired.exchangeAuthCode({
        clientId: primary.clientId,
        code: issued.code,
        redirectUri: REDIRECT_URI,
        codeVerifier: VERIFIER,
        devicePublicKey: DEVICE_KEY,
        installationId: INSTALLATION_ID,
      }),
    ).rejects.toMatchObject({ code: "AUTH_CODE_EXPIRED" });

    const fresh = createDesktopAuthService({ store, db, now: () => fixedNow });
    const second = await fresh.issueAuthCode({
      userId,
      client: primary,
      codeChallenge: challenge,
      redirectUri: REDIRECT_URI,
    });
    const exchanger = createDesktopAuthService({ store, db, now: () => fixedNow });
    await exchanger.exchangeAuthCode({
      clientId: primary.clientId,
      code: second.code,
      redirectUri: REDIRECT_URI,
      codeVerifier: VERIFIER,
      devicePublicKey: DEVICE_KEY,
      installationId: INSTALLATION_ID,
    });
    await expect(
      exchanger.exchangeAuthCode({
        clientId: primary.clientId,
        code: second.code,
        redirectUri: REDIRECT_URI,
        codeVerifier: VERIFIER,
        devicePublicKey: DEVICE_KEY,
        installationId: INSTALLATION_ID,
      }),
    ).rejects.toMatchObject({ code: "AUTH_CODE_INVALID" });
  });

  it("rejects code issued for another client", async () => {
    const suffix = crypto.randomUUID();
    const { userId, primary, other, store } = await seedClient(suffix);
    const service = createDesktopAuthService({ store, db });
    const issued = await service.issueAuthCode({
      userId,
      client: primary,
      codeChallenge: createPkceChallenge(VERIFIER),
      redirectUri: REDIRECT_URI,
    });

    await expect(
      service.exchangeAuthCode({
        clientId: other.clientId,
        code: issued.code,
        redirectUri: REDIRECT_URI,
        codeVerifier: VERIFIER,
        devicePublicKey: DEVICE_KEY,
        installationId: INSTALLATION_ID,
      }),
    ).rejects.toMatchObject({ code: "AUTH_CODE_INVALID" });
  });

  it("rejects wrong redirect URI on exchange", async () => {
    const suffix = crypto.randomUUID();
    const { userId, primary, store } = await seedClient(suffix);
    const service = createDesktopAuthService({ store, db });
    const issued = await service.issueAuthCode({
      userId,
      client: primary,
      codeChallenge: createPkceChallenge(VERIFIER),
      redirectUri: REDIRECT_URI,
    });

    await expect(
      service.exchangeAuthCode({
        clientId: primary.clientId,
        code: issued.code,
        redirectUri: "khepree-dev://other/callback",
        codeVerifier: VERIFIER,
        devicePublicKey: DEVICE_KEY,
        installationId: INSTALLATION_ID,
      }),
    ).rejects.toMatchObject({ code: "REDIRECT_URI_INVALID" });
  });

  it("stores only hashed auth codes", async () => {
    const suffix = crypto.randomUUID();
    const { userId, primary, store } = await seedClient(suffix);
    const service = createDesktopAuthService({ store, db });
    const issued = await service.issueAuthCode({
      userId,
      client: primary,
      codeChallenge: createPkceChallenge(VERIFIER),
      redirectUri: REDIRECT_URI,
    });

    const rows = await db!
      .select()
      .from(desktopAuthCodes)
      .where(eq(desktopAuthCodes.id, issued.record.id));
    expect(rows[0]?.codeHash).toBe(hashSecret(issued.code));
    expect(JSON.stringify(rows)).not.toContain(issued.code);
  });

  it("rejects invalid PKCE verifier", async () => {
    const suffix = crypto.randomUUID();
    const { userId, primary, store } = await seedClient(suffix);
    const service = createDesktopAuthService({ store, db });
    const issued = await service.issueAuthCode({
      userId,
      client: primary,
      codeChallenge: createPkceChallenge(VERIFIER),
      redirectUri: REDIRECT_URI,
    });

    try {
      await service.exchangeAuthCode({
        clientId: primary.clientId,
        code: issued.code,
        redirectUri: REDIRECT_URI,
        codeVerifier: "wrong-verifier-value-1234567890",
        devicePublicKey: DEVICE_KEY,
        installationId: INSTALLATION_ID,
      });
      throw new Error("expected PKCE_INVALID");
    } catch (error) {
      expect(isDesktopAuthError(error)).toBe(true);
      if (isDesktopAuthError(error)) expect(error.code).toBe("PKCE_INVALID");
    }
  });
});
