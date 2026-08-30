import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  auditLogs,
  createPublicId,
  entitlements,
  getDb,
  licenses,
  outboxEvents,
  plans,
  products,
  user,
  withTransaction,
} from "@khepree/db";
import {
  COMMERCE_ORDER_PAID_V1,
  DrizzleOutboxStore,
  PollingOutboxDispatcher,
  commerceOrderPaidEventId,
} from "@khepree/events";
import { createEntitlementOrderHandlers } from "./commerce-hooks";
import { createEntitlementService } from "./service";

const db = getDb();
const pg = Boolean(db && process.env.INTEGRATION === "1");

async function seedAccountPlan() {
  if (!db) throw new Error("DATABASE_URL required");
  const suffix = crypto.randomUUID();
  const [product] = await db
    .insert(products)
    .values({
      publicId: createPublicId("prd"),
      slug: `ent-${suffix}`,
      status: "active",
      licensingMode: "ACCOUNT",
    })
    .returning();
  if (!product) throw new Error("product insert failed");
  const [plan] = await db
    .insert(plans)
    .values({
      publicId: createPublicId("pln"),
      productId: product.id,
      slug: "term",
      billingType: "one_time",
      accessTermDays: 30,
      status: "active",
    })
    .returning();
  if (!plan) throw new Error("plan insert failed");
  return { product, plan, suffix };
}

describe.skipIf(!pg)("Entitlement provisioning (Postgres)", () => {
  it("rolls back grant + audit when the surrounding transaction throws", async () => {
    if (!db) throw new Error("DATABASE_URL required");
    const { product, plan, suffix } = await seedAccountPlan();
    const userId = `ent_${suffix}`;
    await db.insert(user).values({
      id: userId,
      name: "Entitlement",
      email: `${userId}@example.test`,
      emailVerified: false,
    });
    const entitlement = createEntitlementService({ db });
    await expect(
      withTransaction(db, async (tx) => {
        await entitlement.grantInTransaction(tx, {
          principal: { type: "USER", id: userId },
          productId: product.id,
          planId: plan.id,
          source: "perpetual",
          actorUserId: userId,
          provisionLicense: false,
        });
        throw new Error("forced-grant-rollback");
      }),
    ).rejects.toThrow("forced-grant-rollback");

    const granted = await db
      .select({ id: entitlements.id })
      .from(entitlements)
      .where(eq(entitlements.principalId, userId));
    expect(granted).toHaveLength(0);
    const audits = await db.select({ id: auditLogs.id }).from(auditLogs).where(eq(auditLogs.actorUserId, userId));
    expect(audits).toHaveLength(0);

    await db.delete(plans).where(eq(plans.id, plan.id));
    await db.delete(products).where(eq(products.id, product.id));
    await db.delete(user).where(eq(user.id, userId));
  });

  it("dispatches commerce.order.paid.v1 into an entitlement without a license for ACCOUNT products", async () => {
    if (!db) throw new Error("DATABASE_URL required");
    const { product, plan, suffix } = await seedAccountPlan();
    const userId = `ent2_${suffix}`;
    await db.insert(user).values({
      id: userId,
      name: "Paid",
      email: `${userId}@example.test`,
      emailVerified: false,
    });
    const entitlement = createEntitlementService({ db });
    const orderPublicId = `ord_${suffix}`;
    const store = new DrizzleOutboxStore(db);
    const publicId = commerceOrderPaidEventId(orderPublicId);
    await store.enqueue({
      publicId,
      eventType: COMMERCE_ORDER_PAID_V1,
      aggregateType: "order",
      aggregateId: orderPublicId,
      payload: {
        orderId: crypto.randomUUID(),
        orderPublicId,
        paymentPublicId: `pay_${suffix}`,
        customer: { userId, organizationId: null },
        currency: "VND",
        totalMinor: "1000",
        items: [
          {
            orderItemId: `item_${suffix}`,
            productId: product.id,
            planId: plan.id,
            accessTermDays: 30,
          },
        ],
        occurredAt: new Date().toISOString(),
      },
    });
    const dispatcher = new PollingOutboxDispatcher({
      store,
      handlers: createEntitlementOrderHandlers(entitlement),
    });
    await dispatcher.dispatchPending();

    const rows = await db.select().from(entitlements).where(eq(entitlements.principalId, userId));
    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("active");
    const licenseRows = await db.select().from(licenses).where(eq(licenses.entitlementId, rows[0]!.id));
    expect(licenseRows).toHaveLength(0);

    await db.delete(outboxEvents).where(eq(outboxEvents.publicId, publicId));
    await db.delete(entitlements).where(eq(entitlements.principalId, userId));
    await db.delete(plans).where(eq(plans.id, plan.id));
    await db.delete(products).where(eq(products.id, product.id));
    await db.delete(user).where(eq(user.id, userId));
  });
});
