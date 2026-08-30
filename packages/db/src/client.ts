import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { sql } from "drizzle-orm";
import postgres from "postgres";
import { isDatabaseConfigured, getEnv } from "@khepree/config";
import { loadRootEnv } from "./lib/load-root-env";
import { schema } from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

let client: ReturnType<typeof postgres> | null = null;
let dbInstance: Database | null = null;

export function getDb(): Database | null {
  loadRootEnv();
  const env = getEnv();
  if (!isDatabaseConfigured(env)) {
    return null;
  }

  if (!dbInstance) {
    client = postgres(env.DATABASE_URL!, {
      max: env.DATABASE_POOL_MAX,
      idle_timeout: env.DATABASE_IDLE_TIMEOUT,
      connect_timeout: env.DATABASE_CONNECT_TIMEOUT,
    });
    dbInstance = drizzle(client, { schema });
  }

  return dbInstance;
}

export function requireDb(): Database {
  const db = getDb();
  if (!db) {
    throw new Error(
      "DATABASE_URL is not configured. Set it in .env — status: NOT CONFIGURED",
    );
  }
  return db;
}

export async function pingDatabase(db: Database): Promise<boolean> {
  try {
    await db.execute(sql`select 1`);
    return true;
  } catch {
    return false;
  }
}

export async function closeDb(): Promise<void> {
  if (client) {
    await client.end();
    client = null;
    dbInstance = null;
  }
}
