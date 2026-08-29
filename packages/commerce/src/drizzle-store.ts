import { and, desc, eq, inArray } from "drizzle-orm";
import {
  createPublicId,
  customers,
  orderItems,
  orders,
  payments,
  subscriptions,
  webhookEvents,
  withTransaction,
  type Database,
} from "@khepree/db";
import { CommerceError } from "./errors";
import type { CommerceRepository, NewOrderInput, NewOrderItemInput, NewPaymentInput, NewSubscriptionInput } from "./store";
import type {
  CustomerOwner,
  CustomerRecord,
  OrderItemRecord,
  OrderRecord,
  OrderStatus,
  PaymentRecord,
  PaymentStatus,
  SubscriptionRecord,
  SubscriptionStatus,
} from "./types";

export class DrizzleCommerceRepository implements CommerceRepository {
  constructor(private readonly db: Database) {}

  async withTransaction<T>(fn: (repo: CommerceRepository) => Promise<T>): Promise<T> {
    return withTransaction(this.db, async (tx) => fn(new DrizzleCommerceRepository(tx)));
  }

  async getOrCreateCustomer(owner: CustomerOwner): Promise<CustomerRecord> {
    const existing = await this.getCustomerByOwner(owner);
    if (existing) return existing;

    try {
      const [row] = await this.db
        .insert(customers)
        .values({
          publicId: createPublicId("cus"),
          userId: owner.type === "user" ? owner.userId : null,
          organizationId: owner.type === "organization" ? owner.organizationId : null,
        })
        .returning();
      if (!row) throw new CommerceError("CONFLICT", "Could not create customer");
      return mapCustomer(row);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const raced = await this.getCustomerByOwner(owner);
      if (raced) return raced;
      throw error;
    }
  }

  async getCustomerById(id: string): Promise<CustomerRecord | null> {
    const [row] = await this.db.select().from(customers).where(eq(customers.id, id)).limit(1);
    return row ? mapCustomer(row) : null;
  }

  async getCustomerByOwner(owner: CustomerOwner): Promise<CustomerRecord | null> {
    const [row] =
      owner.type === "user"
        ? await this.db.select().from(customers).where(eq(customers.userId, owner.userId)).limit(1)
        : await this.db
            .select()
            .from(customers)
            .where(eq(customers.organizationId, owner.organizationId))
            .limit(1);
    return row ? mapCustomer(row) : null;
  }

  async insertOrder(input: NewOrderInput): Promise<OrderRecord> {
    const [row] = await this.db
      .insert(orders)
      .values({
        publicId: createPublicId("ord"),
        customerId: input.customerId,
        status: "draft",
        currency: input.currency,
        totalMinor: input.totalMinor,
      })
      .returning();
    if (!row) throw new CommerceError("CONFLICT", "Could not create order");
    return mapOrder(row);
  }

  async getOrderById(id: string): Promise<OrderRecord | null> {
    const [row] = await this.db.select().from(orders).where(eq(orders.id, id)).limit(1);
    return row ? mapOrder(row) : null;
  }

  async getOrderByPublicId(publicId: string): Promise<OrderRecord | null> {
    const [row] = await this.db.select().from(orders).where(eq(orders.publicId, publicId)).limit(1);
    return row ? mapOrder(row) : null;
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<OrderRecord> {
    const [row] = await this.db
      .update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    if (!row) throw new CommerceError("NOT_FOUND", "Order not found");
    return mapOrder(row);
  }

  async listOrdersByCustomer(customerId: string): Promise<OrderRecord[]> {
    const rows = await this.db
      .select()
      .from(orders)
      .where(eq(orders.customerId, customerId))
      .orderBy(desc(orders.createdAt));
    return rows.map(mapOrder);
  }

  async insertOrderItem(input: NewOrderItemInput): Promise<OrderItemRecord> {
    const [row] = await this.db.insert(orderItems).values(input).returning();
    if (!row) throw new CommerceError("CONFLICT", "Could not create order item");
    return mapItem(row);
  }

  async listOrderItems(orderId: string): Promise<OrderItemRecord[]> {
    const rows = await this.db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    return rows.map(mapItem);
  }

  async listOrderItemsForOrders(orderIds: string[]): Promise<OrderItemRecord[]> {
    if (orderIds.length === 0) return [];
    const rows = await this.db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds));
    return rows.map(mapItem);
  }

  async insertPayment(input: NewPaymentInput): Promise<PaymentRecord> {
    const [row] = await this.db
      .insert(payments)
      .values({
        publicId: createPublicId("pay"),
        orderId: input.orderId,
        provider: input.provider,
        providerPaymentId: input.providerPaymentId,
        amountMinor: input.amountMinor,
        currency: input.currency,
        status: input.status ?? "pending",
      })
      .returning();
    if (!row) throw new CommerceError("CONFLICT", "Could not create payment");
    return mapPayment(row);
  }

  async getPaymentById(id: string): Promise<PaymentRecord | null> {
    const [row] = await this.db.select().from(payments).where(eq(payments.id, id)).limit(1);
    return row ? mapPayment(row) : null;
  }

  async getPaymentByProviderId(
    provider: string,
    providerPaymentId: string,
  ): Promise<PaymentRecord | null> {
    const [row] = await this.db
      .select()
      .from(payments)
      .where(and(eq(payments.provider, provider), eq(payments.providerPaymentId, providerPaymentId)))
      .limit(1);
    return row ? mapPayment(row) : null;
  }

  async listPaymentsByOrder(orderId: string): Promise<PaymentRecord[]> {
    const rows = await this.db.select().from(payments).where(eq(payments.orderId, orderId));
    return rows.map(mapPayment);
  }

  async listPaymentsForOrders(orderIds: string[]): Promise<PaymentRecord[]> {
    if (orderIds.length === 0) return [];
    const rows = await this.db.select().from(payments).where(inArray(payments.orderId, orderIds));
    return rows.map(mapPayment);
  }

  async updatePayment(
    id: string,
    patch: { status?: PaymentStatus; providerPaymentId?: string | null },
  ): Promise<PaymentRecord> {
    const [row] = await this.db
      .update(payments)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning();
    if (!row) throw new CommerceError("NOT_FOUND", "Payment not found");
    return mapPayment(row);
  }

  async insertSubscription(input: NewSubscriptionInput): Promise<SubscriptionRecord> {
    const [row] = await this.db
      .insert(subscriptions)
      .values({
        publicId: createPublicId("sub"),
        ...input,
      })
      .returning();
    if (!row) throw new CommerceError("CONFLICT", "Could not create subscription");
    return mapSubscription(row);
  }

  async listSubscriptionsByCustomer(customerId: string): Promise<SubscriptionRecord[]> {
    const rows = await this.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.customerId, customerId))
      .orderBy(desc(subscriptions.createdAt));
    return rows.map(mapSubscription);
  }

  async updateSubscriptionStatus(id: string, status: SubscriptionStatus): Promise<void> {
    const [row] = await this.db
      .update(subscriptions)
      .set({ status, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning({ id: subscriptions.id });
    if (!row) throw new CommerceError("NOT_FOUND", "Subscription not found");
  }

  async claimWebhookEvent(input: {
    provider: string;
    eventId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<"inserted" | "duplicate" | "retry"> {
    try {
      await this.db.insert(webhookEvents).values({
        provider: input.provider,
        eventId: input.eventId,
        eventType: input.eventType,
        payload: input.payload,
      });
      return "inserted";
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      const [existing] = await this.db
        .select()
        .from(webhookEvents)
        .where(and(eq(webhookEvents.provider, input.provider), eq(webhookEvents.eventId, input.eventId)))
        .limit(1);
      if (!existing) throw error;
      return existing.processedAt ? "duplicate" : "retry";
    }
  }

  async markWebhookProcessed(provider: string, eventId: string): Promise<void> {
    await this.db
      .update(webhookEvents)
      .set({ processedAt: new Date() })
      .where(and(eq(webhookEvents.provider, provider), eq(webhookEvents.eventId, eventId)));
  }
}

function mapCustomer(row: typeof customers.$inferSelect): CustomerRecord {
  return {
    id: row.id,
    publicId: row.publicId,
    userId: row.userId,
    organizationId: row.organizationId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapOrder(row: typeof orders.$inferSelect): OrderRecord {
  return {
    id: row.id,
    publicId: row.publicId,
    customerId: row.customerId,
    status: row.status,
    currency: row.currency,
    totalMinor: row.totalMinor,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapItem(row: typeof orderItems.$inferSelect): OrderItemRecord {
  return {
    id: row.id,
    orderId: row.orderId,
    productId: row.productId,
    planId: row.planId,
    priceId: row.priceId,
    quantity: row.quantity,
    unitAmountMinor: row.unitAmountMinor,
    currency: row.currency,
    productNameSnapshot: row.productNameSnapshot,
    planNameSnapshot: row.planNameSnapshot,
    billingIntervalSnapshot: row.billingIntervalSnapshot,
  };
}

function mapPayment(row: typeof payments.$inferSelect): PaymentRecord {
  return {
    id: row.id,
    publicId: row.publicId,
    orderId: row.orderId,
    provider: row.provider,
    providerPaymentId: row.providerPaymentId,
    status: row.status,
    amountMinor: row.amountMinor,
    currency: row.currency,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapSubscription(row: typeof subscriptions.$inferSelect): SubscriptionRecord {
  return {
    id: row.id,
    publicId: row.publicId,
    customerId: row.customerId,
    planId: row.planId,
    productId: row.productId,
    priceId: row.priceId,
    provider: row.provider,
    providerSubscriptionId: row.providerSubscriptionId,
    status: row.status,
    currentPeriodStart: row.currentPeriodStart,
    currentPeriodEnd: row.currentPeriodEnd,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let i = 0; i < 4 && current && typeof current === "object"; i++) {
    const record = current as { code?: string; cause?: unknown };
    if (record.code === "23505") return true;
    current = record.cause;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /duplicate key|unique constraint/i.test(message);
}
