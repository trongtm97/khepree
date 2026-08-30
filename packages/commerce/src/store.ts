import { createPublicId } from "@khepree/db";
import type { Database } from "@khepree/db";
import { MemoryOutboxStore, type NewOutboxEvent } from "@khepree/events";
import { CommerceError } from "./errors";
import type {
  CustomerOwner,
  CustomerRecord,
  OrderItemRecord,
  OrderRecord,
  OrderStatus,
  PaymentRecord,
  PaymentStatus,
  RefundRecord,
  RefundStatus,
  SubscriptionRecord,
  SubscriptionStatus,
} from "./types";

export type WebhookClaimResult = "inserted" | "duplicate" | "retry";

export interface NewOrderInput {
  customerId: string;
  currency: string;
  totalMinor: bigint;
}

export interface NewOrderItemInput {
  orderId: string;
  productId: string;
  planId: string;
  priceId: string | null;
  quantity: number;
  unitAmountMinor: bigint;
  currency: string;
  productNameSnapshot: string;
  planNameSnapshot: string;
  billingIntervalSnapshot: string | null;
  accessTermDaysSnapshot?: number | null;
}

export interface NewPaymentInput {
  orderId: string;
  provider: string;
  providerPaymentId: string | null;
  amountMinor: bigint;
  currency: string;
  status?: PaymentStatus;
  method?: string | null;
  providerSubscriptionId?: string | null;
}

export interface NewSubscriptionInput {
  customerId: string;
  planId: string;
  productId: string;
  priceId: string | null;
  provider: string | null;
  providerSubscriptionId: string | null;
  status: SubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
}

export interface CommerceRepository {
  withTransaction<T>(fn: (repo: CommerceRepository) => Promise<T>): Promise<T>;
  /** Drizzle transaction connection; undefined for the memory store. */
  connection?: Database;

  enqueueOutbox(input: NewOutboxEvent): Promise<void>;

  getOrCreateCustomer(owner: CustomerOwner): Promise<CustomerRecord>;
  getCustomerById(id: string): Promise<CustomerRecord | null>;
  getCustomerByOwner(owner: CustomerOwner): Promise<CustomerRecord | null>;

  insertOrder(input: NewOrderInput): Promise<OrderRecord>;
  getOrderById(id: string): Promise<OrderRecord | null>;
  getOrderByPublicId(publicId: string): Promise<OrderRecord | null>;
  updateOrderStatus(id: string, status: OrderStatus): Promise<OrderRecord>;
  listOrdersByCustomer(customerId: string): Promise<OrderRecord[]>;

  insertOrderItem(input: NewOrderItemInput): Promise<OrderItemRecord>;
  listOrderItems(orderId: string): Promise<OrderItemRecord[]>;
  listOrderItemsForOrders(orderIds: string[]): Promise<OrderItemRecord[]>;

  insertPayment(input: NewPaymentInput): Promise<PaymentRecord>;
  getPaymentById(id: string): Promise<PaymentRecord | null>;
  getPaymentByProviderId(provider: string, providerPaymentId: string): Promise<PaymentRecord | null>;
  listPaymentsByOrder(orderId: string): Promise<PaymentRecord[]>;
  listPaymentsForOrders(orderIds: string[]): Promise<PaymentRecord[]>;
  updatePayment(
    id: string,
    patch: {
      status?: PaymentStatus;
      providerPaymentId?: string | null;
      method?: string | null;
      providerSubscriptionId?: string | null;
    },
  ): Promise<PaymentRecord>;

  insertRefund(input: {
    paymentId: string;
    provider: string;
    providerRefundId?: string | null;
    amountMinor: bigint;
    currency: string;
    status: RefundStatus;
    reason?: string | null;
    initiatedBy?: string | null;
  }): Promise<RefundRecord>;
  getRefundById(id: string): Promise<RefundRecord | null>;
  listRefundsByPayment(paymentId: string): Promise<RefundRecord[]>;
  updateRefund(
    id: string,
    patch: { status?: RefundStatus; providerRefundId?: string | null },
  ): Promise<RefundRecord>;

  insertSubscription(input: NewSubscriptionInput): Promise<SubscriptionRecord>;
  listSubscriptionsByCustomer(customerId: string): Promise<SubscriptionRecord[]>;
  updateSubscriptionStatus(id: string, status: SubscriptionStatus): Promise<void>;

  claimWebhookEvent(input: {
    provider: string;
    eventId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<WebhookClaimResult>;
  markWebhookProcessed(provider: string, eventId: string): Promise<void>;
}

interface MemoryWebhook {
  provider: string;
  eventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  processedAt: Date | null;
}

/** In-memory commerce store for tests. Not used in production. */
export class MemoryCommerceRepository implements CommerceRepository {
  customers: CustomerRecord[] = [];
  orders: OrderRecord[] = [];
  items: OrderItemRecord[] = [];
  payments: PaymentRecord[] = [];
  subscriptions: SubscriptionRecord[] = [];
  refunds: RefundRecord[] = [];
  webhooks: MemoryWebhook[] = [];
  readonly outbox: MemoryOutboxStore;

  constructor(private readonly now: () => Date = () => new Date()) {
    this.outbox = new MemoryOutboxStore(now);
  }

  async enqueueOutbox(input: NewOutboxEvent): Promise<void> {
    await this.outbox.enqueue(input);
  }

  async withTransaction<T>(fn: (repo: CommerceRepository) => Promise<T>): Promise<T> {
    // ponytail: no isolation/rollback in memory; use Drizzle transactions in production.
    return fn(this);
  }

  async getOrCreateCustomer(owner: CustomerOwner): Promise<CustomerRecord> {
    const existing = await this.getCustomerByOwner(owner);
    if (existing) return existing;
    const timestamp = this.now();
    const row: CustomerRecord = {
      id: crypto.randomUUID(),
      publicId: createPublicId("cus"),
      userId: owner.type === "user" ? owner.userId : null,
      organizationId: owner.type === "organization" ? owner.organizationId : null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.customers.push(row);
    return row;
  }

  async getCustomerById(id: string): Promise<CustomerRecord | null> {
    return this.customers.find((row) => row.id === id) ?? null;
  }

  async getCustomerByOwner(owner: CustomerOwner): Promise<CustomerRecord | null> {
    if (owner.type === "user") {
      return this.customers.find((row) => row.userId === owner.userId) ?? null;
    }
    return this.customers.find((row) => row.organizationId === owner.organizationId) ?? null;
  }

  async insertOrder(input: NewOrderInput): Promise<OrderRecord> {
    const timestamp = this.now();
    const row: OrderRecord = {
      id: crypto.randomUUID(),
      publicId: createPublicId("ord"),
      customerId: input.customerId,
      status: "draft",
      currency: input.currency,
      totalMinor: input.totalMinor,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.orders.push(row);
    return row;
  }

  async getOrderById(id: string): Promise<OrderRecord | null> {
    return this.orders.find((row) => row.id === id) ?? null;
  }

  async getOrderByPublicId(publicId: string): Promise<OrderRecord | null> {
    return this.orders.find((row) => row.publicId === publicId) ?? null;
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<OrderRecord> {
    const row = requireRow(this.orders.find((item) => item.id === id), "Order");
    row.status = status;
    row.updatedAt = this.now();
    return row;
  }

  async listOrdersByCustomer(customerId: string): Promise<OrderRecord[]> {
    return this.orders
      .filter((row) => row.customerId === customerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async insertOrderItem(input: NewOrderItemInput): Promise<OrderItemRecord> {
    const row: OrderItemRecord = {
      id: crypto.randomUUID(),
      ...input,
      accessTermDaysSnapshot: input.accessTermDaysSnapshot ?? null,
    };
    this.items.push(row);
    return row;
  }

  async listOrderItems(orderId: string): Promise<OrderItemRecord[]> {
    return this.items.filter((row) => row.orderId === orderId);
  }

  async listOrderItemsForOrders(orderIds: string[]): Promise<OrderItemRecord[]> {
    const set = new Set(orderIds);
    return this.items.filter((row) => set.has(row.orderId));
  }

  async insertPayment(input: NewPaymentInput): Promise<PaymentRecord> {
    if (input.providerPaymentId) {
      const duplicate = this.payments.find(
        (row) => row.provider === input.provider && row.providerPaymentId === input.providerPaymentId,
      );
      if (duplicate) {
        throw new CommerceError("CONFLICT", "Payment provider id already exists");
      }
    }
    const timestamp = this.now();
    const row: PaymentRecord = {
      id: crypto.randomUUID(),
      publicId: createPublicId("pay"),
      orderId: input.orderId,
      provider: input.provider,
      providerPaymentId: input.providerPaymentId,
      status: input.status ?? "pending",
      amountMinor: input.amountMinor,
      currency: input.currency,
      method: input.method ?? null,
      providerSubscriptionId: input.providerSubscriptionId ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.payments.push(row);
    return row;
  }

  async getPaymentById(id: string): Promise<PaymentRecord | null> {
    return this.payments.find((row) => row.id === id) ?? null;
  }

  async getPaymentByProviderId(
    provider: string,
    providerPaymentId: string,
  ): Promise<PaymentRecord | null> {
    return (
      this.payments.find(
        (row) => row.provider === provider && row.providerPaymentId === providerPaymentId,
      ) ?? null
    );
  }

  async listPaymentsByOrder(orderId: string): Promise<PaymentRecord[]> {
    return this.payments.filter((row) => row.orderId === orderId);
  }

  async listPaymentsForOrders(orderIds: string[]): Promise<PaymentRecord[]> {
    const set = new Set(orderIds);
    return this.payments.filter((row) => set.has(row.orderId));
  }

  async updatePayment(
    id: string,
    patch: {
      status?: PaymentStatus;
      providerPaymentId?: string | null;
      method?: string | null;
      providerSubscriptionId?: string | null;
    },
  ): Promise<PaymentRecord> {
    const row = requireRow(this.payments.find((item) => item.id === id), "Payment");
    if (patch.status) row.status = patch.status;
    if (patch.providerPaymentId !== undefined) row.providerPaymentId = patch.providerPaymentId;
    if (patch.method !== undefined) row.method = patch.method;
    if (patch.providerSubscriptionId !== undefined) {
      row.providerSubscriptionId = patch.providerSubscriptionId;
    }
    row.updatedAt = this.now();
    return row;
  }

  async insertSubscription(input: NewSubscriptionInput): Promise<SubscriptionRecord> {
    const timestamp = this.now();
    const row: SubscriptionRecord = {
      id: crypto.randomUUID(),
      publicId: createPublicId("sub"),
      ...input,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.subscriptions.push(row);
    return row;
  }

  async listSubscriptionsByCustomer(customerId: string): Promise<SubscriptionRecord[]> {
    return this.subscriptions.filter((row) => row.customerId === customerId);
  }

  async updateSubscriptionStatus(id: string, status: SubscriptionStatus): Promise<void> {
    const row = requireRow(
      this.subscriptions.find((item) => item.id === id),
      "Subscription",
    );
    row.status = status;
    row.updatedAt = this.now();
  }

  async insertRefund(input: {
    paymentId: string;
    provider: string;
    providerRefundId?: string | null;
    amountMinor: bigint;
    currency: string;
    status: RefundStatus;
    reason?: string | null;
    initiatedBy?: string | null;
  }): Promise<RefundRecord> {
    const timestamp = this.now();
    const row: RefundRecord = {
      id: crypto.randomUUID(),
      publicId: createPublicId("refnd"),
      paymentId: input.paymentId,
      provider: input.provider,
      providerRefundId: input.providerRefundId ?? null,
      amountMinor: input.amountMinor,
      currency: input.currency,
      status: input.status,
      reason: input.reason ?? null,
      initiatedBy: input.initiatedBy ?? null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    this.refunds.push(row);
    return row;
  }

  async getRefundById(id: string): Promise<RefundRecord | null> {
    return this.refunds.find((row) => row.id === id) ?? null;
  }

  async listRefundsByPayment(paymentId: string): Promise<RefundRecord[]> {
    return this.refunds.filter((row) => row.paymentId === paymentId);
  }

  async updateRefund(
    id: string,
    patch: { status?: RefundStatus; providerRefundId?: string | null },
  ): Promise<RefundRecord> {
    const row = requireRow(
      this.refunds.find((item) => item.id === id),
      "Refund",
    );
    if (patch.status) row.status = patch.status;
    if (patch.providerRefundId !== undefined) row.providerRefundId = patch.providerRefundId;
    row.updatedAt = this.now();
    return row;
  }

  async claimWebhookEvent(input: {
    provider: string;
    eventId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }): Promise<WebhookClaimResult> {
    const existing = this.webhooks.find(
      (row) => row.provider === input.provider && row.eventId === input.eventId,
    );
    if (!existing) {
      this.webhooks.push({ ...input, processedAt: null });
      return "inserted";
    }
    return existing.processedAt ? "duplicate" : "retry";
  }

  async markWebhookProcessed(provider: string, eventId: string): Promise<void> {
    const row = this.webhooks.find((item) => item.provider === provider && item.eventId === eventId);
    if (row) row.processedAt = this.now();
  }
}

function requireRow<T>(row: T | undefined, label: string): T {
  if (!row) throw new CommerceError("NOT_FOUND", `${label} not found`);
  return row;
}
