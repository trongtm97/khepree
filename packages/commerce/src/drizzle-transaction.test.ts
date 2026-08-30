import { and, eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { customers, getDb, orders, outboxEvents, payments, refunds, user, webhookEvents } from "@khepree/db";
import { DrizzleCommerceRepository } from "./drizzle-store";
import { SePayPaymentProvider } from "./sepay";
import { createCommerceService } from "./service";

const db = getDb();
const pg = Boolean(db && process.env.INTEGRATION === "1");

describe.skipIf(!pg)("Drizzle commerce transactions (Postgres)", () => {
  it("rolls back work when the transaction callback throws", async () => {
    if (!db) throw new Error("DATABASE_URL required");
    const store = new DrizzleCommerceRepository(db);
    const eventId = `evt_rollback_${crypto.randomUUID()}`;
    await expect(
      store.withTransaction(async (repo) => {
        await repo.claimWebhookEvent({
          provider: "sepay",
          eventId,
          eventType: "TRANSACTION_VOID",
          payload: { probe: true },
        });
        throw new Error("forced-rollback");
      }),
    ).rejects.toThrow("forced-rollback");

    const rows = await db
      .select({ id: webhookEvents.id })
      .from(webhookEvents)
      .where(and(eq(webhookEvents.provider, "sepay"), eq(webhookEvents.eventId, eventId)));
    expect(rows).toHaveLength(0);
  });

  it("commits manual_required refunds and confirms them without a second hook", async () => {
    if (!db) throw new Error("DATABASE_URL required");

    const userId = `phase131_${crypto.randomUUID()}`;
    const store = new DrizzleCommerceRepository(db);
    await db.insert(user).values({
      id: userId,
      name: "Phase 13.1",
      email: `${userId}@example.test`,
      emailVerified: false,
    });

    let customerId: string | undefined;
    let orderId: string | undefined;
    let paymentId: string | undefined;
    try {
      const customer = await store.getOrCreateCustomer({ type: "user", userId });
      customerId = customer.id;
      const order = await store.insertOrder({
        customerId: customer.id,
        currency: "VND",
        totalMinor: 599000n,
      });
      orderId = order.id;
      await store.updateOrderStatus(order.id, "pending_payment");
      await store.updateOrderStatus(order.id, "paid");
      const payment = await store.insertPayment({
        orderId: order.id,
        provider: "sepay",
        providerPaymentId: `KHP_${order.publicId}`,
        amountMinor: 599000n,
        currency: "VND",
        status: "succeeded",
      });
      paymentId = payment.id;

      const refunded: string[] = [];
      const commerce = createCommerceService({
        store,
        provider: new SePayPaymentProvider({
          env: "sandbox",
          merchantId: "MERCHANT_123",
          secretKey: "test-sepay-secret",
          ipnSecret: "test-ipn-secret",
        }),
        catalog: { getPurchasableOffer: async () => null },
        audit: { record: async () => undefined },
        hooks: {
          afterRefunded: async (ctx) => {
            refunded.push(ctx.payment.id);
          },
        },
      });

      const requested = await commerce.requestRefund({
        paymentId: payment.id,
        amountMinor: 599000n,
        actorUserId: userId,
        reason: "customer_request",
      });
      expect(requested.outcome).toBe("manual_required");

      const persisted = await store.getRefundById(requested.refund.id);
      expect(persisted?.status).toBe("manual_required");
      expect((await store.getPaymentById(payment.id))?.status).toBe("succeeded");
      expect((await store.getOrderById(order.id))?.status).toBe("paid");
      expect(refunded).toEqual([]);

      const confirmed = await commerce.confirmManualRefund({
        refundId: requested.refund.id,
        actorUserId: userId,
        reason: "finance_wire",
      });
      expect(confirmed.outcome).toBe("completed");
      expect((await store.getRefundById(requested.refund.id))?.status).toBe("succeeded");
      expect((await store.getPaymentById(payment.id))?.status).toBe("refunded");
      expect((await store.getOrderById(order.id))?.status).toBe("refunded");
      expect(refunded).toEqual([payment.id]);

      await commerce.confirmManualRefund({
        refundId: requested.refund.id,
        actorUserId: userId,
        reason: "finance_wire",
      });
      expect(refunded).toEqual([payment.id]);
    } finally {
      if (paymentId) await db.delete(refunds).where(eq(refunds.paymentId, paymentId));
      if (paymentId) await db.delete(payments).where(eq(payments.id, paymentId));
      if (orderId) await db.delete(orders).where(eq(orders.id, orderId));
      if (customerId) await db.delete(customers).where(eq(customers.id, customerId));
      await db.delete(user).where(eq(user.id, userId));
    }
  });

  it("rolls back outbox rows with the payment transaction", async () => {
    if (!db) throw new Error("DATABASE_URL required");
    const store = new DrizzleCommerceRepository(db);
    const publicId = `evt_outbox_${crypto.randomUUID()}`;
    await expect(
      store.withTransaction(async (repo) => {
        await repo.enqueueOutbox({
          publicId,
          eventType: "commerce.order.paid.v1",
          aggregateType: "order",
          aggregateId: "ord_test",
          payload: { orderPublicId: "ord_test" },
        });
        throw new Error("forced-outbox-rollback");
      }),
    ).rejects.toThrow("forced-outbox-rollback");

    const rows = await db.select({ id: outboxEvents.id }).from(outboxEvents).where(eq(outboxEvents.publicId, publicId));
    expect(rows).toHaveLength(0);
  });

  it("commits outbox rows with the surrounding transaction", async () => {
    if (!db) throw new Error("DATABASE_URL required");
    const store = new DrizzleCommerceRepository(db);
    const publicId = `evt_outbox_${crypto.randomUUID()}`;
    await store.withTransaction(async (repo) => {
      await repo.enqueueOutbox({
        publicId,
        eventType: "commerce.order.paid.v1",
        aggregateType: "order",
        aggregateId: "ord_test",
        payload: { orderPublicId: "ord_test" },
      });
    });
    const rows = await db.select({ id: outboxEvents.id }).from(outboxEvents).where(eq(outboxEvents.publicId, publicId));
    expect(rows).toHaveLength(1);
    await db.delete(outboxEvents).where(eq(outboxEvents.publicId, publicId));
  });
});
