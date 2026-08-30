import { createClient } from "redis";

/** Lightweight Redis readiness probe — no secrets in response. */
export async function pingRedis(url: string): Promise<boolean> {
  const client = createClient({ url });
  try {
    await client.connect();
    const pong = await client.ping();
    return pong === "PONG";
  } catch {
    return false;
  } finally {
    if (client.isOpen) await client.quit();
  }
}
