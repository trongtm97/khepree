export const EVENTS_PACKAGE = "@khepree/events" as const;

export {
  COMMERCE_ORDER_PAID_V1,
  COMMERCE_ORDER_REFUNDED_V1,
  COMMERCE_ORDER_VOIDED_V1,
  commerceOrderPaidEventId,
  commerceOrderRefundedEventId,
  commerceOrderVoidedEventId,
  type CommerceCustomerRefV1,
  type CommerceEventTypeV1,
  type CommerceOrderItemV1,
  type CommerceOrderPaidV1,
  type CommerceOrderRefundedV1,
  type CommerceOrderVoidedV1,
} from "./contracts";
export { PollingOutboxDispatcher, retryDelayMs, CRITICAL_COMMERCE_EVENT_TYPES } from "./dispatcher";
export { MemoryOutboxStore } from "./memory-store";
export { DrizzleOutboxStore } from "./drizzle-store";
export { OutboxWorker } from "./worker";
export { outboxLockTimeoutMs, outboxMaxAttempts } from "./outbox-config";
export type {
  DispatcherOptions,
  DomainEventHandler,
  NewOutboxEvent,
  OutboxEventRecord,
  OutboxStatus,
  OutboxStore,
  OutboxWorkerOptions,
  OutboxWorkerResult,
} from "./types";
