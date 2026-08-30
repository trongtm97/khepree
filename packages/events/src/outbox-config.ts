import { getEnv } from "@khepree/config";

export function outboxLockTimeoutMs(): number {
  return getEnv().OUTBOX_LOCK_TIMEOUT_MS;
}

export function outboxMaxAttempts(): number {
  return getEnv().OUTBOX_MAX_ATTEMPTS;
}

export function outboxPollIntervalMs(): number {
  return getEnv().OUTBOX_POLL_INTERVAL_MS;
}

export function outboxBatchSize(): number {
  return getEnv().OUTBOX_BATCH_SIZE;
}
