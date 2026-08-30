import { createProductService } from "@khepree/catalog";
import { getEnv, sepayIpnSecret, type Env } from "@khepree/config";
import {
  createDrizzleAuditService,
  getDb,
  type AuditService,
  type Database,
} from "@khepree/db";
import { parseMoneyMinor } from "@khepree/types";
import { DrizzleCommerceRepository } from "./drizzle-store";
import { CommerceError } from "./errors";
import { assertOrderTransition, assertPaymentTransition } from "./order-state";
import {
  MockDevelopmentPaymentProvider,
  type PaymentProvider,
} from "./provider";
import { SePayPaymentProvider, SEPAY_PROVIDER_ID } from "./sepay";
import type { CommerceRepository } from "./store";
import type {
  BillingAccount,
  CatalogReader,
  CheckoutIntentResult,
  CommerceLifecycleHooks,
  CustomerOwner,
  NormalizedCommerceEvent,
  OrderItemRecord,
  OrderRecord,
  PaymentRecord,
  PurchasableOffer,
  WebhookProcessResult,
  WebhookRequest,
} from "./types";

export interface CommerceServiceOptions {
  store: CommerceRepository;
  provider: PaymentProvider;
  catalog: CatalogReader;
  audit: AuditService;
  hooks?: CommerceLifecycleHooks;
  now?: () => Date;
}

export class CommerceService {
  private readonly now: () => Date;

  constructor(private readonly options: CommerceServiceOptions) {
    this.now = options.now ?? (() => new Date());
  }

  get provider(): PaymentProvider {
    return this.options.provider;
  }

  async createOrder(input: {
    owner: CustomerOwner;
    offer: PurchasableOffer;
    quantity?: number;
  }): Promise<{ order: OrderRecord; item: OrderItemRecord }> {
    const quantity = input.quantity ?? 1;
    if (quantity < 1) {
      throw new CommerceError("INVALID_AMOUNT", "Quantity must be at least 1");
    }
    const unitAmountMinor = parseMoneyMinor(input.offer.price.amountMinor);
    const totalMinor = unitAmountMinor * BigInt(quantity);

    return this.options.store.withTransaction(async (repo) => {
      const customer = await repo.getOrCreateCustomer(input.owner);
      const order = await repo.insertOrder({
        customerId: customer.id,
        currency: input.offer.price.currency,
        totalMinor,
      });
      const item = await repo.insertOrderItem({
        orderId: order.id,
        productId: input.offer.product.id,
        planId: input.offer.plan.id,
        priceId: input.offer.price.id,
        quantity,
        unitAmountMinor,
        currency: input.offer.price.currency,
        productNameSnapshot: input.offer.product.name,
        planNameSnapshot: input.offer.plan.name,
        billingIntervalSnapshot: input.offer.price.interval,
        accessTermDaysSnapshot: input.offer.plan.accessTermDays,
      });
      return { order, item };
    });
  }

  async createCheckoutIntent(input: {
    owner: CustomerOwner;
    planPublicId: string;
    pricePublicId: string;
    locale: string;
    successUrl: string;
    cancelUrl: string;
    errorUrl?: string;
    actorUserId?: string;
  }): Promise<CheckoutIntentResult> {
    const offer = await this.options.catalog.getPurchasableOffer(
      input.planPublicId,
      input.pricePublicId,
      input.locale,
    );
    if (!offer) {
      throw new CommerceError("NOT_PURCHASABLE", "Plan is not available for checkout");
    }

    const { order } = await this.createOrder({ owner: input.owner, offer });

    let checkout;
    try {
      checkout = await this.options.provider.createCheckout({
        orderPublicId: order.publicId,
        amountMinor: order.totalMinor,
        currency: order.currency,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        errorUrl: input.errorUrl ?? input.cancelUrl,
        customerId: input.owner.type === "user" ? input.owner.userId : input.owner.organizationId,
        description: `${offer.product.name} — ${offer.plan.name}`,
      });
    } catch (error) {
      await this.cancelOrder({ orderId: order.id, actorUserId: input.actorUserId });
      throw error;
    }

    const payment = await this.markPaymentPending({
      orderId: order.id,
      provider: this.options.provider.id,
      providerPaymentId: checkout.providerCheckoutId,
      amountMinor: order.totalMinor,
      currency: order.currency,
      actorUserId: input.actorUserId,
    });

    await this.options.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "commerce.checkout_intent.created",
      resourceType: "order",
      resourceId: order.publicId,
      metadata: {
        provider: this.options.provider.id,
        paymentPublicId: payment.publicId,
        amountMinor: order.totalMinor.toString(),
        currency: order.currency,
      },
    });

    return {
      orderPublicId: order.publicId,
      paymentPublicId: payment.publicId,
      checkoutAction: checkout.checkoutAction,
      provider: this.options.provider.id,
    };
  }

  async rebuildCheckoutAction(input: {
    orderPublicId: string;
    owner: CustomerOwner;
    successUrl: string;
    cancelUrl: string;
    errorUrl?: string;
  }): Promise<CheckoutIntentResult | null> {
    const session = await this.getCheckoutSession(input.orderPublicId, input.owner);
    if (!session) return null;
    const pending =
      session.payments.find((row) => row.status === "pending") ?? session.payments[0];
    if (!pending || session.order.status === "cancelled" || session.order.status === "paid") {
      return null;
    }
    const item = session.items[0];
    const checkout = await this.options.provider.createCheckout({
      orderPublicId: session.order.publicId,
      amountMinor: session.order.totalMinor,
      currency: session.order.currency,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      errorUrl: input.errorUrl ?? input.cancelUrl,
      customerId: input.owner.type === "user" ? input.owner.userId : input.owner.organizationId,
      description: item ? `${item.productNameSnapshot} — ${item.planNameSnapshot}` : session.order.publicId,
    });
    return {
      orderPublicId: session.order.publicId,
      paymentPublicId: pending.publicId,
      checkoutAction: checkout.checkoutAction,
      provider: this.options.provider.id,
    };
  }

  async markPaymentPending(input: {
    orderId: string;
    provider: string;
    providerPaymentId: string;
    amountMinor: bigint;
    currency: string;
    actorUserId?: string;
  }): Promise<PaymentRecord> {
    return this.options.store.withTransaction(async (repo) => {
      const order = await requireOrder(repo, input.orderId);
      assertOrderTransition(order.status, "pending_payment");
      const payment = await repo.insertPayment({
        orderId: order.id,
        provider: input.provider,
        providerPaymentId: input.providerPaymentId,
        amountMinor: parseMoneyMinor(input.amountMinor),
        currency: input.currency,
        status: "pending",
      });
      await repo.updateOrderStatus(order.id, "pending_payment");
      await this.options.audit.record({
        actorUserId: input.actorUserId ?? null,
        action: "commerce.payment.pending",
        resourceType: "payment",
        resourceId: payment.publicId,
        metadata: { orderPublicId: order.publicId, provider: input.provider },
      });
      return payment;
    });
  }

  async confirmPayment(input: { paymentId: string; actorUserId?: string }): Promise<PaymentRecord> {
    const payment = await this.options.store.withTransaction((repo) =>
      this.confirmPaymentOn(repo, input),
    );
    await this.invokeAfterPaid(payment);
    return payment;
  }

  async failPayment(input: { paymentId: string; actorUserId?: string }): Promise<PaymentRecord> {
    return this.options.store.withTransaction((repo) => this.failPaymentOn(repo, input));
  }

  async requestRefund(input: {
    paymentId: string;
    amountMinor: bigint;
    actorUserId?: string;
    reason?: string;
  }): Promise<PaymentRecord> {
    const payment = await this.options.store.withTransaction((repo) =>
      this.requestRefundOn(repo, input),
    );
    await this.invokeAfterRefunded(payment);
    return payment;
  }

  /** @deprecated Use requestRefund for commands and applyProviderRefundEvent for webhooks. */
  async refundPayment(input: {
    paymentId: string;
    amountMinor: bigint;
    actorUserId?: string;
  }): Promise<PaymentRecord> {
    return this.requestRefund(input);
  }

  async cancelOrder(input: { orderId: string; actorUserId?: string }): Promise<OrderRecord> {
    return this.options.store.withTransaction((repo) => this.cancelOrderOn(repo, input));
  }

  async processWebhook(input: WebhookRequest & { providerId: string }): Promise<WebhookProcessResult> {
    if (input.providerId !== this.options.provider.id) {
      throw new CommerceError("UNKNOWN_PROVIDER", `Unknown payment provider: ${input.providerId}`);
    }

    const verified = await this.options.provider.verifyWebhook(input);
    const event = this.options.provider.normalizeWebhookEvent(verified);
    const payload = verified.payload;

    const result = await this.options.store.withTransaction(async (repo) => {
      const claim = await repo.claimWebhookEvent({
        provider: verified.provider,
        eventId: verified.eventId,
        eventType: verified.eventType,
        payload,
      });

      if (claim === "duplicate") {
        await this.options.audit.record({
          action: "commerce.webhook.duplicate",
          resourceType: "webhook_event",
          resourceId: `${verified.provider}:${verified.eventId}`,
        });
        return { status: "duplicate" as const };
      }

      if (!event) {
        await repo.markWebhookProcessed(verified.provider, verified.eventId);
        await this.options.audit.record({
          action: "commerce.webhook.ignored",
          resourceType: "webhook_event",
          resourceId: `${verified.provider}:${verified.eventId}`,
          metadata: { eventType: verified.eventType },
        });
        return { status: "ignored" as const };
      }

      await this.applyNormalizedEvent(repo, event);
      await repo.markWebhookProcessed(verified.provider, verified.eventId);
      await this.options.audit.record({
        action: "commerce.webhook.processed",
        resourceType: "webhook_event",
        resourceId: `${verified.provider}:${verified.eventId}`,
        metadata: {
          type: event.type,
          providerPaymentId: event.providerPaymentId,
          amountMinor: event.amountMinor.toString(),
        },
      });
      return { status: "processed" as const, event };
    });

    if (result.status === "processed" && event) {
      await this.invokeHooksForEvent(event);
    }
    return result;
  }

  async getBillingAccount(owner: CustomerOwner): Promise<BillingAccount> {
    const customer = await this.options.store.getCustomerByOwner(owner);
    if (!customer) {
      return { customer: null, orders: [], payments: [], subscriptions: [] };
    }
    const orderRows = await this.options.store.listOrdersByCustomer(customer.id);
    const orderIds = orderRows.map((row) => row.id);
    const [items, payments, subscriptions] = await Promise.all([
      this.options.store.listOrderItemsForOrders(orderIds),
      this.options.store.listPaymentsForOrders(orderIds),
      this.options.store.listSubscriptionsByCustomer(customer.id),
    ]);
    return {
      customer,
      orders: orderRows.map((order) => ({
        ...order,
        items: items.filter((item) => item.orderId === order.id),
        payments: payments.filter((payment) => payment.orderId === order.id),
      })),
      payments,
      subscriptions,
    };
  }

  async getOrderForOwner(orderPublicId: string, owner: CustomerOwner): Promise<OrderRecord | null> {
    const order = await this.options.store.getOrderByPublicId(orderPublicId);
    if (!order) return null;
    const customer = await this.options.store.getCustomerById(order.customerId);
    if (!customer) return null;
    if (owner.type === "user" && customer.userId !== owner.userId) return null;
    if (owner.type === "organization" && customer.organizationId !== owner.organizationId) {
      return null;
    }
    return order;
  }

  async getCheckoutSession(orderPublicId: string, owner: CustomerOwner) {
    const order = await this.getOrderForOwner(orderPublicId, owner);
    if (!order) return null;
    const [items, payments] = await Promise.all([
      this.options.store.listOrderItems(order.id),
      this.options.store.listPaymentsByOrder(order.id),
    ]);
    return { order, items, payments };
  }

  private async confirmPaymentOn(
    repo: CommerceRepository,
    input: { paymentId: string; actorUserId?: string; paymentMethod?: string },
  ): Promise<PaymentRecord> {
    const payment = await requirePayment(repo, input.paymentId);
    const order = await requireOrder(repo, payment.orderId);
    if (payment.status === "succeeded" && order.status === "paid") {
      return payment;
    }
    assertPaymentTransition(payment.status, "succeeded");
    assertOrderTransition(order.status, "paid");
    const updated = await repo.updatePayment(payment.id, {
      status: "succeeded",
      method: input.paymentMethod ?? payment.method,
    });
    await repo.updateOrderStatus(order.id, "paid");
    await this.activateSubscriptionIfNeeded(repo, order, payment);
    await this.options.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "commerce.payment.succeeded",
      resourceType: "payment",
      resourceId: payment.publicId,
      metadata: { orderPublicId: order.publicId },
    });
    return updated;
  }

  private async failPaymentOn(
    repo: CommerceRepository,
    input: { paymentId: string; actorUserId?: string },
  ): Promise<PaymentRecord> {
    const payment = await requirePayment(repo, input.paymentId);
    if (payment.status === "failed") return payment;
    assertPaymentTransition(payment.status, "failed");
    const updated = await repo.updatePayment(payment.id, { status: "failed" });
    const order = await requireOrder(repo, payment.orderId);
    await this.options.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "commerce.payment.failed",
      resourceType: "payment",
      resourceId: payment.publicId,
      metadata: { orderPublicId: order.publicId },
    });
    return updated;
  }

  private async requestRefundOn(
    repo: CommerceRepository,
    input: { paymentId: string; amountMinor: bigint; actorUserId?: string; reason?: string },
  ): Promise<PaymentRecord> {
    const amountMinor = parseMoneyMinor(input.amountMinor);
    const payment = await requirePayment(repo, input.paymentId);
    const order = await requireOrder(repo, payment.orderId);
    const existing = await repo.listRefundsByPayment(payment.id);
    const alreadyRefunded = existing
      .filter((row) => row.status === "succeeded")
      .reduce((sum, row) => sum + row.amountMinor, 0n);
    if (alreadyRefunded + amountMinor > payment.amountMinor) {
      throw new CommerceError("INVALID_AMOUNT", "Refund exceeds remaining payment amount");
    }

    const caps = this.options.provider.capabilities;
    const full = alreadyRefunded + amountMinor === payment.amountMinor;
    if (full ? !caps.supportsRefund : !caps.supportsPartialRefund) {
      await repo.insertRefund({
        paymentId: payment.id,
        provider: payment.provider,
        amountMinor,
        currency: payment.currency,
        status: "manual_required",
        reason: input.reason ?? "unsupported_provider_refund",
        initiatedBy: input.actorUserId ?? null,
      });
      await this.options.audit.record({
        actorUserId: input.actorUserId ?? null,
        action: "commerce.refund.manual_required",
        resourceType: "payment",
        resourceId: payment.publicId,
        metadata: { amountMinor: amountMinor.toString() },
      });
      throw new CommerceError(
        "UNSUPPORTED",
        "This payment provider does not support automated refunds",
      );
    }

    const providerResult = await this.options.provider.refund({
      providerPaymentId: payment.providerPaymentId ?? payment.publicId,
      amountMinor,
      currency: payment.currency,
    });

    return this.applyLocalRefund(repo, {
      payment,
      order,
      amountMinor,
      alreadyRefunded,
      providerRefundId: providerResult.providerRefundId,
      actorUserId: input.actorUserId,
      reason: input.reason,
    });
  }

  private async applyProviderRefundEventOn(
    repo: CommerceRepository,
    input: {
      paymentId: string;
      amountMinor: bigint;
      providerRefundId?: string;
      paymentMethod?: string;
    },
  ): Promise<PaymentRecord> {
    const amountMinor = parseMoneyMinor(input.amountMinor);
    const payment = await requirePayment(repo, input.paymentId);
    const order = await requireOrder(repo, payment.orderId);
    const existing = await repo.listRefundsByPayment(payment.id);
    const alreadyRefunded = existing
      .filter((row) => row.status === "succeeded")
      .reduce((sum, row) => sum + row.amountMinor, 0n);
    if (alreadyRefunded + amountMinor > payment.amountMinor) {
      throw new CommerceError("INVALID_AMOUNT", "Refund exceeds remaining payment amount");
    }
    return this.applyLocalRefund(repo, {
      payment,
      order,
      amountMinor,
      alreadyRefunded,
      providerRefundId: input.providerRefundId ?? null,
      actorUserId: undefined,
      reason: "provider_event",
    });
  }

  private async applyLocalRefund(
    repo: CommerceRepository,
    input: {
      payment: PaymentRecord;
      order: Awaited<ReturnType<typeof requireOrder>>;
      amountMinor: bigint;
      alreadyRefunded: bigint;
      providerRefundId: string | null;
      actorUserId?: string;
      reason?: string;
    },
  ): Promise<PaymentRecord> {
    const { payment, order, amountMinor, alreadyRefunded } = input;
    const full = alreadyRefunded + amountMinor === payment.amountMinor;
    const nextOrderStatus = full ? "refunded" : "partially_refunded";
    if (order.status === nextOrderStatus && (!full || payment.status === "refunded")) {
      return payment;
    }

    await repo.insertRefund({
      paymentId: payment.id,
      provider: payment.provider,
      providerRefundId: input.providerRefundId,
      amountMinor,
      currency: payment.currency,
      status: "succeeded",
      reason: input.reason ?? null,
      initiatedBy: input.actorUserId ?? null,
    });

    assertOrderTransition(order.status, nextOrderStatus);
    if (full) {
      if (payment.status !== "refunded") {
        assertPaymentTransition(payment.status, "refunded");
      }
      const updated = await repo.updatePayment(payment.id, { status: "refunded" });
      await repo.updateOrderStatus(order.id, "refunded");
      await this.cancelSubscriptionsForOrder(repo, order);
      await this.options.audit.record({
        actorUserId: input.actorUserId ?? null,
        action: "commerce.payment.refunded",
        resourceType: "payment",
        resourceId: payment.publicId,
        metadata: { orderPublicId: order.publicId, amountMinor: amountMinor.toString() },
      });
      return updated;
    }
    await repo.updateOrderStatus(order.id, "partially_refunded");
    await this.options.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "commerce.payment.partially_refunded",
      resourceType: "payment",
      resourceId: payment.publicId,
      metadata: { orderPublicId: order.publicId, amountMinor: amountMinor.toString() },
    });
    return payment;
  }

  private async cancelOrderOn(
    repo: CommerceRepository,
    input: { orderId: string; actorUserId?: string },
  ): Promise<OrderRecord> {
    const order = await requireOrder(repo, input.orderId);
    if (order.status === "cancelled") return order;
    assertOrderTransition(order.status, "cancelled");
    const updated = await repo.updateOrderStatus(order.id, "cancelled");
    const pending = (await repo.listPaymentsByOrder(order.id)).filter((row) => row.status === "pending");
    for (const payment of pending) {
      await repo.updatePayment(payment.id, { status: "failed" });
    }
    await this.options.audit.record({
      actorUserId: input.actorUserId ?? null,
      action: "commerce.order.cancelled",
      resourceType: "order",
      resourceId: order.publicId,
    });
    return updated;
  }

  private async applyNormalizedEvent(
    repo: CommerceRepository,
    event: NormalizedCommerceEvent,
  ): Promise<void> {
    const payment = await repo.getPaymentByProviderId(event.provider, event.providerPaymentId);
    if (!payment) {
      throw new CommerceError("NOT_FOUND", "Payment not found for provider event");
    }
    const order = await requireOrder(repo, payment.orderId);
    if (order.status === "cancelled") return;

    switch (event.type) {
      case "payment_succeeded":
        if (
          event.amountMinor !== payment.amountMinor ||
          event.currency.toUpperCase() !== payment.currency.toUpperCase()
        ) {
          throw new CommerceError(
            "WEBHOOK_INVALID",
            "Webhook amount or currency does not match the stored payment",
          );
        }
        await this.confirmPaymentOn(repo, {
          paymentId: payment.id,
          paymentMethod: event.paymentMethod,
        });
        return;
      case "payment_failed":
        await this.failPaymentOn(repo, { paymentId: payment.id });
        return;
      case "payment_refunded":
        await this.applyProviderRefundEventOn(repo, {
          paymentId: payment.id,
          amountMinor: payment.amountMinor,
          providerRefundId: event.providerEventId,
          paymentMethod: event.paymentMethod,
        });
        return;
      case "payment_partially_refunded":
        await this.applyProviderRefundEventOn(repo, {
          paymentId: payment.id,
          amountMinor: event.amountMinor,
          providerRefundId: event.providerEventId,
          paymentMethod: event.paymentMethod,
        });
        return;
      default: {
        const _exhaustive: never = event.type;
        throw new CommerceError("WEBHOOK_INVALID", `Unhandled event ${_exhaustive}`);
      }
    }
  }

  private async activateSubscriptionIfNeeded(
    repo: CommerceRepository,
    order: OrderRecord,
    payment: PaymentRecord,
  ): Promise<void> {
    if (!this.options.provider.capabilities.supportsRecurring) return;
    const items = await repo.listOrderItems(order.id);
    const item = items[0];
    if (!item) return;
    if (item.billingIntervalSnapshot && !this.options.provider.capabilities.supportsRecurring) return;

    const providerSubscriptionId = payment.providerPaymentId;
    if (!providerSubscriptionId) return;

    const existing = (await repo.listSubscriptionsByCustomer(order.customerId)).find(
      (row) => row.planId === item.planId && (row.status === "active" || row.status === "trialing"),
    );
    if (existing) return;

    const start = this.now();
    await repo.insertSubscription({
      customerId: order.customerId,
      planId: item.planId,
      productId: item.productId,
      priceId: item.priceId,
      provider: payment.provider,
      providerSubscriptionId,
      status: "active",
      currentPeriodStart: start,
      currentPeriodEnd: addBillingInterval(start, item.billingIntervalSnapshot ?? "year"),
    });
  }

  private async cancelSubscriptionsForOrder(
    repo: CommerceRepository,
    order: OrderRecord,
  ): Promise<void> {
    const items = await repo.listOrderItems(order.id);
    const planIds = new Set(items.map((item) => item.planId));
    const rows = await repo.listSubscriptionsByCustomer(order.customerId);
    for (const row of rows) {
      if (planIds.has(row.planId) && (row.status === "active" || row.status === "trialing")) {
        await repo.updateSubscriptionStatus(row.id, "cancelled");
      }
    }
  }

  private async invokeHooksForEvent(event: NormalizedCommerceEvent): Promise<void> {
    const payment = await this.options.store.getPaymentByProviderId(
      event.provider,
      event.providerPaymentId,
    );
    if (!payment) return;
    if (event.type === "payment_succeeded") {
      await this.invokeAfterPaid(payment);
      return;
    }
    if (event.type === "payment_refunded" || event.type === "payment_partially_refunded") {
      await this.invokeAfterRefunded(payment);
    }
  }

  private async invokeAfterPaid(payment: PaymentRecord): Promise<void> {
    const hook = this.options.hooks?.afterPaid;
    if (!hook) return;
    const order = await requireOrder(this.options.store, payment.orderId);
    const customer = await requireCustomer(this.options.store, order.customerId);
    const [items, subscriptions] = await Promise.all([
      this.options.store.listOrderItems(order.id),
      this.options.store.listSubscriptionsByCustomer(order.customerId),
    ]);
    await hook({ order, items, customer, payment, subscriptions });
  }

  private async invokeAfterRefunded(payment: PaymentRecord): Promise<void> {
    const hook = this.options.hooks?.afterRefunded;
    if (!hook) return;
    const order = await requireOrder(this.options.store, payment.orderId);
    const customer = await requireCustomer(this.options.store, order.customerId);
    const items = await this.options.store.listOrderItems(order.id);
    await hook({
      order,
      items,
      customer,
      payment,
      full: payment.status === "refunded",
    });
  }
}

async function requireOrder(repo: CommerceRepository, orderId: string): Promise<OrderRecord> {
  const order = await repo.getOrderById(orderId);
  if (!order) throw new CommerceError("NOT_FOUND", "Order not found");
  return order;
}

async function requirePayment(repo: CommerceRepository, paymentId: string): Promise<PaymentRecord> {
  const payment = await repo.getPaymentById(paymentId);
  if (!payment) throw new CommerceError("NOT_FOUND", "Payment not found");
  return payment;
}

export function addBillingInterval(start: Date, interval: string): Date {
  const end = new Date(start.getTime());
  if (interval === "year") {
    end.setUTCFullYear(end.getUTCFullYear() + 1);
    return end;
  }
  end.setUTCMonth(end.getUTCMonth() + 1);
  return end;
}

function mockWebhookSecret(env: Env): string {
  if (env.MOCK_PAYMENT_WEBHOOK_SECRET && !env.MOCK_PAYMENT_WEBHOOK_SECRET.includes("CHANGE_ME")) {
    return env.MOCK_PAYMENT_WEBHOOK_SECRET;
  }
  if (env.NODE_ENV !== "production") return "dev-mock-webhook-secret";
  throw new CommerceError("NOT_CONFIGURED", "MOCK_PAYMENT_WEBHOOK_SECRET is required");
}

export function createPaymentProvider(
  env: Env,
  options: { hostedBaseUrl: string },
): PaymentProvider {
  if (env.PAYMENT_PROVIDER === SEPAY_PROVIDER_ID) {
    const ipnSecret = sepayIpnSecret(env);
    if (!env.SEPAY_ENV || !env.SEPAY_MERCHANT_ID || !env.SEPAY_SECRET_KEY || !ipnSecret) {
      throw new CommerceError("NOT_CONFIGURED", "SePay credentials are missing");
    }
    return new SePayPaymentProvider({
      env: env.SEPAY_ENV,
      merchantId: env.SEPAY_MERCHANT_ID,
      secretKey: env.SEPAY_SECRET_KEY,
      ipnSecret,
    });
  }
  if (env.PAYMENT_PROVIDER === "mock") {
    if (env.NODE_ENV === "production") {
      throw new CommerceError("NOT_CONFIGURED", "Mock payment provider is not allowed in production");
    }
    return new MockDevelopmentPaymentProvider({
      webhookSecret: mockWebhookSecret(env),
      hostedBaseUrl: options.hostedBaseUrl,
    });
  }
  throw new CommerceError("UNKNOWN_PROVIDER", `Unknown payment provider: ${env.PAYMENT_PROVIDER}`);
}

export interface CreateCommerceServiceOverrides {
  db?: Database | null;
  store?: CommerceRepository;
  provider?: PaymentProvider;
  catalog?: CatalogReader;
  audit?: AuditService;
  hooks?: CommerceLifecycleHooks;
  now?: () => Date;
  checkoutBaseUrl?: string;
}

export function createCommerceService(
  overrides: CreateCommerceServiceOverrides = {},
): CommerceService {
  const env = getEnv();
  const db = overrides.store ? null : (overrides.db ?? getDb());
  const store = overrides.store ?? (db ? new DrizzleCommerceRepository(db) : null);
  if (!store) {
    throw new CommerceError("NOT_CONFIGURED", "Database is not configured");
  }

  const catalog: CatalogReader =
    overrides.catalog ??
    ({
      getPurchasableOffer: (planPublicId, pricePublicId, locale) =>
        createProductService(db).getPurchasableOffer(planPublicId, pricePublicId, { locale }),
    } satisfies CatalogReader);

  const audit =
    overrides.audit ??
    (db ? createDrizzleAuditService(db) : { record: async () => undefined });

  const hostedBaseUrl =
    overrides.checkoutBaseUrl ?? env.ACCOUNT_URL ?? "http://localhost:3001";
  const provider = overrides.provider ?? createPaymentProvider(env, { hostedBaseUrl });

  return new CommerceService({
    store,
    provider,
    catalog,
    audit,
    hooks: overrides.hooks,
    now: overrides.now,
  });
}

async function requireCustomer(
  repo: CommerceRepository,
  customerId: string,
): Promise<NonNullable<Awaited<ReturnType<CommerceRepository["getCustomerById"]>>>> {
  const customer = await repo.getCustomerById(customerId);
  if (!customer) throw new CommerceError("NOT_FOUND", "Customer not found");
  return customer;
}
