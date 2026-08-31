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

describe.skipIf(!pg)("Desktop auth persistence (Postgres)", () => {
  it("stores hashed auth codes and sessions — never plaintext tokens", async () => {
    if (!db) throw new Error("DATABASE_URL required");
    const suffix = crypto.randomUUID();
    const userId = `dsk_${suffix}`;
    await db.insert(user).values({
      id: userId,
      name: "Desktop User",
      email: `${userId}@example.test`,
      emailVerified: true,
    });

    const [product] = await db
      .insert(products)
      .values({
        publicId: createPublicId("prd"),
        slug: `desktop-${suffix}`,
        status: "active",
        licensingMode: "ACCOUNT",
        platformCapabilities: ["desktop"],
      })
      .returning();
    if (!product) throw new Error("product insert failed");

    const store = createDrizzleDesktopAuthRepository(db);
    const client = await store.insertClient({
      clientId: `dev-client-${suffix}`,
      productId: product.id,
      displayName: "Dev Desktop Client",
      allowedRedirectUris: ["khepree-dev://auth/callback"],
    });

    const codeVerifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const codeChallenge = createPkceChallenge(codeVerifier);
    const redirectUri = "khepree-dev://auth/callback";
    const service = createDesktopAuthService({ store });

    const issued = await service.issueAuthCode({
      userId,
      client,
      codeChallenge,
      redirectUri,
    });

    const codeRows = await db
      .select()
      .from(desktopAuthCodes)
      .where(eq(desktopAuthCodes.id, issued.record.id));
    expect(codeRows).toHaveLength(1);
    expect(codeRows[0]?.codeHash).toBe(hashSecret(issued.code));
    expect(JSON.stringify(codeRows)).not.toContain(issued.code);

    await service.consumeAuthCode(
      { code: issued.code, codeVerifier, redirectUri },
      { client },
    );

    await expect(
      service.consumeAuthCode({ code: issued.code, codeVerifier, redirectUri }, { client }),
    ).rejects.toMatchObject({ code: "AUTH_CODE_INVALID" });

    const session = await service.createSession({ userId, client });
    const sessionRows = await db
      .select()
      .from(desktopSessions)
      .where(eq(desktopSessions.id, session.record.id));
    expect(sessionRows).toHaveLength(1);
    expect(sessionRows[0]?.accessTokenHash).toBe(hashSecret(session.accessToken));
    expect(sessionRows[0]?.refreshTokenHash).toBe(hashSecret(session.refreshToken));
    expect(JSON.stringify(sessionRows)).not.toContain(session.accessToken);
    expect(JSON.stringify(sessionRows)).not.toContain(session.refreshToken);
  });

  it("rejects expired authorization codes", async () => {
    if (!db) throw new Error("DATABASE_URL required");
    const suffix = crypto.randomUUID();
    const userId = `dsk_exp_${suffix}`;
    await db.insert(user).values({
      id: userId,
      name: "Expired",
      email: `${userId}@example.test`,
      emailVerified: true,
    });

    const [product] = await db
      .insert(products)
      .values({
        publicId: createPublicId("prd"),
        slug: `desktop-exp-${suffix}`,
        status: "active",
        licensingMode: "ACCOUNT",
      })
      .returning();
    if (!product) throw new Error("product insert failed");

    const store = createDrizzleDesktopAuthRepository(db);
    const client = await store.insertClient({
      clientId: `exp-client-${suffix}`,
      productId: product.id,
      displayName: "Expired Client",
      allowedRedirectUris: ["khepree-dev://auth/callback"],
    });

    const fixedNow = new Date("2026-01-01T00:00:00.000Z");
    const service = createDesktopAuthService({
      store,
      now: () => fixedNow,
      authCodeTtlSeconds: 60,
    });

    const codeVerifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const issued = await service.issueAuthCode({
      userId,
      client,
      codeChallenge: createPkceChallenge(codeVerifier),
      redirectUri: "khepree-dev://auth/callback",
    });

    const expiredService = createDesktopAuthService({
      store,
      now: () => new Date(fixedNow.getTime() + 120_000),
    });

    try {
      await expiredService.consumeAuthCode(
        {
          code: issued.code,
          codeVerifier,
          redirectUri: "khepree-dev://auth/callback",
        },
        { client },
      );
      throw new Error("expected AUTH_CODE_EXPIRED");
    } catch (error) {
      expect(isDesktopAuthError(error)).toBe(true);
      if (isDesktopAuthError(error)) {
        expect(error.code).toBe("AUTH_CODE_EXPIRED");
      }
    }
  });
});
