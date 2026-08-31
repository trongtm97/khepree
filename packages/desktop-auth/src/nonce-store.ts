/** One-time nonce backing for device proof replay protection. */

export interface NonceStore {
  /** Returns true when nonce is fresh and now reserved. */
  reserve(scope: string, nonce: string, ttlSeconds: number): Promise<boolean>;
}

export class MemoryNonceStore implements NonceStore {
  private readonly entries = new Map<string, number>();

  async reserve(scope: string, nonce: string, ttlSeconds: number): Promise<boolean> {
    const key = `${scope}:${nonce}`;
    const now = Date.now();
    for (const [entryKey, expiresAt] of this.entries) {
      if (expiresAt <= now) this.entries.delete(entryKey);
    }
    if (this.entries.has(key)) return false;
    this.entries.set(key, now + ttlSeconds * 1000);
    return true;
  }

  clear(): void {
    this.entries.clear();
  }
}

export interface NonceRedisCommands {
  set(key: string, value: string, options: { NX: true; EX: number }): Promise<string | null>;
}

export class RedisNonceStore implements NonceStore {
  constructor(private readonly redis: NonceRedisCommands) {}

  async reserve(scope: string, nonce: string, ttlSeconds: number): Promise<boolean> {
    const result = await this.redis.set(`desktop-nonce:${scope}:${nonce}`, "1", {
      NX: true,
      EX: ttlSeconds,
    });
    return result === "OK";
  }
}
