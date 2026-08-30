import { getEnv } from "@khepree/config";

export function outboxLockTimeoutMs(): number {
  return getEnv().OUTBOX_LOCK_TIMEOUT_MS;
}

export function outboxMaxAttempts(): number {
  return getEnv().OUTBOX_MAX_ATTEMPTS;
}
