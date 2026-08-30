import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createPublicId, getDb, partners, wallets, walletTransactions } from "@khepree/db";
import { DrizzlePartnerRepository } from "./drizzle-store";

const db = getDb();
const pg = Boolean(db && process.env.INTEGRATION === "1");

describe.skipIf(!pg)("Partner wallet locks (Postgres)", () => {
  it("serializes concurrent debits so the balance cannot go negative", async () => {
    if (!db) throw new Error("DATABASE_URL required");
    const slug = `lock-${crypto.randomUUID()}`;
    const [partner] = await db
      .insert(partners)
      .values({
        publicId: createPublicId("ptr"),
        slug,
        name: "Lock Test",
        status: "active",
        modes: ["RESELLER"],
        defaultCurrency: "VND",
      })
      .returning();
    if (!partner) throw new Error("partner insert failed");
    const [wallet] = await db
      .insert(wallets)
      .values({ partnerId: partner.id, balanceMinor: 1000n, currency: "VND" })
      .returning();
    if (!wallet) throw new Error("wallet insert failed");
    const partnerId = partner.id;
    const walletId = wallet.id;

    const repo = new DrizzlePartnerRepository(db);
    async function debit(key: string) {
      await repo.withWalletLock(walletId, async (locked) => {
        const current = await locked.getWalletByPartner(partnerId);
        if (!current || current.balanceMinor < 800n) throw new Error("INSUFFICIENT");
        await locked.insertWalletTx({
          walletId,
          amountMinor: 800n,
          type: "DEBIT",
          idempotencyKey: key,
          referenceType: "test",
          referenceId: key,
        });
        await locked.updateWalletBalance(walletId, current.balanceMinor - 800n);
      });
    }

    const results = await Promise.allSettled([debit("debit-a"), debit("debit-b")]);
    expect(results.filter((row) => row.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((row) => row.status === "rejected")).toHaveLength(1);
    const after = await repo.getWalletByPartner(partnerId);
    expect(after?.balanceMinor).toBe(200n);

    await db.delete(walletTransactions).where(eq(walletTransactions.walletId, walletId));
    await db.delete(wallets).where(eq(wallets.id, walletId));
    await db.delete(partners).where(eq(partners.id, partnerId));
  });
});
