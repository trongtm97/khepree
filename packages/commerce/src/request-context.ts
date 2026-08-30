import { AsyncLocalStorage } from "node:async_hooks";

const storage = new AsyncLocalStorage<{ requestId?: string }>();

export function runWithRequestId<T>(requestId: string | undefined, fn: () => T): T {
  if (!requestId) return fn();
  return storage.run({ requestId }, fn);
}

export function getRequestIdFromContext(): string | undefined {
  return storage.getStore()?.requestId;
}
