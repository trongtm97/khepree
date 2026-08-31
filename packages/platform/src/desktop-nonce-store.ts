import { getEnv, isRedisConfigured } from "@khepree/config";
import { MemoryNonceStore, RedisNonceStore, type NonceStore } from "@khepree/desktop-auth";
import { createRedisSetCommands } from "@khepree/security";

let memoryFallback = new MemoryNonceStore();
let shared: NonceStore | null = null;
let init: Promise<NonceStore> | null = null;

class LazyNonceStore implements NonceStore {
  private delegate: NonceStore | null = null;

  constructor(private readonly ready: Promise<NonceStore>) {}

  private async store(): Promise<NonceStore> {
    if (!this.delegate) this.delegate = await this.ready;
    return this.delegate;
  }

  async reserve(scope: string, nonce: string, ttlSeconds: number): Promise<boolean> {
    return (await this.store()).reserve(scope, nonce, ttlSeconds);
  }
}

async function resolveDesktopNonceStore(): Promise<NonceStore> {
  const env = getEnv();
  if (isRedisConfigured(env)) {
    return new RedisNonceStore(await createRedisSetCommands(env.REDIS_URL!));
  }
  if (env.NODE_ENV === "production") {
    throw new Error("REDIS_URL is required in production for desktop nonce replay protection");
  }
  return memoryFallback;
}

/** Shared nonce store: Memory in dev/test; Redis when REDIS_URL is set. */
export function getDesktopNonceStore(): NonceStore {
  if (shared) return shared;
  if (!init) init = resolveDesktopNonceStore();
  shared = new LazyNonceStore(init);
  return shared;
}

/** Test-only. */
export function resetDesktopNonceStoreForTests(): void {
  memoryFallback = new MemoryNonceStore();
  shared = null;
  init = null;
}
