import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  auditLogs,
  createDrizzleAuditService,
  getDb,
  withTransaction,
} from "@khepree/db";

const db = getDb();
const pg = Boolean(db && process.env.INTEGRATION === "1");

describe.skipIf(!pg)("Audit transaction consistency (Postgres)", () => {
  it("rolls back audit rows written on a bound transaction", async () => {
    if (!db) throw new Error("DATABASE_URL required");
    const action = `audit.rollback.${crypto.randomUUID()}`;
    const audit = createDrizzleAuditService(db);
    await expect(
      withTransaction(db, async (tx) => {
        await audit.bind!(tx).record({
          action,
          resourceType: "payment",
          resourceId: "pay_test",
        });
        throw new Error("forced-audit-rollback");
      }),
    ).rejects.toThrow("forced-audit-rollback");

    const rows = await db.select({ id: auditLogs.id }).from(auditLogs).where(eq(auditLogs.action, action));
    expect(rows).toHaveLength(0);
  });

  it("commits audit rows with the surrounding transaction", async () => {
    if (!db) throw new Error("DATABASE_URL required");
    const action = `audit.commit.${crypto.randomUUID()}`;
    const audit = createDrizzleAuditService(db);
    await withTransaction(db, async (tx) => {
      await audit.bind!(tx).record({
        action,
        resourceType: "payment",
        resourceId: "pay_test",
      });
    });
    const rows = await db.select({ id: auditLogs.id }).from(auditLogs).where(eq(auditLogs.action, action));
    expect(rows).toHaveLength(1);
    await db.delete(auditLogs).where(eq(auditLogs.action, action));
  });
});
