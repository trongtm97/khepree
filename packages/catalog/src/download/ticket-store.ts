/** One-time download ticket ids — replay of the same ticket id is rejected. */

export interface DownloadTicketStore {
  /** Returns true when ticket id is fresh and now reserved. */
  reserve(ticketId: string, ttlSeconds: number): Promise<boolean>;
}

export class MemoryDownloadTicketStore implements DownloadTicketStore {
  private readonly entries = new Map<string, number>();

  async reserve(ticketId: string, ttlSeconds: number): Promise<boolean> {
    const now = Date.now();
    for (const [key, expiresAt] of this.entries) {
      if (expiresAt <= now) this.entries.delete(key);
    }
    if (this.entries.has(ticketId)) return false;
    this.entries.set(ticketId, now + ttlSeconds * 1000);
    return true;
  }

  clear(): void {
    this.entries.clear();
  }
}
